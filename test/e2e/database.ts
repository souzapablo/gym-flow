import { randomUUID } from "node:crypto";

import { Pool } from "pg";

import { resetTestDatabase, type TestDatabaseProof } from "../database/reset";
import { buildUserFixture } from "../factories/user";
import { buildWorkoutFixture } from "../factories/workout";

const connectionUri = process.env.GYM_FLOW_E2E_DATABASE_URL;
const suiteId = process.env.GYM_FLOW_E2E_SUITE_ID;

if (!connectionUri || !suiteId) {
  throw new Error("E2E database helpers require the lifecycle runner");
}

export const e2ePool = new Pool({ connectionString: connectionUri });

const proof: TestDatabaseProof = {
  databaseName: "gym_flow_test",
  suiteId,
  connectionUri,
};

export async function seedWorkoutScenario() {
  await resetTestDatabase(e2ePool, proof);

  const user = buildUserFixture();
  const workout = buildWorkoutFixture({
    id: randomUUID(),
    exercises: [
      {
        id: randomUUID(),
        name: "Agachamento livre",
        sets: 1,
        targetReps: 8,
        position: 0,
      },
    ],
  });

  await e2ePool.query("insert into users (id, name) values ($1, $2)", [
    user.id,
    user.name,
  ]);
  await e2ePool.query(
    "insert into workouts (id, owner_id, name, focus, color) values ($1, $2, $3, $4, $5)",
    [workout.id, workout.ownerId, workout.name, workout.focus, workout.color],
  );

  for (const exercise of workout.exercises) {
    await e2ePool.query(
      "insert into exercises (id, workout_id, name, sets, target_reps, position) values ($1, $2, $3, $4, $5, $6)",
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

  return workout;
}
