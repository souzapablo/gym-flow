import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CompletedWorkout, Workout, WorkoutSession } from "@/lib/workout";
import { WorkoutApp } from "./workout-app";

const workout: Workout = {
  id: "20000000-0000-4000-8000-000000000001",
  name: "Treino A",
  focus: "Pernas",
  color: "yellow",
  exercises: [
    {
      id: "10000000-0000-4000-8000-000000000001",
      name: "Agachamento",
      sets: 1,
      targetReps: 8,
    },
  ],
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, resolve, reject };
}

function renderApp({
  workouts = [workout],
  completedWorkouts = [],
  createWorkoutAction = vi.fn<() => Promise<Workout>>(),
  saveWorkoutSessionAction = vi.fn<() => Promise<void>>(),
}: {
  workouts?: Workout[];
  completedWorkouts?: CompletedWorkout[];
  createWorkoutAction?: (input: unknown) => Promise<Workout>;
  saveWorkoutSessionAction?: (input: unknown) => Promise<void>;
} = {}) {
  render(
    <WorkoutApp
      initialWorkouts={workouts}
      initialCompletedWorkouts={completedWorkouts}
      createWorkoutAction={createWorkoutAction}
      saveWorkoutSessionAction={saveWorkoutSessionAction}
    />,
  );
}

async function reachSummary(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /Treino A/ }));
  await user.type(screen.getByLabelText(/^Peso \(opcional\)/), "80");
  await user.type(screen.getByLabelText(/^Repetições \(opcional\)/), "7");
  await user.click(screen.getByRole("button", { name: "Concluir série" }));
  await user.click(screen.getByRole("button", { name: "Ideal" }));
  await user.click(screen.getByRole("button", { name: "Na medida" }));
  await user.click(screen.getByRole("button", { name: "Ver resumo" }));
}

afterEach(() => {
  vi.useRealTimers();
});

