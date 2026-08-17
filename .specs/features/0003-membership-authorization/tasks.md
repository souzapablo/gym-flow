# Membership Authorization Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/0003-membership-authorization/design.md`  
**Status**: Draft

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec; confirm before Execute. Guidelines found: `AGENTS.md`, `TESTING.md`, `package.json`, `vitest.config.ts`, and `.github/workflows/quality.yml`. Test conventions sampled from membership unit tests and active-gym, audit, Gym Access facade, workout data, and Server Action integration tests.

| Code Layer                                      | Required Test Type | Coverage Expectation                                                                                                                     | Location Pattern                                  | Run Command                |
| ----------------------------------------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | -------------------------- |
| Membership domain and pure authorization policy | unit               | All branches; every role-capability cell; 1:1 coverage of applicable AUTHZ requirements and edge cases                                   | `src/modules/gym-access/**/*.unit.test.ts`        | `npm run test:unit`        |
| Membership schema and migration                 | integration        | Canonical role migration, accepted roles, rejected legacy/unknown roles, and preserved owner constraints                                 | `src/modules/gym-access/**/*.integration.test.ts` | `npm run test:integration` |
| Authorization coordinator and audit boundary    | integration        | Allowed handler execution, every denial class, current-state reload, lock behavior, audit persistence/failure, and generic public errors | `src/modules/gym-access/**/*.integration.test.ts` | `npm run test:integration` |
| Gym Access public facade                        | integration        | Provider-neutral request/result contract and generic error contract                                                                      | `src/modules/gym-access/**/*.integration.test.ts` | `npm run test:integration` |
| Training data operations                        | integration        | Each operation's allowed roles plus inactive, unauthorized-role, relationship-absent, and cross-gym denial without partial persistence   | `src/data/**/*.integration.test.ts`               | `npm run test:integration` |
| Server Actions                                  | integration        | Identity resolution, input validation, authorized persistence, denial, audit evidence, and no revalidation on failure                    | `src/app/**/*.integration.test.ts`                | `npm run test:integration` |
| Async Server Component and browser wiring       | e2e                | Existing three critical journeys remain green through the authorization boundary; no duplicate policy matrix                             | `test/e2e/*.spec.ts`                              | `npm run test:e2e`         |

## Gate Check Commands

> Generated from codebase; confirm before Execute.

| Gate Level | When to Use                                                            | Command                                         |
| ---------- | ---------------------------------------------------------------------- | ----------------------------------------------- |
| Quick      | After tasks containing only pure unit-tested behavior                  | `npm run test:unit`                             |
| Full       | After schema, database, data-operation, facade, or Server Action tasks | `npm run test:unit && npm run test:integration` |
| Build      | After every phase and before final verification                        | `npm run check`                                 |

---

## Execution Plan

Phases are ordered and run sequentially. Each phase completes before the next begins, and tasks within a phase execute in order.

### Phase 1: Policy Foundation

Establish the canonical role vocabulary, pure policy, and relationship extension point.

```text
T1 -> T2 -> T3
```

### Phase 2: Enforcement Boundary

Load current facts, persist denial evidence, coordinate protected transactions, and publish the module contract.

```text
T4 -> T5 -> T6 -> T7
```

### Phase 3: Protected Training Operations

Move each current training operation family through the authorization boundary.

```text
T8 -> T9 -> T10
```

---

## Task Breakdown

### Phase 1: Policy Foundation

### T1: Establish the Canonical Membership Roles ✅

**What**: Replace `member` with `trainee`, add `admin`, align domain and persistence constraints, and preserve owner immutability.
**Where**: Membership role domain and persistence boundary
**Depends on**: None
**Reuses**: `src/modules/gym-access/membership/`, `src/db/schema.ts`, lexical SQL migrations, and the PostgreSQL integration harness
**Requirement**: AUTHZ-06, AUTHZ-07, AUTHZ-08, AUTHZ-09, AUTHZ-10, AUTHZ-12

