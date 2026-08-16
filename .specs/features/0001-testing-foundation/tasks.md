# Testing foundation tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name
and follow its Execute flow and Critical Rules.** Do not search for skill files
by filesystem path. The skill is the source of truth for the per-task cycle,
atomic commits, verification, and final independent verifier.

**If the skill cannot be activated, STOP and tell the user.**

---

**Design**: `.specs/features/0001-testing-foundation/design.md`
**Status**: Draft

---

## Test Coverage Matrix

> Generated from `AGENTS.md`, `TESTING.md`, the approved specification, the
> installed Next.js testing guides, and the absence of existing tests or test
> configuration.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Documentation | none | Every approved tool, command, boundary, lifecycle, and safety rule is stated consistently. | `README.md`, `TESTING.md` | `npm run lint` |
| Database schema and runner config | none | Type-check and build gate; schema parity is exercised by database integration setup. | `src/db/schema.ts`, `*.config.ts` | `npm run typecheck` |
| Database configuration and safety helpers | unit | Every accepted configuration and every destructive-operation rejection branch. | `**/*.unit.test.ts` | `npm run test:unit` |
| Validation and pure business rules | unit | All branches, accepted boundaries, and rejection rules in the approved spec. | `src/**/*.unit.test.ts` | `npm run test:unit` |
| Data functions and migration lifecycle | integration | Real PostgreSQL happy, empty, ownership, ordering, atomicity, constraint, and failure paths. | `src/**/*.integration.test.ts`, `test/**/*.integration.test.ts` | `npm run test:integration` |
| Server Actions | integration | Validation, owner resolution, real persistence, return values, failures, and revalidation boundary. | `src/app/*.integration.test.ts` | `npm run test:integration` |
| Interactive client component | integration | Observable create, completion, timer, pending, success, and failure behavior through accessible queries. | `src/components/*.integration.test.tsx` | `npm run test:component` |
| Async Server Component and application wiring | e2e | Three critical journeys only: load, create with revalidation, and complete with history. | `test/e2e/*.spec.ts` | `npm run test:e2e` |
| CI and package wiring | none | Complete non-watch quality gate succeeds from the public command. | `.github/workflows/*.yml`, `package.json` | `npm run check` |

## Gate Check Commands

> These commands become available as their infrastructure tasks complete.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Documentation, configuration, and unit-test tasks | `npm run lint && npm run typecheck && npm run test:unit` |
| Full | Database, Server Action, component, and E2E behavior tasks | `npm run lint && npm run typecheck && npm test` |
| Build | Phase completion and CI/package wiring | `npm run check` |

---

## Execution Plan

Phases and tasks run strictly in order.

### Phase 1: Documentation contract

```text
T1 -> T2
```

### Phase 2: Drizzle and test infrastructure

```text
T2 -> T3 -> T4 -> T6 -> T5 -> T7 -> T8
```

### Phase 3: Current behavior coverage

```text
T8 -> T9 -> T10 -> T11 -> T12 -> T13 -> T14 -> T15
```

### Phase 4: Browser journeys and CI

```text
T15 -> T16 -> T17 -> T18 -> T19
```

---

## Task Breakdown

### T1: Define the executable testing contract

**Status**: Complete

**What**: Expand the agent testing policy with the approved stack, honeycomb,
commands, naming, lifecycle, mocking, database safety, PostgreSQL parity, and
CI rules.
**Where**: `TESTING.md`
**Depends on**: None
**Reuses**: Existing testing strategy and approved specification.
**Requirement**: TEST-01

**Tools**:

- MCP: NONE
- Skill: `docs-writer`, `tlc-spec-driven`

**Done when**:

- [x] Every TEST-01 acceptance criterion is stated explicitly.
- [x] The guide identifies integration as default, unit as selective, and E2E
      as three critical journeys.
- [x] The guide requires `postgres:18-alpine`, pooled Neon TCP, and Node.js.
- [x] Markdown and `npm run lint` pass.

