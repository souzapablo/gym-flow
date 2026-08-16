import "server-only";

import { asc, eq, sql } from "drizzle-orm";

import { database } from "@/db/client";
import { exercises, workouts } from "@/db/schema";
import { db } from "@/lib/db";
import type {
  CompletedWorkout,
  MarkerColor,
  NewWorkout,
  Workout,
  WorkoutSession,
} from "@/lib/workout";

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

export async function listWorkouts(ownerId: string): Promise<Workout[]> {
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
    .where(eq(workouts.ownerId, ownerId))
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
  ownerId: string,
): Promise<CompletedWorkout[]> {
  const sql = db();
  return (await sql`
    select
      s.id::text as id,
      w.id::text as "workoutId",
      w.name as "workoutName",
      w.color,
      s.completed_at::text as "completedAt"
    from workout_sessions s
    join workouts w on w.id = s.workout_id
    where s.owner_id = ${ownerId}
    order by s.completed_at desc
  `) as CompletedWorkout[];
}

export async function createWorkout(
  ownerId: string,
  input: NewWorkout,
): Promise<Workout> {
  const workout: Workout = {
    ...input,
    id: crypto.randomUUID(),
    exercises: input.exercises.map((exercise) => ({
      ...exercise,
      id: crypto.randomUUID(),
    })),
  };

  await database().transaction(async (transaction) => {
    await transaction.insert(workouts).values({
      id: workout.id,
      ownerId,
      name: workout.name,
      focus: workout.focus,
      color: workout.color,
    });
    await transaction.insert(exercises).values(
      workout.exercises.map((exercise, position) => ({
        id: exercise.id,
        workoutId: workout.id,
        name: exercise.name,
        sets: exercise.sets,
        targetReps: exercise.targetReps,
        position,
      })),
    );
  });

  return workout;
}

export async function saveWorkoutSession(
  ownerId: string,
  input: WorkoutSession,
): Promise<void> {
  const sql = db();
  const sessionId = crypto.randomUUID();

  const insertedSets = (await sql`
    with owned_workout as (
      select id from workouts
      where id = ${input.workoutId} and owner_id = ${ownerId}
    ), provided_sets as (
      select *
      from jsonb_to_recordset(${JSON.stringify(input.sets)}::jsonb) as completed_set(
        exercise_id text,
        set_number integer,
        weight numeric,
        reps integer,
        load_rating text
      )
    ), valid_workout as (
      select owned_workout.id
      from owned_workout
      where (select count(*) from provided_sets) = (
        select count(*)
        from provided_sets
        join exercises e
          on e.id = provided_sets.exercise_id::uuid
          and e.workout_id = owned_workout.id
      )
    ), inserted_session as (
      insert into workout_sessions (id, workout_id, owner_id, feedback)
      select ${sessionId}, id, ${ownerId}, ${input.feedback}
      from valid_workout
      returning id
    )
    insert into completed_sets (
      id, session_id, exercise_id, set_number, weight, reps, load_rating
    )
    select
      gen_random_uuid(),
      inserted_session.id,
      completed_set.exercise_id::uuid,
      completed_set.set_number,
      completed_set.weight,
      completed_set.reps,
      completed_set.load_rating
    from inserted_session
    cross join provided_sets as completed_set
    join exercises e
      on e.id = completed_set.exercise_id::uuid
      and e.workout_id = ${input.workoutId}
    returning completed_sets.id::text as id
  `) as { id: string }[];

  if (insertedSets.length !== input.sets.length) {
    throw new Error("Workout not found or access denied");
  }
}
