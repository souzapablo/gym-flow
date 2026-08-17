import { database } from "@/db/client";
import type { MembershipRole } from "../membership";
import { createAuthorizedOperationBoundary } from "./authorized-operation";
import type { GymOperation, GymResourceType } from "./membership-policy";
import type { RelationshipQuery } from "./relationship-policy";

export type GymAuthorizationRequestDto = Readonly<{
  actorUserId: string;
  operation: GymOperation;
  resource: Readonly<{ type: GymResourceType; id?: string; gymId?: string }>;
  relationship?: RelationshipQuery;
}>;
export type AuthorizedGymContextDto = Readonly<{
  actorUserId: string;
  membershipId: string;
  gymId: string;
  role: MembershipRole;
  operation: GymOperation;
}>;

export async function authorizeGymOperation<Result>(
  request: GymAuthorizationRequestDto,
  handler: (context: AuthorizedGymContextDto) => Promise<Result>,
): Promise<Result> {
  return createAuthorizedOperationBoundary({ db: database() })({
    ...request,
    handler: async (_transaction, context) => handler(context),
  });
}
