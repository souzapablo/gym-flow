# Testing strategy

This repository follows the testing honeycomb. Favor integration tests that
exercise meaningful behavior across module boundaries. Add unit tests only
when isolating a small piece of logic makes failures clearer or covers edge
cases more efficiently.

The repository does not have a test runner yet. Treat this document as the
policy for selecting and writing tests when test infrastructure is introduced.

## Required workflow

For every behavior change:

1. Identify the user-visible behavior or business rule that can regress.
2. Add or update the smallest integration test that proves that behavior across
   the relevant boundaries.
3. Add unit tests only if the unit-test criteria below apply.
4. Run the relevant tests, lint, and type checks before declaring the change
   complete.

A change is not complete when required tests are missing or failing. Bug fixes
must include a regression test that fails without the fix.

## Integration tests are the default

Integration tests must provide most of the test coverage. Test behavior through
the most stable public boundary available, such as a Server Action, data
function, or rendered component, instead of calling private helpers directly.

Prefer integration tests for:

- Server Actions, including validation, current-user resolution, persistence,
  and returned results.
- Data access, including queries, writes, ownership constraints, row mapping,
  and transaction behavior.
- Components with meaningful user interaction or coordination between state,
  validation, and application boundaries.
- Complete business operations such as creating a workout or saving a workout
  session.

Use a real test database when database behavior matters. Each test must create
its own data and must not depend on execution order or shared mutable fixtures.
Reset or roll back test data between tests. Never point automated tests at a
development or production database.

Mock only boundaries that are slow, nondeterministic, unavailable in the test
environment, or outside this application's control. Do not mock the code under
test, database query results when testing persistence, or internal collaborators
solely to make a test easier to write.

## Unit tests are selective

Add a unit test when at least one of these conditions applies:

- The code expresses a business rule with several inputs, branches, or edge
  cases.
- The code is a pure transformation or parser whose full input matrix would make
  an integration test slow or hard to diagnose.
- Failure paths are impractical to reproduce through an integration boundary.
- The code fixes a defect in an isolated rule and a focused regression test
  communicates the defect better.

Good unit-test candidates include the parsers in
`src/lib/workout-validation.ts`. Type declarations, trivial accessors, framework
delegation, and implementation details do not need isolated tests.

## Test design rules

- Assert observable outcomes, persisted state, emitted errors, or accessible UI
  behavior. Do not assert private call order or internal implementation details.
- Name tests by behavior and condition, such as
  `rejects a session with an exercise owned by another user`.
- Cover the successful path, meaningful boundary values, and important failure
  paths. Do not chase line coverage with low-value assertions.
- Keep tests deterministic. Control time, randomness, generated identifiers, and
  external responses when they affect the result.
- Keep setup local and explicit. Use small factories for valid default data, and
  override only the fields relevant to the scenario.
- Avoid snapshots for business behavior. Use explicit assertions that explain
  what must remain true.
- Do not weaken production code or expose private functions only to test them.
- Do not add a unit test when an existing integration test already proves the
  behavior clearly and cheaply.

## Placement and naming

Co-locate tests with the code they cover unless the chosen test runner requires
a different structure. Use these suffixes:

- `*.integration.test.ts` or `*.integration.test.tsx` for integration tests.
- `*.unit.test.ts` or `*.unit.test.tsx` for unit tests.

Shared test factories and environment setup belong in a top-level `test/`
directory. Keep application-specific fixtures near their owning feature.

## Initial infrastructure constraints

When introducing the first tests, use a runner that supports TypeScript, React
Testing Library, and the current Next.js version. Read the matching guide in
`node_modules/next/dist/docs/01-app/02-guides/testing/` before configuring it.
Add separate commands for unit and integration tests, plus one command that runs
the complete suite in continuous integration.

Do not add end-to-end tests as part of the initial test setup unless a later
task explicitly expands the strategy. Static analysis, linting, and type
checking remain required quality checks, but they do not replace behavioral
tests.
