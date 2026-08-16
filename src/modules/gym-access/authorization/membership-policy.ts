import { MEMBERSHIP_ROLES, MEMBERSHIP_STATUSES } from "../membership";

export const GYM_OPERATIONS = [
  "manage_owner_membership",
  "manage_admin_membership",
  "manage_coach_membership",
  "manage_trainee_membership",
  "manage_training_resources",
  "access_trainee_resources",
  "access_trainee_history",
] as const;
export type GymOperation = (typeof GYM_OPERATIONS)[number];

export const GYM_RESOURCE_TYPES = [
  "owner_membership",
  "admin_membership",
  "coach_membership",
  "trainee_membership",
  "training_resource",
  "trainee_resource",
  "trainee_history",
] as const;
export type GymResourceType = (typeof GYM_RESOURCE_TYPES)[number];
export type RelationshipResult = "satisfied" | "absent";

export type AuthorizationFacts = Readonly<{
  actorUserId?: unknown;
  membershipId?: unknown;
  membershipGymId?: unknown;
  activeGymId?: unknown;
  resourceGymId?: unknown;
  role?: unknown;
  status?: unknown;
  operation?: unknown;
  resourceType?: unknown;
  relationship?: unknown;
}>;

export type AuthorizationDecision =
  | Readonly<{ allowed: true }>
  | Readonly<{
      allowed: false;
      reason:
        | "missing_fact"
        | "unknown_role"
        | "unknown_status"
        | "unknown_operation"
        | "unknown_resource"
        | "cross_gym"
        | "membership_status"
        | "role"
        | "relationship";
    }>;

const capabilities: Readonly<Record<GymOperation, readonly string[]>> = {
  manage_owner_membership: [],
  manage_admin_membership: ["owner"],
  manage_coach_membership: ["owner", "admin"],
  manage_trainee_membership: ["owner", "admin"],
  manage_training_resources: ["owner", "admin"],
  access_trainee_resources: ["owner", "admin"],
  access_trainee_history: ["owner", "admin"],
};

export function evaluateMembershipPolicy(
  facts: AuthorizationFacts,
): AuthorizationDecision {
  const required = [
    facts.actorUserId,
    facts.membershipId,
    facts.membershipGymId,
    facts.activeGymId,
    facts.resourceGymId,
  ];
  if (required.some((value) => typeof value !== "string" || value.length === 0))
    return deny("missing_fact");
  if (!MEMBERSHIP_ROLES.includes(facts.role as never))
    return deny("unknown_role");
  if (!MEMBERSHIP_STATUSES.includes(facts.status as never))
    return deny("unknown_status");
  if (!GYM_OPERATIONS.includes(facts.operation as never))
    return deny("unknown_operation");
  if (!GYM_RESOURCE_TYPES.includes(facts.resourceType as never))
    return deny("unknown_resource");
  if (
    facts.membershipGymId !== facts.activeGymId ||
    facts.activeGymId !== facts.resourceGymId
  )
    return deny("cross_gym");
  if (facts.status !== "active") return deny("membership_status");

  const operation = facts.operation as GymOperation;
  if (capabilities[operation].includes(facts.role as string))
    return { allowed: true };
  if (
    (facts.role === "coach" || facts.role === "trainee") &&
    operation.startsWith("access_trainee_")
  ) {
    return facts.relationship === "satisfied"
      ? { allowed: true }
      : deny("relationship");
  }
  return deny("role");
}

function deny(
  reason: Extract<AuthorizationDecision, { allowed: false }>["reason"],
): AuthorizationDecision {
  return { allowed: false, reason };
}
