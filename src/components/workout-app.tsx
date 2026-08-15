"use client";

import { useState } from "react";
import { TEST_WORKOUT } from "@/lib/workout";

type Entry = {
  weight: string;
  reps: string;
};

type Screen = "list" | "focus" | "done";

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

  const exercise = TEST_WORKOUT.exercises[exerciseIndex];
  const completedSets = TEST_WORKOUT.exercises
    .slice(0, exerciseIndex)
    .reduce((total, item) => total + item.sets, 0) + setIndex;
  const progress = (completedSets / totalSets) * 100;

  function startWorkout() {
    setExerciseIndex(0);
    setSetIndex(0);
    setEntries({});
    setWeight("");
    setReps("");
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
    const isLastExercise = exerciseIndex === TEST_WORKOUT.exercises.length - 1;

    if (isLastSet && isLastExercise) {
      setScreen("done");
      return;
    }

    if (isLastSet) {
      setExerciseIndex((current) => current + 1);
      setSetIndex(0);
    } else {
      setSetIndex((current) => current + 1);
    }

    setWeight("");
    setReps("");
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
    return <DoneScreen onClose={closeWorkout} />;
  }

  return <WorkoutList onStart={startWorkout} />;
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
  const canComplete = weight !== "" && reps !== "";
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
                  <strong>{entry.weight} kg</strong>
                  <strong>{entry.reps} reps</strong>
                  <span aria-label="concluída">✓</span>
                </li>
              ))}
            </ol>
          )}

          <form
            className="set-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (canComplete) onComplete();
            }}
          >
            <div className="field-grid">
              <label>
                <span>Peso</span>
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
                <span>Repetições</span>
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

            <button className="complete-button" type="submit" disabled={!canComplete}>
              <span>Concluir série</span>
              <span aria-hidden="true">→</span>
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

function DoneScreen({ onClose }: { onClose: () => void }) {
  return (
    <main className="desk">
      <section className="sheet done-sheet">
        <MarkerLogo />
        <p className="kicker">Ficha preenchida</p>
        <h1>Treino concluído.</h1>
        <p>As séries desta sessão ficaram registradas durante o treino.</p>
        <button className="complete-button" type="button" onClick={onClose}>
          <span>Voltar às fichas</span>
          <span aria-hidden="true">→</span>
        </button>
      </section>
    </main>
  );
}
