import { expect, test } from "@playwright/test";

import { e2ePool, seedWorkoutScenario } from "./database";

test.afterAll(async () => {
  await e2ePool.end();
});

test("loads a seeded workout", async ({ page }) => {
  const workout = await seedWorkoutScenario();

  await page.goto("/");

  await expect(
    page.getByRole("button", { name: new RegExp(workout.name) }),
  ).toBeVisible();
  await expect(page.getByText(workout.focus)).toBeVisible();
  await expect(page.getByText(workout.exercises[0].name)).not.toBeVisible();
});

test("creates a workout through the application", async ({ page }) => {
  const workout = await seedWorkoutScenario();
  await page.goto("/");

  await page.getByRole("button", { name: "criar novo treino" }).click();
  await page.getByLabel("Nome do treino").fill("Treino B");
  await page.getByLabel("Foco").fill("Costas e bíceps");
  await page.getByLabel("Exercício").fill("Remada curvada");
  await page.getByRole("button", { name: "Salvar treino" }).click();

  await expect(page.getByRole("button", { name: /Treino B/ })).toBeVisible();

  await expect
    .poll(async () => {
      const result = await e2ePool.query<{
        name: string;
        focus: string;
        exercise_name: string;
      }>(
        `select w.name, w.focus, e.name as exercise_name
           from workouts w
           join exercises e on e.workout_id = w.id
          where w.gym_id = $1 and w.name = $2`,
        [workout.gymId, "Treino B"],
      );
      return result.rows;
    })
    .toEqual([
      {
        name: "Treino B",
        focus: "Costas e bíceps",
        exercise_name: "Remada curvada",
      },
    ]);
});

test("completes a workout and displays it in history", async ({ page }) => {
  const workout = await seedWorkoutScenario();
  await page.goto("/");

  await page.getByRole("button", { name: new RegExp(workout.name) }).click();
  await page.getByLabel(/^Peso \(opcional\)/).fill("72.5");
  await page.getByLabel(/^Repetições \(opcional\)/).fill("8");
  await page.getByRole("button", { name: "Concluir série" }).click();
  await page.getByRole("button", { name: "Ideal" }).click();
  await page.getByRole("button", { name: "Na medida" }).click();
  await page.getByRole("button", { name: "Ver resumo" }).click();
  await page.getByRole("button", { name: "Voltar às fichas" }).click();

  await page.getByRole("button", { name: "Histórico" }).click();
  await expect(
    page.getByRole("gridcell", {
      name: new RegExp(`${workout.name} concluído`),
    }),
  ).toBeVisible();

  await expect
    .poll(async () => {
      const result = await e2ePool.query<{
        workout_id: string;
        feedback: string;
        weight: string;
        reps: number;
        load_rating: string;
      }>(
        `select ws.workout_id, ws.feedback, cs.weight, cs.reps, cs.load_rating
           from workout_sessions ws
           join completed_sets cs on cs.session_id = ws.id
          where ws.gym_id = $1 and ws.workout_id = $2`,
        [workout.gymId, workout.id],
      );
      return result.rows;
    })
    .toEqual([
      {
        workout_id: workout.id,
        feedback: "Na medida",
        weight: "72.50",
        reps: 8,
        load_rating: "Ideal",
      },
    ]);
});
