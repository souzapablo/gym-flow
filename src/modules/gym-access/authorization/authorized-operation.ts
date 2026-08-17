import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "@/db/schema";
import { GymAccessForbiddenError } from "../active-gym/active-gym";
import type { MembershipRole } from "../membership";
import {
  persistAuthorizationDenial,
  type AuditableDenialReason,
} from "./denial-audit";
import { loadCurrentAuthorizationFacts } from "./facts-loader";
import {
  evaluateMembershipPolicy,
  type GymOperation,
  type GymResourceType,
} from "./membership-policy";
import {
  resolveRelationship,
  type RelationshipQuery,
  type RelationshipResolver,
} from "./relationship-policy";

type GymDatabase = NodePgDatabase<typeof schema>;
type GymTransaction = Parameters<Parameters<GymDatabase["transaction"]>[0]>[0];
export type AuthorizedGymContext = Readonly<{
  actorUserId: string;
  membershipId: string;
  gymId: string;
  role: MembershipRole;
  operation: GymOperation;
}>;
export type AuthorizationRequest<Result> = Readonly<{
  actorUserId: string;
  operation: GymOperation;
  resource: Readonly<{ type: GymResourceType; id?: string; gymId?: string }>;
  relationship?: RelationshipQuery;
  resolveResourceFacts?: (
    transaction: GymTransaction,
  ) => Promise<{ gymId?: string }>;
  handler: (
    transaction: GymTransaction,
    context: AuthorizedGymContext,
  ) => Promise<Result>;
}>;

export function createAuthorizedOperationBoundary({
  db,
  relationshipResolver,
  auditDenial = persistAuthorizationDenial,
}: {
  db: GymDatabase;
  relationshipResolver?: RelationshipResolver<GymTransaction>;
  auditDenial?: typeof persistAuthorizationDenial;
}) {
  return async function withGymAuthorization<Result>(
    request: AuthorizationRequest<Result>,
  ): Promise<Result> {
    const outcome = await db.transaction(async (transaction) => {
      const current = await loadCurrentAuthorizationFacts(
        transaction,
        request.actorUserId,
      );
      const resolved = request.resolveResourceFacts
        ? await request.resolveResourceFacts(transaction)
        : undefined;
      const resourceGymId = resolved?.gymId ?? request.resource.gymId;
      const relationship = await resolveRelationship(
        transaction,
        request.relationship,
        relationshipResolver,
      );
      const decision = current.denyReason
        ? { allowed: false as const, reason: current.denyReason }
        : evaluateMembershipPolicy({
            actorUserId: current.actorUserId,
            membershipId: current.membershipId,
            membershipGymId: current.membershipGymId,
            activeGymId: current.activeGymId,
            resourceGymId,
            role: current.role,
            status: current.status,
            operation: request.operation,
            resourceType: request.resource.type,
            relationship,
          });
      if (!decision.allowed)
        return { denied: true as const, reason: decision.reason, current };
      const context: AuthorizedGymContext = {
        actorUserId: current.actorUserId,
        membershipId: current.membershipId!,
        gymId: current.activeGymId!,
        role: current.role!,
        operation: request.operation,
      };
      return {
        denied: false as const,
        value: await request.handler(transaction, context),
      };
    });
    if (!outcome.denied) return outcome.value;
    if (isAuditable(outcome.reason) && outcome.current.activeGymId)
      await auditDenial(db, {
        reason: outcome.reason,
        actorUserId: request.actorUserId,
        selectedGymId: outcome.current.activeGymId,
        operation: request.operation,
        resourceType: request.resource.type,
        resourceId: request.resource.id,
      });
    throw new GymAccessForbiddenError();
  };
}

function isAuditable(reason: string): reason is AuditableDenialReason {
  return ["cross_gym", "role", "membership_status", "relationship"].includes(
    reason,
  );
}
