# STATE

## Decisions

### AD-001

- **Decision**: Gym Flow will use Drizzle for database access through Neon HTTP
  in production and node-postgres in isolated test environments.
- **Reason**: One typed query layer preserves Neon serverless transport while
  allowing real PostgreSQL tests through Testcontainers.
- **Trade-off**: The database composition root must normalize the small driver
  differences and carry both adapters.
- **Scope**: All current and future server-side database access.
- **Date**: 2026-08-15
- **Status**: superseded by AD-003

### AD-002

- **Decision**: Gym Flow will follow a testing honeycomb with integration tests
  as the default, selective unit tests, and a thin Playwright journey layer.
- **Reason**: Real boundaries provide the most confidence, while a few browser
  journeys cover Next.js wiring that lower-level tests cannot exercise.
- **Trade-off**: Docker and browser binaries are required for the full suite.
- **Scope**: All application behavior and CI quality gates.
- **Date**: 2026-08-15
- **Status**: active

### AD-003

- **Decision**: Gym Flow will use Drizzle with node-postgres over TCP in
  production and tests; production will connect through Neon's pooled endpoint.
- **Reason**: One driver provides full PostgreSQL transaction semantics and
  maximizes production/test parity.
- **Trade-off**: Database-dependent code requires the Node.js runtime and every
  production instance owns a bounded application connection pool.
- **Scope**: All current and future server-side database access.
- **Date**: 2026-08-15
- **Status**: active

### AD-004

- **Decision**: Gym Flow will evolve as a feature-oriented modular monolith with pragmatic DDD, flat-by-aggregate modules, provider-facing adapters, and one PostgreSQL database.
- **Reason**: The membership roadmap introduces durable business boundaries and invariants, while one deployment and database keep operations simple at the product's current scale.
- **Trade-off**: Module ownership and dependency rules require more discipline than the existing flat data layer, and physical isolation is deferred.
- **Scope**: New server-side business capabilities beginning with gym access; existing training code migrates incrementally when touched by a feature.
- **Date**: 2026-08-16
- **Status**: active

## Handoff

- **Current feature**: `0002-gym-workspaces-memberships`
- **Status**: Specification ready for approval and design
- **Next step**: Approve and design spec 0002 before advancing through the dependency-ordered membership-access roadmap.
- **Roadmap**: `.specs/features/0002-gym-workspaces-memberships/roadmap.md`
- **Dependencies**: 0002 → 0003 → 0004; 0003 → 0005 → 0006; 0003 + 0005 → 0007.
