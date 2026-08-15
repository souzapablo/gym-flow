import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { Pool } from "pg";
import type { TestProject } from "vitest/node";

const POSTGRES_IMAGE = "postgres:18-alpine";
const TEST_DATABASE_NAME = "gym_flow_test";

export async function applyMigrations(
  pool: Pool,
  migrationsDirectory: string,
) {
  const migrationFiles = (await readdir(migrationsDirectory))
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort((left, right) => left.localeCompare(right));

  for (const fileName of migrationFiles) {
    const migrationPath = resolve(migrationsDirectory, fileName);
    const migrationSql = await readFile(migrationPath, "utf8");

    try {
      await pool.query(migrationSql);
    } catch (cause) {
      throw new Error(`Failed to apply migration ${fileName}`, { cause });
    }
  }
}

export default async function setupDatabaseProject(project: TestProject) {
  const container = await new PostgreSqlContainer(POSTGRES_IMAGE)
    .withDatabase(TEST_DATABASE_NAME)
    .start();
  const databaseUri = container.getConnectionUri();
  const pool = new Pool({ connectionString: databaseUri });

  try {
    await applyMigrations(pool, resolve(process.cwd(), "migrations"));
    project.provide("databaseUri", databaseUri);
  } catch (error) {
    await pool.end();
    await container.stop();
    throw error;
  }

  return async function teardownDatabaseProject() {
    await pool.end();
    await container.stop();
  };
}

declare module "vitest" {
  export interface ProvidedContext {
    databaseUri: string;
  }
}
