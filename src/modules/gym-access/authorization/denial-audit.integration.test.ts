import { afterAll, beforeEach, expect, inject, it } from "vitest";
import { users } from "@/db/schema";
import { createTestDatabase } from "../../../../test/database/client";
import {
  resetTestDatabase,
  type TestDatabaseProof,
} from "../../../../test/database/reset";
import { createGymProvisioningService } from "../gym/provision-gym";
import {
  AuthorizationAuditError,
  persistAuthorizationDenial,
} from "./denial-audit";

const databaseUri = inject("databaseUri");
const proof: TestDatabaseProof = {
  databaseName: "gym_flow_test",
  suiteId: "denial-audit-suite",
  connectionUri: databaseUri,
};
const context = createTestDatabase(databaseUri);
const userId = "70000000-0000-7000-8000-000000000051";
let gymId: string;
beforeEach(async () => {
  await resetTestDatabase(context.pool, proof);
  await context.database
    .insert(users)
    .values({
      id: userId,
      name: "User",
      email: "user@example.com",
      emailVerified: true,
    });
  gymId = (
    await createGymProvisioningService({ db: context.database })(
      { userId, email: "user@example.com" },
      { name: "Gym" },
    )
  ).id;
});
afterAll(async () => context.close());

it.each(["cross_gym", "role", "membership_status", "relationship"] as const)(
  "persists stable %s denial evidence",
  async (reason) => {
    await persistAuthorizationDenial(context.database, {
      reason,
      actorUserId: userId,
      selectedGymId: gymId,
      operation: "manage_training_resources",
      resourceType: "training_resource",
    });
    const result = await context.pool.query(
      "select event_type, target_type, target_id, metadata from security_audit_events where event_type = 'authorization.denied'",
    );
    expect(result.rows).toEqual([
      {
        event_type: "authorization.denied",
        target_type: "gym",
        target_id: gymId,
        metadata: {
          reason,
          operation: "manage_training_resources",
          resourceType: "training_resource",
        },
      },
    ]);
  },
);

it("uses a valid resource UUIDv7 as the target", async () => {
  const resourceId = "73000000-0000-7000-8000-000000000051";
  await persistAuthorizationDenial(context.database, {
    reason: "role",
    actorUserId: userId,
    selectedGymId: gymId,
    operation: "manage_training_resources",
    resourceType: "training_resource",
    resourceId,
  });
  const result = await context.pool.query(
    "select target_type, target_id from security_audit_events where event_type = 'authorization.denied'",
  );
  expect(result.rows[0]).toEqual({
    target_type: "training_resource",
    target_id: resourceId,
  });
});

it("fails closed when audit persistence fails", async () => {
  await expect(
    persistAuthorizationDenial(
      context.database,
      {
        reason: "role",
        actorUserId: userId,
        selectedGymId: gymId,
        operation: "manage_training_resources",
        resourceType: "training_resource",
      },
      async () => {
        throw new Error("audit unavailable");
      },
    ),
  ).rejects.toBeInstanceOf(AuthorizationAuditError);
  const result = await context.pool.query(
    "select count(*) from security_audit_events where event_type = 'authorization.denied'",
  );
  expect(result.rows[0].count).toBe("0");
});
