import type { MarkerColor, NewWorkout, WorkoutSession } from "@/lib/workout";

const MARKER_COLORS = new Set<MarkerColor>([
  "yellow",
  "pink",
  "blue",
  "green",
  "orange",
]);
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LOAD_RATINGS = new Set(["Leve", "Ideal", "Pesada"]);
const WORKOUT_FEEDBACK = new Set([
  "Muito pesado",
  "Puxado",
  "Na medida",
  "Mandou bem",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function requiredText(value: unknown, maxLength: number, field: string) {
  if (typeof value !== "string" || value.trim().length === 0 || value.trim().length > maxLength) {
    throw new Error(`${field} is invalid`);
  }

  return value.trim();
}

function boundedInteger(value: unknown, minimum: number, maximum: number, field: string) {
  if (!Number.isInteger(value) || (value as number) < minimum || (value as number) > maximum) {
    throw new Error(`${field} is invalid`);
  }

  return value as number;
}

export function parseNewWorkout(value: unknown): NewWorkout {
  if (!isRecord(value) || !Array.isArray(value.exercises)) {
    throw new Error("Workout is invalid");
  }
  if (value.exercises.length === 0 || value.exercises.length > 50) {
    throw new Error("Workout exercises are invalid");
  }
  if (typeof value.color !== "string" || !MARKER_COLORS.has(value.color as MarkerColor)) {
    throw new Error("Workout color is invalid");
  }

  return {
    name: requiredText(value.name, 40, "Workout name"),
    focus: requiredText(value.focus, 60, "Workout focus"),
    color: value.color as MarkerColor,
    exercises: value.exercises.map((exercise) => {
      if (!isRecord(exercise)) throw new Error("Exercise is invalid");

      return {
        name: requiredText(exercise.name, 60, "Exercise name"),
        sets: boundedInteger(exercise.sets, 1, 20, "Exercise sets"),
        targetReps: boundedInteger(exercise.targetReps, 1, 100, "Exercise reps"),
      };
    }),
  };
}

export function parseWorkoutSession(value: unknown): WorkoutSession {
  if (!isRecord(value) || typeof value.workoutId !== "string" || !UUID_PATTERN.test(value.workoutId)) {
    throw new Error("Workout session is invalid");
  }
  if (!Array.isArray(value.sets) || value.sets.length === 0 || value.sets.length > 1000) {
    throw new Error("Completed sets are invalid");
  }

  if (value.feedback !== null && !WORKOUT_FEEDBACK.has(String(value.feedback))) {
    throw new Error("Feedback is invalid");
  }

  return {
    workoutId: value.workoutId,
    feedback: value.feedback as string | null,
    sets: value.sets.map((completedSet) => {
      if (
        !isRecord(completedSet) ||
        typeof completedSet.exercise_id !== "string" ||
        !UUID_PATTERN.test(completedSet.exercise_id)
      ) {
        throw new Error("Completed set is invalid");
      }
      const weight = completedSet.weight;
      if (weight !== null && (typeof weight !== "number" || !Number.isFinite(weight) || weight < 0)) {
        throw new Error("Completed set weight is invalid");
      }

      if (
        completedSet.load_rating !== null &&
        !LOAD_RATINGS.has(String(completedSet.load_rating))
      ) {
        throw new Error("Load rating is invalid");
      }

      return {
        exercise_id: completedSet.exercise_id,
        set_number: boundedInteger(completedSet.set_number, 1, 20, "Set number"),
        weight,
        reps: boundedInteger(completedSet.reps, 1, 1000, "Completed reps"),
        load_rating: completedSet.load_rating as string | null,
      };
    }),
  };
}
