import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "@/db/schema";

export type TestDatabaseContext = {
  database: NodePgDatabase<typeof schema>;
  pool: Pool;
  close: () => Promise<void>;
};

export function createTestDatabase(connectionUri: string): TestDatabaseContext {
  const pool = new Pool({ connectionString: connectionUri });

  return {
    database: drizzle({ client: pool, schema }),
    pool,
    close: () => pool.end(),
  };
}
