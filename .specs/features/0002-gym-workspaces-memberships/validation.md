# Gym Workspaces and Memberships Validation

## Validation: Gym Workspaces and Memberships - PASS

**Date**: 2026-08-16  
**Spec**: `.specs/features/0002-gym-workspaces-memberships/spec.md`  
**Diff range**: `f1c2bcc..bfbded0`  
**Verifier**: independent sub-agent (author != verifier)

The implementation matches all 22 specified outcomes. The full behavioral gate,
mandatory build gate, and expanded six-mutation critical-path sensor pass.

---

## Task Completion

| Task | Status | Verification result                                                                                      |
| ---- | ------ | -------------------------------------------------------------------------------------------------------- |
| T1   | Done   | PostgreSQL migration lifecycle and production build pass.                                                |
| T2   | Done   | Drizzle schema typechecks and builds.                                                                    |
| T3   | Done   | Identity verification, normalized uniqueness, and stable identity are covered.                           |
| T4   | Done   | Owner and non-owner membership transitions are covered.                                                  |
| T5   | Done   | Structured append and update/delete rejection are covered.                                               |
| T6   | Done   | Provisioning, uniqueness, owner invariants, and audit rollback are covered.                              |
| T7   | Done   | Automatic, explicit, stale, inactive, malformed, unknown, and unauthorized context paths are covered.    |
| T8   | Done   | Facade provisioning, membership DTOs, context DTOs, and forbidden resolution are covered.                |
| T9   | Done   | Gym ownership, creator attribution, invalid relationship, and cross-gym isolation are covered.           |
| T10  | Done   | Server Actions resolve identity/context and reject invalid, inactive, ambiguous, and cross-gym requests. |
| T11  | Done   | Selector accessibility/states and the multi-gym browser path are covered.                                |

All task checkboxes in `tasks.md` are complete.

---

## Spec-Anchored Acceptance Criteria

