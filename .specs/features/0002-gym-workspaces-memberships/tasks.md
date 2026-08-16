# Gym Workspaces and Memberships Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name
and follow its Execute flow and Critical Rules.** Do not search for skill files
by filesystem path. The skill is the source of truth for the full flow
(per-task cycle, sub-agent delegation, adequacy review, Verifier,
discrimination sensor).

**If the skill cannot be activated, STOP and tell the user -- do not proceed
without it.**

---

**Design**: `.specs/features/0002-gym-workspaces-memberships/design.md`  
**Status**: In Progress

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec -- confirm before
> Execute. Guidelines found: `AGENTS.md`, `TESTING.md`, `README.md`,
> `vitest.config.ts`, and `package.json`.

| Code Layer                                    | Required Test Type | Coverage Expectation                                                                                                              | Location Pattern                           | Run Command                |
| --------------------------------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | -------------------------- |
| Domain model and value objects                | unit               | Every invariant branch and applicable acceptance criterion; membership owner transition matrix and email normalization boundaries | `src/**/*.unit.test.ts`                    | `npm run test:unit`        |
| Identity adapter and Server Actions           | integration        | Verified, unverified, missing-session, success, selection-required, and forbidden outcomes at the public server boundary          | `src/**/*.integration.test.ts`             | `npm run test:integration` |
| Repositories and transactional services       | integration        | Successful queries/writes, constraints, concurrency, rollback, isolation, and every mapped failure criterion against PostgreSQL   | `src/**/*.integration.test.ts`             | `npm run test:integration` |
| Interactive gym selector                      | component          | Accessible rendering, valid selection, pending/error behavior, and action boundary interaction                                    | `src/components/**/*.integration.test.tsx` | `npm run test:component`   |
| Critical browser journey                      | e2e                | Existing three journeys continue to pass with gym context; add only the multi-gym selection path needed to prove context wiring   | `test/e2e/*.spec.ts`                       | `npm run test:e2e`         |
| SQL migration and Drizzle schema declarations | none               | Database behavior is asserted through repository/service integration tests; declarations also pass typecheck and build            | N/A                                        | Build gate only            |

## Gate Check Commands

> Generated from codebase -- confirm before Execute.

| Gate Level | When to Use                                                    | Command                                                                                       |
| ---------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Quick      | After domain/value-object or component-only tasks              | `npm run test:unit` or `npm run test:component`, as named by the task                         |
| Full       | After database, identity, action, or browser integration tasks | `npm run test:unit && npm run test:component && npm run test:integration && npm run test:e2e` |
| Build      | After schema/config changes and every phase completion         | `npm run lint && npm run format:check && npm run typecheck && npm run build`                  |

---

## Execution Plan

Phases are ordered and run sequentially. Tasks within each phase execute in
order.

### Phase 1: Identity and Domain Foundation

```text
T1 -> T2 -> T3 -> T4
```

### Phase 2: Gym Access Behavior

```text
T4 -> T5 -> T6 -> T7 -> T8
```

### Phase 3: Training and Application Integration

```text
T8 -> T9 -> T10 -> T11
```

## Task Breakdown

### T1: Add the Gym Access Database Migration

**What**: Define Better Auth-compatible identity fields, gym access, active
selection, append-only audit, and gym-owned training storage using PostgreSQL
18 UUIDv7 defaults and database constraints.  
**Where**: `migrations/003_gym_workspaces_memberships.sql`,
`test/database/lifecycle.integration.test.ts`  
**Depends on**: None  
**Reuses**: `migrations/001_initial.sql`, `migrations/002_users.sql`  
**Requirement**: GWM-01, GWM-02, GWM-06, GWM-09, GWM-18, GWM-20

**Tools**:

- MCP: NONE
- Skill: `coding-guidelines`

**Done when**:

