"use server";

import { revalidatePath } from "next/cache";
import { createWorkout, saveWorkoutSession } from "@/data/workouts";
import type { Workout } from "@/lib/workout";
import { parseNewWorkout, parseWorkoutSession } from "@/lib/workout-validation";
import { gymAccess } from "@/modules/gym-access";
import { requireVerifiedIdentity } from "@/modules/identity/account";

export async function createWorkoutAction(input: unknown): Promise<Workout> {
  const identity = await requireVerifiedIdentity();
  const gymContext = await gymAccess.resolveActiveGym(identity.userId);
  const workout = await createWorkout(gymContext, parseNewWorkout(input));
  revalidatePath("/");
  return workout;
}

export async function saveWorkoutSessionAction(input: unknown): Promise<void> {
  const identity = await requireVerifiedIdentity();
  const gymContext = await gymAccess.resolveActiveGym(identity.userId);
  await saveWorkoutSession(gymContext, parseWorkoutSession(input));
  revalidatePath("/");
}

export async function selectActiveGymAction(gymId: string): Promise<void> {
  const identity = await requireVerifiedIdentity();
  await gymAccess.selectActiveGym(identity.userId, gymId);
  revalidatePath("/");
}
