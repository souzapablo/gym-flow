import { Pool } from "pg";

import { resetTestDatabase, type TestDatabaseProof } from "../database/reset";
import { buildUserFixture } from "../factories/user";
import { buildWorkoutFixture } from "../factories/workout";

const connectionUri = process.env.GYM_FLOW_E2E_DATABASE_URL;
const suiteId = process.env.GYM_FLOW_E2E_SUITE_ID;
const sessionToken = process.env.GYM_FLOW_E2E_SESSION_TOKEN;

if (!connectionUri || !suiteId || !sessionToken) {
  throw new Error("E2E database helpers require the lifecycle runner");
}

export const e2ePool = new Pool({ connectionString: connectionUri });

const proof: TestDatabaseProof = {
  databaseName: "gym_flow_test",
  suiteId,
  connectionUri,
};

export async function seedWorkoutScenario({ multiGym = false } = {}) {
  await resetTestDatabase(e2ePool, proof);

  const user = buildUserFixture();
  const workout = buildWorkoutFixture({
    exercises: [
      {
        id: "10000000-0000-7000-8000-000000000001",
        name: "Agachamento livre",
        sets: 1,
        targetReps: 8,
        position: 0,
      },
    ],
  });

  await e2ePool.query("begin");
  let gymId: string;
  try {
    await e2ePool.query(
      `insert into users (id, name, email, email_normalized, email_verified)
       values ($1, $2, $3, $3, true)`,
      [user.id, user.name, user.email],
    );
    const gym = await e2ePool.query<{ id: string }>(
      "insert into gyms (name, owner_user_id) values ('Main gym', $1) returning id::text",
      [user.id],
    );
    gymId = gym.rows[0].id;
    const membership = await e2ePool.query<{ id: string }>(
      `insert into memberships (gym_id, user_id, role, status)
       values ($1, $2, 'owner', 'active') returning id::text`,
      [gymId, user.id],
    );
    if (multiGym) {
      const secondGym = await e2ePool.query<{ id: string }>(
        "insert into gyms (name, owner_user_id) values ('Second gym', $1) returning id::text",
        [user.id],
      );
      await e2ePool.query(
        `insert into memberships (gym_id, user_id, role, status)
         values ($1, $2, 'owner', 'active')`,
        [secondGym.rows[0].id, user.id],
      );
    } else {
      await e2ePool.query(
        `insert into active_gym_selections (user_id, gym_id, membership_id)
         values ($1, $2, $3)`,
        [user.id, gymId, membership.rows[0].id],
      );
    }
    await e2ePool.query(
      `insert into sessions (user_id, token, expires_at)
       values ($2, $1, now() + interval '1 day')`,
      [sessionToken, user.id],
    );
    await e2ePool.query(
      `insert into workouts (id, gym_id, created_by_user_id, name, focus, color)
       values ($1, $2, $3, $4, $5, $6)`,
      [
        workout.id,
        gymId,
        workout.ownerId,
        workout.name,
        workout.focus,
        workout.color,
      ],
    );
    await e2ePool.query("commit");
  } catch (error) {
    await e2ePool.query("rollback");
    throw error;
  }

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

  return { ...workout, gymId };
}