describe("WorkoutApp", () => {
  it("shows the initial workout list and completed-workout history", async () => {
    const user = userEvent.setup();
    renderApp({
      completedWorkouts: [
        {
          id: "30000000-0000-4000-8000-000000000001",
          workoutId: workout.id,
          workoutName: workout.name,
          color: workout.color,
          completedAt: new Date().toISOString(),
        },
      ],
    });

    expect(
      screen.getByRole("button", { name: /Treino A/ }).textContent,
    ).toContain("Pernas");

    await user.click(screen.getByRole("button", { name: "Histórico" }));

    expect(
      screen.getByRole("gridcell", { name: /Treino A concluído/ }),
    ).toBeTruthy();
    expect(screen.getByText("1 treinos concluídos")).toBeTruthy();
  });

  it("creates a workout and displays the returned result", async () => {
    const user = userEvent.setup();
    const createdWorkout: Workout = {
      ...workout,
      id: "20000000-0000-4000-8000-000000000002",
      name: "Treino B",
      focus: "Costas",
      color: "pink",
      exercises: [{ ...workout.exercises[0], name: "Remada" }],
    };
    const createWorkoutAction = vi.fn(async () => createdWorkout);
    renderApp({ createWorkoutAction });

    await user.click(screen.getByRole("button", { name: "criar novo treino" }));
    await user.type(screen.getByLabelText("Nome do treino"), " Treino B ");
    await user.type(screen.getByLabelText("Foco"), " Costas ");
    await user.type(screen.getByLabelText("Exercício"), " Remada ");
    await user.click(screen.getByRole("button", { name: "Salvar treino" }));

    expect(createWorkoutAction).toHaveBeenCalledWith({
      name: "Treino B",
      focus: "Costas",
      color: "pink",
      exercises: [{ name: "Remada", sets: 3, targetReps: 10 }],
    });
    expect(
      await screen.findByRole("button", { name: /Treino B/ }),
    ).toBeTruthy();
  });

  it("keeps the create form visible and reports a save failure", async () => {
    const user = userEvent.setup();
    const createWorkoutAction = vi.fn(async () => {
      throw new Error("database unavailable");
    });
    renderApp({ createWorkoutAction });

    await user.click(screen.getByRole("button", { name: "criar novo treino" }));
    await user.type(screen.getByLabelText("Nome do treino"), "Treino B");
    await user.type(screen.getByLabelText("Foco"), "Costas");
    await user.type(screen.getByLabelText("Exercício"), "Remada");
    await user.click(screen.getByRole("button", { name: "Salvar treino" }));

    expect((await screen.findByRole("alert")).textContent).toBe(
      "Não foi possível salvar o treino.",
    );
    expect(screen.getByRole("button", { name: "Salvar treino" })).toBeTruthy();
  });

  it("disables the create submit button while the action is pending", async () => {
    const user = userEvent.setup();
    const pending = deferred<Workout>();
    renderApp({ createWorkoutAction: () => pending.promise });

    await user.click(screen.getByRole("button", { name: "criar novo treino" }));
    await user.type(screen.getByLabelText("Nome do treino"), "Treino B");
    await user.type(screen.getByLabelText("Foco"), "Costas");
    await user.type(screen.getByLabelText("Exercício"), "Remada");
    await user.click(screen.getByRole("button", { name: "Salvar treino" }));

    expect(
      await screen.findByRole("button", { name: "Salvando…" }),
    ).toHaveProperty("disabled", true);

    pending.resolve({ ...workout, name: "Treino B" });
    expect(
      await screen.findByRole("button", { name: /Treino B/ }),
    ).toBeTruthy();
  });

  it("advances from rest to the next set without a real countdown", async () => {
    vi.useFakeTimers();
    renderApp({
      workouts: [
        { ...workout, exercises: [{ ...workout.exercises[0], sets: 2 }] },
      ],
    });

    fireEvent.click(screen.getByRole("button", { name: /Treino A/ }));
    fireEvent.click(screen.getByRole("button", { name: "Concluir série" }));
    expect(screen.getByText("00:05")).toBeTruthy();

    await act(() => vi.advanceTimersByTimeAsync(5_000));

    expect(screen.getByText(/Série 2 de 2/)).toBeTruthy();
  });

  it("advances from exercise evaluation without a real countdown", async () => {
    vi.useFakeTimers();
    renderApp();

    fireEvent.click(screen.getByRole("button", { name: /Treino A/ }));
    fireEvent.click(screen.getByRole("button", { name: "Concluir série" }));
    expect(
      screen.getByRole("button", { name: /Pular · continua em 5s/ }),
    ).toBeTruthy();

    await act(() => vi.advanceTimersByTimeAsync(5_000));

    expect(
      screen.getByRole("heading", { name: "Treino concluído." }),
    ).toBeTruthy();
  });

  it("saves a completed session and adds it to visible history", async () => {
    const user = userEvent.setup();
    const saveWorkoutSessionAction = vi.fn<(input: unknown) => Promise<void>>(
      async () => undefined,
    );
    renderApp({ saveWorkoutSessionAction });
    await reachSummary(user);

    await user.click(screen.getByRole("button", { name: "Voltar às fichas" }));

    expect(saveWorkoutSessionAction).toHaveBeenCalledTimes(1);
    const session = saveWorkoutSessionAction.mock.calls[0][0] as WorkoutSession;
    expect(session).toEqual({
      workoutId: workout.id,
      feedback: "Na medida",
      sets: [
        {
          exercise_id: workout.exercises[0].id,
          set_number: 1,
          weight: 80,
          reps: 7,
          load_rating: "Ideal",
        },
      ],
    });
    await user.click(await screen.findByRole("button", { name: "Histórico" }));
    expect(
      screen.getByRole("gridcell", { name: /Treino A concluído/ }),
    ).toBeTruthy();
  });

  it("reports a session failure and preserves the summary for retry", async () => {
    const user = userEvent.setup();
    const pending = deferred<void>();
    renderApp({ saveWorkoutSessionAction: () => pending.promise });
    await reachSummary(user);

    await user.click(screen.getByRole("button", { name: "Voltar às fichas" }));
    expect(
      await screen.findByRole("button", { name: "Salvando…" }),
    ).toHaveProperty("disabled", true);

    pending.reject(new Error("database unavailable"));

    expect((await screen.findByRole("alert")).textContent).toBe(
      "Não foi possível salvar a sessão.",
    );
    expect(
      within(screen.getByRole("main")).getByRole("heading", {
        name: "Treino A",
      }),
    ).toBeTruthy();
  });
});
