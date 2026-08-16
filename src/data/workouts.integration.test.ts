import { afterAll, beforeEach, describe, expect, inject, it } from "vitest";

import { gyms, memberships, users } from "@/db/schema";
import type { NewWorkout, WorkoutSession } from "@/lib/workout";
import {
  closeTestDatabase,
  createTestDatabase,
} from "../../test/database/client";
import {
  resetTestDatabase,
  type TestDatabaseProof,
} from "../../test/database/reset";
import { buildUserFixture } from "../../test/factories/user";
import { buildWorkoutFixture } from "../../test/factories/workout";

import {
  createWorkout,
  listCompletedWorkouts,
  listWorkouts,
  saveWorkoutSession,
} from "./workouts";

const databaseUri = inject("databaseUri");
const proof: TestDatabaseProof = {
  databaseName: "gym_flow_test",
  suiteId: "workouts-integration-suite",
  connectionUri: databaseUri,
};
const context = createTestDatabase(databaseUri);

beforeEach(async () => {
  await resetTestDatabase(context.pool, proof);
});

afterAll(async () => {
  await closeTestDatabase();
  await context.close();
});

describe("createWorkout", () => {
  it("returns generated ids and persists the mapped workout", async () => {
    const gymContext = await insertGymContext();
    const input = newWorkout();

    const created = await createWorkout(gymContext, input);

    expect(created).toEqual({
      ...input,
      id: expect.stringMatching(UUID_PATTERN),
      exercises: input.exercises.map((exercise) => ({
        ...exercise,
        id: expect.stringMatching(UUID_PATTERN),
      })),
    });
    const persisted = await context.pool.query(
      "select gym_id::text, created_by_user_id, name, focus, color from workouts where id = $1",
      [created.id],
    );
    expect(persisted.rows).toEqual([
      {
        gym_id: gymContext.gymId,
        created_by_user_id: gymContext.userId,
        name: input.name,
        focus: input.focus,
        color: input.color,
      },
    ]);
  });

  it("persists every exercise in input order", async () => {
    const gymContext = await insertGymContext();
    const input = newWorkout();

    const created = await createWorkout(gymContext, input);

    const persisted = await context.pool.query(
      `select id::text, name, sets, target_reps, position
       from exercises where workout_id = $1 order by position`,
      [created.id],
    );
    expect(persisted.rows).toEqual(
      created.exercises.map((exercise, position) => ({
        id: exercise.id,
        name: exercise.name,
        sets: exercise.sets,
        target_reps: exercise.targetReps,
        position,
      })),
    );
  });

  it("rolls back a duplicate owner and color without partial rows", async () => {
    const gymContext = await insertGymContext();
    await createWorkout(gymContext, newWorkout());

    await expect(
      createWorkout(gymContext, {
        ...newWorkout(),
        name: "Duplicate color",
      }),
    ).rejects.toThrow();

    const counts = await context.pool.query<{
      workouts: string;
      exercises: string;
    }>(`
      select
        (select count(*) from workouts) as workouts,
        (select count(*) from exercises) as exercises
    `);
    expect(counts.rows[0]).toEqual({ workouts: "1", exercises: "2" });
  });

  it("rejects creation without a valid gym relationship", async () => {
    const creator = await insertUser();

    await expect(
      context.pool.query(
        `insert into workouts (gym_id, created_by_user_id, name, focus, color)
         values ($1, $2, 'Strength day', 'Lower body', 'yellow')`,
        ["50000000-0000-7000-8000-000000000099", creator.id],
      ),
    ).rejects.toMatchObject({ code: "23503" });
  });
});

