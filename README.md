# Gym Flow

A small personal workout app built with Next.js and Neon Postgres.

## Prerequisites

Install these tools before working with the repository:

- Node.js 20.9 or newer and npm.
- Docker Desktop or another Docker-compatible runtime for database integration
  and end-to-end tests.
- The Playwright Chromium browser and its system dependencies for end-to-end
  tests.

Install project dependencies and the Playwright browser after cloning:

```bash
npm ci
npx playwright install --with-deps chromium
```

Start Docker before running database integration, end-to-end, complete-suite,
or quality-gate commands. Unit and component tests do not require Docker.

## Run locally

1. Copy `.env.example` to `.env.local`.
2. Replace `DATABASE_URL` with your Neon connection string.
3. Run the SQL files in `migrations/` in numeric order against the Neon database.
4. Start the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

`DATABASE_URL` is required. Workouts and completed sessions are loaded from
Postgres, and mutations are persisted through Server Actions.

Database access is isolated in `src/data/`. The temporary single-user resolver
lives in `src/lib/owner.ts`; replace it with the selected authentication provider
before exposing the app to multiple users. Authorization attributes and policies
will be added when professional and trainee capabilities diverge.

## Run tests

Automated tests never use Neon credentials. Integration and end-to-end setup
creates an isolated PostgreSQL container, applies the repository migrations,
and destroys the test database after the suite. Keep your production or
development `DATABASE_URL` separate from test configuration.

Use the command that matches the change:

| Command | Runs |
| ------- | ---- |
| `npm run test:unit` | Unit tests without Docker. |
| `npm run test:component` | Client component integration tests without Docker. |
| `npm run test:integration` | Database integration tests with Docker. |
| `npm run test:e2e` | Playwright browser journeys with Docker. |
| `npm run test:vitest` | All non-browser Vitest projects. |
| `npm run test:watch` | The local Vitest watch loop. |
| `npm test` | The complete non-watch test suite. |
| `npm run lint` | ESLint. |
| `npm run typecheck` | TypeScript checks without output. |
| `npm run build` | The production Next.js build. |
| `npm run check` | Lint, type checking, all tests, and the production build. |

Continuous integration performs a clean install, installs Playwright Chromium,
uses Docker for isolated PostgreSQL, and runs `npm run check`. It does not need
a Neon credential.

Read the authoritative [testing strategy](TESTING.md) before adding or changing
application behavior. It defines test selection, naming, placement, database
safety, lifecycle, mocking boundaries, and required gates.
