"use client";

import { useCallback, useEffect, useState } from "react";
import { TEST_WORKOUT } from "@/lib/workout";

type Entry = {
  weight: string;
  reps: string;
};

type Screen = "list" | "focus" | "evaluate" | "rest" | "done" | "summary";

const TEST_REST_SECONDS = 5;
const EVALUATION_SECONDS = 5;
const LOAD_RATINGS = [
  { emoji: "😌", label: "Leve" },
  { emoji: "💪", label: "Ideal" },
  { emoji: "🫠", label: "Pesada" },
];

const totalSets = TEST_WORKOUT.exercises.reduce(
  (total, exercise) => total + exercise.sets,
  0,
);

function MarkerLogo() {
  return (
    <span className="marker-logo" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

export function WorkoutApp() {
  const [screen, setScreen] = useState<Screen>("list");
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [setIndex, setSetIndex] = useState(0);
  const [entries, setEntries] = useState<Record<string, Entry>>({});
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [restSeconds, setRestSeconds] = useState(TEST_REST_SECONDS);
  const [evaluationSeconds, setEvaluationSeconds] = useState(EVALUATION_SECONDS);
  const [exerciseRatings, setExerciseRatings] = useState<Record<number, string>>({});
  const [workoutFeedback, setWorkoutFeedback] = useState<string | null>(null);

  const exercise = TEST_WORKOUT.exercises[exerciseIndex];
  const completedSets = TEST_WORKOUT.exercises
    .slice(0, exerciseIndex)
    .reduce((total, item) => total + item.sets, 0) + setIndex;
  const progress = (completedSets / totalSets) * 100;

  const finishExercise = useCallback(() => {
    const isLastExercise = exerciseIndex === TEST_WORKOUT.exercises.length - 1;

    if (isLastExercise) {
      setScreen("done");
      return;
    }

    setWeight("");
    setReps("");
    setExerciseIndex((current) => current + 1);
    setSetIndex(0);
    setRestSeconds(TEST_REST_SECONDS);
    setScreen("rest");
  }, [exerciseIndex]);

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

  function startWorkout() {
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
    setScreen("list");
  }

  function completeSet() {
    const entryKey = `${exerciseIndex}-${setIndex}`;
    setEntries((current) => ({
      ...current,
      [entryKey]: { weight, reps },
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

  if (screen === "focus") {
    return (
      <FocusScreen
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

  if (screen === "done") {
    return (
      <DoneScreen
        feedback={workoutFeedback}
        onFeedbackChange={setWorkoutFeedback}
        onContinue={() => setScreen("summary")}
      />
    );
  }

  if (screen === "summary") {
    return (
      <SummaryScreen
        entries={entries}
        exerciseRatings={exerciseRatings}
        feedback={workoutFeedback}
        onClose={closeWorkout}
      />
    );
  }

  if (screen === "evaluate") {
    return (
      <EvaluationScreen
        exerciseName={exercise.name}
        seconds={evaluationSeconds}
        onSelect={(rating) => {
          setExerciseRatings((current) => ({ ...current, [exerciseIndex]: rating }));
          finishExercise();
        }}
        onSkip={finishExercise}
      />
    );
  }

  if (screen === "rest") {
    return (
      <RestScreen
        exerciseIndex={exerciseIndex}
        setIndex={setIndex}
        seconds={restSeconds}
        onClose={closeWorkout}
      />
    );
  }

  return <WorkoutList onStart={startWorkout} />;
}

function RestScreen({
  exerciseIndex,
  setIndex,
  seconds,
  onClose,
}: {
  exerciseIndex: number;
  setIndex: number;
  seconds: number;
  onClose: () => void;
}) {
  const exercise = TEST_WORKOUT.exercises[exerciseIndex];

  return (
    <main className="desk">
      <section className="sheet rest-sheet">
        <header className="focus-header">
          <button className="close-button" type="button" onClick={onClose}>
            <span aria-hidden="true">←</span> sair
          </button>
          <div>
            <span>{TEST_WORKOUT.name}</span>
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
            A próxima é a série {setIndex + 1} de {exercise.sets} em {exercise.name}.
          </p>
        </div>
      </section>
    </main>
  );
}

function EvaluationScreen({
  exerciseName,
  seconds,
  onSelect,
  onSkip,
}: {
  exerciseName: string;
  seconds: number;
  onSelect: (rating: string) => void;
  onSkip: () => void;
}) {
  return (
    <main className="desk">
      <section className="sheet evaluation-sheet">
        <p className="kicker">Exercício concluído</p>
        <h1>Como sentiu a carga?</h1>
        <p>{exerciseName}</p>

        <div className="load-rating-options" aria-label="Avalie a carga do exercício">
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

function WorkoutList({ onStart }: { onStart: () => void }) {
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

        <button className="workout-row" type="button" onClick={onStart}>
          <span className="workout-letter">A</span>
          <span className="workout-details">
            <strong>{TEST_WORKOUT.name}</strong>
            <span>{TEST_WORKOUT.focus}</span>
            <small>
              {TEST_WORKOUT.exercises.length} exercícios · {totalSets} séries
            </small>
          </span>
          <span className="row-action" aria-hidden="true">
            iniciar ↗
          </span>
        </button>

        <p className="paper-note">Uma ficha por vez. Sem distrações.</p>
      </section>
    </main>
  );
}

function FocusScreen({
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
  const exercise = TEST_WORKOUT.exercises[exerciseIndex];
  const completedForExercise = Array.from({ length: setIndex }, (_, index) => ({
    index,
    entry: entries[`${exerciseIndex}-${index}`],
  }));

  return (
    <main className="desk">
      <section className="sheet focus-sheet">
        <header className="focus-header">
          <button className="close-button" type="button" onClick={onClose}>
            <span aria-hidden="true">←</span> sair
          </button>
          <div>
            <span>{TEST_WORKOUT.name}</span>
            <strong>{TEST_WORKOUT.focus}</strong>
          </div>
          <span className="exercise-count">
            {String(exerciseIndex + 1).padStart(2, "0")}/
            {String(TEST_WORKOUT.exercises.length).padStart(2, "0")}
          </span>
        </header>

        <div className="progress-track" aria-label={`${Math.round(progress)}% concluído`}>
          <span style={{ transform: `scaleX(${progress / 100})` }} />
        </div>

        <div className="focus-content">
          <div className="exercise-heading">
            <p>Exercício atual</p>
            <h1>{exercise.name}</h1>
            <span>
              Série {setIndex + 1} de {exercise.sets} · alvo {exercise.targetReps} reps
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
  feedback,
  onFeedbackChange,
  onContinue,
}: {
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
    <main className="desk">
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
            {feedback ? "Valeu pelo feedback!" : "Toque em uma opção para responder."}
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
  entries,
  exerciseRatings,
  feedback,
  onClose,
}: {
  entries: Record<string, Entry>;
  exerciseRatings: Record<number, string>;
  feedback: string | null;
  onClose: () => void;
}) {
  return (
    <main className="desk">
      <section className="sheet summary-sheet">
        <header className="summary-header">
          <div>
            <p className="kicker">Resumo do treino</p>
            <h1>{TEST_WORKOUT.name}</h1>
            <p>{TEST_WORKOUT.focus}</p>
          </div>
          <strong>{totalSets} séries</strong>
        </header>

        <div className="summary-exercises">
          {TEST_WORKOUT.exercises.map((exercise, exerciseIndex) => {
            const rating = exerciseRatings[exerciseIndex];
            const ratingEmoji = LOAD_RATINGS.find((option) => option.label === rating)?.emoji;

            return (
              <section className="summary-exercise" key={exercise.name}>
                <div className="summary-exercise-heading">
                  <span>{String(exerciseIndex + 1).padStart(2, "0")}</span>
                  <h2>{exercise.name}</h2>
                  {ratingEmoji && (
                    <span className="summary-rating" aria-label={`Carga ${rating}`}>
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
                        <strong>{entry?.weight ? `${entry.weight} kg` : "—"}</strong>
                        <strong>{entry?.reps ? `${entry.reps} reps` : "—"}</strong>
                      </li>
                    );
                  })}
                </ol>
              </section>
            );
          })}
        </div>

        {feedback && <p className="summary-feedback">Como foi: {feedback}</p>}

        <button className="complete-button" type="button" onClick={onClose}>
          <span>Voltar às fichas</span>
          <span aria-hidden="true">→</span>
        </button>
      </section>
    </main>
  );
}
