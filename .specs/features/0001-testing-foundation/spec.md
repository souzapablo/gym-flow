# Testing foundation specification

## Problem Statement

Gym Flow has no executable test infrastructure or automated behavioral tests.
Agents need a documented, reproducible testing contract that uses Drizzle for
typed database access, Testcontainers for real PostgreSQL integration tests,
and focused unit tests only where isolation improves coverage or diagnosis.

## Goals

- [ ] Document the approved tools, boundaries, commands, and safety rules.
- [ ] Run integration tests against an isolated PostgreSQL Testcontainer.
- [ ] Use Drizzle with node-postgres over TCP for all production and integration
      database access.
- [ ] Cover the current validation, data, Server Action, and interactive client
      behavior with integration-first tests.
- [ ] Cover critical Next.js application wiring with a thin Playwright
      end-to-end suite.
- [ ] Provide deterministic local and continuous-integration commands.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Production database migration execution | Local implementation must not change an external database. |
| Replacing Neon | Neon remains the production PostgreSQL provider. |
| New product behavior | The adoption verifies existing behavior only. |
| Coverage percentage threshold | Behavioral coverage is required before selecting a numeric target. |
| Parallel database integration tests | Sequential execution is the safe initial isolation model. |

---

## Assumptions & Open Questions

Every ambiguity is resolved or recorded here.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Delivery order | Documentation, infrastructure, then current-project tests | The user explicitly selected this sequence. | Yes |
| Query layer | Use Drizzle for production and integration database access | One query layer provides typed access across both supported transports. | Yes |
| Production transport | Use Drizzle's node-postgres adapter over TCP with Neon's pooled connection URL | It provides full PostgreSQL behavior and matches the integration-test driver. | Yes |
| Integration transport | Use Drizzle's node-postgres adapter with Testcontainers | A PostgreSQL Testcontainer exposes TCP, not Neon's HTTP protocol. | Yes |
| Migration ownership | Keep the existing ordered SQL files as the source of truth | This avoids rewriting migration history during test adoption. | Yes |
| Integration isolation | Use one container per suite, sequential tests, and database reset before each test | This is deterministic and avoids cross-connection transaction assumptions. | Yes |
| PostgreSQL image | Pin Testcontainers to `postgres:18-alpine` | PostgreSQL 18 matches the deployed Neon major version confirmed by the user. | Yes |
| Test framework | Use Vitest projects with Testing Library for client behavior | This matches the installed Next.js guidance and supports separate environments. | Yes |
| End-to-end scope | Use Playwright for three critical user journeys after integration coverage exists | A thin browser layer verifies Next.js wiring without duplicating lower-level coverage. | Yes |

**Open questions:** none.

---

## User Stories

### P1: Agent testing contract

**User story**: As a coding agent, I want one authoritative testing guide so
that I select the right test type and run the correct gates for every change.

**Why P1**: Infrastructure and tests must conform to an agreed contract before
they are introduced.

**Acceptance criteria**:

1. The repository SHALL document Vitest, Drizzle, Testcontainers PostgreSQL,
   node-postgres, React Testing Library, user-event, and Playwright as the
   approved testing tools.
2. The repository SHALL document integration tests as the default, unit tests
   as selective coverage for isolated rules and edge-case matrices, and
   end-to-end tests as a thin critical-journey layer.
3. The repository SHALL document test naming, placement, database lifecycle,
   reset behavior, mocking boundaries, Docker prerequisites, and CI behavior.
4. The repository SHALL define commands for unit tests, integration tests,
   end-to-end tests, watch mode, the complete suite, lint, type checking, and
   the production build.
5. WHEN an agent changes application behavior THEN the repository SHALL require
   the matching behavioral test in the same change.

**Independent test**: Inspect the testing guide and verify that every named
tool, boundary, command, and lifecycle rule is explicit and internally
consistent.

### P1: Executable test infrastructure

**User story**: As a developer, I want isolated test infrastructure so that I
can run deterministic tests without Neon credentials or shared database state.

**Why P1**: Real integration tests cannot run safely until the database and
runner lifecycles are controlled.

**Acceptance criteria**:

1. WHEN production code creates or executes a database query THEN the system
   SHALL use Drizzle with node-postgres over TCP and `DATABASE_URL`.
2. WHEN integration setup creates a database client THEN the system SHALL use
   Drizzle with node-postgres and the Testcontainer connection URI.
3. Production and integration data functions SHALL use the same Drizzle
   node-postgres database type.
4. WHILE production database code runs, the application SHALL use the Next.js
   Node.js runtime and one module-scoped connection pool limited to five
   connections per application instance.
5. IF the production `DATABASE_URL` does not identify a Neon pooled endpoint
   THEN production configuration validation SHALL reject it with an actionable
   error.
6. WHEN the integration suite starts THEN the system SHALL start one pinned
   PostgreSQL container and apply every `migrations/*.sql` file once in lexical
   filename order.
7. WHEN an integration test starts THEN the system SHALL reset mutable tables
   before inserting scenario-specific fixtures.
8. WHEN the integration suite finishes THEN the system SHALL close database
   clients and stop its PostgreSQL container.
9. IF Docker is unavailable or a migration fails THEN the integration suite
   SHALL fail with the originating setup error and execute no tests.
10. IF the integration database URI was not created by suite setup THEN the
   reset helper SHALL refuse to modify the database.
11. WHILE integration tests share one database container, the test runner SHALL
   execute them without file-level parallelism.
12. WHEN a developer runs the complete test command THEN the system SHALL run
    unit, integration, and end-to-end tests in non-watch mode.
13. WHEN continuous integration runs the quality gate THEN the system SHALL run
    lint, type checking, all tests, and the production build.

