"use server";

import { revalidatePath } from "next/cache";
import {
  createWorkout,
  saveWorkoutSession,
} from "@/data/workouts";
import { getCurrentUser } from "@/lib/owner";
import type { Workout } from "@/lib/workout";
import {
  parseNewWorkout,
  parseWorkoutSession,
} from "@/lib/workout-validation";

export async function createWorkoutAction(input: unknown): Promise<Workout> {
  const user = await getCurrentUser();
  const workout = await createWorkout(user.id, parseNewWorkout(input));
  revalidatePath("/");
  return workout;
}

export async function saveWorkoutSessionAction(input: unknown): Promise<void> {
  const user = await getCurrentUser();
  await saveWorkoutSession(user.id, parseWorkoutSession(input));
  revalidatePath("/");
}