describe("listWorkouts", () => {
  it("maps workouts and orders their exercises by position", async () => {
    const gymContext = await insertGymContext();
    const workout = buildWorkoutFixture({
      exercises: [
        {
          id: "10000000-0000-7000-8000-000000000002",
          name: "Bench press",
          sets: 4,
          targetReps: 6,
          position: 1,
        },
        {
          id: "10000000-0000-7000-8000-000000000001",
          name: "Back squat",
          sets: 3,
          targetReps: 8,
          position: 0,
        },
      ],
    });
    await insertWorkout(gymContext, workout);

    await expect(listWorkouts(gymContext)).resolves.toEqual([
      {
        id: workout.id,
        name: workout.name,
        focus: workout.focus,
        color: workout.color,
        exercises: [
          {
            id: workout.exercises[1].id,
            name: "Back squat",
            sets: 3,
            targetReps: 8,
          },
          {
            id: workout.exercises[0].id,
            name: "Bench press",
            sets: 4,
            targetReps: 6,
          },
        ],
      },
    ]);
  });

  it("orders workouts from oldest to newest", async () => {
    const gymContext = await insertGymContext();
    const older = buildWorkoutFixture({ name: "Older" });
    const newer = buildWorkoutFixture({
      id: "20000000-0000-7000-8000-000000000002",
      name: "Newer",
      color: "pink",
      exercises: [
        {
          id: "10000000-0000-7000-8000-000000000002",
          name: "Deadlift",
          sets: 2,
          targetReps: 5,
          position: 0,
        },
      ],
    });
    await insertWorkout(gymContext, newer, "2026-08-15T12:00:00.000Z");
    await insertWorkout(gymContext, older, "2026-08-14T12:00:00.000Z");

    const listed = await listWorkouts(gymContext);

    expect(listed.map((workout) => workout.name)).toEqual(["Older", "Newer"]);
  });

  it("returns all gym workouts regardless of creator and excludes another gym", async () => {
    const gymContext = await insertGymContext();
    const otherCreator = await insertUser({
      id: "70000000-0000-7000-8000-000000000002",
      name: "Other",
    });
    const otherGymContext = await insertGymContext({
      userId: otherCreator.id,
      gymName: "Other gym",
    });
    await insertWorkout(gymContext, buildWorkoutFixture());
    await insertWorkout(
      gymContext,
      buildWorkoutFixture({
        id: "20000000-0000-7000-8000-000000000002",
        ownerId: otherCreator.id,
        color: "pink",
        exercises: [
          {
            id: "10000000-0000-7000-8000-000000000002",
            name: "Deadlift",
            sets: 2,
            targetReps: 5,
            position: 0,
          },
        ],
      }),
    );
    await insertWorkout(
      otherGymContext,
      buildWorkoutFixture({
        id: "20000000-0000-7000-8000-000000000003",
        ownerId: otherCreator.id,
        color: "blue",
        exercises: [
          {
            id: "10000000-0000-7000-8000-000000000003",
            name: "Press",
            sets: 3,
            targetReps: 8,
            position: 0,
          },
        ],
      }),
    );

    const listed = await listWorkouts(gymContext);

    expect(listed.map((workout) => workout.id)).toEqual([
      "20000000-0000-7000-8000-000000000001",
      "20000000-0000-7000-8000-000000000002",
    ]);
  });

  it("returns an empty array when the owner has no workouts", async () => {
    const gymContext = await insertGymContext();

    await expect(listWorkouts(gymContext)).resolves.toEqual([]);
  });
});