**Tools**:

- MCP: NONE
- Skill: `coding-guidelines`

**Done when**:

- [x] `MembershipRole` contains exactly `owner`, `admin`, `coach`, and `trainee`.
- [x] A lexical migration converts existing `member` rows to `trainee` before replacing the role constraint.
- [x] Drizzle schema and database constraint accept the four canonical roles and reject `member` and unknown roles.
- [x] Owner immutability and active-owner constraints remain unchanged.
- [x] At least 4 role-persistence cases and all existing membership unit cases pass without silent deletion.
- [x] Full gate passes.

**Tests**: unit + integration
**Gate**: full
**Commit**: `feat(authz): establish membership roles`

### T2: Implement the Pure Membership Policy ✅

**What**: Define runtime-validated authorization facts, operation/resource vocabularies, decisions, reason codes, and the deny-by-default role-and-attribute evaluator.
**Where**: `src/modules/gym-access/authorization/`
**Depends on**: T1
**Reuses**: Membership role/status types and owner invariants
**Requirement**: AUTHZ-01, AUTHZ-02, AUTHZ-03, AUTHZ-04, AUTHZ-06, AUTHZ-07, AUTHZ-08, AUTHZ-09, AUTHZ-10, AUTHZ-12, AUTHZ-13

**Tools**:

- MCP: NONE
- Skill: `coding-guidelines`

**Done when**:

- [x] The evaluator is pure and returns a typed allow or internal deny decision.
- [x] Every required fact is runtime-validated; missing or unknown values deny.
- [x] Cross-gym and inactive membership facts deny before role capability evaluation.
- [x] The complete owner/admin/coach/trainee capability matrix matches the approved design.
- [x] At least 38 table-driven policy cases cover every matrix cell and all fact-validation branches.
- [x] Quick gate passes.

**Tests**: unit
**Gate**: quick
**Commit**: `feat(authz): implement membership policy`

### T3: Add the Deny-by-Default Relationship Port ✅

**What**: Define the transaction-scoped relationship query contract and a default resolver that reports absent relationships.
**Where**: `src/modules/gym-access/authorization/`
**Depends on**: T2
**Reuses**: Authorization facts and decision types from T2
**Requirement**: AUTHZ-08, AUTHZ-09, AUTHZ-11, AUTHZ-13

**Tools**:

- MCP: NONE
- Skill: `coding-guidelines`

**Done when**:

- [x] The port accepts a transaction and a closed relationship query.
- [x] The default resolver returns `absent` for every relationship-dependent request.
- [x] The contract requires future adapters to read and lock relevant rows through the supplied transaction.
- [x] At least 3 unit cases prove default denial, satisfied-result consumption, and missing-query denial.
- [x] Quick gate passes.

**Tests**: unit
**Gate**: quick
**Commit**: `feat(authz): add relationship policy port`

### Phase 2: Enforcement Boundary

### T4: Load and Lock Current Authorization Facts ✅

**What**: Load the persisted active selection and current membership, validate database strings, and hold a shared membership lock for the protected transaction.
**Where**: `src/modules/gym-access/authorization/`
**Depends on**: T3
**Reuses**: Active-gym tables, membership identifiers, and Drizzle transaction patterns
**Requirement**: AUTHZ-01, AUTHZ-03, AUTHZ-10, AUTHZ-12, AUTHZ-13

**Tools**:

- MCP: NONE
- Skill: `coding-guidelines`

**Done when**:

- [x] Facts come from current PostgreSQL state rather than a caller-supplied `GymContextDto`.
- [x] Membership role and status strings pass explicit runtime parsers without unsafe casts.
- [x] Missing, stale, inactive, and malformed selection/membership states produce deny facts without leaking existence.
- [x] A shared membership-row lock remains held until the supplied transaction finishes.
- [x] At least 8 integration cases cover active, stale, inactive, absent, malformed, unknown-role/status, and lock behavior.
- [x] Full gate passes.

