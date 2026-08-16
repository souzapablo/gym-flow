import { afterAll, beforeEach, describe, expect, inject, it, vi } from "vitest";
import { eq } from "drizzle-orm";

import { revalidatePath } from "next/cache";
import { gyms, memberships, users } from "@/db/schema";
import { requireVerifiedIdentity } from "@/modules/identity/account";
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
  createWorkoutAction,
  saveWorkoutSessionAction,
  selectActiveGymAction,
} from "./actions";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/modules/identity/account", () => ({
  requireVerifiedIdentity: vi.fn(),
}));

const databaseUri = inject("databaseUri");
const proof: TestDatabaseProof = {
  databaseName: "gym_flow_test",
  suiteId: "actions-integration-suite",
  connectionUri: databaseUri,
};
const context = createTestDatabase(databaseUri);
const revalidatePathMock = vi.mocked(revalidatePath);
const requireVerifiedIdentityMock = vi.mocked(requireVerifiedIdentity);

beforeEach(async () => {
  revalidatePathMock.mockClear();
  requireVerifiedIdentityMock.mockResolvedValue({
    userId: "70000000-0000-7000-8000-000000000001",
    email: "local@example.com",
  });
  await resetTestDatabase(context.pool, proof);
});

afterAll(async () => {
  await closeTestDatabase();
  await context.close();
});

