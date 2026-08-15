# Gym Flow

A small personal workout app built with Next.js and Neon Postgres.

## Run locally

1. Copy `.env.example` to `.env.local`.
2. Replace `DATABASE_URL` with your Neon connection string.
3. Start the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The database client lives in `src/lib/db.ts`. Import `db()` only from server-side
code such as Server Components, Route Handlers, or Server Actions.