describe("saveWorkoutSession", () => {
  it("persists the session and every completed set", async () => {
    const gymContext = await insertGymContext();
    const workout = twoExerciseWorkout();
    await insertWorkout(gymContext, workout);
    const session: WorkoutSession = {
      workoutId: workout.id,
      feedback: "Na medida",
      sets: [
        {
          exercise_id: workout.exercises[0].id,
          set_number: 1,
          weight: 80,
          reps: 8,
          load_rating: "Ideal",
        },
        {
          exercise_id: workout.exercises[1].id,
          set_number: 1,
          weight: 120.5,
          reps: 5,
          load_rating: "Pesada",
        },
      ],
    };

    await saveWorkoutSession(gymContext, session);

    const persistedSession = await context.pool.query(
      "select gym_id::text, workout_id::text, created_by_user_id, feedback from workout_sessions",
    );
    expect(persistedSession.rows).toEqual([
      {
        workout_id: workout.id,
        gym_id: gymContext.gymId,
        created_by_user_id: gymContext.userId,
        feedback: "Na medida",
      },
    ]);
    const persistedSets = await context.pool.query(
      `select exercise_id::text, set_number, weight, reps, load_rating
       from completed_sets order by exercise_id`,
    );
    expect(persistedSets.rows).toEqual([
      {
        exercise_id: workout.exercises[0].id,
        set_number: 1,
        weight: "80.00",
        reps: 8,
        load_rating: "Ideal",
      },
      {
        exercise_id: workout.exercises[1].id,
        set_number: 1,
        weight: "120.50",
        reps: 5,
        load_rating: "Pesada",
      },
    ]);
  });

  it("preserves nullable feedback, weight, and load rating", async () => {
    const gymContext = await insertGymContext();
    const workout = buildWorkoutFixture();
    await insertWorkout(gymContext, workout);

    await saveWorkoutSession(gymContext, {
      workoutId: workout.id,
      feedback: null,
      sets: [
        {
          exercise_id: workout.exercises[0].id,
          set_number: 1,
          weight: null,
          reps: 8,
          load_rating: null,
        },
      ],
    });

    const result = await context.pool.query(
      `select s.feedback, cs.weight, cs.load_rating
       from workout_sessions s
       join completed_sets cs on cs.session_id = s.id`,
    );
    expect(result.rows).toEqual([
      { feedback: null, weight: null, load_rating: null },
    ]);
  });

  it("rejects a foreign workout without partial persistence", async () => {
    const gymContext = await insertGymContext();
    const otherUser = await insertUser({
      id: "70000000-0000-7000-8000-000000000002",
      name: "Other",
    });
    const otherGymContext = await insertGymContext({
      userId: otherUser.id,
      gymName: "Other gym",
    });
    const otherWorkout = buildWorkoutFixture({
      id: "20000000-0000-7000-8000-000000000099",
      ownerId: otherUser.id,
    });
    await insertWorkout(otherGymContext, otherWorkout);

    await expect(
      saveWorkoutSession(gymContext, {
        workoutId: otherWorkout.id,
        feedback: null,
        sets: [
          {
            exercise_id: "10000000-0000-7000-8000-000000000099",
            set_number: 1,
            weight: null,
            reps: 8,
            load_rating: null,
          },
        ],
      }),
    ).rejects.toThrowError("Workout not found or access denied");
    await expect(sessionCounts()).resolves.toEqual({ sessions: 0, sets: 0 });
  });

  it("rejects a missing exercise without partial persistence", async () => {
    const gymContext = await insertGymContext();
    const workout = buildWorkoutFixture();
    await insertWorkout(gymContext, workout);

    await expect(
      saveWorkoutSession(gymContext, {
        workoutId: workout.id,
        feedback: null,
        sets: [
          {
            exercise_id: "10000000-0000-7000-8000-000000000099",
            set_number: 1,
            weight: null,
            reps: 8,
            load_rating: null,
          },
        ],
      }),
    ).rejects.toThrowError("Workout not found or access denied");
    await expect(sessionCounts()).resolves.toEqual({ sessions: 0, sets: 0 });
  });

  it("rejects an exercise from another workout without partial persistence", async () => {
    const gymContext = await insertGymContext();
    const workout = buildWorkoutFixture();
    const otherWorkout = buildWorkoutFixture({
      id: "20000000-0000-7000-8000-000000000002",
      color: "pink",
      exercises: [
        {
          id: "10000000-0000-7000-8000-000000000002",
          name: "Deadlift",
          sets: 2,
          targetReps: 5,
          position: 0,
        },
      ],
    });
    await insertWorkout(gymContext, workout);
    await insertWorkout(gymContext, otherWorkout);

    await expect(
      saveWorkoutSession(gymContext, {
        workoutId: workout.id,
        feedback: null,
        sets: [
          {
            exercise_id: workout.exercises[0].id,
            set_number: 1,
            weight: null,
            reps: 8,
            load_rating: null,
          },
          {
            exercise_id: otherWorkout.exercises[0].id,
            set_number: 1,
            weight: null,
            reps: 5,
            load_rating: null,
          },
        ],
      }),
    ).rejects.toThrowError("Workout not found or access denied");
    await expect(sessionCounts()).resolves.toEqual({ sessions: 0, sets: 0 });
  });
});

