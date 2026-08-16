import { afterAll, beforeEach, describe, expect, inject, it } from "vitest";

import { users } from "@/db/schema";
import { createTestDatabase } from "../../../../test/database/client";
import {
  resetTestDatabase,
  type TestDatabaseProof,
} from "../../../../test/database/reset";

import { createGymProvisioningService } from "./provision-gym";

const databaseUri = inject("databaseUri");
const proof: TestDatabaseProof = {
  databaseName: "gym_flow_test",
  suiteId: "provision-gym-integration-suite",
  connectionUri: databaseUri,
};
const context = createTestDatabase(databaseUri);
const provisionGym = createGymProvisioningService({ db: context.database });

beforeEach(async () => {
  await resetTestDatabase(context.pool, proof);
  await insertUser("70000000-0000-7000-8000-000000000031");
});

afterAll(async () => {
  await context.close();
});

it("atomically provisions a gym with one owner membership and audit event", async () => {
  const result = await provisionGym(
    identity("70000000-0000-7000-8000-000000000031"),
    {
      name: "Downtown Gym",
    },
  );
  const persisted = await context.pool.query<{
    gym_id: string;
    owner_user_id: string;
    membership_count: string;
    role: string;
    status: string;
    event_count: string;
  }>(`
    select gyms.id as gym_id, gyms.owner_user_id,
      count(distinct memberships.id) as membership_count,
      min(memberships.role) as role, min(memberships.status) as status,
      count(distinct security_audit_events.id) as event_count
    from gyms
    join memberships on memberships.gym_id = gyms.id
    join security_audit_events on security_audit_events.gym_id = gyms.id
    group by gyms.id
  `);

  expect(result).toEqual({
    id: persisted.rows[0].gym_id,
    name: "Downtown Gym",
    ownerMembership: {
      id: expect.any(String),
      userId: "70000000-0000-7000-8000-000000000031",
      role: "owner",
      status: "active",
    },
  });
  expect(persisted.rows).toEqual([
    {
      gym_id: result.id,
      owner_user_id: "70000000-0000-7000-8000-000000000031",
      membership_count: "1",
      role: "owner",
      status: "active",
      event_count: "1",
    },
  ]);
});

it("allows one verified user to provision multiple independent gyms", async () => {
  const first = await provisionGym(
    identity("70000000-0000-7000-8000-000000000031"),
    { name: "First Gym" },
  );
  const second = await provisionGym(
    identity("70000000-0000-7000-8000-000000000031"),
    {
      name: "Second Gym",
    },
  );

  expect(second.id).not.toBe(first.id);
  const result = await context.pool.query<{
    gyms: string;
    memberships: string;
    events: string;
  }>(`
    select count(distinct gyms.id) as gyms,
      count(distinct memberships.id) as memberships,
      count(distinct security_audit_events.id) as events
    from gyms
    join memberships on memberships.gym_id = gyms.id
    join security_audit_events on security_audit_events.gym_id = gyms.id
  `);
  expect(result.rows[0]).toEqual({ gyms: "2", memberships: "2", events: "2" });
});

it("rejects concurrent duplicate memberships through the unique constraint", async () => {
  const gym = await provisionGym(
    identity("70000000-0000-7000-8000-000000000031"),
    { name: "Downtown Gym" },
  );
  await insertUser("70000000-0000-7000-8000-000000000021");

  const attempts = await Promise.allSettled([
    insertMember(gym.id, "70000000-0000-7000-8000-000000000021"),
    insertMember(gym.id, "70000000-0000-7000-8000-000000000021"),
  ]);

  expect(attempts.map((attempt) => attempt.status).sort()).toEqual([
    "fulfilled",
    "rejected",
  ]);
  const result = await context.pool.query<{ count: string }>(
    "select count(*) from memberships where gym_id = $1 and user_id = $2",
    [gym.id, "70000000-0000-7000-8000-000000000021"],
  );
  expect(result.rows[0].count).toBe("1");
});

describe("owner immutability backstop", () => {
  it.each([
    ["role", "update memberships set role = 'coach' where role = 'owner'"],
    [
      "status",
      "update memberships set status = 'suspended' where role = 'owner'",
    ],
    ["removal", "delete from memberships where role = 'owner'"],
  ])("rejects owner %s mutation", async (_operation, statement) => {
    await provisionGym(identity("70000000-0000-7000-8000-000000000031"), {
      name: "Downtown Gym",
    });

    await expect(context.pool.query(statement)).rejects.toMatchObject({
      message: "owner membership is immutable",
    });
  });
});

it("rolls back the gym and membership when the required audit write fails", async () => {
  const failingProvision = createGymProvisioningService({
    db: context.database,
    appendEvent: async () => {
      throw new Error("audit unavailable");
    },
  });

  await expect(
    failingProvision(identity("70000000-0000-7000-8000-000000000031"), {
      name: "Downtown Gym",
    }),
  ).rejects.toThrow("audit unavailable");
  const result = await context.pool.query<{
    gyms: string;
    memberships: string;
    events: string;
  }>(`
    select (select count(*) from gyms) as gyms,
      (select count(*) from memberships) as memberships,
      (select count(*) from security_audit_events) as events
  `);
  expect(result.rows[0]).toEqual({ gyms: "0", memberships: "0", events: "0" });
});

function identity(userId: string) {
  return { userId, email: `${userId}@gym-flow.test` };
}

async function insertUser(id: string) {
  await context.database.insert(users).values({
    id,
    name: id,
    email: `${id}@gym-flow.test`,
    emailVerified: true,
  });
}

async function insertMember(gymId: string, userId: string) {
  await context.pool.query(
    "insert into memberships (gym_id, user_id, role, status) values ($1, $2, 'member', 'active')",
    [gymId, userId],
  );
}
