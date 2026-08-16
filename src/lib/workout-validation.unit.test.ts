import { describe, expect, it } from "vitest";

import type { WorkoutSession } from "./workout";
import { parseNewWorkout, parseWorkoutSession } from "./workout-validation";

const WORKOUT_ID = "123e4567-e89b-42d3-a456-426614174000";
const EXERCISE_ID = "123e4567-e89b-42d3-a456-426614174001";

function validWorkout() {
  return {
    name: "Strength day",
    focus: "Lower body",
    color: "yellow",
    exercises: [{ name: "Back squat", sets: 3, targetReps: 8 }],
  };
}

function validSession(): WorkoutSession {
  return {
    workoutId: WORKOUT_ID,
    feedback: null,
    sets: [
      {
        exercise_id: EXERCISE_ID,
        set_number: 1,
        weight: null,
        reps: 8,
        load_rating: null,
      },
    ],
  };
}

describe("parseNewWorkout", () => {
  it("normalizes text and accepts every integer boundary", () => {
    const workout = validWorkout();
    workout.name = `  ${"n".repeat(40)}  `;
    workout.focus = `  ${"f".repeat(60)}  `;
    workout.exercises = [
      { name: `  ${"e".repeat(60)}  `, sets: 1, targetReps: 1 },
      { name: "Maximums", sets: 20, targetReps: 100 },
    ];

    expect(parseNewWorkout(workout)).toEqual({
      name: "n".repeat(40),
      focus: "f".repeat(60),
      color: "yellow",
      exercises: [
        { name: "e".repeat(60), sets: 1, targetReps: 1 },
        { name: "Maximums", sets: 20, targetReps: 100 },
      ],
    });
  });

  it.each(["yellow", "pink", "blue", "green", "orange"])(
    "accepts the %s marker color",
    (color) => {
      expect(parseNewWorkout({ ...validWorkout(), color }).color).toBe(color);
    },
  );

  it.each([
    [null, "Workout is invalid"],
    [{}, "Workout is invalid"],
    [{ ...validWorkout(), exercises: [] }, "Workout exercises are invalid"],
    [
      { ...validWorkout(), exercises: Array.from({ length: 51 }, () => validWorkout().exercises[0]) },
      "Workout exercises are invalid",
    ],
    [{ ...validWorkout(), color: "purple" }, "Workout color is invalid"],
    [{ ...validWorkout(), name: "   " }, "Workout name is invalid"],
    [{ ...validWorkout(), name: "n".repeat(41) }, "Workout name is invalid"],
    [{ ...validWorkout(), focus: "f".repeat(61) }, "Workout focus is invalid"],
    [{ ...validWorkout(), exercises: [null] }, "Exercise is invalid"],
    [
      { ...validWorkout(), exercises: [{ name: "e".repeat(61), sets: 3, targetReps: 8 }] },
      "Exercise name is invalid",
    ],
    [
      { ...validWorkout(), exercises: [{ name: "Squat", sets: 0, targetReps: 8 }] },
      "Exercise sets is invalid",
    ],
    [
      { ...validWorkout(), exercises: [{ name: "Squat", sets: 21, targetReps: 8 }] },
      "Exercise sets is invalid",
    ],
    [
      { ...validWorkout(), exercises: [{ name: "Squat", sets: 1.5, targetReps: 8 }] },
      "Exercise sets is invalid",
    ],
    [
      { ...validWorkout(), exercises: [{ name: "Squat", sets: 3, targetReps: 0 }] },
      "Exercise reps is invalid",
    ],
    [
      { ...validWorkout(), exercises: [{ name: "Squat", sets: 3, targetReps: 101 }] },
      "Exercise reps is invalid",
    ],
    [
      { ...validWorkout(), exercises: [{ name: "Squat", sets: 3, targetReps: 1.5 }] },
      "Exercise reps is invalid",
    ],
  ])("rejects invalid workout input %# with the field error", (value, message) => {
    expect(() => parseNewWorkout(value)).toThrowError(message as string);
  });
});

describe("parseWorkoutSession", () => {
  it("accepts nullable values, finite weight, ratings, feedback, and integer boundaries", () => {
    const session = validSession();
    session.feedback = "Na medida";
    session.sets = [
      { ...session.sets[0], set_number: 1, weight: 0, reps: 1, load_rating: "Leve" },
      { ...session.sets[0], set_number: 20, weight: 82.5, reps: 1000, load_rating: "Pesada" },
      { ...session.sets[0], set_number: 2, weight: null, reps: 8, load_rating: "Ideal" },
    ];

    expect(parseWorkoutSession(session)).toEqual(session);
  });

  it.each(["Muito pesado", "Puxado", "Na medida", "Mandou bem"])(
    "accepts the %s feedback value",
    (feedback) => {
      expect(parseWorkoutSession({ ...validSession(), feedback }).feedback).toBe(feedback);
    },
  );

  it.each([
    [null, "Workout session is invalid"],
    [{ ...validSession(), workoutId: "not-a-uuid" }, "Workout session is invalid"],
    [{ ...validSession(), workoutId: "123e4567-e89b-02d3-a456-426614174000" }, "Workout session is invalid"],
    [{ ...validSession(), sets: [] }, "Completed sets are invalid"],
    [
      { ...validSession(), sets: Array.from({ length: 1001 }, () => validSession().sets[0]) },
      "Completed sets are invalid",
    ],
    [{ ...validSession(), feedback: "Easy" }, "Feedback is invalid"],
    [{ ...validSession(), sets: [null] }, "Completed set is invalid"],
    [
      { ...validSession(), sets: [{ ...validSession().sets[0], exercise_id: "not-a-uuid" }] },
      "Completed set is invalid",
    ],
    [
      { ...validSession(), sets: [{ ...validSession().sets[0], weight: -1 }] },
      "Completed set weight is invalid",
    ],
    [
      { ...validSession(), sets: [{ ...validSession().sets[0], weight: Number.POSITIVE_INFINITY }] },
      "Completed set weight is invalid",
    ],
    [
      { ...validSession(), sets: [{ ...validSession().sets[0], weight: "80" }] },
      "Completed set weight is invalid",
    ],
    [
      { ...validSession(), sets: [{ ...validSession().sets[0], load_rating: "Moderate" }] },
      "Load rating is invalid",
    ],
    [
      { ...validSession(), sets: [{ ...validSession().sets[0], set_number: 0 }] },
      "Set number is invalid",
    ],
    [
      { ...validSession(), sets: [{ ...validSession().sets[0], set_number: 21 }] },
      "Set number is invalid",
    ],
    [
      { ...validSession(), sets: [{ ...validSession().sets[0], set_number: 1.5 }] },
      "Set number is invalid",
    ],
    [
      { ...validSession(), sets: [{ ...validSession().sets[0], reps: 0 }] },
      "Completed reps is invalid",
    ],
    [
      { ...validSession(), sets: [{ ...validSession().sets[0], reps: 1001 }] },
      "Completed reps is invalid",
    ],
    [
      { ...validSession(), sets: [{ ...validSession().sets[0], reps: 1.5 }] },
      "Completed reps is invalid",
    ],
  ])("rejects invalid session input %# with the field error", (value, message) => {
    expect(() => parseWorkoutSession(value)).toThrowError(message as string);
  });
});
