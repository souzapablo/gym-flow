import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { Pool } from "pg";
import { expect, inject, it } from "vitest";

import { applyMigrations } from "./lifecycle";

it("provides a PostgreSQL database with every real migration applied", async () => {
  const databaseUri = inject("databaseUri");
  const pool = new Pool({ connectionString: databaseUri });

  try {
    expect(new URL(databaseUri).hostname).not.toContain("neon.tech");
    expect(new URL(databaseUri).pathname).toBe("/gym_flow_test");

    const result = await pool.query<{ table_name: string }>(`
      select table_name
      from information_schema.tables
      where table_schema = 'public'
      order by table_name
    `);

    expect(result.rows.map((row) => row.table_name)).toEqual([
      "accounts",
      "active_gym_selections",
      "completed_sets",
      "exercises",
      "gyms",
      "memberships",
      "security_audit_events",
      "sessions",
      "users",
      "verifications",
      "workout_sessions",
      "workouts",
    ]);
  } finally {
    await pool.end();
  }
});

it("applies migrations lexically and reports the failing filename and cause", async () => {
  const pool = new Pool({ connectionString: inject("databaseUri") });
  const migrationsDirectory = await mkdtemp(
    join(tmpdir(), "gym-flow-migrations-"),
  );

  await writeFile(
    join(migrationsDirectory, "002_failure.sql"),
    "insert into lifecycle_migration_order values (2); select * from missing_relation;",
  );
  await writeFile(
    join(migrationsDirectory, "001_first.sql"),
    "create table lifecycle_migration_order (step integer not null); insert into lifecycle_migration_order values (1);",
  );

  try {
    let migrationError: unknown;

    try {
      await applyMigrations(pool, migrationsDirectory);
    } catch (error) {
      migrationError = error;
    }

    expect(migrationError).toBeInstanceOf(Error);
    expect((migrationError as Error).message).toContain("002_failure.sql");
    expect(
      (migrationError as Error & { cause?: unknown }).cause,
    ).toBeInstanceOf(Error);

    const result = await pool.query<{ step: number }>(
      "select step from lifecycle_migration_order order by step",
    );
    expect(result.rows).toEqual([{ step: 1 }]);
  } finally {
    await pool.query("drop table if exists lifecycle_migration_order");
    await pool.end();
    await rm(migrationsDirectory, { recursive: true, force: true });
  }
});
