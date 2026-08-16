import "server-only";

import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "@/db/schema";

let context:
  | {
      database: NodePgDatabase<typeof schema>;
      pool: Pool;
    }
  | undefined;

export function database(): NodePgDatabase<typeof schema> {
  if (context) {
    return context.database;
  }

  const connectionString = process.env.GYM_FLOW_E2E_DATABASE_URL;
  const suiteId = process.env.GYM_FLOW_E2E_SUITE_ID;

  if (!connectionString || !suiteId?.trim()) {
    throw new Error("E2E database composition requires its runner proof");
  }

  if (decodeURIComponent(new URL(connectionString).pathname.slice(1)) !== "gym_flow_test") {
    throw new Error("E2E database composition is restricted to gym_flow_test");
  }

  const pool = new Pool({ connectionString });
  context = { database: drizzle({ client: pool, schema }), pool };
  return context.database;
}
