import { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, expect, inject, it } from "vitest";

import { buildUserFixture } from "../factories/user";
import { buildWorkoutFixture } from "../factories/workout";
import { resetTestDatabase, type TestDatabaseProof } from "./reset";

const originalDatabaseUrl = process.env.DATABASE_URL;
const databaseUri = inject("databaseUri");
const proof: TestDatabaseProof = {
  databaseName: "gym_flow_test",
  suiteId: "reset-integration-suite",
  connectionUri: databaseUri,
};

let pool: Pool;

beforeAll(() => {
  pool = new Pool({ connectionString: databaseUri });
});

beforeEach(async () => {
  delete process.env.DATABASE_URL;
  await resetTestDatabase(pool, proof);
});

afterAll(async () => {
  if (originalDatabaseUrl === undefined) {
    delete process.env.DATABASE_URL;
  } else {
    process.env.DATABASE_URL = originalDatabaseUrl;
  }

  await pool.end();
});

it("refuses reset without the suite proof and preserves data", async () => {
  await insertWorkoutFixture(pool);

  await expect(
    resetTestDatabase(pool, { ...proof, suiteId: "" }),
  ).rejects.toThrowError("Database reset requires a non-empty suite proof");
  await expect(workoutCount(pool)).resolves.toBe(1);
});

it("refuses reset unless the proof targets the suite database", async () => {
  await insertWorkoutFixture(pool);

  await expect(
    resetTestDatabase(pool, { ...proof, connectionUri: "not-a-url" }),
  ).rejects.toThrowError("Database reset requires a valid connection URI");
  await expect(
    resetTestDatabase(pool, {
      ...proof,
      databaseName: "gym_flow_dev" as "gym_flow_test",
    }),
  ).rejects.toThrowError("Database reset is restricted to gym_flow_test");
  await expect(
    resetTestDatabase(pool, {
      ...proof,
      connectionUri: databaseUri.replace("/gym_flow_test", "/gym_flow_dev"),
    }),
  ).rejects.toThrowError("Database reset is restricted to gym_flow_test");
  const mismatchedUri = new URL(databaseUri);
  mismatchedUri.port = String(Number(mismatchedUri.port) + 1);
  await expect(
    resetTestDatabase(pool, {
      ...proof,
      connectionUri: mismatchedUri.toString(),
    }),
  ).rejects.toThrowError("Database reset proof does not match the pool target");
  await expect(workoutCount(pool)).resolves.toBe(1);
});

it("refuses reset when the target matches DATABASE_URL", async () => {
  await insertWorkoutFixture(pool);
  process.env.DATABASE_URL = databaseUri;

  await expect(resetTestDatabase(pool, proof)).rejects.toThrowError(
    "Database reset target matches DATABASE_URL",
  );
  await expect(workoutCount(pool)).resolves.toBe(1);
});

it("truncates all mutable tables and accepts valid fixture defaults", async () => {
  await insertCompleteSessionFixture(pool);

  await resetTestDatabase(pool, proof);

  const emptyCounts = await mutableTableCounts(pool);
  expect(emptyCounts).toEqual({
    completedSets: 0,
    exercises: 0,
    users: 0,
    workoutSessions: 0,
    workouts: 0,
  });

  const inserted = await insertWorkoutFixture(pool);
  const result = await pool.query(
    `select w.name, w.focus, w.color, e.name as exercise_name,
            e.sets, e.target_reps, e.position
     from workouts w
     join exercises e on e.workout_id = w.id
     where w.id = $1`,
    [inserted.workout.id],
  );
  expect(result.rows).toEqual([
    {
      color: inserted.workout.color,
      exercise_name: inserted.workout.exercises[0].name,
      focus: inserted.workout.focus,
      name: inserted.workout.name,
      position: inserted.workout.exercises[0].position,
      sets: inserted.workout.exercises[0].sets,
      target_reps: inserted.workout.exercises[0].targetReps,
    },
  ]);
});

async function insertWorkoutFixture(pool: Pool) {
  const user = buildUserFixture();
  const workout = buildWorkoutFixture();

  await pool.query("insert into users (id, name) values ($1, $2)", [
    user.id,
    user.name,
  ]);
  await pool.query(
    "insert into workouts (id, owner_id, name, focus, color) values ($1, $2, $3, $4, $5)",
    [workout.id, workout.ownerId, workout.name, workout.focus, workout.color],
  );

  for (const exercise of workout.exercises) {
    await pool.query(
      `insert into exercises
        (id, workout_id, name, sets, target_reps, position)
       values ($1, $2, $3, $4, $5, $6)`,
      [
        exercise.id,
        workout.id,
        exercise.name,
        exercise.sets,
        exercise.targetReps,
        exercise.position,
      ],
    );
  }

  return { user, workout };
}

async function insertCompleteSessionFixture(pool: Pool) {
  const fixtures = await insertWorkoutFixture(pool);
  const sessionId = "30000000-0000-4000-8000-000000000001";

  await pool.query(
    `insert into workout_sessions (id, workout_id, owner_id, feedback)
     values ($1, $2, $3, $4)`,
    [sessionId, fixtures.workout.id, fixtures.user.id, "Good session"],
  );
  await pool.query(
    `insert into completed_sets
      (id, session_id, exercise_id, set_number, weight, reps, load_rating)
     values ($1, $2, $3, $4, $5, $6, $7)`,
    [
      "40000000-0000-4000-8000-000000000001",
      sessionId,
      fixtures.workout.exercises[0].id,
      1,
      80,
      8,
      "right",
    ],
  );

  return fixtures;
}

async function workoutCount(pool: Pool) {
  const result = await pool.query<{ count: string }>(
    "select count(*) from workouts",
  );
  return Number(result.rows[0].count);
}

async function mutableTableCounts(pool: Pool) {
  const result = await pool.query<{
    completed_sets: string;
    exercises: string;
    users: string;
    workout_sessions: string;
    workouts: string;
  }>(`
    select
      (select count(*) from completed_sets) as completed_sets,
      (select count(*) from exercises) as exercises,
      (select count(*) from users) as users,
      (select count(*) from workout_sessions) as workout_sessions,
      (select count(*) from workouts) as workouts
  `);
  const counts = result.rows[0];

  return {
    completedSets: Number(counts.completed_sets),
    exercises: Number(counts.exercises),
    users: Number(counts.users),
    workoutSessions: Number(counts.workout_sessions),
    workouts: Number(counts.workouts),
  };
}
