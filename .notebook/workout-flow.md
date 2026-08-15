# Workout Flow
> PostgreSQL-backed workout creation, selection, execution, and summary

Entry: `src/components/workout-app.tsx:WorkoutApp()`
Flow: list → create/select workout → sets/rest/evaluation → feedback → summary

Navigation: `src/components/workout-app.tsx:AppTabs()`
- Bottom tabs switch between the workout list and calendar while no workout flow is active
- Active create/focus/rest/evaluation/summary screens intentionally hide the tab bar

History: `src/components/workout-app.tsx:CalendarTab()`
- Month navigation and marker-color legend reuse the in-memory `Workout` model
- Completed days come from PostgreSQL-backed workout sessions

Model: `src/lib/workout.ts`
- `Workout.color` is unique per owner, enforced by `migrations/001_initial.sql`
- Marker palette: yellow, pink, blue, green, orange

Creation: `src/components/workout-app.tsx:CreateWorkoutScreen()`
- Dynamic exercise rows; native required/min/max validation
- Used marker colors disabled; save disabled when palette exhausted
- Server Actions validate and persist new workouts and completed sessions

Persistence: `src/data/workouts.ts`
- `src/app/page.tsx:Home()` loads workouts and completed sessions for the current owner
- `DATABASE_URL` is required; there is no fixture or in-memory fallback

Styling: `src/app/globals.css`
- `marker-color-*` classes set `--workout-color` for cards and picker swatches
- Active workout maps `--workout-color` to `--training-accent` for set highlights

Updated: 2026-08-15
