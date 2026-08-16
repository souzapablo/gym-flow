import { connection } from "next/server";
import { createWorkoutAction, saveWorkoutSessionAction } from "@/app/actions";
import { WorkoutApp } from "@/components/workout-app";
import { listCompletedWorkouts, listWorkouts } from "@/data/workouts";
import { gymAccess } from "@/modules/gym-access";
import { requireVerifiedIdentity } from "@/modules/identity/account";

export default async function Home() {
  await connection();
  const identity = await requireVerifiedIdentity();
  const gymContext = await gymAccess.resolveActiveGym(identity.userId);
  const [workouts, completedWorkouts] = await Promise.all([
    listWorkouts(gymContext),
    listCompletedWorkouts(gymContext),
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
