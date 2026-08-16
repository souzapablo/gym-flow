import "server-only";

import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { appendSecurityEvent } from "@/modules/audit/security-event";
import type { AuthenticatedIdentity } from "@/modules/identity/account";
import { database } from "@/db/client";
import * as schema from "@/db/schema";

export type ProvisionedGym = Readonly<{
  id: string;
  name: string;
  ownerMembership: Readonly<{
    id: string;
    userId: string;
    role: "owner";
    status: "active";
  }>;
}>;

type GymDatabase = NodePgDatabase<typeof schema>;
type AppendEvent = typeof appendSecurityEvent;

export function createGymProvisioningService({
  db,
  appendEvent = appendSecurityEvent,
}: {
  db: GymDatabase;
  appendEvent?: AppendEvent;
}) {
  return async function provisionGym(
    identity: AuthenticatedIdentity,
    input: { name: string },
  ): Promise<ProvisionedGym> {
    return db.transaction(async (transaction) => {
      const [gym] = await transaction
        .insert(schema.gyms)
        .values({ name: input.name, ownerUserId: identity.userId })
        .returning({ id: schema.gyms.id, name: schema.gyms.name });
      const [membership] = await transaction
        .insert(schema.memberships)
        .values({
          gymId: gym.id,
          userId: identity.userId,
          role: "owner",
          status: "active",
        })
        .returning({ id: schema.memberships.id });

      await appendEvent(transaction, {
        eventType: "gym.provisioned",
        gymId: gym.id,
        actorUserId: identity.userId,
        targetType: "gym",
        targetId: gym.id,
        metadata: { name: gym.name },
      });

      return {
        id: gym.id,
        name: gym.name,
        ownerMembership: {
          id: membership.id,
          userId: identity.userId,
          role: "owner",
          status: "active",
        },
      };
    });
  };
}

export async function provisionGym(
  identity: AuthenticatedIdentity,
  input: { name: string },
) {
  return createGymProvisioningService({ db: database() })(identity, input);
}
