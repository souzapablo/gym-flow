import { afterAll, beforeEach, describe, expect, inject, it, vi } from "vitest";

import { revalidatePath } from "next/cache";
import { users } from "@/db/schema";
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

import { createWorkoutAction, saveWorkoutSessionAction } from "./actions";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const databaseUri = inject("databaseUri");
const proof: TestDatabaseProof = {
  databaseName: "gym_flow_test",
  suiteId: "actions-integration-suite",
  connectionUri: databaseUri,
};
const context = createTestDatabase(databaseUri);
const revalidatePathMock = vi.mocked(revalidatePath);

beforeEach(async () => {
  revalidatePathMock.mockClear();
  await resetTestDatabase(context.pool, proof);
});

afterAll(async () => {
  await closeTestDatabase();
  await context.close();
});

describe("createWorkoutAction", () => {
  it("validates, resolves the current owner, persists, returns, and revalidates", async () => {
    await insertUser();

    const created = await createWorkoutAction({
      name: "  Strength day  ",
      focus: "  Lower body  ",
      color: "yellow",
      exercises: [{ name: "  Back squat  ", sets: 3, targetReps: 8 }],
    });

    expect(created).toEqual({
      id: expect.stringMatching(UUID_PATTERN),
      name: "Strength day",
      focus: "Lower body",
      color: "yellow",
      exercises: [
        {
          id: expect.stringMatching(UUID_PATTERN),
          name: "Back squat",
          sets: 3,
          targetReps: 8,
        },
      ],
    });
    const persisted = await context.pool.query(
      `select w.owner_id, w.name, w.focus, w.color, e.name as exercise_name
       from workouts w join exercises e on e.workout_id = w.id`,
    );
    expect(persisted.rows).toEqual([
      {
        owner_id: "local-user",
        name: "Strength day",
        focus: "Lower body",
        color: "yellow",
        exercise_name: "Back squat",
      },
    ]);
    expect(revalidatePathMock).toHaveBeenCalledOnce();
    expect(revalidatePathMock).toHaveBeenCalledWith("/");
  });

  it("rejects invalid input without persistence or revalidation", async () => {
    await insertUser();

    await expect(
      createWorkoutAction({
        name: "",
        focus: "Lower body",
        color: "yellow",
        exercises: [{ name: "Squat", sets: 3, targetReps: 8 }],
      }),
    ).rejects.toThrowError("Workout name is invalid");
    await expect(mutationCounts()).resolves.toEqual({
      workouts: 0,
      exercises: 0,
      sessions: 0,
      sets: 0,
    });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("rejects when the current owner is missing without persistence or revalidation", async () => {
    await expect(
      createWorkoutAction({
        name: "Strength day",
        focus: "Lower body",
        color: "yellow",
        exercises: [{ name: "Squat", sets: 3, targetReps: 8 }],
      }),
    ).rejects.toThrowError("Current user not found");
    await expect(mutationCounts()).resolves.toEqual({
      workouts: 0,
      exercises: 0,
      sessions: 0,
      sets: 0,
    });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});

describe("saveWorkoutSessionAction", () => {
  it("validates, resolves the current owner, persists, returns, and revalidates", async () => {
    await insertUser();
    const workout = buildWorkoutFixture();
    await insertWorkout(workout);

    const result = await saveWorkoutSessionAction({
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
      ],
    });

    expect(result).toBeUndefined();
    const persisted = await context.pool.query(
      `select s.owner_id, s.feedback, cs.weight, cs.reps, cs.load_rating
       from workout_sessions s
       join completed_sets cs on cs.session_id = s.id`,
    );
    expect(persisted.rows).toEqual([
      {
        owner_id: "local-user",
        feedback: "Na medida",
        weight: "80.00",
        reps: 8,
        load_rating: "Ideal",
      },
    ]);
    expect(revalidatePathMock).toHaveBeenCalledOnce();
    expect(revalidatePathMock).toHaveBeenCalledWith("/");
  });

  it("rejects invalid input without partial persistence or revalidation", async () => {
    await insertUser();
    const workout = buildWorkoutFixture();
    await insertWorkout(workout);

    await expect(
      saveWorkoutSessionAction({
        workoutId: workout.id,
        feedback: null,
        sets: [
          {
            exercise_id: workout.exercises[0].id,
            set_number: 1,
            weight: null,
            reps: 0,
            load_rating: null,
          },
        ],
      }),
    ).rejects.toThrowError("Completed reps is invalid");
    await expect(mutationCounts()).resolves.toEqual({
      workouts: 1,
      exercises: 1,
      sessions: 0,
      sets: 0,
    });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("rejects a workout owned by another user without partial persistence or revalidation", async () => {
    await insertUser();
    const otherOwner = await insertUser({ id: "other-user", name: "Other" });
    const workout = buildWorkoutFixture({ ownerId: otherOwner.id });
    await insertWorkout(workout);

    await expect(
      saveWorkoutSessionAction({
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
      }),
    ).rejects.toThrowError("Workout not found or access denied");
    await expect(mutationCounts()).resolves.toEqual({
      workouts: 1,
      exercises: 1,
      sessions: 0,
      sets: 0,
    });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function insertUser(overrides = {}) {
  const user = buildUserFixture(overrides);
  await context.database.insert(users).values(user);
  return user;
}

async function insertWorkout(workout = buildWorkoutFixture()) {
  await context.pool.query(
    `insert into workouts (id, owner_id, name, focus, color)
     values ($1, $2, $3, $4, $5)`,
    [workout.id, workout.ownerId, workout.name, workout.focus, workout.color],
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

async function mutationCounts() {
  const result = await context.pool.query<{
    workouts: string;
    exercises: string;
    sessions: string;
    sets: string;
  }>(`
    select
      (select count(*) from workouts) as workouts,
      (select count(*) from exercises) as exercises,
      (select count(*) from workout_sessions) as sessions,
      (select count(*) from completed_sets) as sets
  `);
  return {
    workouts: Number(result.rows[0].workouts),
    exercises: Number(result.rows[0].exercises),
    sessions: Number(result.rows[0].sessions),
    sets: Number(result.rows[0].sets),
  };
}
