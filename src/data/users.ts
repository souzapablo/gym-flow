import "server-only";

import { eq } from "drizzle-orm";

import { database } from "@/db/client";
import { users } from "@/db/schema";
import type { User } from "@/lib/user";

export async function findUserById(id: string): Promise<User | null> {
  const [user] = await database()
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  return user ?? null;
}
