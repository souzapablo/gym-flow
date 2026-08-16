import { expect, it } from "vitest";

import { evaluateMembershipPolicy } from "./membership-policy";
import {
  defaultRelationshipResolver,
  resolveRelationship,
} from "./relationship-policy";

const transaction = { marker: "transaction" };
const query = {
  type: "coach_trainee" as const,
  coachUserId: "coach-1",
  traineeUserId: "trainee-1",
  gymId: "gym-1",
};

it("defaults every relationship query to absent", async () => {
  await expect(
    defaultRelationshipResolver.resolve(transaction, query),
  ).resolves.toBe("absent");
});

it("consumes a satisfied relationship in policy evaluation", async () => {
  const relationship = await resolveRelationship(transaction, query, {
    resolve: async () => "satisfied",
  });
  expect(
    evaluateMembershipPolicy({
      actorUserId: "coach-1",
      membershipId: "membership-1",
      membershipGymId: "gym-1",
      activeGymId: "gym-1",
      resourceGymId: "gym-1",
      role: "coach",
      status: "active",
      operation: "access_trainee_resources",
      resourceType: "trainee_resource",
      relationship,
    }),
  ).toEqual({ allowed: true });
});

it("denies when a relationship-dependent request omits its query", async () => {
  const relationship = await resolveRelationship(transaction);
  expect(
    evaluateMembershipPolicy({
      actorUserId: "coach-1",
      membershipId: "membership-1",
      membershipGymId: "gym-1",
      activeGymId: "gym-1",
      resourceGymId: "gym-1",
      role: "coach",
      status: "active",
      operation: "access_trainee_resources",
      resourceType: "trainee_resource",
      relationship,
    }),
  ).toEqual({ allowed: false, reason: "relationship" });
});
