import "server-only";

import { asc, eq } from "drizzle-orm";

import { database } from "@/db/client";
import { gyms, memberships } from "@/db/schema";

export type MembershipDto = Readonly<{
  id: string;
  gymId: string;
  gymName: string;
  role: string;
  status: string;
}>;

export async function listMemberships(
  userId: string,
): Promise<MembershipDto[]> {
  return database()
    .select({
      id: memberships.id,
      gymId: memberships.gymId,
      gymName: gyms.name,
      role: memberships.role,
      status: memberships.status,
    })
    .from(memberships)
    .innerJoin(gyms, eq(gyms.id, memberships.gymId))
    .where(eq(memberships.userId, userId))
    .orderBy(asc(gyms.name));
}
