import { sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import * as schema from "@/db/schema";
import {
  MEMBERSHIP_ROLES,
  MEMBERSHIP_STATUSES,
  type MembershipRole,
  type MembershipStatus,
} from "../membership";

export type AuthorizationTransaction = Pick<
  NodePgDatabase<typeof schema>,
  "execute"
>;

export type LoadedAuthorizationFacts = Readonly<{
  actorUserId: string;
  activeGymId?: string;
  membershipId?: string;
  membershipGymId?: string;
  role?: MembershipRole;
  status?: MembershipStatus;
  denyReason?:
    "missing_fact" | "membership_status" | "unknown_role" | "unknown_status";
}>;

export async function loadCurrentAuthorizationFacts(
  transaction: AuthorizationTransaction,
  actorUserId: string,
): Promise<LoadedAuthorizationFacts> {
  const selectionResult = await transaction.execute(sql`
    select gym_id, membership_id from active_gym_selections
    where user_id = ${actorUserId}
  `);
  const selection = selectionResult.rows[0] as
    Record<string, unknown> | undefined;
  if (
    !selection ||
    typeof selection.gym_id !== "string" ||
    typeof selection.membership_id !== "string"
  ) {
    return { actorUserId, denyReason: "missing_fact" };
  }
  const result = await transaction.execute(sql`
    select ${selection.gym_id}::uuid as active_gym_id, id as membership_id,
      gym_id as membership_gym_id, role, status
    from memberships
    where id = ${selection.membership_id} and gym_id = ${selection.gym_id} and user_id = ${actorUserId}
    for share
  `);
  const row = result.rows[0] as Record<string, unknown> | undefined;
  if (
    !row ||
    typeof row.active_gym_id !== "string" ||
    typeof row.membership_id !== "string" ||
    typeof row.membership_gym_id !== "string"
  ) {
    return { actorUserId, denyReason: "missing_fact" };
  }
  if (!MEMBERSHIP_ROLES.includes(row.role as never))
    return {
      actorUserId,
      activeGymId: row.active_gym_id,
      membershipId: row.membership_id,
      membershipGymId: row.membership_gym_id,
      denyReason: "unknown_role",
    };
  if (!MEMBERSHIP_STATUSES.includes(row.status as never))
    return {
      actorUserId,
      activeGymId: row.active_gym_id,
      membershipId: row.membership_id,
      membershipGymId: row.membership_gym_id,
      denyReason: "unknown_status",
    };
  if (row.status !== "active")
    return {
      actorUserId,
      activeGymId: row.active_gym_id,
      membershipId: row.membership_id,
      membershipGymId: row.membership_gym_id,
      role: row.role as MembershipRole,
      status: row.status as MembershipStatus,
      denyReason: "membership_status",
    };
  return {
    actorUserId,
    activeGymId: row.active_gym_id,
    membershipId: row.membership_id,
    membershipGymId: row.membership_gym_id,
    role: row.role as MembershipRole,
    status: row.status as MembershipStatus,
  };
}
