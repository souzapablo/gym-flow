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

export type MarkerColor = "yellow" | "pink" | "blue" | "green" | "orange";

export const TEST_WORKOUT: Workout = {
  id: "workout-a",
  name: "Treino A",
  focus: "Peito e tríceps",
  color: "yellow",
  exercises: [
    { id: "bench-press", name: "Supino reto", sets: 3, targetReps: 10 },
    { id: "incline-press", name: "Supino inclinado", sets: 3, targetReps: 12 },
    { id: "chest-fly", name: "Crucifixo na máquina", sets: 3, targetReps: 12 },
    { id: "triceps-pushdown", name: "Tríceps na polia", sets: 3, targetReps: 15 },
  ],
};