- [x] All new gym-access and audit entity primary keys default to PostgreSQL 18 `uuidv7()`; Better Auth user IDs remain text.
- [x] Constraints enforce normalized email uniqueness, one membership per gym/user, one immutable owner relationship, and valid gym ownership.
- [x] The migration applies to an empty PostgreSQL 18 test database and the Build gate passes.

**Tests**: integration -- migration lifecycle regression  
**Gate**: build

### T2: Map the Gym Access Schema in Drizzle

**What**: Add typed Drizzle declarations and relationships for the migrated
identity, gym, membership, selection, audit, and gym-owned training columns.  
**Where**: `src/db/schema.ts`  
**Depends on**: T1  
**Reuses**: Existing Drizzle table and relation conventions  
**Requirement**: GWM-01, GWM-02, GWM-09, GWM-18

**Tools**:

- MCP: NONE
- Skill: `coding-guidelines`

**Done when**:

- [x] Drizzle types match every column and constraint introduced by T1.
- [x] UUIDv7 defaults are represented as database defaults rather than application-generated IDs.
- [x] Existing imports compile and the Build gate passes.

**Tests**: none -- schema declarations  
**Gate**: build

### T3: Introduce the Provider-Neutral Identity Boundary

**What**: Replace the hard-coded local owner with a Better Auth-backed adapter
that exposes only a stable verified Gym Flow identity.  
**Where**: `migrations/004_better_auth_core.sql`, `src/db/schema.ts`,
`src/modules/identity/account/`, `package.json`  
**Depends on**: T2  
**Reuses**: `src/lib/owner.ts`, `src/data/users.ts`, existing server-only composition  
**Requirement**: GWM-01, GWM-02, GWM-03

**Tools**:

- MCP: official documentation lookup
- Skill: `coding-guidelines`

**Done when**:

- [x] Better Auth is configured with the existing Drizzle/PostgreSQL composition root.
- [x] Better Auth's required session, account, and verification storage is migrated and mapped.
- [x] `requireVerifiedIdentity()` rejects missing and unverified sessions and returns provider-neutral data for verified sessions.
- [x] A verified email change preserves the same user ID.
- [x] Identity integration tests cover verified, missing, unverified, duplicate normalized email, and email-change outcomes; the Full gate passes.

**Tests**: integration  
**Gate**: full

### T4: Model Membership Invariants

**What**: Create the membership aggregate, identifiers, roles, statuses, and
expressive transition errors protecting owner membership.  
**Where**: `src/modules/gym-access/membership/`  
**Depends on**: T3  
**Reuses**: Domain language and invariants from the approved design  
**Requirement**: GWM-06, GWM-08, GWM-09, GWM-13

**Tools**:

- MCP: NONE
- Skill: `tactical-ddd`, `coding-guidelines`

**Done when**:

- [x] The aggregate rejects suspend, remove, and role-change operations for an owner.
- [x] An inactive membership cannot produce an active gym context.
- [x] Unit tests cover every owner/non-owner transition branch and the Quick gate passes.

**Tests**: unit  
**Gate**: quick

### T5: Persist Append-Only Security Events

**What**: Implement a transaction-scoped audit writer for immutable structured
security events.  
**Where**: `src/modules/audit/security-event/`  
**Depends on**: T4  
**Reuses**: Drizzle transaction handles from `src/db/client.ts`  
**Requirement**: GWM-18, GWM-19, GWM-20

**Tools**:

- MCP: NONE
- Skill: `coding-guidelines`

**Done when**:

- [x] The writer records event type, gym, optional actor, target, timestamp, and structured metadata.
- [x] No application update or delete function is exported.
- [x] Integration tests prove append/read behavior and database rejection of mutation paths; the Full gate passes.

**Tests**: integration  
**Gate**: full

### T6: Provision a Gym Atomically

**What**: Implement the gym provisioning application service that creates a
gym, its immutable owner membership, and its audit event in one transaction.  
**Where**: `src/modules/gym-access/gym/`  
**Depends on**: T5  
**Reuses**: Membership aggregate, audit writer, database transaction composition  
**Requirement**: GWM-04, GWM-05, GWM-06, GWM-07, GWM-08

