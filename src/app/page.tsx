import { connection } from "next/server";
import { createWorkoutAction, saveWorkoutSessionAction } from "@/app/actions";
import { WorkoutApp } from "@/components/workout-app";
import { listCompletedWorkouts, listWorkouts } from "@/data/workouts";
import { getCurrentOwnerId } from "@/lib/owner";

export default async function Home() {
  await connection();
  const ownerId = getCurrentOwnerId();
  const [workouts, completedWorkouts] = await Promise.all([
    listWorkouts(ownerId),
    listCompletedWorkouts(ownerId),
  ]);

  return (
    <WorkoutApp
      initialWorkouts={workouts}
      initialCompletedWorkouts={completedWorkouts}
      createWorkoutAction={createWorkoutAction}
      saveWorkoutSessionAction={saveWorkoutSessionAction}
    />
  );
}
