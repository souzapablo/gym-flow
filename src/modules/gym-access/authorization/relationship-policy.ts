import type { RelationshipResult } from "./membership-policy";

export type RelationshipQuery =
  | Readonly<{
      type: "coach_trainee";
      coachUserId: string;
      traineeUserId: string;
      gymId: string;
    }>
  | Readonly<{
      type: "trainee_self";
      actorUserId: string;
      traineeUserId: string;
      gymId: string;
    }>;

export type RelationshipResolver<Transaction = unknown> = Readonly<{
  /** Implementations must read and lock relevant relationship rows through this transaction. */
  resolve(
    transaction: Transaction,
    query: RelationshipQuery,
  ): Promise<RelationshipResult>;
}>;

export const defaultRelationshipResolver: RelationshipResolver = {
  async resolve() {
    return "absent";
  },
};

export async function resolveRelationship<Transaction>(
  transaction: Transaction,
  query?: RelationshipQuery,
  resolver: RelationshipResolver<Transaction> = defaultRelationshipResolver,
): Promise<RelationshipResult> {
  if (!query) return "absent";
  return resolver.resolve(transaction, query);
}