| Criterion | Spec-defined outcome                                                                                     | `file:line` + assertion expression                                                                                                                                                                                                                                                                   | Result |
| --------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| GWM-01    | Global identity is stored separately from gym membership.                                                | `test/database/lifecycle.integration.test.ts:25` - `expect(result.rows.map(...)).toEqual([... "memberships", ... "users" ...])` proves distinct persisted entities.                                                                                                                                  | PASS   |
| GWM-02    | One normalized verified email identifies at most one account.                                            | `src/modules/identity/account/identity.integration.test.ts:84` - duplicate trimmed/case-varied email rejects with PostgreSQL `23505`; line 85 asserts `users_email_normalized_idx`.                                                                                                                  | PASS   |
| GWM-03    | Changing to another unique verified email preserves the user ID and memberships.                         | `src/modules/identity/account/identity.integration.test.ts:129` - exact row remains `id: "user-1"`, `membership_user_id: "user-1"`, with normalized new email.                                                                                                                                       | PASS   |
| GWM-04    | Provisioning creates one gym and one active owner membership for the verified user.                      | `src/modules/gym-access/gym/provision-gym.integration.test.ts:52` - returned owner has `role: "owner"`, `status: "active"`; line 62 asserts exactly one persisted membership.                                                                                                                        | PASS   |
| GWM-05    | Gym, owner membership, and audit event are atomic.                                                       | `src/modules/gym-access/gym/provision-gym.integration.test.ts:62` - exact one membership and event; line 153 asserts audit failure leaves `{ gyms: "0", memberships: "0", events: "0" }`.                                                                                                            | PASS   |
| GWM-06    | Each gym has exactly one immutable owner membership.                                                     | `src/modules/gym-access/gym/provision-gym.integration.test.ts:62` - exact owner count/state; line 127 asserts role, status, and removal mutations reject with `owner membership is immutable`.                                                                                                       | PASS   |
| GWM-07    | A user already associated with a gym may provision another independent gym.                              | `src/modules/gym-access/gym/provision-gym.integration.test.ts:80` - second ID differs; line 93 asserts two gyms, two memberships, and two events.                                                                                                                                                    | PASS   |
| GWM-08    | Owner suspension, removal, and role change are forbidden.                                                | `src/modules/gym-access/membership/membership.unit.test.ts:16` - all three transitions throw `OwnerMembershipImmutableError`; `src/modules/gym-access/gym/provision-gym.integration.test.ts:127` proves the database backstop.                                                                       | PASS   |
| GWM-09    | A user has at most one membership per gym and may belong to multiple gyms.                               | `src/modules/gym-access/gym/provision-gym.integration.test.ts:105` - concurrent duplicates yield one fulfilled and one rejected attempt; line 113 asserts one row; line 93 proves multiple memberships across gyms.                                                                                  | PASS   |
| GWM-10    | Every gym-scoped operation resolves exactly one active gym context.                                      | `src/app/actions.integration.test.ts:83` and `:215` assert workouts and sessions persist under the server-resolved gym; `:142` rejects ambiguous context before persistence.                                                                                                                         | PASS   |
| GWM-11    | Exactly one active membership is automatically selected.                                                 | `src/modules/gym-access/active-gym/active-gym.integration.test.ts:48` - resolved gym equals the only gym; line 49 asserts the exact persisted selection row; `test/e2e/workout-journeys.spec.ts:17` asserts no selector prompt.                                                                      | PASS   |
| GWM-12    | Multiple active memberships without a valid selection require explicit selection before gym-scoped work. | `src/modules/gym-access/active-gym/active-gym.integration.test.ts:62` - rejects with `GymSelectionRequiredError`; `src/app/actions.integration.test.ts:149` asserts the exact public message and line 150 asserts zero workouts.                                                                     | PASS   |
| GWM-13    | An inactive saved membership is cleared and another valid context is required.                           | `src/modules/gym-access/active-gym/active-gym.integration.test.ts:91` - stale resolution rejects with `GymSelectionRequiredError`; line 97 asserts selection count `"0"`.                                                                                                                            | PASS   |
| GWM-14    | No active membership in the selected gym produces a forbidden outcome.                                   | `src/modules/gym-access/active-gym/active-gym.integration.test.ts:107` - explicit inactive selection equals `GymAccessForbiddenError`; line 113 asserts no selection; `src/app/actions.integration.test.ts:339` asserts the same public denial and lines 345-346 assert no persistence/revalidation. | PASS   |
| GWM-15    | Created workouts and sessions persist gym ownership and creator attribution.                             | `src/data/workouts.integration.test.ts:59` - workout row asserts `gym_id` and `created_by_user_id`; line 288 asserts the same fields for a session.                                                                                                                                                  | PASS   |
| GWM-16    | Creator identity is attribution while the gym owns training data.                                        | `src/data/workouts.integration.test.ts:244` - listing includes same-gym records from different creators and excludes another gym; line 519 proves the same for history.                                                                                                                              | PASS   |
| GWM-17    | Cross-gym record access is forbidden without partial persistence.                                        | `src/app/actions.integration.test.ts:283` - exact `Workout not found or access denied` rejection; line 284 asserts zero sessions/sets; `src/data/workouts.integration.test.ts:244` proves cross-gym listing isolation.                                                                               | PASS   |
| GWM-18    | Audit rows contain event type, gym, optional actor, target, timestamp, and structured metadata.          | `src/modules/audit/security-event/security-event.integration.test.ts:57` - one exact row asserts every required field and metadata value.                                                                                                                                                            | PASS   |
| GWM-19    | Required audit persistence failure rejects and rolls back the protected mutation.                        | `src/modules/gym-access/gym/provision-gym.integration.test.ts:143` - rejects with `audit unavailable`; line 153 asserts gym, membership, and event counts remain zero.                                                                                                                               | PASS   |
| GWM-20    | Audit events are retained without an application deletion operation.                                     | `src/modules/audit/security-event/security-event.integration.test.ts:86` - update and delete both reject with `security audit events are append-only`; line 92 asserts the row remains.                                                                                                              | PASS   |
| GWM-21    | Training-record creation without a valid gym relationship is rejected.                                   | `src/data/workouts.integration.test.ts:117` - missing-gym insert rejects; line 123 asserts foreign-key code `23503`.                                                                                                                                                                                 | PASS   |
| GWM-22    | Malformed and unknown active-gym IDs reject identically without existence disclosure.                    | `src/modules/gym-access/active-gym/active-gym.integration.test.ts:122` - both inputs reject equal to `new GymAccessForbiddenError()`; `src/app/actions.integration.test.ts:317` asserts the same public message and no revalidation.                                                                 | PASS   |