describe("createWorkoutAction", () => {
  it("validates, resolves the current owner, persists, returns, and revalidates", async () => {
    const gym = await insertGymContext();

    const created = await createWorkoutAction({
      gymId: "20000000-0000-7000-8000-000000000099",
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
      `select w.gym_id::text, w.created_by_user_id, w.name, w.focus, w.color, e.name as exercise_name
       from workouts w join exercises e on e.workout_id = w.id`,
    );
    expect(persisted.rows).toEqual([
      {
        gym_id: gym.gymId,
        created_by_user_id: "70000000-0000-7000-8000-000000000001",
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
    await insertGymContext();

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

  it("rejects when verified identity is missing without persistence or revalidation", async () => {
    requireVerifiedIdentityMock.mockRejectedValue(
      new Error("Authentication is required"),
    );
    await expect(
      createWorkoutAction({
        name: "Strength day",
        focus: "Lower body",
        color: "yellow",
        exercises: [{ name: "Squat", sets: 3, targetReps: 8 }],
      }),
    ).rejects.toThrowError("Authentication is required");
    await expect(mutationCounts()).resolves.toEqual({
      workouts: 0,
      exercises: 0,
      sessions: 0,
      sets: 0,
    });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("requires an explicit selection when multiple active gyms exist", async () => {
    await insertGymContext();
    await insertGymContext({ gymName: "Second gym", reuseUser: true });

    await expect(
      createWorkoutAction({
        name: "Strength day",
        focus: "Lower body",
        color: "yellow",
        exercises: [{ name: "Squat", sets: 3, targetReps: 8 }],
      }),
    ).rejects.toThrow("An active gym selection is required");
    await expect(mutationCounts()).resolves.toMatchObject({ workouts: 0 });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("rejects an inactive membership without persistence or revalidation", async () => {
    await insertUser();
    const owner = await insertUser({
      id: "70000000-0000-7000-8000-000000000002",
      name: "Other",
    });
    const gym = await insertGymContext({
      userId: owner.id,
      gymName: "Other gym",
      reuseUser: true,
    });
    const [membership] = await context.database
      .insert(memberships)
      .values({
        gymId: gym.gymId,
        userId: "70000000-0000-7000-8000-000000000001",
        role: "coach",
        status: "active",
      })
      .returning({ id: memberships.id });
    await context.database
      .update(memberships)
      .set({ status: "suspended" })
      .where(eq(memberships.id, membership.id));

    await expect(
      createWorkoutAction({
        name: "Strength day",
        focus: "Lower body",
        color: "yellow",
        exercises: [{ name: "Squat", sets: 3, targetReps: 8 }],
      }),
    ).rejects.toThrow("Gym access is forbidden");
    await expect(mutationCounts()).resolves.toMatchObject({ workouts: 0 });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});

describe("saveWorkoutSessionAction", () => {
  it("validates, resolves the current owner, persists, returns, and revalidates", async () => {
    const gym = await insertGymContext();
    const workout = buildWorkoutFixture();
    await insertWorkout(gym, workout);

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
      `select s.gym_id::text, s.created_by_user_id, s.feedback, cs.weight, cs.reps, cs.load_rating
       from workout_sessions s
       join completed_sets cs on cs.session_id = s.id`,
    );
    expect(persisted.rows).toEqual([
      {
        gym_id: gym.gymId,
        created_by_user_id: "70000000-0000-7000-8000-000000000001",
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
    const gym = await insertGymContext();
    const workout = buildWorkoutFixture();
    await insertWorkout(gym, workout);

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

  it("rejects a workout in another gym without partial persistence or revalidation", async () => {
    await insertGymContext();
    const otherOwner = await insertUser({
      id: "70000000-0000-7000-8000-000000000002",
      name: "Other",
    });
    const otherGym = await insertGymContext({
      userId: otherOwner.id,
      gymName: "Other gym",
      reuseUser: true,
    });
    const workout = buildWorkoutFixture({ ownerId: otherOwner.id });
    await insertWorkout(otherGym, workout);

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

describe("selectActiveGymAction", () => {
  it("persists an authorized selection and revalidates", async () => {
    const firstGym = await insertGymContext();
    const secondGym = await insertGymContext({
      gymName: "Second gym",
      reuseUser: true,
    });

    await selectActiveGymAction(secondGym.gymId);

    const selection = await context.pool.query(
      "select gym_id::text from active_gym_selections where user_id = $1",
      [firstGym.userId],
    );
    expect(selection.rows).toEqual([{ gym_id: secondGym.gymId }]);
    expect(revalidatePathMock).toHaveBeenCalledWith("/");
  });

  it.each(["not-a-uuid", "20000000-0000-7000-8000-000000000099"])(
    "rejects malformed or unknown gym %s without revalidation",
    async (gymId) => {
      await insertGymContext();

      await expect(selectActiveGymAction(gymId)).rejects.toThrow(
        "Gym access is forbidden",
      );
      expect(revalidatePathMock).not.toHaveBeenCalled();
    },
  );

  it("rejects an inactive membership without selection or revalidation", async () => {
    await insertUser();
    const owner = await insertUser({
      id: "70000000-0000-7000-8000-000000000002",
      name: "Other",
    });
    const gym = await insertGymContext({
      userId: owner.id,
      gymName: "Other gym",
      reuseUser: true,
    });
    await context.database.insert(memberships).values({
      gymId: gym.gymId,
      userId: "70000000-0000-7000-8000-000000000001",
      role: "coach",
      status: "suspended",
    });

    await expect(selectActiveGymAction(gym.gymId)).rejects.toThrow(
      "Gym access is forbidden",
    );
    const selection = await context.pool.query<{ count: string }>(
      "select count(*) from active_gym_selections where user_id = '70000000-0000-7000-8000-000000000001'",
    );
    expect(selection.rows[0].count).toBe("0");
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function insertUser(overrides = {}) {
  const user = buildUserFixture(overrides);
  await context.database.insert(users).values(user);
  return user;
}

async function insertGymContext({
  userId = "70000000-0000-7000-8000-000000000001",
  gymName = "Main gym",
  reuseUser = false,
}: {
  userId?: string;
  gymName?: string;
  reuseUser?: boolean;
} = {}) {
  if (!reuseUser) await insertUser({ id: userId });
  return context.database.transaction(async (transaction) => {
    const [gym] = await transaction
      .insert(gyms)
      .values({ name: gymName, ownerUserId: userId })
      .returning({ id: gyms.id });
    const [membership] = await transaction
      .insert(memberships)
      .values({ gymId: gym.id, userId, role: "owner", status: "active" })
      .returning({ id: memberships.id });
    return { userId, gymId: gym.id, membershipId: membership.id };
  });
}

async function insertWorkout(
  gymContext: { gymId: string },
  workout = buildWorkoutFixture(),
) {
  await context.pool.query(
    `insert into workouts (id, gym_id, created_by_user_id, name, focus, color)
     values ($1, $2, $3, $4, $5, $6)`,
    [
      workout.id,
      gymContext.gymId,
      workout.ownerId,
      workout.name,
      workout.focus,
      workout.color,
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