describe("listCompletedWorkouts", () => {
  it("maps completed workouts newest first", async () => {
    const gymContext = await insertGymContext();
    const workout = buildWorkoutFixture();
    await insertWorkout(gymContext, workout);
    await insertCompletedSession({
      id: "30000000-0000-7000-8000-000000000001",
      workoutId: workout.id,
      gymContext,
      completedAt: "2026-08-14T12:00:00.000Z",
    });
    await insertCompletedSession({
      id: "30000000-0000-7000-8000-000000000002",
      workoutId: workout.id,
      gymContext,
      completedAt: "2026-08-15T12:00:00.000Z",
    });

    await expect(listCompletedWorkouts(gymContext)).resolves.toEqual([
      {
        id: "30000000-0000-7000-8000-000000000002",
        workoutId: workout.id,
        workoutName: workout.name,
        color: workout.color,
        completedAt: "2026-08-15 12:00:00+00",
      },
      {
        id: "30000000-0000-7000-8000-000000000001",
        workoutId: workout.id,
        workoutName: workout.name,
        color: workout.color,
        completedAt: "2026-08-14 12:00:00+00",
      },
    ]);
  });

  it("returns gym history regardless of creator and excludes another gym", async () => {
    const gymContext = await insertGymContext();
    const otherOwner = await insertUser({
      id: "70000000-0000-7000-8000-000000000002",
      name: "Other",
    });
    const otherGymContext = await insertGymContext({
      userId: otherOwner.id,
      gymName: "Other gym",
    });
    const workout = buildWorkoutFixture();
    const otherWorkout = buildWorkoutFixture({
      id: "20000000-0000-7000-8000-000000000002",
      ownerId: otherOwner.id,
      color: "pink",
      exercises: [
        {
          id: "10000000-0000-7000-8000-000000000002",
          name: "Deadlift",
          sets: 2,
          targetReps: 5,
          position: 0,
        },
      ],
    });
    await insertWorkout(gymContext, workout);
    await insertWorkout(otherGymContext, otherWorkout);
    await insertCompletedSession({
      id: "30000000-0000-7000-8000-000000000001",
      workoutId: workout.id,
      gymContext,
    });
    await insertCompletedSession({
      id: "30000000-0000-7000-8000-000000000002",
      workoutId: otherWorkout.id,
      gymContext: otherGymContext,
    });

    const completed = await listCompletedWorkouts(gymContext);

    expect(completed.map((session) => session.id)).toEqual([
      "30000000-0000-7000-8000-000000000001",
    ]);
  });

  it("returns an empty array when the owner has no completed workouts", async () => {
    const gymContext = await insertGymContext();

    await expect(listCompletedWorkouts(gymContext)).resolves.toEqual([]);
  });
});

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function newWorkout(): NewWorkout {
  return {
    name: "Strength day",
    focus: "Lower body",
    color: "yellow",
    exercises: [
      { name: "Back squat", sets: 3, targetReps: 8 },
      { name: "Romanian deadlift", sets: 3, targetReps: 10 },
    ],
  };
}

function twoExerciseWorkout() {
  return buildWorkoutFixture({
    exercises: [
      {
        id: "10000000-0000-7000-8000-000000000001",
        name: "Back squat",
        sets: 3,
        targetReps: 8,
        position: 0,
      },
      {
        id: "10000000-0000-7000-8000-000000000002",
        name: "Deadlift",
        sets: 2,
        targetReps: 5,
        position: 1,
      },
    ],
  });
}

async function insertUser(overrides = {}) {
  const user = buildUserFixture(overrides);
  await context.database.insert(users).values(user);
  return user;
}

async function insertGymContext({
  userId = "70000000-0000-7000-8000-000000000001",
  gymName = "Main gym",
}: {
  userId?: string;
  gymName?: string;
} = {}) {
  const user =
    userId === "70000000-0000-7000-8000-000000000001"
      ? await insertUser()
      : buildUserFixture({ id: userId });
  return context.database.transaction(async (transaction) => {
    const [gym] = await transaction
      .insert(gyms)
      .values({ name: gymName, ownerUserId: user.id })
      .returning({ id: gyms.id });
    const [membership] = await transaction
      .insert(memberships)
      .values({
        gymId: gym.id,
        userId: user.id,
        role: "owner",
        status: "active",
      })
      .returning({ id: memberships.id });
    return { userId: user.id, gymId: gym.id, membershipId: membership.id };
  });
}

async function insertWorkout(
  gymContext: { userId: string; gymId: string },
  workout = buildWorkoutFixture(),
  createdAt = "2026-08-15T12:00:00.000Z",
) {
  await context.pool.query(
    `insert into workouts (id, gym_id, created_by_user_id, name, focus, color, created_at)
     values ($1, $2, $3, $4, $5, $6, $7)`,
    [
      workout.id,
      gymContext.gymId,
      workout.ownerId,
      workout.name,
      workout.focus,
      workout.color,
      createdAt,
    ],
  );

  for (const exercise of workout.exercises) {
    await context.pool.query(
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
}

async function insertCompletedSession({
  id,
  workoutId,
  gymContext,
  completedAt = "2026-08-15T12:00:00.000Z",
}: {
  id: string;
  workoutId: string;
  gymContext: { userId: string; gymId: string };
  completedAt?: string;
}) {
  await context.pool.query(
    `insert into workout_sessions
      (id, gym_id, workout_id, created_by_user_id, completed_at)
     values ($1, $2, $3, $4, $5)`,
    [id, gymContext.gymId, workoutId, gymContext.userId, completedAt],
  );
}

async function sessionCounts() {
  const result = await context.pool.query<{ sessions: string; sets: string }>(`
    select
      (select count(*) from workout_sessions) as sessions,
      (select count(*) from completed_sets) as sets
  `);
  return {
    sessions: Number(result.rows[0].sessions),
    sets: Number(result.rows[0].sets),
  };
}
