# Testing foundation context

**Gathered:** August 15, 2026
**Spec:** `.specs/features/0001-testing-foundation/spec.md`
**Status:** Ready for design

---

## Feature boundary

Adopt Drizzle and a Vitest-based testing foundation, run PostgreSQL integration
tests with Testcontainers, cover the behavior already present in Gym Flow, and
add a thin Playwright layer for critical browser journeys. The delivery order
is documentation, infrastructure, current-project tests, then end-to-end tests.

---

## Implementation decisions

### Delivery sequence

- Complete and verify agent-facing testing documentation first.
- Add database and test infrastructure only after the documentation is in
  place.
- Add tests for current behavior only after the infrastructure gate passes.
- Add Playwright journeys only after lower-level behavioral coverage passes.

### Test strategy

- Keep the testing honeycomb documented in `TESTING.md`.
- Make integration tests the default.
- Use unit tests only for isolated rules and dense edge-case matrices.
- Use Playwright only for loading workouts, creating a workout, and completing
  a workout session through the real application.
- Keep end-to-end scenarios sequential and backed by isolated Testcontainers
  data.

### Database query layer

- Use Drizzle for database access in production and integration tests.
- Use Drizzle's node-postgres adapter over TCP in every environment.
- Use Neon's pooled connection URL and a bounded module-scoped pool in
  production.
- Use the Testcontainer connection URL in integration and end-to-end tests.
- Keep all database-dependent Next.js code on the Node.js runtime.

### Agent's discretion

- Exact helper and fixture names may follow repository conventions established
  in the design.
- Exact test case grouping may optimize readability while preserving every
  acceptance criterion.

### Declined or undiscussed gray areas to assumptions

- Keep existing SQL migration files authoritative during adoption.
- Run database integration files sequentially against one container.
- Pin Testcontainers to `postgres:18-alpine`, matching the deployed Neon major.

---

## Deferred ideas

- Additional end-to-end scenarios beyond the three critical journeys.
- Coverage percentage enforcement.
- Per-worker databases for parallel integration tests.
- Drizzle-generated migrations after the existing schema is reconciled.
