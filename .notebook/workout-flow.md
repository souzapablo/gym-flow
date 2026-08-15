# Workout Flow
> In-memory workout creation, selection, execution, and summary

Entry: `src/components/workout-app.tsx:WorkoutApp()`
Flow: list → create/select workout → sets/rest/evaluation → feedback → summary

Model: `src/lib/workout.ts`
- `Workout.color` must be unique among the current in-memory workout list
- Marker palette: yellow, pink, blue, green, orange

Creation: `src/components/workout-app.tsx:CreateWorkoutScreen()`
- Dynamic exercise rows; native required/min/max validation
- Used marker colors disabled; save disabled when palette exhausted
- State is intentionally client-memory only; refresh restores `TEST_WORKOUT`

Styling: `src/app/globals.css`
- `marker-color-*` classes set `--workout-color` for cards and picker swatches
- Active workout maps `--workout-color` to `--training-accent` for set highlights

Updated: 2026-08-15