**Tools**:

- MCP: NONE
- Skill: `tactical-ddd`, `coding-guidelines`

**Done when**:

- [x] A verified user can provision multiple independent gyms.
- [x] Each result has exactly one owner membership and one audit event.
- [x] Concurrent duplicate/invariant attempts are rejected by constraints.
- [x] Audit failure rolls back gym and membership records.
- [x] Integration tests cover success, multiple gyms, concurrency, forbidden owner mutation, and rollback; the Full gate passes.

**Tests**: integration  
**Gate**: full

### T7: Resolve and Persist Active Gym Context

**What**: Implement automatic and explicit active-gym selection with membership
revalidation and non-disclosing failures.  
**Where**: `src/modules/gym-access/active-gym/`  
**Depends on**: T6  
**Reuses**: Membership persistence and identity value objects  
**Requirement**: GWM-10, GWM-11, GWM-12, GWM-13, GWM-14, GWM-22

**Tools**:

- MCP: NONE
- Skill: `tactical-ddd`, `coding-guidelines`

**Done when**:

- [ ] Exactly one active membership is auto-selected.
- [ ] Multiple active memberships without a valid selection require explicit selection.
- [ ] Inactive selections are cleared and cannot produce a context.
- [ ] Malformed, unknown, and unauthorized gym IDs return the same public forbidden result.
- [ ] Integration tests cover all resolver branches and cross-user isolation; the Full gate passes.

**Tests**: integration  
**Gate**: full

### T8: Expose the Gym Access Module Contract

**What**: Publish a narrow module facade for provisioning, membership lookup,
and active-context resolution without exporting repositories or entities.  
**Where**: `src/modules/gym-access/index.ts`  
**Depends on**: T7  
**Reuses**: Gym provisioning and active-gym services  
**Requirement**: GWM-04, GWM-10, GWM-14

**Tools**:

- MCP: NONE
- Skill: `evolutionary-modular-architecture`, `coding-guidelines`

**Done when**:

- [ ] Only provider-neutral DTOs and facade operations are exported.
- [ ] No caller can import gym-access repositories through the public entry point.
- [ ] Module contract integration tests exercise provisioning and context resolution through the facade; the Full gate passes.

**Tests**: integration  
**Gate**: full

### T9: Scope Training Records to the Active Gym

**What**: Migrate workout/session storage from creator ownership to gym
ownership, map that schema in Drizzle, and require mandatory validated gym
context while retaining creator attribution.  
**Where**: `migrations/005_gym_owned_training.sql`, `src/db/schema.ts`,
`src/data/workouts.ts`  
**Depends on**: T8  
**Reuses**: Existing workout mapping, validation, and transaction behavior  
**Requirement**: GWM-15, GWM-16, GWM-17, GWM-21

**Tools**:

- MCP: NONE
- Skill: `coding-guidelines`

**Done when**:

- [ ] Every workout and session read/write requires `GymContext`.
- [ ] Training entity UUIDs use PostgreSQL 18 `uuidv7()` database defaults.
- [ ] Records persist `gym_id` plus creator attribution.
- [ ] Cross-gym and missing-gym relationships are rejected without leakage.
- [ ] Integration tests cover creation, listing, sessions, creator preservation, and cross-gym denial; the Full gate passes.

**Tests**: integration  
**Gate**: full

### T10: Wire Identity and Gym Context into Server Actions

**What**: Resolve verified identity and exactly one active gym before each
gym-scoped action, and expose an explicit gym-selection action.  
**Where**: `src/app/actions.ts`  
**Depends on**: T9  
**Reuses**: Existing parsing and path-revalidation boundaries  
**Requirement**: GWM-10, GWM-12, GWM-14, GWM-15, GWM-17, GWM-22

**Tools**:

- MCP: current local Next.js documentation
- Skill: `coding-guidelines`

**Done when**:

