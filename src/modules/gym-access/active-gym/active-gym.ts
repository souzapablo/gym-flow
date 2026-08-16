import "server-only";

import { and, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { database } from "@/db/client";
import * as schema from "@/db/schema";
import { isUuidV7 } from "@/lib/uuid";
import {
  GymId,
  Membership,
  MembershipId,
  UserId,
  type GymContext,
  type MembershipRole,
  type MembershipStatus,
} from "@/modules/gym-access/membership";

type GymDatabase = NodePgDatabase<typeof schema>;

export class GymSelectionRequiredError extends Error {
  constructor() {
    super("An active gym selection is required");
    this.name = "GymSelectionRequiredError";
  }
}

export class GymAccessForbiddenError extends Error {
  constructor() {
    super("Gym access is forbidden");
    this.name = "GymAccessForbiddenError";
  }
}

export function createActiveGymService(db: GymDatabase) {
  async function resolveActiveGym(userIdValue: string): Promise<GymContext> {
    const activeMemberships = await findActiveMemberships(db, userIdValue);

    if (activeMemberships.length === 0) {
      await clearSelection(db, userIdValue);
      throw new GymAccessForbiddenError();
    }

    const [selection] = await db
      .select({ membershipId: schema.activeGymSelections.membershipId })
      .from(schema.activeGymSelections)
      .where(eq(schema.activeGymSelections.userId, userIdValue))
      .limit(1);
    const selectedMembership = selection
      ? activeMemberships.find(
          (membership) => membership.id.value === selection.membershipId,
        )
      : undefined;

    if (selectedMembership) {
      return selectedMembership.toGymContext();
    }

    if (selection) {
      await clearSelection(db, userIdValue);
    }

    if (activeMemberships.length === 1) {
      await persistSelection(db, activeMemberships[0]);
      return activeMemberships[0].toGymContext();
    }

    throw new GymSelectionRequiredError();
  }

  async function selectActiveGym(
    userIdValue: string,
    gymIdValue: string,
  ): Promise<GymContext> {
    if (!isUuid(gymIdValue)) {
      throw new GymAccessForbiddenError();
    }

    const [row] = await db
      .select({
        id: schema.memberships.id,
        gymId: schema.memberships.gymId,
        userId: schema.memberships.userId,
        role: schema.memberships.role,
        status: schema.memberships.status,
      })
      .from(schema.memberships)
      .where(
        and(
          eq(schema.memberships.userId, userIdValue),
          eq(schema.memberships.gymId, gymIdValue),
          eq(schema.memberships.status, "active"),
        ),
      )
      .limit(1);

    if (!row) {
      throw new GymAccessForbiddenError();
    }

    const membership = mapMembership(row);
    await persistSelection(db, membership);
    return membership.toGymContext();
  }

  return { resolveActiveGym, selectActiveGym };
}

export async function resolveActiveGym(userId: string) {
  return createActiveGymService(database()).resolveActiveGym(userId);
}

export async function selectActiveGym(userId: string, gymId: string) {
  return createActiveGymService(database()).selectActiveGym(userId, gymId);
}

async function findActiveMemberships(db: GymDatabase, userId: string) {
  const rows = await db
    .select({
      id: schema.memberships.id,
      gymId: schema.memberships.gymId,
      userId: schema.memberships.userId,
      role: schema.memberships.role,
      status: schema.memberships.status,
    })
    .from(schema.memberships)
    .where(
      and(
        eq(schema.memberships.userId, userId),
        eq(schema.memberships.status, "active"),
      ),
    );

  return rows.map(mapMembership);
}

function mapMembership(row: {
  id: string;
  gymId: string;
  userId: string;
  role: string;
  status: string;
}) {
  return new Membership({
    id: new MembershipId(row.id),
    gymId: new GymId(row.gymId),
    userId: new UserId(row.userId),
    role: row.role as MembershipRole,
    status: row.status as MembershipStatus,
  });
}

async function persistSelection(db: GymDatabase, membership: Membership) {
  await db
    .insert(schema.activeGymSelections)
    .values({
      userId: membership.userId.value,
      gymId: membership.gymId.value,
      membershipId: membership.id.value,
    })
    .onConflictDoUpdate({
      target: schema.activeGymSelections.userId,
      set: {
        gymId: membership.gymId.value,
        membershipId: membership.id.value,
        updatedAt: new Date(),
      },
    });
}

async function clearSelection(db: GymDatabase, userId: string) {
  await db
    .delete(schema.activeGymSelections)
    .where(eq(schema.activeGymSelections.userId, userId));
}

const isUuid = isUuidV7;