**Tests**: none, documentation layer
**Gate**: quick, using the commands available before test tooling exists
**Commit**: `docs(testing): define executable testing contract`

### T2: Add developer testing instructions

**Status**: Complete

**What**: Document Docker and Playwright prerequisites, environment safety,
local commands, and expected CI behavior for developers.
**Where**: `README.md`
**Depends on**: T1
**Reuses**: The run-local section and `TESTING.md` as the authoritative policy.
**Requirement**: TEST-01

**Tools**:

- MCP: NONE
- Skill: `docs-writer`, `tlc-spec-driven`

**Done when**:

- [x] A clean-clone developer can identify prerequisites and every public test
      command.
- [x] The README links to `TESTING.md` instead of duplicating policy details.
- [x] Markdown and `npm run lint` pass.

**Tests**: none, documentation layer
**Gate**: quick, using the commands available before test tooling exists
**Commit**: `docs(readme): add testing setup and commands`

### T3: Install and expose the testing toolchain

**Status**: Complete

**What**: Add Drizzle, node-postgres, Vitest, Testing Library, Testcontainers,
Playwright, TypeScript path support, React test support, and public scripts.
**Where**: `package.json`
**Depends on**: T2
**Reuses**: Existing npm scripts and lockfile workflow.
**Requirement**: TEST-01, TEST-02

**Tools**:

- MCP: official package documentation through web research
- Skill: `coding-guidelines`, `tlc-spec-driven`

**Done when**:

- [x] Runtime dependencies add `drizzle-orm` and `pg` while retaining
      `@neondatabase/serverless` until the migration reaches T12.
- [x] Development dependencies contain the approved test tools.
- [x] Scripts expose `test`, `test:vitest`, `test:unit`, `test:component`,
      `test:integration`, `test:e2e`, `test:watch`, `typecheck`, and `check`.
- [x] `package-lock.json` matches the manifest and install succeeds.
- [x] `npm run typecheck` passes with the initial configs allowed to land in
      subsequent tasks.

**Tests**: none, package and configuration layer
**Gate**: build
**Commit**: `build(testing): install approved test toolchain`

### T4: Declare the existing PostgreSQL schema in Drizzle

**Status**: Complete

**What**: Model every existing table, column, constraint, index-relevant key,
and relationship without changing migration history.
**Where**: `src/db/schema.ts`
**Depends on**: T3
**Reuses**: `migrations/001_initial.sql` and `migrations/002_users.sql`.
**Requirement**: TEST-02

**Tools**:

- MCP: official Drizzle documentation through web research
- Skill: `coding-guidelines`, `tlc-spec-driven`

**Done when**:

- [x] The schema mirrors all five current tables and their nullability.
- [x] Application-facing domain types remain separate.
- [x] Existing SQL files remain the migration source of truth.
- [x] `npm run typecheck` and `npm run build` pass.

**Tests**: none, schema layer; migration parity is exercised by T7
**Gate**: build
**Commit**: `feat(db): declare drizzle schema`

### T6: Configure isolated Vitest projects

**Status**: Complete

**What**: Configure named unit, component, and database projects with their
correct environments, globs, setup files, aliases, and parallelism.
**Where**: `vitest.config.ts`
**Depends on**: T4
**Reuses**: Installed Next.js Vitest guidance and test naming policy.
**Requirement**: TEST-01, TEST-02

**Tools**:

- MCP: official Vitest documentation through web research
- Skill: `coding-guidelines`, `tlc-spec-driven`

**Done when**:

- [x] Unit uses Node, component uses jsdom, and database uses Node.
- [x] Database test files run without file-level parallelism.
- [x] Project filters select only their documented suffixes.
- [x] Empty projects exit successfully during staged adoption.
- [x] `npm run typecheck` and config loading pass.

**Tests**: none, runner configuration layer
**Gate**: build
**Commit**: `test(config): define isolated vitest projects`

### T5: Create the production Drizzle TCP client

**Status**: Complete

