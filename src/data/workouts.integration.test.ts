import { afterAll, beforeEach, describe, expect, inject, it } from "vitest";

import { users } from "@/db/schema";
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
    const owner = await insertUser();
    const input = newWorkout();

    const created = await createWorkout(owner.id, input);

    expect(created).toEqual({
      ...input,
      id: expect.stringMatching(UUID_PATTERN),
      exercises: input.exercises.map((exercise) => ({
        ...exercise,
        id: expect.stringMatching(UUID_PATTERN),
      })),
    });
    const persisted = await context.pool.query(
      "select owner_id, name, focus, color from workouts where id = $1",
      [created.id],
    );
    expect(persisted.rows).toEqual([
      {
        owner_id: owner.id,
        name: input.name,
        focus: input.focus,
        color: input.color,
      },
    ]);
  });

  it("persists every exercise in input order", async () => {
    const owner = await insertUser();
    const input = newWorkout();

    const created = await createWorkout(owner.id, input);

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
    const owner = await insertUser();
    await createWorkout(owner.id, newWorkout());

    await expect(
      createWorkout(owner.id, {
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
});

describe("listWorkouts", () => {
  it("maps workouts and orders their exercises by position", async () => {
    const owner = await insertUser();
    const workout = buildWorkoutFixture({
      exercises: [
        {
          id: "10000000-0000-4000-8000-000000000002",
          name: "Bench press",
          sets: 4,
          targetReps: 6,
          position: 1,
        },
        {
          id: "10000000-0000-4000-8000-000000000001",
          name: "Back squat",
          sets: 3,
          targetReps: 8,
          position: 0,
        },
      ],
    });
    await insertWorkout(workout);

    await expect(listWorkouts(owner.id)).resolves.toEqual([
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
    const owner = await insertUser();
    const older = buildWorkoutFixture({ name: "Older" });
    const newer = buildWorkoutFixture({
      id: "20000000-0000-4000-8000-000000000002",
      name: "Newer",
      color: "pink",
      exercises: [
        {
          id: "10000000-0000-4000-8000-000000000002",
          name: "Deadlift",
          sets: 2,
          targetReps: 5,
          position: 0,
        },
      ],
    });
    await insertWorkout(newer, "2026-08-15T12:00:00.000Z");
    await insertWorkout(older, "2026-08-14T12:00:00.000Z");

    const listed = await listWorkouts(owner.id);

    expect(listed.map((workout) => workout.name)).toEqual(["Older", "Newer"]);
  });

  it("returns only workouts owned by the requested user", async () => {
    const owner = await insertUser();
    const otherOwner = await insertUser({ id: "other-user", name: "Other" });
    await insertWorkout(buildWorkoutFixture());
    await insertWorkout(
      buildWorkoutFixture({
        id: "20000000-0000-4000-8000-000000000002",
        ownerId: otherOwner.id,
        color: "pink",
        exercises: [
          {
            id: "10000000-0000-4000-8000-000000000002",
            name: "Deadlift",
            sets: 2,
            targetReps: 5,
            position: 0,
          },
        ],
      }),
    );

    const listed = await listWorkouts(owner.id);

    expect(listed.map((workout) => workout.id)).toEqual([
      "20000000-0000-4000-8000-000000000001",
    ]);
  });

  it("returns an empty array when the owner has no workouts", async () => {
    const owner = await insertUser();

    await expect(listWorkouts(owner.id)).resolves.toEqual([]);
  });
});

describe("saveWorkoutSession", () => {
  it("persists the session and every completed set", async () => {
    const owner = await insertUser();
    const workout = twoExerciseWorkout();
    await insertWorkout(workout);
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

    await saveWorkoutSession(owner.id, session);

    const persistedSession = await context.pool.query(
      "select workout_id::text, owner_id, feedback from workout_sessions",
    );
    expect(persistedSession.rows).toEqual([
      {
        workout_id: workout.id,
        owner_id: owner.id,
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
    const owner = await insertUser();
    const workout = buildWorkoutFixture();
    await insertWorkout(workout);

    await saveWorkoutSession(owner.id, {
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
    const owner = await insertUser();

    await expect(
      saveWorkoutSession(owner.id, {
        workoutId: "20000000-0000-4000-8000-000000000099",
        feedback: null,
        sets: [
          {
            exercise_id: "10000000-0000-4000-8000-000000000099",
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
    const owner = await insertUser();
    const workout = buildWorkoutFixture();
    await insertWorkout(workout);

    await expect(
      saveWorkoutSession(owner.id, {
        workoutId: workout.id,
        feedback: null,
        sets: [
          {
            exercise_id: "10000000-0000-4000-8000-000000000099",
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
    const owner = await insertUser();
    const workout = buildWorkoutFixture();
    const otherWorkout = buildWorkoutFixture({
      id: "20000000-0000-4000-8000-000000000002",
      color: "pink",
      exercises: [
        {
          id: "10000000-0000-4000-8000-000000000002",
          name: "Deadlift",
          sets: 2,
          targetReps: 5,
          position: 0,
        },
      ],
    });
    await insertWorkout(workout);
    await insertWorkout(otherWorkout);

    await expect(
      saveWorkoutSession(owner.id, {
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
    const owner = await insertUser();
    const workout = buildWorkoutFixture();
    await insertWorkout(workout);
    await insertCompletedSession({
      id: "30000000-0000-4000-8000-000000000001",
      workoutId: workout.id,
      ownerId: owner.id,
      completedAt: "2026-08-14T12:00:00.000Z",
    });
    await insertCompletedSession({
      id: "30000000-0000-4000-8000-000000000002",
      workoutId: workout.id,
      ownerId: owner.id,
      completedAt: "2026-08-15T12:00:00.000Z",
    });

    await expect(listCompletedWorkouts(owner.id)).resolves.toEqual([
      {
        id: "30000000-0000-4000-8000-000000000002",
        workoutId: workout.id,
        workoutName: workout.name,
        color: workout.color,
        completedAt: "2026-08-15 12:00:00+00",
      },
      {
        id: "30000000-0000-4000-8000-000000000001",
        workoutId: workout.id,
        workoutName: workout.name,
        color: workout.color,
        completedAt: "2026-08-14 12:00:00+00",
      },
    ]);
  });

  it("returns only completed workouts owned by the requested user", async () => {
    const owner = await insertUser();
    const otherOwner = await insertUser({ id: "other-user", name: "Other" });
    const workout = buildWorkoutFixture();
    const otherWorkout = buildWorkoutFixture({
      id: "20000000-0000-4000-8000-000000000002",
      ownerId: otherOwner.id,
      color: "pink",
      exercises: [
        {
          id: "10000000-0000-4000-8000-000000000002",
          name: "Deadlift",
          sets: 2,
          targetReps: 5,
          position: 0,
        },
      ],
    });
    await insertWorkout(workout);
    await insertWorkout(otherWorkout);
    await insertCompletedSession({
      id: "30000000-0000-4000-8000-000000000001",
      workoutId: workout.id,
      ownerId: owner.id,
    });
    await insertCompletedSession({
      id: "30000000-0000-4000-8000-000000000002",
      workoutId: otherWorkout.id,
      ownerId: otherOwner.id,
    });

    const completed = await listCompletedWorkouts(owner.id);

    expect(completed.map((session) => session.id)).toEqual([
      "30000000-0000-4000-8000-000000000001",
    ]);
  });

  it("returns an empty array when the owner has no completed workouts", async () => {
    const owner = await insertUser();

    await expect(listCompletedWorkouts(owner.id)).resolves.toEqual([]);
  });
});

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
        id: "10000000-0000-4000-8000-000000000001",
        name: "Back squat",
        sets: 3,
        targetReps: 8,
        position: 0,
      },
      {
        id: "10000000-0000-4000-8000-000000000002",
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

async function insertWorkout(
  workout = buildWorkoutFixture(),
  createdAt = "2026-08-15T12:00:00.000Z",
) {
  await context.pool.query(
    `insert into workouts (id, owner_id, name, focus, color, created_at)
     values ($1, $2, $3, $4, $5, $6)`,
    [
      workout.id,
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
  ownerId,
  completedAt = "2026-08-15T12:00:00.000Z",
}: {
  id: string;
  workoutId: string;
  ownerId: string;
  completedAt?: string;
}) {
  await context.pool.query(
    `insert into workout_sessions
      (id, workout_id, owner_id, completed_at)
     values ($1, $2, $3, $4)`,
    [id, workoutId, ownerId, completedAt],
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
