import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "@/db/schema";
import { appendSecurityEvent } from "@/modules/audit/security-event";
import { isUuidV7 } from "@/lib/uuid";
import type { GymOperation, GymResourceType } from "./membership-policy";

export type AuditableDenialReason =
  "cross_gym" | "role" | "membership_status" | "relationship";
export class AuthorizationAuditError extends Error {
  constructor(options?: ErrorOptions) {
    super("Authorization denial audit failed", options);
    this.name = "AuthorizationAuditError";
  }
}

export async function persistAuthorizationDenial(
  db: NodePgDatabase<typeof schema>,
  input: Readonly<{
    reason: AuditableDenialReason;
    actorUserId: string;
    selectedGymId: string;
    operation: GymOperation;
    resourceType: GymResourceType;
    resourceId?: string;
  }>,
  appendEvent = appendSecurityEvent,
) {
  try {
    await db.transaction(async (transaction) => {
      const useResource = Boolean(
        input.resourceId && isUuidV7(input.resourceId),
      );
      await appendEvent(transaction, {
        eventType: "authorization.denied",
        gymId: input.selectedGymId,
        actorUserId: input.actorUserId,
        targetType: useResource ? input.resourceType : "gym",
        targetId: useResource ? input.resourceId! : input.selectedGymId,
        metadata: {
          reason: input.reason,
          operation: input.operation,
          resourceType: input.resourceType,
        },
      });
    });
  } catch (error) {
    throw new AuthorizationAuditError({ cause: error });
  }
}
