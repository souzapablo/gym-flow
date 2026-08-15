# Workout Flow
> In-memory workout creation, selection, execution, and summary

Entry: `src/components/workout-app.tsx:WorkoutApp()`
Flow: list → create/select workout → sets/rest/evaluation → feedback → summary

Navigation: `src/components/workout-app.tsx:AppTabs()`
- Bottom tabs switch between the workout list and calendar while no workout flow is active
- Active create/focus/rest/evaluation/summary screens intentionally hide the tab bar

History: `src/components/workout-app.tsx:CalendarTab()`
- Month navigation and marker-color legend reuse the in-memory `Workout` model
- Completed days are sample data for the current month; no persistence exists yet

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