**Spec-anchored status**: 22/22 criteria match the exact specified outcome.
There are 0 uncovered criteria and 0 spec-precision gaps.

---

## Discrimination Sensor

**Depth**: P0/full manual sensor for identity, authorization, audit atomicity,
tenant isolation, and action behavior  
**Scratch**: detached temporary Git worktree at `bfbded0`; no mutation touched
the real checkout

| Mutation                          | File:line                                            | Fault                                                                          | Focused result                                                                                                                                                               | Outcome |
| --------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| M1 - identity verification        | `src/modules/identity/account/identity.ts:43`        | Inverted verified-email enforcement.                                           | Identity suite: 2/5 tests failed on verified and unverified outcomes.                                                                                                        | Killed  |
| M2 - explicit active membership   | `src/modules/gym-access/active-gym/active-gym.ts:91` | Inverted `status = "active"` to `status = "suspended"` for explicit selection. | Active-gym + action suites: 5/21 tests failed. Both the service test at `active-gym.integration.test.ts:107` and action test at `actions.integration.test.ts:339` killed it. | Killed  |
| M3 - audit side effect            | `src/modules/gym-access/gym/provision-gym.ts:50`     | Removed the required provisioning audit append.                                | Provisioning suite: 3/7 tests failed on event count, audit-error propagation, and rollback.                                                                                  | Killed  |
| M4 - owner provisioning invariant | `src/modules/gym-access/gym/provision-gym.ts:45`     | Created a member instead of the required owner membership.                     | Provisioning suite: 6/7 tests failed; the deferred database invariant rejected the transaction.                                                                              | Killed  |
| M5 - training isolation           | `src/data/workouts.ts:138`                           | Replaced the session workout gym predicate with a tautology.                   | Workout + action suites: 1/28 tests failed because the public cross-gym denial changed to a lower-level constraint error.                                                    | Killed  |
| M6 - selector action              | `src/app/actions.ts:27`                              | Removed the active-gym selection call while retaining revalidation.            | Action suite: 4/12 tests failed on persistence and malformed/unknown/inactive denial.                                                                                        | Killed  |

**Sensor outcome**: 6 injected, 6 killed, 0 survived. PASS.

### Isolation proof

- Real-tree porcelain before sensor contained exactly the three pre-existing
  untracked verifier artifacts:
  `.specs/LESSONS.md`,
  `.specs/features/0002-gym-workspaces-memberships/validation.md`, and
  `.specs/lessons.json`.
- The scratch path
  `C:\Users\pablo\AppData\Local\Temp\gym-flow-verifier-0002-iteration2`
  was validated under the system temp directory and removed.
- `git worktree list --porcelain` shows only the real checkout after cleanup.
- Real-tree porcelain after cleanup matches the baseline exactly.
- Worktree cleanup followed the temporary `node_modules` junction and removed
  the ignored real dependency contents. `npm ci` restored all 671
  lockfile-pinned packages; `node_modules/.bin/vitest.cmd` was verified
  present afterward. Tracked files and porcelain were unchanged.

---

## Gate Checks and Test Integrity

### Mandatory build gate

- **Command**: `npm run lint && npm run format:check && npm run typecheck && npm run build`
  (PowerShell exit checks were used for equivalent fail-fast behavior).
- **Lint**: passed.
- **Format check**: passed.
- **Typecheck**: passed.
- **Production build**: passed. Next.js compiled, typechecked, generated static
  pages, and finalized optimization.
