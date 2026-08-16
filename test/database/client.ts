import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { inject } from "vitest";

import * as schema from "@/db/schema";

export type TestDatabaseContext = {
  database: NodePgDatabase<typeof schema>;
  pool: Pool;
  close: () => Promise<void>;
};

let sharedContext: TestDatabaseContext | undefined;

export function createTestDatabase(connectionUri: string): TestDatabaseContext {
  const pool = new Pool({ connectionString: connectionUri });

  return {
    database: drizzle({ client: pool, schema }),
    pool,
    close: () => pool.end(),
  };
}

export function database(): NodePgDatabase<typeof schema> {
  sharedContext ??= createTestDatabase(inject("databaseUri"));
  return sharedContext.database;
}

export async function closeTestDatabase() {
  await sharedContext?.close();
  sharedContext = undefined;
}
