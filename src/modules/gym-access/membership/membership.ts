import { GymId, MembershipId, UserId } from "./identifiers";

export const MEMBERSHIP_ROLES = ["owner", "coach", "member"] as const;
export type MembershipRole = (typeof MEMBERSHIP_ROLES)[number];

export const MEMBERSHIP_STATUSES = ["active", "suspended", "removed"] as const;
export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];

export type GymContext = Readonly<{
  userId: UserId;
  gymId: GymId;
  membershipId: MembershipId;
}>;

export class OwnerMembershipImmutableError extends Error {
  constructor() {
    super("Owner membership is immutable");
    this.name = "OwnerMembershipImmutableError";
  }
}

export class InactiveMembershipError extends Error {
  constructor() {
    super("Inactive membership cannot produce a gym context");
    this.name = "InactiveMembershipError";
  }
}

type MembershipState = Readonly<{
  id: MembershipId;
  gymId: GymId;
  userId: UserId;
  role: MembershipRole;
  status: MembershipStatus;
}>;

export class Membership {
  readonly id: MembershipId;
  readonly gymId: GymId;
  readonly userId: UserId;
  readonly role: MembershipRole;
  readonly status: MembershipStatus;

  constructor(state: MembershipState) {
    if (state.role === "owner" && state.status !== "active") {
      throw new OwnerMembershipImmutableError();
    }

    this.id = state.id;
    this.gymId = state.gymId;
    this.userId = state.userId;
    this.role = state.role;
    this.status = state.status;
  }

  activate() {
    return this.withStatus("active");
  }

  suspend() {
    this.protectOwner();
    return this.withStatus("suspended");
  }

  remove() {
    this.protectOwner();
    return this.withStatus("removed");
  }

  changeRole(role: MembershipRole) {
    this.protectOwner();
    return new Membership({ ...this.state(), role });
  }

  toGymContext(): GymContext {
    if (this.status !== "active") {
      throw new InactiveMembershipError();
    }

    return {
      userId: this.userId,
      gymId: this.gymId,
      membershipId: this.id,
    };
  }

  private protectOwner() {
    if (this.role === "owner") {
      throw new OwnerMembershipImmutableError();
    }
  }

  private withStatus(status: MembershipStatus) {
    return new Membership({ ...this.state(), status });
  }

  private state(): MembershipState {
    return {
      id: this.id,
      gymId: this.gymId,
      userId: this.userId,
      role: this.role,
      status: this.status,
    };
  }
}
