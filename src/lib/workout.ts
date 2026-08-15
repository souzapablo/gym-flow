export type Exercise = {
  id: string;
  name: string;
  sets: number;
  targetReps: number;
};

export type Workout = {
  id: string;
  name: string;
  focus: string;
  color: MarkerColor;
  exercises: Exercise[];
};

export type NewWorkout = Omit<Workout, "id" | "exercises"> & {
  exercises: Array<Omit<Exercise, "id">>;
};

export type CompletedWorkout = {
  id: string;
  workoutId: string;
  workoutName: string;
  color: MarkerColor;
  completedAt: string;
};

export type WorkoutSession = {
  workoutId: string;
  feedback: string | null;
  sets: Array<{
    exercise_id: string;
    set_number: number;
    weight: number | null;
    reps: number;
    load_rating: string | null;
  }>;
};

export type MarkerColor = "yellow" | "pink" | "blue" | "green" | "orange";
