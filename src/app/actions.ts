"use server";

import { revalidatePath } from "next/cache";
import {
  createWorkout,
  saveWorkoutSession,
} from "@/data/workouts";
import { getCurrentOwnerId } from "@/lib/owner";
import type { Workout } from "@/lib/workout";
import {
  parseNewWorkout,
  parseWorkoutSession,
} from "@/lib/workout-validation";

export async function createWorkoutAction(input: unknown): Promise<Workout> {
  const ownerId = getCurrentOwnerId();
  const workout = await createWorkout(ownerId, parseNewWorkout(input));
  revalidatePath("/");
  return workout;
}

export async function saveWorkoutSessionAction(input: unknown): Promise<void> {
  const ownerId = getCurrentOwnerId();
  await saveWorkoutSession(ownerId, parseWorkoutSession(input));
  revalidatePath("/");
}
