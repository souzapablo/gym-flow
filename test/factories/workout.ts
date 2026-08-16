import type { MarkerColor } from "@/lib/workout";

export type ExerciseFixture = {
  id: string;
  name: string;
  sets: number;
  targetReps: number;
  position: number;
};

export type WorkoutFixture = {
  id: string;
  ownerId: string;
  name: string;
  focus: string;
  color: MarkerColor;
  exercises: ExerciseFixture[];
};

const defaultExercise: ExerciseFixture = {
  id: "10000000-0000-7000-8000-000000000001",
  name: "Back squat",
  sets: 3,
  targetReps: 8,
  position: 0,
};

export function buildWorkoutFixture(
  overrides: Partial<Omit<WorkoutFixture, "exercises">> & {
    exercises?: ExerciseFixture[];
  } = {},
): WorkoutFixture {
  return {
    id: "20000000-0000-7000-8000-000000000001",
    ownerId: "70000000-0000-7000-8000-000000000001",
    name: "Strength day",
    focus: "Lower body",
    color: "yellow",
    exercises: [{ ...defaultExercise }],
    ...overrides,
  };
}
