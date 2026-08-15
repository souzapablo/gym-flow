import { connection } from "next/server";
import { createWorkoutAction, saveWorkoutSessionAction } from "@/app/actions";
import { WorkoutApp } from "@/components/workout-app";
import { listCompletedWorkouts, listWorkouts } from "@/data/workouts";
import { getCurrentUser } from "@/lib/owner";

export default async function Home() {
  await connection();
  const user = await getCurrentUser();
  const [workouts, completedWorkouts] = await Promise.all([
    listWorkouts(user.id),
    listCompletedWorkouts(user.id),
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
