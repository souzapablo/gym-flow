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
