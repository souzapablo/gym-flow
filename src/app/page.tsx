import { createWorkoutAction, saveWorkoutSessionAction } from "@/app/actions";
import { WorkoutApp } from "@/components/workout-app";
import { listCompletedWorkouts, listWorkouts } from "@/data/workouts";
import { isDatabaseConfigured } from "@/lib/db";
import { getCurrentOwnerId } from "@/lib/owner";
import { TEST_WORKOUT } from "@/lib/workout";

export default async function Home() {
  const persistenceEnabled = isDatabaseConfigured();
  const ownerId = getCurrentOwnerId();
  const [workouts, completedWorkouts] = persistenceEnabled
    ? await Promise.all([listWorkouts(ownerId), listCompletedWorkouts(ownerId)])
    : [[TEST_WORKOUT], []];

  return (
    <WorkoutApp
      initialWorkouts={workouts}
      initialCompletedWorkouts={completedWorkouts}
      persistenceEnabled={persistenceEnabled}
      createWorkoutAction={createWorkoutAction}
      saveWorkoutSessionAction={saveWorkoutSessionAction}
    />
  );
}
