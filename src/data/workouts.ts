import "server-only";

import { db } from "@/lib/db";
import type {
  CompletedWorkout,
  MarkerColor,
  NewWorkout,
  Workout,
  WorkoutSession,
} from "@/lib/workout";

type WorkoutRow = {
  workout_id: string;
  workout_name: string;
  focus: string;
  color: MarkerColor;
  exercise_id: string;
  exercise_name: string;
  sets: number;
  target_reps: number;
};

export async function listWorkouts(ownerId: string): Promise<Workout[]> {
  const sql = db();
  const rows = (await sql`
    select
      w.id::text as workout_id,
      w.name as workout_name,
      w.focus,
      w.color,
      e.id::text as exercise_id,
      e.name as exercise_name,
      e.sets,
      e.target_reps
    from workouts w
    join exercises e on e.workout_id = w.id
    where w.owner_id = ${ownerId}
    order by w.created_at, e.position
  `) as WorkoutRow[];

  const workouts = new Map<string, Workout>();

  for (const row of rows) {
    const workout: Workout = workouts.get(row.workout_id) ?? {
      id: row.workout_id,
      name: row.workout_name,
      focus: row.focus,
      color: row.color,
      exercises: [],
    };

    workout.exercises.push({
      id: row.exercise_id,
      name: row.exercise_name,
      sets: row.sets,
      targetReps: row.target_reps,
    });
    workouts.set(row.workout_id, workout);
  }

  return [...workouts.values()];
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
  const sql = db();

  await sql`
    with inserted_workout as (
      insert into workouts (id, owner_id, name, focus, color)
      values (${workout.id}, ${ownerId}, ${workout.name}, ${workout.focus}, ${workout.color})
      returning id
    )
    insert into exercises (id, workout_id, name, sets, target_reps, position)
    select
      exercise.id::uuid,
      inserted_workout.id,
      exercise.name,
      exercise.sets,
      exercise.target_reps,
      exercise.position
    from inserted_workout
    cross join jsonb_to_recordset(${JSON.stringify(
      workout.exercises.map((exercise, position) => ({
        ...exercise,
        target_reps: exercise.targetReps,
        position,
      })),
    )}::jsonb) as exercise(
      id text,
      name text,
      sets integer,
      target_reps integer,
      position integer
    )
  `;

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