**Independent test**: Start the suite with Docker, prove migrations created the
schema, prove reset removes scenario data, and verify teardown removes the
container without any Neon credential.

### P1: Current behavior coverage

**User story**: As a maintainer, I want tests around the existing behavior so
that refactoring the database layer does not introduce regressions.

**Why P1**: The infrastructure earns its cost only when it protects the
application's current business behavior.

**Acceptance criteria**:

1. WHEN valid or invalid workout input reaches the validation parsers THEN the
   unit suite SHALL assert every accepted boundary and every rejection rule
   encoded in `src/lib/workout-validation.ts`.
2. WHEN user data functions query PostgreSQL THEN the integration suite SHALL
   verify found-user and missing-user results.
3. WHEN workout data functions create or list workouts THEN the integration
   suite SHALL verify persistence, row mapping, exercise ordering, owner
   isolation, and empty results.
4. WHEN a workout session is saved or listed THEN the integration suite SHALL
   verify atomic persistence, nullable values, chronological ordering, owner
   isolation, and rejection of foreign workouts or exercises.
5. WHEN a Server Action receives valid input THEN the integration suite SHALL
   verify validation, current-owner resolution, real persistence, its return
   value, and path revalidation where applicable.
6. IF a Server Action receives invalid or unauthorized input THEN the
   integration suite SHALL verify no partial persistence and no successful path
   revalidation.
7. WHEN a user interacts with the existing workout client THEN component
   integration tests SHALL verify the observable form, set-completion, loading,
   success, and failure behavior that the component currently exposes.
8. WHILE component integration tests run THEN the suite SHALL mock the Server
   Action boundary and SHALL assert accessible roles, labels, and visible
   outcomes instead of implementation details.
9. The integration suite SHALL use real PostgreSQL for data functions and SHALL
   not mock database query results.

**Independent test**: Run the unit and integration projects from a clean clone
with Docker and observe all specified current behaviors pass without Neon
credentials.

### P2: Critical browser journeys

**User story**: As a maintainer, I want a small browser-level safety net so that
Next.js routing, Server Components, Server Actions, cache revalidation, and
client hydration are proven to work together.

**Why P2**: Integration tests remain the primary suite, but they cannot prove
the complete framework and browser wiring.

**Acceptance criteria**:

1. WHEN Playwright opens the application with seeded workout data THEN the
   end-to-end suite SHALL verify that the workout list is visible in the
   browser.
2. WHEN a browser user creates a valid workout THEN the end-to-end suite SHALL
   verify that the created workout becomes visible after the Server Action
   completes and the route revalidates.
3. WHEN a browser user completes a workout session THEN the end-to-end suite
   SHALL verify that the completed workout becomes visible in completion
   history.
4. WHILE end-to-end tests run, the system SHALL use an isolated
   Testcontainers-backed PostgreSQL database and SHALL not use Neon credentials.
5. WHILE end-to-end tests run, the test runner SHALL execute browser scenarios
   sequentially against scenario-specific seeded data.
6. The end-to-end suite SHALL assert user-visible behavior and SHALL not repeat
   validation matrices, SQL edge cases, or internal call assertions covered by
   unit and integration tests.
7. IF the application server, browser, or PostgreSQL container fails to start
   THEN the end-to-end command SHALL exit non-zero and report the originating
   startup failure.

**Independent test**: Run the Playwright project from a clean clone with Docker
and verify the three critical journeys pass without Neon credentials.

---

## Edge cases and implicit requirements

- IF the container connection string resembles a configured development or
  production URL THEN the reset helper SHALL refuse destructive cleanup.
- IF one migration cannot be applied to an empty database THEN setup SHALL stop
  at that migration and report its filename.
- WHEN two owners have workouts THEN queries and session writes SHALL never
  expose or modify the other owner's records.
- WHEN an integration test completes THEN its persisted state SHALL not affect
  the next test.
- Input validation and bounds are covered by the validation-parser acceptance
  criterion.
- Failure and partial-failure behavior are covered by migration, authorization,
  atomic-write, and Server Action criteria.
- Idempotent migration replay is N/A because migrations run once against a new
  database for each suite.
- Rate limiting is N/A because this feature adds no public network API.
- Data expiry and archival are N/A because test data exists only for the suite
  lifetime and the container is destroyed afterward.
- Observability beyond actionable setup errors is N/A because this feature adds
  local and CI test tooling, not a production runtime service.
- External dependency failure covers the Docker runtime, container image,
  application server, and Playwright browser startup.
- State-transition integrity is N/A because this feature introduces no product
  state machine.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| TEST-01 | P1: Agent testing contract | Documentation | In Progress (T1-T2 complete) |
| TEST-02 | P1: Executable test infrastructure | Infrastructure | In Progress (T3-T4 complete) |
| TEST-03 | P1: Current behavior coverage | Tests | In Tasks |
| TEST-04 | P2: Critical browser journeys | E2E | In Tasks |

**Coverage:** 4 total, 4 mapped to tasks, 0 unmapped.

---

## Success Criteria

- [ ] A new agent can determine what to test and which command to run from the
      repository documentation alone.
- [ ] Unit tests run without Docker or a database.
- [ ] Integration tests run against an ephemeral PostgreSQL container without
      Neon credentials.
- [ ] No automated test can reset the configured development or production
      database.
- [ ] Current validation, data access, Server Action, and client interaction
      behavior has requirement-linked test coverage.
- [ ] Three Playwright journeys verify workout loading, workout creation, and
      workout-session completion through the real application.
- [ ] The complete local and CI gates use non-watch commands and return a
      non-zero exit code on failure.
