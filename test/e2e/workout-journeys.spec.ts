import { expect, test } from "@playwright/test";

import { e2ePool, seedWorkoutScenario } from "./database";

test.afterAll(async () => {
  await e2ePool.end();
});

test("loads a seeded workout", async ({ page }) => {
  const workout = await seedWorkoutScenario();

  await page.goto("/");

  await expect(page.getByRole("button", { name: new RegExp(workout.name) })).toBeVisible();
  await expect(page.getByText(workout.focus)).toBeVisible();
  await expect(page.getByText(workout.exercises[0].name)).not.toBeVisible();
});

test("creates a workout through the application", async ({ page }) => {
  await seedWorkoutScenario();
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
          where w.owner_id = $1 and w.name = $2`,
        ["local-user", "Treino B"],
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
