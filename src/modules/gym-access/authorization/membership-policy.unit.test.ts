import { describe, expect, it } from "vitest";

import {
  evaluateMembershipPolicy,
  type AuthorizationFacts,
} from "./membership-policy";

const operations = [
  "manage_owner_membership",
  "manage_admin_membership",
  "manage_coach_membership",
  "manage_trainee_membership",
  "manage_training_resources",
  "access_trainee_resources",
  "access_trainee_history",
] as const;
const roles = ["owner", "admin", "coach", "trainee"] as const;

describe("membership capability matrix", () => {
  it.each(
    operations.flatMap((operation) =>
      roles.map((role) => [operation, role] as const),
    ),
  )("%s for %s matches the approved matrix", (operation, role) => {
    const allowed =
      (role === "owner" && operation !== "manage_owner_membership") ||
      (role === "admin" &&
        [
          "manage_coach_membership",
          "manage_trainee_membership",
          "manage_training_resources",
          "access_trainee_resources",
          "access_trainee_history",
        ].includes(operation));
    const decision = evaluateMembershipPolicy(facts({ operation, role }));
    expect(decision.allowed).toBe(allowed);
  });
});

it.each([
  ["actorUserId", undefined, "missing_fact"],
  ["membershipId", undefined, "missing_fact"],
  ["membershipGymId", undefined, "missing_fact"],
  ["activeGymId", undefined, "missing_fact"],
  ["resourceGymId", undefined, "missing_fact"],
  ["role", "unknown", "unknown_role"],
  ["status", "unknown", "unknown_status"],
  ["operation", "unknown", "unknown_operation"],
  ["resourceType", "unknown", "unknown_resource"],
] as const)("denies invalid %s", (field, value, reason) => {
  expect(evaluateMembershipPolicy(facts({ [field]: value }))).toEqual({
    allowed: false,
    reason,
  });
});

it("denies cross-gym facts before role evaluation", () => {
  expect(
    evaluateMembershipPolicy(facts({ role: "owner", resourceGymId: "gym-2" })),
  ).toEqual({ allowed: false, reason: "cross_gym" });
});

it.each(["suspended", "removed"])(
  "denies %s membership before role evaluation",
  (status) => {
    expect(evaluateMembershipPolicy(facts({ role: "owner", status }))).toEqual({
      allowed: false,
      reason: "membership_status",
    });
  },
);

it("allows a required satisfied coach relationship", () => {
  expect(
    evaluateMembershipPolicy(
      facts({
        role: "coach",
        operation: "access_trainee_resources",
        relationship: "satisfied",
      }),
    ),
  ).toEqual({ allowed: true });
});

it("denies an absent required relationship", () => {
  expect(
    evaluateMembershipPolicy(
      facts({
        role: "trainee",
        operation: "access_trainee_history",
        relationship: "absent",
      }),
    ),
  ).toEqual({ allowed: false, reason: "relationship" });
});

function facts(
  overrides: Partial<AuthorizationFacts> = {},
): AuthorizationFacts {
  return {
    actorUserId: "user-1",
    membershipId: "membership-1",
    membershipGymId: "gym-1",
    activeGymId: "gym-1",
    resourceGymId: "gym-1",
    role: "owner",
    status: "active",
    operation: "manage_training_resources",
    resourceType: "training_resource",
    relationship: "absent",
    ...overrides,
  };
}
