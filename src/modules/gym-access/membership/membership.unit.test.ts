import { describe, expect, it } from "vitest";

import { GymId, MembershipId, UserId } from "./identifiers";
import {
  InactiveMembershipError,
  Membership,
  OwnerMembershipImmutableError,
} from "./membership";

describe("owner membership", () => {
  it.each([
    ["suspend", (membership: Membership) => membership.suspend()],
    ["remove", (membership: Membership) => membership.remove()],
    ["change role", (membership: Membership) => membership.changeRole("coach")],
  ])("rejects an attempt to %s", (_operation, transition) => {
    expect(() => transition(membership({ role: "owner" }))).toThrow(
      OwnerMembershipImmutableError,
    );
  });

  it("rejects construction with an inactive owner", () => {
    expect(() => membership({ role: "owner", status: "suspended" })).toThrow(
      OwnerMembershipImmutableError,
    );
  });
});

describe("non-owner membership", () => {
  it("suspends an active membership", () => {
    expect(membership().suspend().status).toBe("suspended");
  });

  it("removes a membership", () => {
    expect(membership().remove().status).toBe("removed");
  });

  it("changes the membership role", () => {
    expect(membership().changeRole("coach").role).toBe("coach");
  });

  it("activates an inactive membership", () => {
    expect(membership({ status: "suspended" }).activate().status).toBe(
      "active",
    );
  });
});

it.each(["suspended", "removed"] as const)(
  "rejects a %s membership as an active gym context",
  (status) => {
    expect(() => membership({ status }).toGymContext()).toThrow(
      InactiveMembershipError,
    );
  },
);

it("produces one active gym context from an active membership", () => {
  const activeMembership = membership();

  expect(activeMembership.toGymContext()).toEqual({
    userId: new UserId("user-1"),
    gymId: new GymId("gym-1"),
    membershipId: new MembershipId("membership-1"),
  });
});

function membership(
  overrides: Partial<{
    role: "owner" | "coach" | "member";
    status: "active" | "suspended" | "removed";
  }> = {},
) {
  return new Membership({
    id: new MembershipId("membership-1"),
    gymId: new GymId("gym-1"),
    userId: new UserId("user-1"),
    role: "member",
    status: "active",
    ...overrides,
  });
}
