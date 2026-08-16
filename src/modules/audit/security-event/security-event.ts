import "server-only";

import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import * as schema from "@/db/schema";

export type SecurityEvent = Readonly<{
  eventType: string;
  gymId: string;
  actorUserId?: string;
  targetType: string;
  targetId: string;
  occurredAt?: Date;
  metadata: Record<string, unknown>;
}>;

export type AuditTransaction = Pick<NodePgDatabase<typeof schema>, "insert">;

export async function appendSecurityEvent(
  transaction: AuditTransaction,
  event: SecurityEvent,
) {
  await transaction.insert(schema.securityAuditEvents).values({
    eventType: event.eventType,
    gymId: event.gymId,
    actorUserId: event.actorUserId ?? null,
    targetType: event.targetType,
    targetId: event.targetId,
    occurredAt: event.occurredAt,
    metadata: event.metadata,
  });
}
