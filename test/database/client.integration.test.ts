import { sql } from "drizzle-orm";
import { expect, inject, it } from "vitest";

import { createTestDatabase } from "./client";

it("composes a test database from the suite-created PostgreSQL URI", async () => {
  const databaseUri = inject("databaseUri");
  const context = createTestDatabase(databaseUri);

  try {
    const result = await context.database.execute<{ database_name: string }>(
      sql`select current_database() as database_name`,
    );

    expect(context.pool.options.connectionString).toBe(databaseUri);
    expect(result.rows).toEqual([{ database_name: "gym_flow_test" }]);
  } finally {
    await context.close();
  }
});