**What**: Add the module-scoped node-postgres pool and configuration validation
for Neon pooled TCP access.
**Where**: `src/db/client.ts`
**Depends on**: T6
**Reuses**: Missing-`DATABASE_URL` behavior from `src/lib/db.ts`.
**Requirement**: TEST-02

**Tools**:

- MCP: official Drizzle and Neon documentation through web research
- Skill: `coding-guidelines`, `tlc-spec-driven`

**Done when**:

- [x] The client uses `drizzle-orm/node-postgres` and one `pg.Pool` with
      `max: 5`.
- [x] Production rejects missing URLs and Neon URLs without `-pooler`.
- [x] Local test composition can supply a Testcontainer URI explicitly without
      weakening production validation.
- [x] Three configuration unit tests pass.
- [x] Quick gate passes with 3 new tests.

**Tests**: unit
**Gate**: quick
**Commit**: `feat(db): add pooled drizzle client`

### T7: Start PostgreSQL and apply real migrations

**Status**: Complete

**What**: Add the PostgreSQL 18 Testcontainers lifecycle and ordered SQL
migration runner with an integration smoke test.
**Where**: `test/database/lifecycle.ts`
**Depends on**: T5
**Reuses**: `migrations/*.sql` and `postgres:18-alpine`.
**Requirement**: TEST-02

**Tools**:

- MCP: official Testcontainers documentation through web research
- Skill: `coding-guidelines`, `tlc-spec-driven`

**Done when**:

- [x] One container starts per database-project run and stops in teardown.
- [x] Migrations run once in lexical filename order before test files load.
- [x] Migration failures report the failing filename and original cause.
- [x] Tests receive the generated URI without Neon credentials.
- [x] Two lifecycle integration tests pass.
- [x] `npm run test:integration` passes with 2 new tests.

**Tests**: integration
**Gate**: full, limited to the available database project
**Commit**: `test(db): add postgres container lifecycle`

### T8: Guard database reset and provide fixtures

**Status**: Complete

**What**: Add destructive-reset proof checks, deterministic cleanup, and minimal
user and workout fixture builders.
**Where**: `test/database/reset.ts`
**Depends on**: T7
**Reuses**: The migrated schema and `local-user` convention.
**Requirement**: TEST-02

**Tools**:

- MCP: NONE
- Skill: `coding-guidelines`, `tlc-spec-driven`

**Done when**:

- [x] Reset requires the suite proof, exact `gym_flow_test` database name, and
      a URI different from production `DATABASE_URL`.
- [x] Reset truncates all mutable tables with cascade semantics.
- [x] Fixture defaults satisfy every current PostgreSQL constraint.
- [x] Four reset safety and isolation integration tests pass.
- [x] `npm run test:integration` passes with at least 6 cumulative tests.

**Tests**: integration
**Gate**: full, limited to the available database project
**Commit**: `test(db): guard reset and add fixtures`

### T9: Migrate user data access with integration coverage

**Status**: Complete

**What**: Replace the user query with Drizzle and prove found and missing-user
behavior against PostgreSQL.
**Where**: `src/data/users.ts`
**Depends on**: T8
**Reuses**: `users` schema and user fixture.
**Requirement**: TEST-03

**Tools**:

- MCP: official Drizzle documentation through web research
- Skill: `coding-guidelines`, `tlc-spec-driven`

**Done when**:

- [x] `findUserById` retains its public signature and mapping.
- [x] Found-user and missing-user integration tests pass.
- [x] No database result is mocked.
- [x] Full gate passes with 2 new tests.

**Tests**: integration
**Gate**: full
**Commit**: `refactor(data): migrate user queries to drizzle`

### T10: Migrate workout creation and listing with coverage

**What**: Move workout creation and listing to Drizzle while preserving
generated IDs, ordering, mapping, uniqueness, and owner isolation.
**Where**: `src/data/workouts.ts`
**Depends on**: T9
**Reuses**: Workout tables, domain models, and fixture builders.
**Requirement**: TEST-03

**Tools**:

- MCP: official Drizzle documentation through web research
- Skill: `coding-guidelines`, `tlc-spec-driven`

