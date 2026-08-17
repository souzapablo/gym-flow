import { afterAll, beforeEach, expect, inject, it } from "vitest";

import { users } from "@/db/schema";
import { createTestDatabase } from "../../../test/database/client";
import {
  resetTestDatabase,
  type TestDatabaseProof,
} from "../../../test/database/reset";

import { gymAccess } from "./index";

const databaseUri = inject("databaseUri");
const proof: TestDatabaseProof = {
  databaseName: "gym_flow_test",
  suiteId: "gym-access-contract-integration-suite",
  connectionUri: databaseUri,
};
const context = createTestDatabase(databaseUri);

beforeEach(async () => {
  await resetTestDatabase(context.pool, proof);
  await context.database.insert(users).values({
    id: "70000000-0000-7000-8000-000000000011",
    name: "Pablo",
    email: "pablo@example.com",
    emailVerified: true,
  });
});

afterAll(async () => {
  await context.close();
});

it("provisions and lists memberships through provider-neutral facade DTOs", async () => {
  const gym = await gymAccess.provisionGym(
    {
      userId: "70000000-0000-7000-8000-000000000011",
      email: "pablo@example.com",
    },
    { name: "Downtown Gym" },
  );

  await expect(
    gymAccess.listMemberships("70000000-0000-7000-8000-000000000011"),
  ).resolves.toEqual([
    {
      id: gym.ownerMembership.id,
      gymId: gym.id,
      gymName: "Downtown Gym",
      role: "owner",
      status: "active",
    },
  ]);
});

it("resolves active context through the facade as primitive values", async () => {
  const gym = await gymAccess.provisionGym(
    {
      userId: "70000000-0000-7000-8000-000000000011",
      email: "pablo@example.com",
    },
    { name: "Downtown Gym" },
  );

  await expect(
    gymAccess.resolveActiveGym("70000000-0000-7000-8000-000000000011"),
  ).resolves.toEqual({
    userId: "70000000-0000-7000-8000-000000000011",
    gymId: gym.id,
    membershipId: gym.ownerMembership.id,
  });
});

it("rejects context resolution for a caller without membership", async () => {
  await expect(
    gymAccess.resolveActiveGym("70000000-0000-7000-8000-000000000011"),
  ).rejects.toMatchObject({
    name: "GymAccessForbiddenError",
    message: "Gym access is forbidden",
  });
});

it("authorizes a named operation through the public facade", async () => {
  const gym = await provisionAndSelect();
  await expect(
    gymAccess.authorizeGymOperation(
      authRequest(gym.id),
      async (authorized) => authorized,
    ),
  ).resolves.toMatchObject({
    actorUserId: "70000000-0000-7000-8000-000000000011",
    gymId: gym.id,
    role: "owner",
    operation: "manage_training_resources",
  });
});

it("returns only the generic public denial", async () => {
  const gym = await provisionAndSelect();
  await context.pool.query(
    "alter table memberships disable trigger memberships_protect_owner_before_write",
  );
  await context.pool.query("update memberships set role = 'trainee'");
  await context.pool.query(
    "alter table memberships enable trigger memberships_protect_owner_before_write",
  );
  await expect(
    gymAccess.authorizeGymOperation(authRequest(gym.id), async () => "no"),
  ).rejects.toMatchObject({
    name: "GymAccessForbiddenError",
    message: "Gym access is forbidden",
  });
});

it("denies relationship-dependent access through the default resolver", async () => {
  const gym = await provisionAndSelect();
  await context.pool.query(
    "alter table memberships disable trigger memberships_protect_owner_before_write",
  );
  await context.pool.query("update memberships set role = 'coach'");
  await context.pool.query(
    "alter table memberships enable trigger memberships_protect_owner_before_write",
  );
  await expect(
    gymAccess.authorizeGymOperation(
      {
        ...authRequest(gym.id),
        operation: "access_trainee_resources",
        resource: { type: "trainee_resource", gymId: gym.id },
      },
      async () => "no",
    ),
  ).rejects.toMatchObject({ name: "GymAccessForbiddenError" });
});

it("creates invocation-scoped authorized contexts", async () => {
  const gym = await provisionAndSelect();
  const first = await gymAccess.authorizeGymOperation(
    authRequest(gym.id),
    async (authorized) => authorized,
  );
  const second = await gymAccess.authorizeGymOperation(
    authRequest(gym.id),
    async (authorized) => authorized,
  );
  expect(first).toEqual(second);
  expect(first).not.toBe(second);
});

async function provisionAndSelect() {
  const gym = await gymAccess.provisionGym(
    {
      userId: "70000000-0000-7000-8000-000000000011",
      email: "pablo@example.com",
    },
    { name: "Downtown Gym" },
  );
  await gymAccess.resolveActiveGym("70000000-0000-7000-8000-000000000011");
  return gym;
}

function authRequest(gymId: string) {
  return {
    actorUserId: "70000000-0000-7000-8000-000000000011",
    operation: "manage_training_resources" as const,
    resource: { type: "training_resource" as const, gymId },
  };
}