- **Environment note**: the sandboxed build reached successful compilation,
  then hit `spawn EPERM` while creating a worker. The identical approved
  out-of-sandbox build completed with exit code 0.

### Full behavioral gate

- **Command**: `npm test`.
- **Vitest**: 134 passed in 16 files.
- **Playwright**: 4 passed with one worker.
- **Current total**: 138 passed, 0 failed, 0 skipped.
- **Pre-feature total at `f1c2bcc`**: 89 passed, 0 failed, 0 skipped, recorded
  at `.specs/features/0001-testing-foundation/validation.md:86`.
- **Delta**: +49 tests.
- **Integrity**: no skipped, disabled, or pending in-scope tests and no
  `// SPEC_DEVIATION` markers were found. The fix commit `bfbded0` adds the
  two inactive explicit-selection regressions without deleting or weakening a
  test.
- **Warnings**: Vite emitted forward-looking config-loader and native
  tsconfig-path warnings. They do not affect the current gate.

---

## Code Quality

| Principle                       | Status | Evidence                                                                                                                              |
| ------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| Minimum code and no scope creep | PASS   | Changed behavior maps to identity, gym access, audit, gym-owned training, selector wiring, or required test infrastructure.           |
| Surgical changes                | PASS   | The behavioral diff is confined to T1-T11 and their tests/spec artifacts.                                                             |
| Matches existing patterns       | PASS   | Integration-heavy Testcontainers coverage, Server Action boundaries, co-located tests, and thin browser journeys follow `TESTING.md`. |
| Spec-anchored assertions        | PASS   | 22/22 outcomes have direct exact-value/state evidence.                                                                                |
| Per-layer coverage              | PASS   | Domain invariants, database constraints/transactions, actions, selector behavior, and the browser path are covered.                   |
| Payload/conjunction rule        | PASS   | Gym, user, membership, audit payload, creator attribution, and zero-partial-state values are asserted, not only call occurrence.      |
| Every in-scope test is claimed  | PASS   | New tests map to GWM-01 through GWM-22, task done-when criteria, database safety, or preservation of the approved browser journeys.   |
| Documented guidelines           | PASS   | Reviewed against `AGENTS.md`, `TESTING.md`, and the skill coding principles.                                                          |

No unrelated implementation issue blocks this feature.

---

## Edge Cases

- [x] GWM-21: invalid gym relationship rejects with foreign-key code `23503`
      at `src/data/workouts.integration.test.ts:123`.
- [x] GWM-22: malformed and unknown IDs share the same forbidden outcome at
      `src/modules/gym-access/active-gym/active-gym.integration.test.ts:122`.
- [x] Inactive explicit selection rejects without selection persistence or
      revalidation at `src/app/actions.integration.test.ts:339`.

## Interactive UAT

No human UAT was required for this verifier pass. The automated browser suite
passes the multi-gym selection journey and all three existing workout journeys.

## Requirement Traceability Update

| Requirement           | Previous status | Verification status |
| --------------------- | --------------- | ------------------- |
| GWM-01 through GWM-22 | Implemented     | Verified            |

## Lessons

Iteration 1 recorded candidate lesson L-001 from the then-surviving M2
authorization mutant. M2 is killed in this iteration, so the gap is closed.
The candidate remains preserved as historical, grounded project guidance.
This clean PASS has no new surviving mutant, AC gap, spec-precision gap,
gate failure, or `SPEC_DEVIATION`, so no new lesson is recorded.

---

## Summary

**Overall**: Ready - PASS

**Spec-anchored check**: 22/22 criteria match their specified outcomes; 0
spec-precision gaps.  
**Build gate**: passed.  
**Behavioral gate**: 138 passed, 0 failed, 0 skipped.  
**Test integrity**: +49 tests from the pre-feature baseline.  
**Sensor**: 6 injected, 6 killed, 0 survived.

The inactive explicit-selection regression tests added by `bfbded0` close the
iteration-1 discrimination gap at both the service and Server Action
boundaries. The feature is ready for the next repository workflow step.