**Done when**:

- [ ] Creation persists one workout and ordered exercises atomically.
- [ ] Listing returns mapped, ordered, owner-scoped results and an empty array.
- [ ] Duplicate owner/color failure leaves no partial workout.
- [ ] Seven creation and listing integration tests pass.
- [ ] Full gate passes with 7 new tests.

**Tests**: integration
**Gate**: full
**Commit**: `refactor(data): migrate workout queries to drizzle`

### T11: Migrate workout sessions with coverage

**What**: Move session persistence and completed-workout listing to Drizzle
while preserving atomicity, nullable values, ownership, and ordering.
**Where**: `src/data/workouts.ts`
**Depends on**: T10
**Reuses**: The Drizzle client, session tables, and workout fixtures.
**Requirement**: TEST-03

**Tools**:

- MCP: official Drizzle transaction documentation through web research
- Skill: `coding-guidelines`, `tlc-spec-driven`

**Done when**:

- [ ] Valid sessions persist all sets and nullable values.
- [ ] Foreign workout and exercise IDs fail without partial persistence.
- [ ] Completed workouts are owner-scoped and newest first.
- [ ] Eight session integration tests pass.
- [ ] Full gate passes with 8 new tests.

**Tests**: integration
**Gate**: full
**Commit**: `refactor(data): migrate workout sessions to drizzle`

### T12: Remove the superseded Neon HTTP path

**What**: Delete the unused Neon HTTP database factory and dependency after all
data functions use Drizzle node-postgres.
**Where**: `src/lib/db.ts`
**Depends on**: T11
**Reuses**: The completed import graph from T9 through T11.
**Requirement**: TEST-02

**Tools**:

- MCP: NONE
- Skill: `coding-guidelines`, `tlc-spec-driven`

**Done when**:

- [ ] No source import references `src/lib/db.ts` or
      `@neondatabase/serverless`.
- [ ] The obsolete file and package dependency are removed.
- [ ] Full gate passes without reducing the cumulative test count.

**Tests**: none, cleanup after behavior-covered migration
**Gate**: full
**Commit**: `refactor(db): remove neon http client`

### T13: Cover Server Actions through real persistence

**What**: Add Server Action integration tests for validation, current-owner
resolution, persistence, results, failures, and revalidation.
**Where**: `src/app/actions.integration.test.ts`
**Depends on**: T12
**Reuses**: Existing actions, migrated data functions, reset, and fixtures.
**Requirement**: TEST-03

**Tools**:

- MCP: installed Next.js documentation
- Skill: `coding-guidelines`, `tlc-spec-driven`

**Done when**:

- [ ] Valid create and completion paths persist through real PostgreSQL.
- [ ] Invalid and unauthorized paths leave no partial data.
- [ ] Only the Next.js revalidation boundary is mocked.
- [ ] Success revalidates `/`; failure does not.
- [ ] Six Server Action integration tests pass.
- [ ] Full gate passes with 6 new tests.

**Tests**: integration
**Gate**: full
**Commit**: `test(actions): cover workout mutations`

### T14: Cover the validation boundary matrix

**What**: Add table-driven unit tests for every accepted boundary and rejection
rule in both workout parsers.
**Where**: `src/lib/workout-validation.unit.test.ts`
**Depends on**: T13
**Reuses**: Existing validation implementation and domain types.
**Requirement**: TEST-03

**Tools**:

- MCP: NONE
- Skill: `coding-guidelines`, `tlc-spec-driven`

**Done when**:

- [ ] Text, collection, color, integer, UUID, nullable, finite-number, rating,
      and feedback boundaries are covered.
- [ ] Tests assert normalized successful output and exact failure classes or
      messages where part of existing behavior.
- [ ] At least 20 unit cases pass.
- [ ] Quick gate passes with at least 23 cumulative unit tests.

**Tests**: unit
**Gate**: quick
**Commit**: `test(validation): cover workout parser boundaries`

### T15: Cover WorkoutApp interactions