**Tests**: integration
**Gate**: full
**Commit**: `feat(authz): load current authorization facts`

### T5: Persist Authorization Denial Evidence ✅

**What**: Translate auditable deny decisions into committed `authorization.denied` security events without exposing internal reason details publicly.
**Where**: `src/modules/gym-access/authorization/`
**Depends on**: T4
**Reuses**: `appendSecurityEvent`, `security_audit_events`, and UUIDv7 validation
**Requirement**: AUTHZ-05

**Tools**:

- MCP: NONE
- Skill: `coding-guidelines`

**Done when**:

- [x] Cross-gym, role, membership-status, and relationship denials map to stable internal audit reason codes.
- [x] Audit metadata contains operation and resource type without resource payload or existence details.
- [x] A valid resource UUIDv7 is the target when available; otherwise the selected gym is the target.
- [x] Audit persistence completes before a forbidden result can be returned.
- [x] At least 6 integration cases cover the four required denial classes, target fallback, and audit-write failure.
- [x] Full gate passes.

**Tests**: integration
**Gate**: full
**Commit**: `feat(authz): audit authorization denials`

### T6: Implement the Authorized Operation Boundary ✅

**What**: Coordinate membership and resource-fact loading, relationship resolution, policy evaluation, protected handler execution, transaction completion, denial auditing, and generic errors.
**Where**: `src/modules/gym-access/authorization/`
**Depends on**: T5
**Reuses**: Database composition root, T2 policy, T3 relationship port, T4 loader, T5 denial audit, and `GymAccessForbiddenError`
**Requirement**: AUTHZ-01, AUTHZ-02, AUTHZ-03, AUTHZ-04, AUTHZ-05, AUTHZ-10, AUTHZ-11, AUTHZ-12, AUTHZ-13

**Tools**:

- MCP: NONE
- Skill: `coding-guidelines`

**Done when**:

- [x] `withGymAuthorization` invokes its handler only for an allow decision.
- [x] ID-based requests can resolve the resource's actual gym through the authorization transaction before policy evaluation.
- [x] The handler receives the same transaction and an invocation-scoped `AuthorizedGymContext`.
- [x] Denials complete without protected work, commit required audit evidence separately, and throw only `GymAccessForbiddenError`.
- [x] Audit failure throws `AuthorizationAuditError` and never executes protected work.
- [x] Handler failure rolls back its transaction without creating a denial audit event.
- [x] At least 8 integration cases cover allow, each denial class, audit failure, handler rollback, stale context, and generic public errors.
- [x] Full gate passes.

**Tests**: integration
**Gate**: full
**Commit**: `feat(authz): enforce authorized operations`

### T7: Publish the Gym Access Authorization Contract ✅

**What**: Expose the authorized-operation boundary and provider-neutral request/context types through the Gym Access facade without exposing persistence collaborators.
**Where**: `src/modules/gym-access/`
**Depends on**: T6
**Reuses**: Existing frozen `gymAccess` facade and facade integration-test style
**Requirement**: AUTHZ-01, AUTHZ-11

**Tools**:

- MCP: NONE
- Skill: `coding-guidelines`

**Done when**:

- [x] Callers can invoke named authorization operations only through the Gym Access public contract.
- [x] DTOs expose primitive provider-neutral values and no Drizzle or domain internals.
- [x] Internal policy, loader, and audit collaborators remain unexported.
- [x] At least 4 facade integration cases cover allow, generic denial, default relationship denial, and invocation-scoped context.
- [x] Full gate passes.

**Tests**: integration
**Gate**: full
**Commit**: `feat(authz): publish authorization contract`

### Phase 3: Protected Training Operations

### T8: Authorize Workout and History Reads

