"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  type CompletedWorkout,
  type Exercise,
  type MarkerColor,
  type NewWorkout,
  type Workout,
  type WorkoutSession,
} from "@/lib/workout";
import { createUuidV7 } from "@/lib/uuid";

type Entry = {
  weight: string;
  reps: string;
};

type Screen =
  "list" | "create" | "focus" | "evaluate" | "rest" | "done" | "summary";
type Tab = "workouts" | "calendar";

const TEST_REST_SECONDS = 5;
const EVALUATION_SECONDS = 5;
const LOAD_RATINGS = [
  { emoji: "😌", label: "Leve" },
  { emoji: "💪", label: "Ideal" },
  { emoji: "🫠", label: "Pesada" },
];
const MARKER_COLORS: { value: MarkerColor; label: string }[] = [
  { value: "yellow", label: "Amarelo" },
  { value: "pink", label: "Rosa" },
  { value: "blue", label: "Azul" },
  { value: "green", label: "Verde" },
  { value: "orange", label: "Laranja" },
];

function MarkerLogo() {
  return (
    <span className="marker-logo" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

export function WorkoutApp({
  initialWorkouts,
  initialCompletedWorkouts,
  createWorkoutAction,
  saveWorkoutSessionAction,
}: {
  initialWorkouts: Workout[];
  initialCompletedWorkouts: CompletedWorkout[];
  createWorkoutAction: (input: unknown) => Promise<Workout>;
  saveWorkoutSessionAction: (input: unknown) => Promise<void>;
}) {
  const [workouts, setWorkouts] = useState<Workout[]>(initialWorkouts);
  const [completedWorkouts, setCompletedWorkouts] = useState(
    initialCompletedWorkouts,
  );
  const [tab, setTab] = useState<Tab>("workouts");
  const [activeWorkout, setActiveWorkout] = useState<Workout | null>(null);
  const [screen, setScreen] = useState<Screen>("list");
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [setIndex, setSetIndex] = useState(0);
  const [entries, setEntries] = useState<Record<string, Entry>>({});
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [restSeconds, setRestSeconds] = useState(TEST_REST_SECONDS);
  const [evaluationSeconds, setEvaluationSeconds] =
    useState(EVALUATION_SECONDS);
  const [exerciseRatings, setExerciseRatings] = useState<
    Record<number, string>
  >({});
  const [workoutFeedback, setWorkoutFeedback] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const exercise = activeWorkout?.exercises[exerciseIndex];
  const totalSets =
    activeWorkout?.exercises.reduce((total, item) => total + item.sets, 0) ?? 0;
  const completedSets =
    activeWorkout?.exercises
      .slice(0, exerciseIndex)
      .reduce((total, item) => total + item.sets, 0) ?? 0;
  const progress =
    totalSets === 0 ? 0 : ((completedSets + setIndex) / totalSets) * 100;

  const finishExercise = useCallback(() => {
    if (!activeWorkout) return;

    const isLastExercise = exerciseIndex === activeWorkout.exercises.length - 1;

    if (isLastExercise) {
      setScreen("done");
      return;
    }

    setWeight("");
    setReps("");
    setExerciseIndex((current) => current + 1);
    setSetIndex(0);
    setScreen("focus");
  }, [activeWorkout, exerciseIndex]);

  useEffect(() => {
    if (screen !== "rest") return;

    const interval = window.setInterval(() => {
      setRestSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(interval);
          setScreen("focus");
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [screen]);

  useEffect(() => {
    if (screen !== "evaluate") return;

    const interval = window.setInterval(() => {
      setEvaluationSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(interval);
          finishExercise();
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [screen, finishExercise]);

  function startWorkout(workout: Workout) {
    setActiveWorkout(workout);
    setExerciseIndex(0);
    setSetIndex(0);
    setEntries({});
    setExerciseRatings({});
    setWorkoutFeedback(null);
    setWeight("");
    setReps("");
    setRestSeconds(TEST_REST_SECONDS);
    setEvaluationSeconds(EVALUATION_SECONDS);
    setScreen("focus");
  }

  function closeWorkout() {
    setActiveWorkout(null);
    setScreen("list");
  }

  function createWorkout(input: NewWorkout) {
    setMutationError(null);

    startTransition(async () => {
      try {
        const workout = await createWorkoutAction(input);
        setWorkouts((current) => [...current, workout]);
        setScreen("list");
      } catch {
        setMutationError("Não foi possível salvar o treino.");
      }
    });
  }

  function finishWorkout() {
    if (!activeWorkout) return;

    const completedWorkout: CompletedWorkout = {
      id: createUuidV7(),
      workoutId: activeWorkout.id,
      workoutName: activeWorkout.name,
      color: activeWorkout.color,
      completedAt: new Date().toISOString(),
    };

    const session: WorkoutSession = {
      workoutId: activeWorkout.id,
      feedback: workoutFeedback,
      sets: activeWorkout.exercises.flatMap((item, itemIndex) =>
        Array.from({ length: item.sets }, (_, itemSetIndex) => {
          const entry = entries[`${itemIndex}-${itemSetIndex}`];
          return {
            exercise_id: item.id,
            set_number: itemSetIndex + 1,
            weight: entry?.weight ? Number(entry.weight) : null,
            reps: Number(entry?.reps || item.targetReps),
            load_rating: exerciseRatings[itemIndex] ?? null,
          };
        }),
      ),
    };

    setMutationError(null);
    startTransition(async () => {
      try {
        await saveWorkoutSessionAction(session);
        setCompletedWorkouts((current) => [completedWorkout, ...current]);
        closeWorkout();
      } catch {
        setMutationError("Não foi possível salvar a sessão.");
      }
    });
  }

  function completeSet() {
    if (!exercise) return;

    const entryKey = `${exerciseIndex}-${setIndex}`;
    const completedReps = reps || String(exercise.targetReps);
    setEntries((current) => ({
      ...current,
      [entryKey]: { weight, reps: completedReps },
    }));

    const isLastSet = setIndex === exercise.sets - 1;

    if (isLastSet) {
      setEvaluationSeconds(EVALUATION_SECONDS);
      setScreen("evaluate");
      return;
    }

    setSetIndex((current) => current + 1);
    setRestSeconds(TEST_REST_SECONDS);
    setScreen("rest");
  }

  if (screen === "focus" && activeWorkout) {
    return (
      <FocusScreen
        workout={activeWorkout}
        exerciseIndex={exerciseIndex}
        setIndex={setIndex}
        entries={entries}
        progress={progress}
        weight={weight}
        reps={reps}
        onWeightChange={setWeight}
        onRepsChange={setReps}
        onComplete={completeSet}
        onClose={closeWorkout}
      />
    );
  }

  if (screen === "done" && activeWorkout) {
    return (
      <DoneScreen
        workout={activeWorkout}
        feedback={workoutFeedback}
        onFeedbackChange={setWorkoutFeedback}
        onContinue={() => setScreen("summary")}
      />
    );
  }

  if (screen === "summary" && activeWorkout) {
    return (
      <SummaryScreen
        workout={activeWorkout}
        entries={entries}
        exerciseRatings={exerciseRatings}
        feedback={workoutFeedback}
        isSaving={isPending}
        error={mutationError}
        onClose={finishWorkout}
      />
    );
  }

  if (screen === "evaluate" && activeWorkout && exercise) {
    return (
      <EvaluationScreen
        workout={activeWorkout}
        exerciseName={exercise.name}
        seconds={evaluationSeconds}
        onSelect={(rating) => {
          setExerciseRatings((current) => ({
            ...current,
            [exerciseIndex]: rating,
          }));
          finishExercise();
        }}
        onSkip={finishExercise}
      />
    );
  }

  if (screen === "rest" && activeWorkout) {
    return (
      <RestScreen
        workout={activeWorkout}
        exerciseIndex={exerciseIndex}
        setIndex={setIndex}
        seconds={restSeconds}
        onClose={closeWorkout}
      />
    );
  }

  if (screen === "create") {
    return (
      <CreateWorkoutScreen
        usedColors={workouts.map((workout) => workout.color)}
        isSaving={isPending}
        error={mutationError}
        onCancel={() => setScreen("list")}
        onCreate={createWorkout}
      />
    );
  }

  return (
    <AppTabs tab={tab} onTabChange={setTab}>
      {tab === "workouts" ? (
        <WorkoutList
          workouts={workouts}
          onCreate={() => setScreen("create")}
          onStart={startWorkout}
        />
      ) : (
        <CalendarTab
          workouts={workouts}
          completedWorkouts={completedWorkouts}
        />
      )}
    </AppTabs>
  );
}

function DumbbellIcon() {
  return (
    <svg
      className="tab-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6.5 6.5v11M3.5 9v6M17.5 6.5v11M20.5 9v6M6.5 12h11" />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg
      className="tab-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5M12 7v5l3 2" />
    </svg>
  );
}

function AppTabs({
  tab,
  onTabChange,
  children,
}: {
  tab: Tab;
  onTabChange: (tab: Tab) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="tab-shell">
      {children}
      <nav className="tab-bar" aria-label="Navegação principal">
        <button
          type="button"
          aria-current={tab === "workouts" ? "page" : undefined}
          onClick={() => onTabChange("workouts")}
        >
          <DumbbellIcon />
          Treinos
        </button>
        <button
          type="button"
          aria-current={tab === "calendar" ? "page" : undefined}
          onClick={() => onTabChange("calendar")}
        >
          <HistoryIcon />
          Histórico
        </button>
      </nav>
    </div>
  );
}

const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];
function CalendarTab({
  workouts,
  completedWorkouts,
}: {
  workouts: Workout[];
  completedWorkouts: CompletedWorkout[];
}) {
  const today = new Date();
  const [view, setView] = useState(() => ({
    year: today.getFullYear(),
    month: today.getMonth(),
  }));
  const firstDay = new Date(view.year, view.month, 1).getDay();
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const isCurrentMonth =
    view.year === today.getFullYear() && view.month === today.getMonth();
  const completedInMonth = completedWorkouts.filter((completedWorkout) => {
    const completedAt = new Date(completedWorkout.completedAt);
    return (
      completedAt.getFullYear() === view.year &&
      completedAt.getMonth() === view.month
    );
  });
  const completedByDay = new Map<number, CompletedWorkout>();
  for (const completedWorkout of completedInMonth) {
    const completedAt = new Date(completedWorkout.completedAt);
    if (!completedByDay.has(completedAt.getDate())) {
      completedByDay.set(completedAt.getDate(), completedWorkout);
    }
  }
  const cells: (number | null)[] = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  function shiftMonth(delta: number) {
    setView((current) => {
      const next = new Date(current.year, current.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  }

  return (
    <main className="desk">
      <section className="sheet calendar-sheet">
        <header className="app-header">
          <div className="brand">
            <MarkerLogo />
            <span>Minha Ficha</span>
          </div>
          <p>histórico</p>
        </header>

        <div className="calendar-heading">
          <p className="kicker">Seu ritmo no papel</p>
          <h1>Histórico.</h1>
        </div>

        <div className="month-switcher">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            aria-label="Mês anterior"
          >
            ←
          </button>
          <div aria-live="polite">
            <strong>
              {MONTHS[view.month]} {view.year}
            </strong>
            <span>{completedInMonth.length} treinos concluídos</span>
          </div>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            aria-label="Próximo mês"
          >
            →
          </button>
        </div>

        <div
          className="calendar-grid"
          role="grid"
          aria-label={`${MONTHS[view.month]} de ${view.year}`}
        >
          {WEEKDAYS.map((weekday, index) => (
            <span
              className="weekday"
              role="columnheader"
              key={`${weekday}-${index}`}
            >
              {weekday}
            </span>
          ))}
          {cells.map((day, index) => {
            if (day === null)
              return <span role="gridcell" key={`empty-${index}`} />;

            const completedWorkout = completedByDay.get(day);
            const isToday = isCurrentMonth && day === today.getDate();
            return (
              <span
                className={`calendar-day${completedWorkout ? ` marker-color-${completedWorkout.color} is-complete` : ""}${isToday ? " is-today" : ""}`}
                role="gridcell"
                aria-label={
                  completedWorkout
                    ? `${day}, ${completedWorkout.workoutName} concluído`
                    : String(day)
                }
                key={day}
              >
                {day}
              </span>
            );
          })}
        </div>

        <div className="calendar-legend">
          <h2>Legenda</h2>
          {workouts.map((workout, index) => (
            <div key={`${workout.name}-${index}`}>
              <span
                className={`legend-marker marker-color-${workout.color}`}
                aria-hidden="true"
              />
              <p>
                <strong>{workout.name}</strong>
                <span> — {workout.focus}</span>
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function RestScreen({
  workout,
  exerciseIndex,
  setIndex,
  seconds,
  onClose,
}: {
  workout: Workout;
  exerciseIndex: number;
  setIndex: number;
  seconds: number;
  onClose: () => void;
}) {
  const exercise = workout.exercises[exerciseIndex];

  return (
    <main className={`desk active-workout-color marker-color-${workout.color}`}>
      <section className="sheet rest-sheet">
        <header className="focus-header">
          <button className="close-button" type="button" onClick={onClose}>
            <span aria-hidden="true">←</span> sair
          </button>
          <div>
            <span>{workout.name}</span>
            <strong>Intervalo</strong>
          </div>
        </header>

        <div className="rest-content">
          <p className="kicker">Série concluída</p>
          <h1>Respira.</h1>
          <strong className="rest-timer" aria-live="polite">
            00:{String(seconds).padStart(2, "0")}
          </strong>
          <p>
            A próxima é a série {setIndex + 1} de {exercise.sets} em{" "}
            {exercise.name}.
          </p>
        </div>
      </section>
    </main>
  );
}

function EvaluationScreen({
  workout,
  exerciseName,
  seconds,
  onSelect,
  onSkip,
}: {
  workout: Workout;
  exerciseName: string;
  seconds: number;
  onSelect: (rating: string) => void;
  onSkip: () => void;
}) {
  return (
    <main className={`desk active-workout-color marker-color-${workout.color}`}>
      <section className="sheet evaluation-sheet">
        <p className="kicker">Exercício concluído</p>
        <h1>Como sentiu a carga?</h1>
        <p>{exerciseName}</p>

        <div
          className="load-rating-options"
          aria-label="Avalie a carga do exercício"
        >
          {LOAD_RATINGS.map(({ emoji, label }) => (
            <button
              className="load-rating-option"
              type="button"
              key={label}
              onClick={() => onSelect(label)}
            >
              <span aria-hidden="true">{emoji}</span>
              <small>{label}</small>
            </button>
          ))}
        </div>

        <button className="evaluation-skip" type="button" onClick={onSkip}>
          Pular · continua em {seconds}s
        </button>
      </section>
    </main>
  );
}

type ExerciseDraft = Exercise;

function CreateWorkoutScreen({
  usedColors,
  isSaving,
  error,
  onCreate,
  onCancel,
}: {
  usedColors: MarkerColor[];
  isSaving: boolean;
  error: string | null;
  onCreate: (workout: NewWorkout) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [focus, setFocus] = useState("");
  const [color, setColor] = useState<MarkerColor | null>(
    () =>
      MARKER_COLORS.find((option) => !usedColors.includes(option.value))
        ?.value ?? null,
  );
  const [exercises, setExercises] = useState<ExerciseDraft[]>([
    { id: createUuidV7(), name: "", sets: 3, targetReps: 10 },
  ]);

  function updateExercise(
    id: Exercise["id"],
    changes: Partial<Omit<Exercise, "id">>,
  ) {
    setExercises((current) =>
      current.map((exercise) =>
        exercise.id === id ? { ...exercise, ...changes } : exercise,
      ),
    );
  }

  return (
    <main className="desk">
      <section className="sheet create-sheet">
        <header className="focus-header">
          <button className="close-button" type="button" onClick={onCancel}>
            <span aria-hidden="true">←</span> cancelar
          </button>
          <div>
            <span>Nova ficha</span>
            <strong>Monte seu treino</strong>
          </div>
        </header>

        <form
          className="create-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (color === null) return;

            onCreate({
              name: name.trim(),
              focus: focus.trim(),
              color,
              exercises: exercises.map(
                ({ name: exerciseName, sets, targetReps }) => ({
                  name: exerciseName.trim(),
                  sets,
                  targetReps,
                }),
              ),
            });
          }}
        >
          <div className="create-heading">
            <p className="kicker">Criar treino</p>
            <h1>Uma ficha do seu jeito.</h1>
          </div>

          <div className="create-basics">
            <label>
              <span>Nome do treino</span>
              <input
                required
                maxLength={40}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ex.: Treino B"
                autoFocus
              />
            </label>
            <label>
              <span>Foco</span>
              <input
                required
                maxLength={60}
                value={focus}
                onChange={(event) => setFocus(event.target.value)}
                placeholder="Ex.: Costas e bíceps"
              />
            </label>
          </div>

          <fieldset className="color-picker">
            <legend>Cor do marca-texto</legend>
            <div>
              {MARKER_COLORS.map((option) => {
                const isUsed = usedColors.includes(option.value);

                return (
                  <label
                    className={`marker-color marker-color-${option.value}`}
                    key={option.value}
                  >
                    <input
                      required
                      type="radio"
                      name="workout-color"
                      value={option.value}
                      checked={color === option.value}
                      disabled={isUsed}
                      onChange={() => setColor(option.value)}
                    />
                    <span aria-hidden="true" />
                    <small>
                      {isUsed ? `${option.label} · em uso` : option.label}
                    </small>
                  </label>
                );
              })}
            </div>
            {color === null ? <p>Todas as cores já estão em uso.</p> : null}
          </fieldset>

          <div className="exercise-editor">
            <div className="exercise-editor-heading">
              <h2>Exercícios</h2>
              <span>{exercises.length}</span>
            </div>

            {exercises.map((exercise, index) => (
              <fieldset className="exercise-draft" key={exercise.id}>
                <legend>{String(index + 1).padStart(2, "0")}</legend>
                <label className="exercise-name-field">
                  <span>Exercício</span>
                  <input
                    required
                    maxLength={60}
                    value={exercise.name}
                    onChange={(event) =>
                      updateExercise(exercise.id, { name: event.target.value })
                    }
                    placeholder="Nome do exercício"
                  />
                </label>
                <label>
                  <span>Séries</span>
                  <input
                    required
                    type="number"
                    inputMode="numeric"
                    min="1"
                    max="20"
                    value={exercise.sets}
                    onChange={(event) =>
                      updateExercise(exercise.id, {
                        sets: Number(event.target.value),
                      })
                    }
                  />
                </label>
                <label>
                  <span>Reps</span>
                  <input
                    required
                    type="number"
                    inputMode="numeric"
                    min="1"
                    max="100"
                    value={exercise.targetReps}
                    onChange={(event) =>
                      updateExercise(exercise.id, {
                        targetReps: Number(event.target.value),
                      })
                    }
                  />
                </label>
                {exercises.length > 1 ? (
                  <button
                    className="remove-exercise-button"
                    type="button"
                    aria-label={`Remover ${exercise.name || `exercício ${index + 1}`}`}
                    onClick={() =>
                      setExercises((current) =>
                        current.filter((item) => item.id !== exercise.id),
                      )
                    }
                  >
                    ×
                  </button>
                ) : null}
              </fieldset>
            ))}

            <button
              className="add-exercise-button"
              type="button"
              onClick={() =>
                setExercises((current) => [
                  ...current,
                  {
                    id: createUuidV7(),
                    name: "",
                    sets: 3,
                    targetReps: 10,
                  },
                ])
              }
            >
              <span aria-hidden="true">＋</span> adicionar exercício
            </button>
          </div>

          {error ? <p role="alert">{error}</p> : null}
          <button
            className="complete-button"
            type="submit"
            disabled={color === null || isSaving}
          >
            <span>{isSaving ? "Salvando…" : "Salvar treino"}</span>
            <span aria-hidden="true">→</span>
          </button>
        </form>
      </section>
    </main>
  );
}

function WorkoutList({
  workouts,
  onStart,
  onCreate,
}: {
  workouts: Workout[];
  onStart: (workout: Workout) => void;
  onCreate: () => void;
}) {
  return (
    <main className="desk">
      <section className="sheet workout-list">
        <header className="app-header">
          <div className="brand">
            <MarkerLogo />
            <span>Minha Ficha</span>
          </div>
          <p>ficha pessoal</p>
        </header>

        <div className="list-heading">
          <p className="kicker">Treinos disponíveis</p>
          <h1>Hora de treinar.</h1>
          <p>Escolha uma ficha e registre cada série conforme avança.</p>
        </div>

        <div className="workout-rows">
          {workouts.map((workout, index) => {
            const workoutSets = workout.exercises.reduce(
              (total, exercise) => total + exercise.sets,
              0,
            );

            return (
              <button
                className={`workout-row marker-color-${workout.color}`}
                type="button"
                key={workout.id}
                onClick={() => onStart(workout)}
              >
                <span className="workout-letter">
                  {String.fromCharCode(65 + (index % 26))}
                </span>
                <span className="workout-details">
                  <strong>{workout.name}</strong>
                  <span>{workout.focus}</span>
                  <small>
                    {workout.exercises.length} exercícios · {workoutSets} séries
                  </small>
                </span>
                <span className="row-action" aria-hidden="true">
                  iniciar ↗
                </span>
              </button>
            );
          })}
        </div>

        <button
          className="create-workout-button"
          type="button"
          onClick={onCreate}
        >
          <span aria-hidden="true">＋</span>
          criar novo treino
        </button>

        <p className="paper-note">Uma ficha por vez. Sem distrações.</p>
      </section>
    </main>
  );
}

function FocusScreen({
  workout,
  exerciseIndex,
  setIndex,
  entries,
  progress,
  weight,
  reps,
  onWeightChange,
  onRepsChange,
  onComplete,
  onClose,
}: {
  workout: Workout;
  exerciseIndex: number;
  setIndex: number;
  entries: Record<string, Entry>;
  progress: number;
  weight: string;
  reps: string;
  onWeightChange: (value: string) => void;
  onRepsChange: (value: string) => void;
  onComplete: () => void;
  onClose: () => void;
}) {
  const exercise = workout.exercises[exerciseIndex];
  const completedForExercise = Array.from({ length: setIndex }, (_, index) => ({
    index,
    entry: entries[`${exerciseIndex}-${index}`],
  }));

  return (
    <main className={`desk active-workout-color marker-color-${workout.color}`}>
      <section className="sheet focus-sheet">
        <header className="focus-header">
          <button className="close-button" type="button" onClick={onClose}>
            <span aria-hidden="true">←</span> sair
          </button>
          <div>
            <span>{workout.name}</span>
            <strong>{workout.focus}</strong>
          </div>
          <span className="exercise-count">
            {String(exerciseIndex + 1).padStart(2, "0")}/
            {String(workout.exercises.length).padStart(2, "0")}
          </span>
        </header>

        <div
          className="progress-track"
          aria-label={`${Math.round(progress)}% concluído`}
        >
          <span style={{ transform: `scaleX(${progress / 100})` }} />
        </div>

        <div className="focus-content">
          <div className="exercise-heading">
            <p>Exercício atual</p>
            <h1>{exercise.name}</h1>
            <span>
              Série {setIndex + 1} de {exercise.sets} · alvo{" "}
              {exercise.targetReps} reps
            </span>
          </div>

          {completedForExercise.length > 0 && (
            <ol className="completed-list" aria-label="Séries concluídas">
              {completedForExercise.map(({ index, entry }) => (
                <li key={index}>
                  <span>série {String(index + 1).padStart(2, "0")}</span>
                  <strong>{entry.weight ? `${entry.weight} kg` : "—"}</strong>
                  <strong>{entry.reps ? `${entry.reps} reps` : "—"}</strong>
                  <span aria-label="concluída">✓</span>
                </li>
              ))}
            </ol>
          )}

          <form
            className="set-form"
            onSubmit={(event) => {
              event.preventDefault();
              onComplete();
            }}
          >
            <div className="field-grid">
              <label>
                <span>Peso (opcional)</span>
                <span className="input-line">
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.5"
                    value={weight}
                    onChange={(event) => onWeightChange(event.target.value)}
                    placeholder="0"
                    autoFocus
                  />
                  <small>kg</small>
                </span>
              </label>
              <label>
                <span>Repetições (opcional)</span>
                <span className="input-line">
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    step="1"
                    value={reps}
                    onChange={(event) => onRepsChange(event.target.value)}
                    placeholder={String(exercise.targetReps)}
                  />
                  <small>reps</small>
                </span>
              </label>
            </div>

            <button className="complete-button" type="submit">
              <span>Concluir série</span>
              <span aria-hidden="true">→</span>
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

function DoneScreen({
  workout,
  feedback,
  onFeedbackChange,
  onContinue,
}: {
  workout: Workout;
  feedback: string | null;
  onFeedbackChange: (feedback: string) => void;
  onContinue: () => void;
}) {
  const feedbackOptions = [
    { emoji: "🫠", label: "Muito pesado" },
    { emoji: "😮‍💨", label: "Puxado" },
    { emoji: "😊", label: "Na medida" },
    { emoji: "🔥", label: "Mandou bem" },
  ];

  return (
    <main className={`desk active-workout-color marker-color-${workout.color}`}>
      <section className="sheet done-sheet">
        <MarkerLogo />
        <p className="kicker">Ficha preenchida</p>
        <h1>Treino concluído.</h1>
        <p>As séries desta sessão ficaram registradas durante o treino.</p>

        <fieldset className="feedback-fieldset">
          <legend>Como foi o treino?</legend>
          <div className="feedback-options">
            {feedbackOptions.map(({ emoji, label }) => (
              <button
                className="feedback-option"
                type="button"
                key={label}
                aria-pressed={feedback === label}
                onClick={() => onFeedbackChange(label)}
              >
                <span aria-hidden="true">{emoji}</span>
                <small>{label}</small>
              </button>
            ))}
          </div>
          <p className="feedback-status" aria-live="polite">
            {feedback
              ? "Valeu pelo feedback!"
              : "Toque em uma opção para responder."}
          </p>
        </fieldset>

        <button className="complete-button" type="button" onClick={onContinue}>
          <span>Ver resumo</span>
          <span aria-hidden="true">→</span>
        </button>
      </section>
    </main>
  );
}

function SummaryScreen({
  workout,
  entries,
  exerciseRatings,
  feedback,
  isSaving,
  error,
  onClose,
}: {
  workout: Workout;
  entries: Record<string, Entry>;
  exerciseRatings: Record<number, string>;
  feedback: string | null;
  isSaving: boolean;
  error: string | null;
  onClose: () => void;
}) {
  const totalSets = workout.exercises.reduce(
    (total, exercise) => total + exercise.sets,
    0,
  );

  return (
    <main className={`desk active-workout-color marker-color-${workout.color}`}>
      <section className="sheet summary-sheet">
        <header className="summary-header">
          <div>
            <p className="kicker">Resumo do treino</p>
            <h1>{workout.name}</h1>
            <p>{workout.focus}</p>
          </div>
          <strong>{totalSets} séries</strong>
        </header>

        <div className="summary-exercises">
          {workout.exercises.map((exercise, exerciseIndex) => {
            const rating = exerciseRatings[exerciseIndex];
            const ratingEmoji = LOAD_RATINGS.find(
              (option) => option.label === rating,
            )?.emoji;

            return (
              <section className="summary-exercise" key={exercise.id}>
                <div className="summary-exercise-heading">
                  <span>{String(exerciseIndex + 1).padStart(2, "0")}</span>
                  <h2>{exercise.name}</h2>
                  {ratingEmoji && (
                    <span
                      className="summary-rating"
                      aria-label={`Carga ${rating}`}
                    >
                      {ratingEmoji}
                    </span>
                  )}
                </div>
                <ol>
                  {Array.from({ length: exercise.sets }, (_, setIndex) => {
                    const entry = entries[`${exerciseIndex}-${setIndex}`];

                    return (
                      <li key={setIndex}>
                        <span>Série {setIndex + 1}</span>
                        <strong>
                          {entry?.weight ? `${entry.weight} kg` : "—"}
                        </strong>
                        <strong>
                          {entry?.reps ? `${entry.reps} reps` : "—"}
                        </strong>
                      </li>
                    );
                  })}
                </ol>
              </section>
            );
          })}
        </div>

        {feedback && <p className="summary-feedback">Como foi: {feedback}</p>}

        {error ? <p role="alert">{error}</p> : null}
        <button
          className="complete-button"
          type="button"
          onClick={onClose}
          disabled={isSaving}
        >
          <span>{isSaving ? "Salvando…" : "Voltar às fichas"}</span>
          <span aria-hidden="true">→</span>
        </button>
      </section>
    </main>
  );
}
