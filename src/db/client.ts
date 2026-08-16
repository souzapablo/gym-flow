import "server-only";

import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

export type DatabaseContext = {
  database: NodePgDatabase<typeof schema>;
  pool: Pool;
  close: () => Promise<void>;
};

let productionContext: DatabaseContext | undefined;

function createDatabaseContext(connectionString: string): DatabaseContext {
  const pool = new Pool({
    connectionString,
    max: 5,
  });

  return {
    database: drizzle({ client: pool, schema }),
    pool,
    close: () => pool.end(),
  };
}

export function database(): NodePgDatabase<typeof schema> {
  if (productionContext) {
    return productionContext.database;
  }

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  validateProductionDatabaseUrl(connectionString);
  productionContext = createDatabaseContext(connectionString);

  return productionContext.database;
}

function validateProductionDatabaseUrl(connectionString: string) {
  let hostname: string;

  try {
    hostname = new URL(connectionString).hostname;
  } catch {
    throw new Error(
      "DATABASE_URL must be a valid pooled Neon PostgreSQL URL containing -pooler",
    );
  }

  const endpoint = hostname.split(".")[0];
  const isPooledNeonEndpoint =
    hostname.endsWith(".neon.tech") && endpoint.endsWith("-pooler");

  if (!isPooledNeonEndpoint) {
    throw new Error(
      "DATABASE_URL must use a pooled Neon endpoint containing -pooler",
    );
  }
}
