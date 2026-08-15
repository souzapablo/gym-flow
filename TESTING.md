# Testing strategy

Gym Flow follows the testing honeycomb. Integration tests provide most of the
coverage. Unit tests isolate dense rules and edge-case matrices. End-to-end
tests cover only three critical browser journeys.

## Approved tools

- Vitest runs the unit, component integration, and database integration
  projects.
- Drizzle ORM with `node-postgres` provides the shared production and test
  database boundary over TCP.
- Testcontainers starts an isolated `postgres:18-alpine` database for database
  integration and end-to-end tests.
- React Testing Library and `user-event` exercise client behavior through
  accessible interactions.
- Playwright exercises the three browser journeys: loading workouts, creating
  a workout, and completing a workout session.

Database-dependent Next.js code must run on the Node.js runtime. Production
must use a pooled Neon TCP `DATABASE_URL`; the application pool is separate
from every test database.

## Required workflow

For every application behavior change:

1. Identify the user-visible behavior or business rule that can regress.
2. Add or update the smallest integration test that proves the behavior across
   the relevant boundaries.
3. Add unit tests only when the unit-test criteria below apply.
4. Run the relevant tests, lint, type checking, and production build before
   declaring the change complete.

Include required behavioral tests in the same change as the behavior. A change
is not complete when those tests are missing or failing. A bug fix must include
a regression test that fails without the fix.

## Integration tests are the default

Test behavior through the most stable public boundary available, such as a
Server Action, data function, or rendered component. Prefer integration tests
for:

- Server Actions, including validation, current-user resolution, persistence,
  returned results, failures, and path revalidation.
- Data access, including queries, writes, ownership constraints, row mapping,
  ordering, and transaction behavior.
- Components with meaningful interaction across state, validation, and action
  boundaries.
- Complete operations such as creating a workout or saving a workout session.

Database integration tests use one PostgreSQL Testcontainer per suite. The
suite applies every `migrations/*.sql` file once in lexical order, executes
test files without file-level parallelism, and resets mutable tables before
each test. Each test inserts its own scenario data and must not depend on
execution order or shared fixtures. The suite closes database clients and
stops the container during teardown.

The PostgreSQL image must remain pinned to `postgres:18-alpine`, matching the
production Neon major version. Update the pin when production changes major
version.

## Unit tests are selective

Add a unit test when at least one condition applies:

- The code expresses a rule with several inputs, branches, or edge cases.
- The code is a pure transformation or parser whose full input matrix would
  make an integration test slow or hard to diagnose.
- A failure path is impractical to reproduce through an integration boundary.
- A focused regression test communicates an isolated defect more clearly.

The parsers in `src/lib/workout-validation.ts` are good unit-test candidates.
Type declarations, trivial accessors, framework delegation, and implementation
details do not need isolated tests.

Unit tests must run without Docker, PostgreSQL, or Neon credentials.

## End-to-end tests are thin

Playwright covers only these critical journeys:

1. Load the application with a seeded workout.
2. Create a workout and observe it after the Server Action and route
   revalidation complete.
3. Complete a workout session and observe it in history.

Run browser scenarios sequentially against scenario-specific data in an
isolated PostgreSQL Testcontainer. Do not repeat validation matrices, SQL edge
cases, or internal assertions already covered by lower-level tests. Async
Server Components are covered at this layer because Vitest does not fully
support them.

## Mocking boundaries

Mock only boundaries that are slow, nondeterministic, unavailable in the test
environment, or outside this application's control.

- Component integration tests fake the Server Action boundary.
- Server Action integration tests may mock only the Next.js revalidation
  boundary.
- Data integration tests use real PostgreSQL and never mock query results or
  internal collaborators.
- Control time, randomness, generated identifiers, and external responses when
  they affect a result.

Do not weaken production code or expose private functions only for tests.

## Database safety

Automated tests must never connect to or reset a development or production
database. Test setup supplies the Testcontainer URI explicitly and never
selects a test database from `NODE_ENV` alone.

The reset helper must refuse cleanup unless all conditions hold:

- Suite setup supplied a non-empty, suite-generated proof value.
- The database name is exactly `gym_flow_test`.
- The connection URI differs from the configured production `DATABASE_URL`.

If Docker is unavailable, a migration fails, or the reset proof is invalid,
setup must stop with the originating error before behavior tests run. A
migration error must identify the failing filename.

## Test design

- Assert observable outcomes, persisted state, emitted errors, or accessible UI
  behavior. Do not assert private call order or internal implementation details.
- Name tests by behavior and condition, such as
  `rejects a session with an exercise owned by another user`.
- Cover the successful path, meaningful boundary values, and important failure
  paths. Do not chase line coverage with low-value assertions.
- Keep setup local and explicit. Use small factories for valid default data,
  and override only fields relevant to the scenario.
- Avoid snapshots for business behavior. Use explicit assertions.
- Do not add a unit test when an existing integration test proves the behavior
  clearly and cheaply.

## Placement and naming

Co-locate tests with the code they cover unless the runner requires a shared
location. Use these suffixes:

- `*.unit.test.ts` or `*.unit.test.tsx` for unit tests.
- `*.integration.test.ts` or `*.integration.test.tsx` for integration tests.
- `*.spec.ts` for Playwright journeys under `test/e2e/`.

Shared database lifecycle, factories, and environment setup belong under
`test/`.

## Commands

Use these public commands after the testing toolchain is installed:

| Command | Purpose | Docker required |
| ------- | ------- | --------------- |
| `npm run test:unit` | Run unit tests once. | No |
| `npm run test:component` | Run component integration tests once. | No |
| `npm run test:integration` | Run database integration tests once. | Yes |
| `npm run test:e2e` | Run the three Playwright journeys once. | Yes |
| `npm run test:vitest` | Run all non-browser Vitest projects once. | Yes |
| `npm run test:watch` | Run the local Vitest watch loop. | Depends on project |
| `npm test` | Run unit, component, database, and browser suites once. | Yes |
| `npm run lint` | Run ESLint. | No |
| `npm run typecheck` | Run TypeScript without emitting files. | No |
| `npm run build` | Build the production application. | No |
| `npm run check` | Run lint, type checking, all tests, and build. | Yes |

All CI and complete-suite commands must run in non-watch mode and exit non-zero
on failure.

## Continuous integration

Continuous integration runs from a clean install with Docker available. It
installs the required Playwright browser and system dependencies, then runs
`npm run check`. CI does not require Neon credentials because database and
browser tests use the isolated Testcontainer URI.
