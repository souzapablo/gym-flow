# Gym Flow

A small personal workout app built with Next.js and Neon Postgres.

## Run locally

1. Copy `.env.example` to `.env.local`.
2. Replace `DATABASE_URL` with your Neon connection string.
3. Run `migrations/001_initial.sql` against the Neon database.
4. Start the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Without `.env.local`, the app stays in local prototype mode and uses fixture data.
When `DATABASE_URL` is configured, workouts and completed sessions are loaded from
Postgres and mutations are persisted through Server Actions.

Database access is isolated in `src/data/workouts.ts`. The temporary single-user
resolver lives in `src/lib/owner.ts`; replace it with the selected authentication
provider before exposing the app to multiple users.