**What**: Route workout-template and completed-history reads through named authorization operations and transaction-scoped gym predicates.
**Where**: Workout read operation boundary
**Depends on**: T7
**Reuses**: Existing workout mapping/order queries, `Home` identity resolution, and current browser journeys
**Requirement**: AUTHZ-02, AUTHZ-03, AUTHZ-04, AUTHZ-06, AUTHZ-07, AUTHZ-08, AUTHZ-09, AUTHZ-10, AUTHZ-13

**Tools**:

- MCP: NONE
- Skill: `coding-guidelines`

**Done when**:

- [ ] Both read handlers use the authorization transaction and authorized gym rather than a reusable DTO.
- [ ] Owner and admin reads succeed within the active gym.
- [ ] Coach and trainee relationship-dependent reads deny through the default relationship policy.
- [ ] Inactive, forged-context, missing-resource-gym, and cross-gym reads return the generic forbidden error with required audit evidence.
- [ ] At least 6 data integration cases and all three existing browser journeys pass.
- [ ] Full gate and phase Build gate pass.

**Tests**: integration + e2e
**Gate**: full + build
**Commit**: `feat(authz): protect training reads`

### T9: Authorize Workout Creation

**What**: Route workout creation through the named training-management operation using the authorization transaction for the complete template write.
**Where**: Workout creation operation boundary
**Depends on**: T8
**Reuses**: Existing workout parser, transactional workout/exercise insert, Server Action identity boundary, and revalidation behavior
**Requirement**: AUTHZ-02, AUTHZ-03, AUTHZ-04, AUTHZ-05, AUTHZ-06, AUTHZ-07, AUTHZ-08, AUTHZ-09, AUTHZ-10, AUTHZ-13

**Tools**:

- MCP: NONE
- Skill: `coding-guidelines`

**Done when**:

- [ ] Owner and admin creation succeeds and preserves creator attribution.
- [ ] Coach, trainee, inactive, and cross-gym attempts create no workout or exercises.
- [ ] Every required denial persists one audit event and does not revalidate the route.
- [ ] Authorization and both inserts use one transaction supplied by the boundary.
- [ ] At least 5 data/Server Action integration cases cover allowed roles and all denial families.
- [ ] Full gate passes.

**Tests**: integration
**Gate**: full
**Commit**: `feat(authz): protect workout creation`

### T10: Authorize Workout Session Writes

**What**: Route workout-session completion through relationship-aware authorization while preserving gym-scoped workout/exercise validation and atomic persistence.
**Where**: Workout session operation boundary
**Depends on**: T9
**Reuses**: Existing session parser, workout/exercise ownership query, transaction inserts, Server Action identity boundary, and revalidation behavior
**Requirement**: AUTHZ-02, AUTHZ-03, AUTHZ-04, AUTHZ-05, AUTHZ-06, AUTHZ-07, AUTHZ-08, AUTHZ-09, AUTHZ-10, AUTHZ-11, AUTHZ-13

**Tools**:

- MCP: NONE
- Skill: `coding-guidelines`

**Done when**:

- [ ] Owner and admin session writes succeed for workouts in the active gym.
- [ ] The workout's actual gym is resolved inside the authorization transaction before the session policy is evaluated.
- [ ] Coach and trainee writes deny while required assignment/self relationship facts are absent.
- [ ] Inactive, cross-gym, wrong-workout, and wrong-exercise attempts persist no partial session data.
- [ ] Required policy denials create one audit event and never revalidate the route.
- [ ] At least 6 data/Server Action integration cases cover allowed roles, relationship denial, tenant denial, and atomic rollback.
- [ ] Full gate and final Build gate pass without reducing the existing test count.

**Tests**: integration + e2e
**Gate**: full + build
**Commit**: `feat(authz): protect workout sessions`

---

## Phase Execution Map

```text
Phase 1 -> Phase 2 -> Phase 3

Phase 1: T1 -> T2 -> T3
Phase 2: T4 -> T5 -> T6 -> T7
Phase 3: T8 -> T9 -> T10
```

