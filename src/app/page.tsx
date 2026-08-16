import { connection } from "next/server";
import {
  createWorkoutAction,
  saveWorkoutSessionAction,
  selectActiveGymAction,
} from "@/app/actions";
import { GymSelector } from "@/components/gym-selector";
import { WorkoutApp } from "@/components/workout-app";
import { listCompletedWorkouts, listWorkouts } from "@/data/workouts";
import { gymAccess } from "@/modules/gym-access";
import { requireVerifiedIdentity } from "@/modules/identity/account";

export default async function Home() {
  await connection();
  const identity = await requireVerifiedIdentity();
  const memberships = await gymAccess.listMemberships(identity.userId);
  let gymContext;

  try {
    gymContext = await gymAccess.resolveActiveGym(identity.userId);
  } catch (error) {
    if (error instanceof Error && error.name === "GymSelectionRequiredError") {
      return (
        <GymSelector
          memberships={memberships.filter(
            (membership) => membership.status === "active",
          )}
          selectGymAction={selectActiveGymAction}
        />
      );
    }
    throw error;
  }
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
