export type Exercise = {
  name: string;
  sets: number;
  targetReps: number;
};

export type Workout = {
  name: string;
  focus: string;
  exercises: Exercise[];
};

export const TEST_WORKOUT: Workout = {
  name: "Treino A",
  focus: "Peito e tríceps",
  exercises: [
    { name: "Supino reto", sets: 3, targetReps: 10 },
    { name: "Supino inclinado", sets: 3, targetReps: 12 },
    { name: "Crucifixo na máquina", sets: 3, targetReps: 12 },
    { name: "Tríceps na polia", sets: 3, targetReps: 15 },
  ],
};