**What**: Add jsdom integration coverage for the existing interactive client
using action fakes and accessible user interactions.
**Where**: `src/components/workout-app.integration.test.tsx`
**Depends on**: T14
**Reuses**: `WorkoutApp` dependency-injection props and domain fixtures.
**Requirement**: TEST-03

**Tools**:

- MCP: official Testing Library documentation through web research
- Skill: `coding-guidelines`, `react-best-practices`, `tlc-spec-driven`

**Done when**:

- [ ] Initial list, create success/failure, session success/failure, timers,
      pending state, and history visibility are covered.
- [ ] Fake timers avoid real countdown delays.
- [ ] Queries use accessible roles, names, labels, and visible outcomes.
- [ ] Eight component integration tests pass.
- [ ] Full gate passes with 8 new tests.

**Tests**: integration
**Gate**: full
**Commit**: `test(ui): cover workout app interactions`

### T16: Build the deterministic Playwright lifecycle

**What**: Add a single-worker Playwright configuration and runner that owns
PostgreSQL, migrations, Next.js, browser execution, and teardown, plus the
seeded-load journey.
**Where**: `test/e2e/run.ts`
**Depends on**: T15
**Reuses**: Database lifecycle, reset, fixtures, and Next.js start scripts.
**Requirement**: TEST-02, TEST-04

**Tools**:

- MCP: official Playwright and Testcontainers documentation through web research
- Skill: `coding-guidelines`, `playwright-skill`, `tlc-spec-driven`

**Done when**:

- [ ] Startup order is container, migrations, seed, Next.js readiness, then
      Playwright.
- [ ] Both success and failure paths stop the server, pool, and container.
- [ ] Playwright uses one worker and scenario-specific reset/seed hooks.
- [ ] The browser displays a seeded workout through the async home page.
- [ ] `npm run test:e2e` passes with 1 journey.

**Tests**: e2e
**Gate**: full
**Commit**: `test(e2e): add isolated browser lifecycle`

### T17: Cover workout creation through the browser

**What**: Add the critical journey that creates a workout and observes it after
the Server Action and route revalidation complete.
**Where**: `test/e2e/workout-journeys.spec.ts`
**Depends on**: T16
**Reuses**: Playwright lifecycle and accessible workout form.
**Requirement**: TEST-04

**Tools**:

- MCP: official Playwright documentation through web research
- Skill: `playwright-skill`, `tlc-spec-driven`

**Done when**:

- [ ] The journey fills the form through labels and submits through role/name.
- [ ] The created workout is visible after the real Server Action completes.
- [ ] PostgreSQL contains the created workout and exercises.
- [ ] `npm run test:e2e` passes with 2 cumulative journeys.

**Tests**: e2e
**Gate**: full
**Commit**: `test(e2e): cover workout creation`

### T18: Cover session completion through the browser

**What**: Add the critical journey that completes a seeded workout and observes
the completed session in history.
**Where**: `test/e2e/workout-journeys.spec.ts`
**Depends on**: T17
**Reuses**: Playwright lifecycle, seeded workout, and user-choice timer bypasses.
**Requirement**: TEST-04

**Tools**:

- MCP: official Playwright documentation through web research
- Skill: `playwright-skill`, `tlc-spec-driven`

**Done when**:

- [ ] The journey records the workout sets without waiting for real countdowns.
- [ ] The session persists through the real Server Action.
- [ ] History visibly identifies the completed workout.
- [ ] `npm run test:e2e` passes with 3 cumulative journeys.

**Tests**: e2e
**Gate**: full
**Commit**: `test(e2e): cover workout completion`

### T19: Enforce the complete CI quality gate

**What**: Add a Docker-capable GitHub Actions workflow that installs browser
dependencies and runs the public `check` command.
**Where**: `.github/workflows/quality.yml`
**Depends on**: T18
**Reuses**: npm lockfile, Playwright installer, and `npm run check`.
**Requirement**: TEST-01, TEST-02, TEST-04

**Tools**:

- MCP: official GitHub Actions and Playwright CI documentation through web research
- Skill: `coding-guidelines`, `tlc-spec-driven`

