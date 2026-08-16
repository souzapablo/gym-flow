import "server-only";

import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";

import { database } from "@/db/client";
import {
  completedSets,
  exercises,
  workoutSessions,
  workouts,
} from "@/db/schema";
import type {
  CompletedWorkout,
  MarkerColor,
  NewWorkout,
  Workout,
  WorkoutSession,
} from "@/lib/workout";
import type { GymContextDto } from "@/modules/gym-access";

type WorkoutRow = {
  workoutId: string;
  workoutName: string;
  focus: string;
  color: MarkerColor;
  exerciseId: string;
  exerciseName: string;
  sets: number;
  targetReps: number;
};

export async function listWorkouts(context: GymContextDto): Promise<Workout[]> {
  const rows: WorkoutRow[] = await database()
    .select({
      workoutId: workouts.id,
      workoutName: workouts.name,
      focus: workouts.focus,
      color: sql<MarkerColor>`${workouts.color}`,
      exerciseId: exercises.id,
      exerciseName: exercises.name,
      sets: exercises.sets,
      targetReps: exercises.targetReps,
    })
    .from(workouts)
    .innerJoin(exercises, eq(exercises.workoutId, workouts.id))
    .where(eq(workouts.gymId, context.gymId))
    .orderBy(asc(workouts.createdAt), asc(exercises.position));

  const mappedWorkouts = new Map<string, Workout>();

  for (const row of rows) {
    const workout: Workout = mappedWorkouts.get(row.workoutId) ?? {
      id: row.workoutId,
      name: row.workoutName,
      focus: row.focus,
      color: row.color,
      exercises: [],
    };

    workout.exercises.push({
      id: row.exerciseId,
      name: row.exerciseName,
      sets: row.sets,
      targetReps: row.targetReps,
    });
    mappedWorkouts.set(row.workoutId, workout);
  }

  return [...mappedWorkouts.values()];
}

export async function listCompletedWorkouts(
  context: GymContextDto,
): Promise<CompletedWorkout[]> {
  return database()
    .select({
      id: workoutSessions.id,
      workoutId: workouts.id,
      workoutName: workouts.name,
      color: sql<MarkerColor>`${workouts.color}`,
      completedAt: sql<string>`${workoutSessions.completedAt}::text`,
    })
    .from(workoutSessions)
    .innerJoin(workouts, eq(workouts.id, workoutSessions.workoutId))
    .where(eq(workoutSessions.gymId, context.gymId))
    .orderBy(desc(workoutSessions.completedAt));
}

export async function createWorkout(
  context: GymContextDto,
  input: NewWorkout,
): Promise<Workout> {
  return database().transaction(async (transaction) => {
    const [createdWorkout] = await transaction
      .insert(workouts)
      .values({
        gymId: context.gymId,
        createdByUserId: context.userId,
        name: input.name,
        focus: input.focus,
        color: input.color,
      })
      .returning({ id: workouts.id });
    const createdExercises = await transaction
      .insert(exercises)
      .values(
        input.exercises.map((exercise, position) => ({
          workoutId: createdWorkout.id,
          name: exercise.name,
          sets: exercise.sets,
          targetReps: exercise.targetReps,
          position,
        })),
      )
      .returning({ id: exercises.id });
    return {
      ...input,
      id: createdWorkout.id,
      exercises: input.exercises.map((exercise, index) => ({
        ...exercise,
        id: createdExercises[index].id,
      })),
    };
  });
}

export async function saveWorkoutSession(
  context: GymContextDto,
  input: WorkoutSession,
): Promise<void> {
  await database().transaction(async (transaction) => {
    const [ownedWorkout] = await transaction
      .select({ id: workouts.id })
      .from(workouts)
      .where(
        and(
          eq(workouts.id, input.workoutId),
          eq(workouts.gymId, context.gymId),
        ),
      )
      .limit(1);
    const exerciseIds = [
      ...new Set(input.sets.map((completedSet) => completedSet.exercise_id)),
    ];
    const ownedExercises = exerciseIds.length
      ? await transaction
          .select({ id: exercises.id })
          .from(exercises)
          .where(
            and(
              eq(exercises.workoutId, input.workoutId),
              inArray(exercises.id, exerciseIds),
            ),
          )
      : [];

    if (!ownedWorkout || ownedExercises.length !== exerciseIds.length) {
      throw new Error("Workout not found or access denied");
    }

    const [session] = await transaction
      .insert(workoutSessions)
      .values({
        gymId: context.gymId,
        workoutId: input.workoutId,
        createdByUserId: context.userId,
        feedback: input.feedback,
      })
      .returning({ id: workoutSessions.id });

    if (input.sets.length) {
      await transaction.insert(completedSets).values(
        input.sets.map((completedSet) => ({
          sessionId: session.id,
          exerciseId: completedSet.exercise_id,
          setNumber: completedSet.set_number,
          weight:
            completedSet.weight === null ? null : String(completedSet.weight),
          reps: completedSet.reps,
          loadRating: completedSet.load_rating,
        })),
      );
    }
  });
}
