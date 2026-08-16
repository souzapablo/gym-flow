import { randomUUID } from "node:crypto";

import { afterAll, beforeEach, expect, inject, it } from "vitest";

import { users } from "@/db/schema";
import { createGymProvisioningService } from "@/modules/gym-access/gym";
import { createTestDatabase } from "../../../../test/database/client";
import {
  resetTestDatabase,
  type TestDatabaseProof,
} from "../../../../test/database/reset";

import {
  createActiveGymService,
  GymAccessForbiddenError,
  GymSelectionRequiredError,
} from "./active-gym";

const databaseUri = inject("databaseUri");
const proof: TestDatabaseProof = {
  databaseName: "gym_flow_test",
  suiteId: "active-gym-integration-suite",
  connectionUri: databaseUri,
};
const context = createTestDatabase(databaseUri);
const activeGym = createActiveGymService(context.database);
const provisionGym = createGymProvisioningService({ db: context.database });

beforeEach(async () => {
  await resetTestDatabase(context.pool, proof);
  await insertUser("70000000-0000-7000-8000-000000000011");
});

afterAll(async () => {
  await context.close();
});

it("auto-selects and persists the only active membership", async () => {
  const gym = await provisionGym(
    identity("70000000-0000-7000-8000-000000000011"),
    { name: "Only Gym" },
  );

  const contextResult = await activeGym.resolveActiveGym(
    "70000000-0000-7000-8000-000000000011",
  );
  const selection = await context.pool.query<{
    user_id: string;
    gym_id: string;
    membership_id: string;
  }>("select user_id, gym_id, membership_id from active_gym_selections");

  expect(contextResult.gymId.value).toBe(gym.id);
  expect(selection.rows).toEqual([
    {
      user_id: "70000000-0000-7000-8000-000000000011",
      gym_id: gym.id,
      membership_id: gym.ownerMembership.id,
    },
  ]);
});

it("requires explicit selection for multiple active memberships", async () => {
  await provisionGym(identity("70000000-0000-7000-8000-000000000011"), {
    name: "First Gym",
  });
  await provisionGym(identity("70000000-0000-7000-8000-000000000011"), {
    name: "Second Gym",
  });

  await expect(
    activeGym.resolveActiveGym("70000000-0000-7000-8000-000000000011"),
  ).rejects.toBeInstanceOf(GymSelectionRequiredError);
});

it("persists an explicit active selection and resolves it again", async () => {
  await provisionGym(identity("70000000-0000-7000-8000-000000000011"), {
    name: "First Gym",
  });
  const selectedGym = await provisionGym(
    identity("70000000-0000-7000-8000-000000000011"),
    {
      name: "Second Gym",
    },
  );

  const selected = await activeGym.selectActiveGym(
    "70000000-0000-7000-8000-000000000011",
    selectedGym.id,
  );
  const resolved = await activeGym.resolveActiveGym(
    "70000000-0000-7000-8000-000000000011",
  );

  expect(selected.gymId.value).toBe(selectedGym.id);
  expect(resolved.gymId.value).toBe(selectedGym.id);
  expect(resolved.membershipId.value).toBe(selectedGym.ownerMembership.id);
});

it("clears an inactive selection and requires another valid context", async () => {
  await provisionGym(identity("70000000-0000-7000-8000-000000000011"), {
    name: "First Gym",
  });
  await provisionGym(identity("70000000-0000-7000-8000-000000000011"), {
    name: "Second Gym",
  });
  const thirdGym = await gymWithMember(
    "70000000-0000-7000-8000-000000000032",
    "70000000-0000-7000-8000-000000000011",
  );
  await activeGym.selectActiveGym(
    "70000000-0000-7000-8000-000000000011",
    thirdGym,
  );
  await context.pool.query(
    "update memberships set status = 'suspended' where gym_id = $1 and user_id = $2",
    [thirdGym, "70000000-0000-7000-8000-000000000011"],
  );

  await expect(
    activeGym.resolveActiveGym("70000000-0000-7000-8000-000000000011"),
  ).rejects.toBeInstanceOf(GymSelectionRequiredError);
  const selection = await context.pool.query<{ count: string }>(
    "select count(*) from active_gym_selections where user_id = '70000000-0000-7000-8000-000000000011'",
  );
  expect(selection.rows[0].count).toBe("0");
});

it("rejects explicit selection of an inactive membership without persistence", async () => {
  const gymId = await gymWithMember(
    "70000000-0000-7000-8000-000000000032",
    "70000000-0000-7000-8000-000000000011",
  );
  await context.pool.query(
    "update memberships set status = 'suspended' where gym_id = $1 and user_id = $2",
    [gymId, "70000000-0000-7000-8000-000000000011"],
  );

  await expect(
    activeGym.selectActiveGym("70000000-0000-7000-8000-000000000011", gymId),
  ).rejects.toEqual(new GymAccessForbiddenError());
  const selection = await context.pool.query<{ count: string }>(
    "select count(*) from active_gym_selections where user_id = '70000000-0000-7000-8000-000000000011'",
  );
  expect(selection.rows[0].count).toBe("0");
});

it.each([
  ["malformed", "not-a-uuid"],
  ["unknown", randomUUID()],
])(
  "returns the same forbidden result for a %s gym id",
  async (_case, gymId) => {
    await expect(
      activeGym.selectActiveGym("70000000-0000-7000-8000-000000000011", gymId),
    ).rejects.toEqual(new GymAccessForbiddenError());
  },
);

it("returns the same forbidden result for another user's gym", async () => {
  await insertUser("70000000-0000-7000-8000-000000000032");
  const otherGym = await provisionGym(
    identity("70000000-0000-7000-8000-000000000032"),
    {
      name: "Private Gym",
    },
  );

  await expect(
    activeGym.selectActiveGym(
      "70000000-0000-7000-8000-000000000011",
      otherGym.id,
    ),
  ).rejects.toEqual(new GymAccessForbiddenError());
  const selection = await context.pool.query<{ count: string }>(
    "select count(*) from active_gym_selections where user_id = '70000000-0000-7000-8000-000000000011'",
  );
  expect(selection.rows[0].count).toBe("0");
});

it("forbids resolution when the user has no active membership", async () => {
  await expect(
    activeGym.resolveActiveGym("70000000-0000-7000-8000-000000000011"),
  ).rejects.toEqual(new GymAccessForbiddenError());
});

async function gymWithMember(ownerId: string, memberId: string) {
  await insertUser(ownerId);
  const gym = await provisionGym(identity(ownerId), { name: `${ownerId} Gym` });
  await context.pool.query(
    "insert into memberships (gym_id, user_id, role, status) values ($1, $2, 'member', 'active')",
    [gym.id, memberId],
  );
  return gym.id;
}

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