**Done when**:

- [ ] CI uses the repository's supported Node.js version and `npm ci`.
- [ ] CI installs the required Playwright browser and system dependencies.
- [ ] CI has Docker access and requires no Neon credential.
- [ ] `npm run check` executes lint, type checking, all tests, and build.
- [ ] Build gate passes without reducing any test count.

**Tests**: none, CI wiring layer
**Gate**: build
**Commit**: `ci(testing): enforce complete quality gate`

---

## Phase Execution Map

```text
Phase 1 -> Phase 2 -> Phase 3 -> Phase 4

T1 -> T2 -> T3 -> T4 -> T6 -> T5 -> T7 -> T8 -> T9 -> T10
   -> T11 -> T12 -> T13 -> T14 -> T15 -> T16 -> T17 -> T18 -> T19
```

Execution is strictly sequential. Phase boundaries remain the batch boundaries
for any approved sub-agent delegation.

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1 | One policy document | OK |
| T2 | One developer document | OK |
| T3 | One package toolchain manifest | OK |
| T4 | One schema module | OK |
| T5 | One database client component plus its unit tests | OK |
| T6 | One runner configuration | OK |
| T7 | One container lifecycle component plus smoke tests | OK |
| T8 | One reset/fixture boundary plus safety tests | OK |
| T9 | One user repository migration plus tests | OK |
| T10 | One workout create/list behavior group plus tests | OK |
| T11 | One session behavior group plus tests | OK |
| T12 | One obsolete database path removal | OK |
| T13 | One Server Action boundary test suite | OK |
| T14 | One validation boundary test suite | OK |
| T15 | One client component test suite | OK |
| T16 | One E2E lifecycle plus first proving journey | OK |
| T17 | One browser journey | OK |
| T18 | One browser journey | OK |
| T19 | One CI workflow | OK |

---

## Diagram-Definition Cross-Check

| Task | Depends On | Diagram Shows | Status |
| ---- | ---------- | ------------- | ------ |
| T1 | None | Start | Match |
| T2 | T1 | T1 -> T2 | Match |
| T3 | T2 | T2 -> T3 | Match |
| T4 | T3 | T3 -> T4 | Match |
| T6 | T4 | T4 -> T6 | Match |
| T5 | T6 | T6 -> T5 | Match |
| T7 | T5 | T5 -> T7 | Match |
| T8 | T7 | T7 -> T8 | Match |
| T9 | T8 | T8 -> T9 | Match |
| T10 | T9 | T9 -> T10 | Match |
| T11 | T10 | T10 -> T11 | Match |
| T12 | T11 | T11 -> T12 | Match |
| T13 | T12 | T12 -> T13 | Match |
| T14 | T13 | T13 -> T14 | Match |
| T15 | T14 | T14 -> T15 | Match |
| T16 | T15 | T15 -> T16 | Match |
| T17 | T16 | T16 -> T17 | Match |
| T18 | T17 | T17 -> T18 | Match |
| T19 | T18 | T18 -> T19 | Match |

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1 | Documentation | none | none | OK |
| T2 | Documentation | none | none | OK |
| T3 | Package/config | none | none | OK |
| T4 | Schema | none | none | OK |
| T5 | Database configuration | unit | unit | OK |
| T6 | Runner config | none | none | OK |
| T7 | Migration lifecycle | integration | integration | OK |
| T8 | Reset safety | integration | integration | OK |
| T9 | User data | integration | integration | OK |
| T10 | Workout data | integration | integration | OK |
| T11 | Session data | integration | integration | OK |
| T12 | Covered cleanup | none | none | OK |
| T13 | Server Actions | integration | integration | OK |
| T14 | Validation | unit | unit | OK |
| T15 | Client component | integration | integration | OK |
| T16 | Application wiring | e2e | e2e | OK |
| T17 | Application wiring | e2e | e2e | OK |
| T18 | Application wiring | e2e | e2e | OK |
| T19 | CI wiring | none | none | OK |