Execution is strictly sequential. Phase 1 and Phase 2 pack into the first approximately seven-task batch; Phase 3 forms the second batch. At Execute, offer sequential batch workers before dispatch because the feature exceeds one task-budgeted batch. A fresh independent Verifier runs after T10 regardless of worker use.

## Task Granularity Check

| Task | Scope                                                                     | Status      |
| ---- | ------------------------------------------------------------------------- | ----------- |
| T1   | One canonical role contract across its domain/persistence representations | ✅ Granular |
| T2   | One pure policy evaluator and its types                                   | ✅ Granular |
| T3   | One relationship-policy port                                              | ✅ Granular |
| T4   | One current-facts loader                                                  | ✅ Granular |
| T5   | One denial-audit mapper/writer                                            | ✅ Granular |
| T6   | One authorized-operation coordinator                                      | ✅ Granular |
| T7   | One public facade contract                                                | ✅ Granular |
| T8   | One read-operation family sharing one policy                              | ✅ Granular |
| T9   | One workout-creation operation                                            | ✅ Granular |
| T10  | One session-write operation                                               | ✅ Granular |

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows            | Status   |
| ---- | ---------------------- | ------------------------ | -------- |
| T1   | None                   | Phase start              | ✅ Match |
| T2   | T1                     | T1 -> T2                 | ✅ Match |
| T3   | T2                     | T2 -> T3                 | ✅ Match |
| T4   | T3                     | Phase 1 precedes Phase 2 | ✅ Match |
| T5   | T4                     | T4 -> T5                 | ✅ Match |
| T6   | T5                     | T5 -> T6                 | ✅ Match |
| T7   | T6                     | T6 -> T7                 | ✅ Match |
| T8   | T7                     | Phase 2 precedes Phase 3 | ✅ Match |
| T9   | T8                     | T8 -> T9                 | ✅ Match |
| T10  | T9                     | T9 -> T10                | ✅ Match |

## Test Co-location Validation

| Task | Code Layer Created/Modified       | Matrix Requires    | Task Says          | Status |
| ---- | --------------------------------- | ------------------ | ------------------ | ------ |
| T1   | Membership domain + schema        | unit + integration | unit + integration | ✅ OK  |
| T2   | Pure authorization policy         | unit               | unit               | ✅ OK  |
| T3   | Relationship policy               | unit               | unit               | ✅ OK  |
| T4   | Authorization data loader         | integration        | integration        | ✅ OK  |
| T5   | Audit boundary                    | integration        | integration        | ✅ OK  |
| T6   | Authorization coordinator         | integration        | integration        | ✅ OK  |
| T7   | Public facade                     | integration        | integration        | ✅ OK  |
| T8   | Training reads + RSC wiring       | integration + e2e  | integration + e2e  | ✅ OK  |
| T9   | Training mutation + Server Action | integration        | integration        | ✅ OK  |
| T10  | Training mutation + Server Action | integration + e2e  | integration + e2e  | ✅ OK  |

## Requirement Coverage

| Requirement | Tasks                       |
| ----------- | --------------------------- |
| AUTHZ-01    | T2, T4, T6, T7              |
| AUTHZ-02    | T2, T6, T8, T9, T10         |
| AUTHZ-03    | T2, T4, T6, T8, T9, T10     |
| AUTHZ-04    | T2, T6, T8, T9, T10         |
| AUTHZ-05    | T5, T6, T9, T10             |
| AUTHZ-06    | T1, T2, T8, T9, T10         |
| AUTHZ-07    | T1, T2, T8, T9, T10         |
| AUTHZ-08    | T1, T2, T3, T8, T9, T10     |
| AUTHZ-09    | T1, T2, T3, T8, T9, T10     |
| AUTHZ-10    | T1, T2, T4, T6, T8, T9, T10 |
| AUTHZ-11    | T3, T6, T7, T10             |
| AUTHZ-12    | T1, T2, T4, T6              |
| AUTHZ-13    | T2, T3, T4, T6, T8, T9, T10 |
