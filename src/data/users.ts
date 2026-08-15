import "server-only";

import { db } from "@/lib/db";
import type { User } from "@/lib/user";

export async function findUserById(id: string): Promise<User | null> {
  const sql = db();
  const users = (await sql`
    select id, name
    from users
    where id = ${id}
  `) as User[];

  return users[0] ?? null;
}
