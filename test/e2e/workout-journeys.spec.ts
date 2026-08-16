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
