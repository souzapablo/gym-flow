import type { Pool } from "pg";

export type TestDatabaseProof = {
  databaseName: "gym_flow_test";
  suiteId: string;
  connectionUri: string;
};

export async function resetTestDatabase(pool: Pool, proof: TestDatabaseProof) {
  if (!proof.suiteId.trim()) {
    throw new Error("Database reset requires a non-empty suite proof");
  }

  const proofDatabaseName = databaseNameFromUri(proof.connectionUri);

  if (
    proof.databaseName !== "gym_flow_test" ||
    proofDatabaseName !== "gym_flow_test"
  ) {
    throw new Error("Database reset is restricted to gym_flow_test");
  }

  if (pool.options.connectionString !== proof.connectionUri) {
    throw new Error("Database reset proof does not match the pool target");
  }

  const productionUri = process.env.DATABASE_URL;

  if (
    productionUri &&
    databaseTarget(productionUri) === databaseTarget(proof.connectionUri)
  ) {
    throw new Error("Database reset target matches DATABASE_URL");
  }

  await pool.query(`
    truncate table
      completed_sets,
      workout_sessions,
      exercises,
      workouts,
      users
    restart identity cascade
  `);
}

function databaseNameFromUri(connectionUri: string) {
  try {
    return decodeURIComponent(new URL(connectionUri).pathname.slice(1));
  } catch {
    throw new Error("Database reset requires a valid connection URI");
  }
}

function databaseTarget(connectionUri: string) {
  try {
    const url = new URL(connectionUri);
    return `${url.hostname.toLowerCase()}:${url.port || "5432"}${url.pathname}`;
  } catch {
    return connectionUri;
  }
}
