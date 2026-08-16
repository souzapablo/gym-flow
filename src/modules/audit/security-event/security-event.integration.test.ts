import { afterAll, beforeEach, describe, expect, inject, it } from "vitest";

import { users } from "@/db/schema";
import { createTestDatabase } from "../../../../test/database/client";
import {
  resetTestDatabase,
  type TestDatabaseProof,
} from "../../../../test/database/reset";

import { appendSecurityEvent } from "./security-event";

const databaseUri = inject("databaseUri");
const proof: TestDatabaseProof = {
  databaseName: "gym_flow_test",
  suiteId: "security-event-integration-suite",
  connectionUri: databaseUri,
};
const context = createTestDatabase(databaseUri);

beforeEach(async () => {
  await resetTestDatabase(context.pool, proof);
});

afterAll(async () => {
  await context.close();
});

it("appends and reads every structured security event field", async () => {
  const gymId = await insertOwnedGym();
  const occurredAt = new Date("2026-08-16T12:00:00.000Z");

  await context.database.transaction(async (transaction) => {
    await appendSecurityEvent(transaction, {
      eventType: "gym.provisioned",
      gymId,
      actorUserId: "user-1",
      targetType: "gym",
      targetId: gymId,
      occurredAt,
      metadata: { name: "Downtown Gym", source: "self-service" },
    });
  });
  const result = await context.pool.query<{
    event_type: string;
    gym_id: string;
    actor_user_id: string | null;
    target_type: string;
    target_id: string;
    occurred_at: Date;
    metadata: Record<string, unknown>;
  }>(`
    select event_type, gym_id, actor_user_id, target_type, target_id,
           occurred_at, metadata
    from security_audit_events
  `);

  expect(result.rows).toEqual([
    {
      event_type: "gym.provisioned",
      gym_id: gymId,
      actor_user_id: "user-1",
      target_type: "gym",
      target_id: gymId,
      occurred_at: occurredAt,
      metadata: { name: "Downtown Gym", source: "self-service" },
    },
  ]);
});

describe("append-only storage", () => {
  it.each([
    ["update", "update security_audit_events set event_type = 'changed'"],
    ["delete", "delete from security_audit_events"],
  ])("rejects an application %s path", async (_operation, statement) => {
    const gymId = await insertOwnedGym();
    await context.database.transaction((transaction) =>
      appendSecurityEvent(transaction, {
        eventType: "gym.provisioned",
        gymId,
        targetType: "gym",
        targetId: gymId,
        metadata: {},
      }),
    );

    await expect(context.pool.query(statement)).rejects.toMatchObject({
      message: "security audit events are append-only",
    });
    const count = await context.pool.query<{ count: string }>(
      "select count(*) from security_audit_events",
    );
    expect(count.rows[0].count).toBe("1");
  });
});

async function insertOwnedGym() {
  await context.database.insert(users).values({
    id: "user-1",
    name: "Pablo",
    email: "pablo@example.com",
    emailVerified: true,
  });
  await context.pool.query("begin");
  try {
    const gym = await context.pool.query<{ id: string }>(
      "insert into gyms (name, owner_user_id) values ($1, $2) returning id",
      ["Downtown Gym", "user-1"],
    );
    await context.pool.query(
      "insert into memberships (gym_id, user_id, role, status) values ($1, $2, 'owner', 'active')",
      [gym.rows[0].id, "user-1"],
    );
    await context.pool.query("commit");
    return gym.rows[0].id;
  } catch (error) {
    await context.pool.query("rollback");
    throw error;
  }
}