- [ ] Workout actions never accept a client-supplied trusted gym context.
- [ ] Selection validates membership before persistence and revalidation.
- [ ] Integration tests cover authenticated success, selection required, malformed/unknown selection, inactive membership, and cross-gym denial; the Full gate passes.

**Tests**: integration  
**Gate**: full

### T11: Add the Active Gym Selection Experience

**What**: Render an accessible selector when a verified account has multiple
active memberships and preserve the existing workout experience after choice.  
**Where**: `src/components/gym-selector.tsx`  
**Depends on**: T10  
**Reuses**: Existing component interaction and Server Action test patterns  
**Requirement**: GWM-11, GWM-12, GWM-13

**Tools**:

- MCP: current local Next.js documentation
- Skill: `react-best-practices`, `coding-guidelines`

**Done when**:

- [ ] One membership proceeds without prompting and multiple memberships render an accessible selector.
- [ ] Selection pending, success, forbidden, and stale-membership states are represented without disclosing other gyms.
- [ ] Component integration tests cover accessible interaction and action outcomes.
- [ ] The browser suite proves the multi-gym selection path and all existing journeys remain green; the Full and Build gates pass.

**Tests**: component and e2e  
**Gate**: full and build

## Phase Execution Map

```text
Phase 1 -> Phase 2 -> Phase 3

Phase 1: T1 -> T2 -> T3 -> T4
Phase 2: T5 -> T6 -> T7 -> T8
Phase 3: T9 -> T10 -> T11
```

Execution is strictly sequential. There is no intra-phase parallelism.

## Task Granularity Check

| Task | Scope                                          | Status           |
| ---- | ---------------------------------------------- | ---------------- |
| T1   | One database migration                         | Pass -- granular |
| T2   | One schema mapping                             | Pass -- granular |
| T3   | One identity boundary                          | Pass -- cohesive |
| T4   | One domain aggregate                           | Pass -- granular |
| T5   | One audit writer                               | Pass -- granular |
| T6   | One provisioning operation                     | Pass -- granular |
| T7   | One context resolver                           | Pass -- granular |
| T8   | One public module contract                     | Pass -- granular |
| T9   | One training persistence boundary              | Pass -- cohesive |
| T10  | One Server Action boundary                     | Pass -- cohesive |
| T11  | One interactive component and its route wiring | Pass -- cohesive |

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| ---- | ---------------------- | ------------- | ------ |
| T1   | None                   | None          | Match  |
| T2   | T1                     | T1 -> T2      | Match  |
| T3   | T2                     | T2 -> T3      | Match  |
| T4   | T3                     | T3 -> T4      | Match  |
| T5   | T4                     | T4 -> T5      | Match  |
| T6   | T5                     | T5 -> T6      | Match  |
| T7   | T6                     | T6 -> T7      | Match  |
| T8   | T7                     | T7 -> T8      | Match  |
| T9   | T8                     | T8 -> T9      | Match  |
| T10  | T9                     | T9 -> T10     | Match  |
| T11  | T10                    | T10 -> T11    | Match  |

## Test Co-location Validation

| Task | Code Layer Created/Modified              | Matrix Requires   | Task Says         | Status |
| ---- | ---------------------------------------- | ----------------- | ----------------- | ------ |
| T1   | SQL migration                            | none              | none              | OK     |
| T2   | Schema declarations                      | none              | none              | OK     |
| T3   | Identity adapter                         | integration       | integration       | OK     |
| T4   | Domain aggregate                         | unit              | unit              | OK     |
| T5   | Audit repository                         | integration       | integration       | OK     |
| T6   | Transactional service                    | integration       | integration       | OK     |
| T7   | Resolver and persistence                 | integration       | integration       | OK     |
| T8   | Module facade                            | integration       | integration       | OK     |
| T9   | Training data access                     | integration       | integration       | OK     |
| T10  | Server Actions                           | integration       | integration       | OK     |
| T11  | Interactive component and browser wiring | component and e2e | component and e2e | OK     |
