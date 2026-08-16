# Gym Workspaces and Memberships Specification

## Problem Statement

Gym Flow currently treats one local user as the owner of every workout and session. The application needs a global identity boundary, isolated gym workspaces, gym-specific memberships, and an explicit active-gym context before multi-user capabilities can be introduced safely.

## Goals

- [ ] A verified global account can provision and own independent gyms.
- [ ] One account can belong to multiple gyms without exposing data across them.
- [ ] Every gym-scoped operation resolves and validates one active gym context.
- [ ] Existing workout data becomes gym-owned without requiring production-data backfill.
- [ ] Security-sensitive mutations have an atomic audit foundation.

## Out of Scope

| Feature                                         | Reason                                                      |
| ----------------------------------------------- | ----------------------------------------------------------- |
| Invitations and email delivery                  | Defined by spec 0004 after membership authorization exists. |
| Detailed role permissions                       | Defined by spec 0003.                                       |
| Coach-trainee assignments                       | Defined by spec 0005.                                       |
| Workout assignments and shared templates        | Defined by spec 0006.                                       |
| Membership lifecycle administration             | Defined by spec 0007.                                       |
| Ownership transfer or subscription deactivation | Requires a separate billing-facing privileged workflow.     |

---

## Assumptions & Open Questions

| Assumption / decision  | Chosen default                                                                                    | Rationale                                                                            | Confirmed? |
| ---------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ---------- |
| Account email identity | One normalized, verified email identifies at most one global account.                             | Gym invitations must later resolve to exactly one account that controls the address. | Yes        |
| Email changes          | Memberships reference a permanent user ID and survive a change to another unique, verified email. | Email is an authentication attribute, not membership identity.                       | Yes        |
| Gym ownership          | Each gym has exactly one immutable owner; one account may own multiple gyms.                      | This preserves workspace isolation without introducing ownership transfer.           | Yes        |
| Active gym context     | Auto-select the only active membership; otherwise require an explicit persisted selection.        | Users need convenience without ambiguous multi-gym access.                           | Yes        |
| Existing data          | No production data exists; development and test data may be recreated.                            | No legacy ownership backfill is required.                                            | Yes        |
| Audit foundation       | Create the audit store and atomic write contract now; later specs add their own events.           | Security cannot be retrofitted safely after mutations ship.                          | Yes        |

**Open questions:** none; all decisions are resolved or recorded above.

---

## User Stories

### P1: Establish Global Identity ⭐ MVP

**User Story**: As a user, I want one verified account across gyms so that I do not need duplicate identities.

**Why P1**: Memberships and invitations require a stable global identity.

**Acceptance Criteria**:

1. **GWM-01:** The system SHALL store global user identity separately from gym membership.
2. **GWM-02:** The system SHALL permit each normalized verified email to identify at most one global account.
3. **GWM-03:** WHEN a user changes to another unique verified email THEN the system SHALL preserve the same user ID and memberships.

**Independent Test**: Change a user's verified email and verify that the same user and memberships remain.

---

### P1: Provision Gym Workspaces ⭐ MVP

**User Story**: As a verified customer, I want an isolated gym workspace so that I can administer gym-owned data.

**Why P1**: Every later access rule depends on a durable gym boundary.

**Acceptance Criteria**:

1. **GWM-04:** WHEN a verified user provisions a gym THEN the system SHALL create one gym and one active owner membership for that user.
2. **GWM-05:** WHEN a gym is provisioned THEN the system SHALL create the gym, owner membership, and audit event in one atomic operation.
3. **GWM-06:** The system SHALL maintain exactly one immutable owner membership for each gym.
4. **GWM-07:** WHEN a user already owns or belongs to another gym THEN the system SHALL permit that user to provision another independent gym.
5. **GWM-08:** IF any user attempts to suspend, remove, or change the role of an owner membership THEN the system SHALL reject the operation as forbidden.

**Independent Test**: Provision two gyms for one verified user and verify distinct gyms, immutable owner memberships, and audit events.

---

### P1: Resolve Active Gym Context ⭐ MVP

**User Story**: As a multi-gym user, I want an explicit active gym so that each operation targets the intended workspace.

**Why P1**: An ambiguous tenant context risks cross-gym data access.

**Acceptance Criteria**:

1. **GWM-09:** The system SHALL permit one user to hold at most one membership per gym and memberships in multiple gyms.
2. **GWM-10:** The system SHALL resolve every gym-scoped operation against exactly one active gym context.
3. **GWM-11:** WHEN a user has exactly one active gym membership THEN the system SHALL select that gym automatically.
4. **GWM-12:** WHEN a user has multiple active gym memberships and no valid selection THEN the system SHALL require a gym selection before a gym-scoped operation.
5. **GWM-13:** WHEN the selected membership becomes inactive THEN the system SHALL clear the selection and require another valid gym context.
6. **GWM-14:** IF a user has no active membership in the selected gym THEN the system SHALL reject the gym-scoped operation as forbidden.

**Independent Test**: Give one account two memberships, switch contexts, invalidate the selection, and verify strict isolation.

---

### P1: Establish Gym-Owned Records and Audit Store ⭐ MVP

**User Story**: As a gym owner, I want training records and security evidence attached to the gym so that later staff changes cannot orphan them.

**Why P1**: Later authorization and lifecycle features depend on gym ownership and auditable mutations.

**Acceptance Criteria**:

1. **GWM-15:** WHEN a workout template or session is created in a gym context THEN the system SHALL associate it with that gym and preserve creator attribution.
2. **GWM-16:** The system SHALL treat creator identity as attribution metadata rather than ownership of gym training data.
3. **GWM-17:** IF a member attempts to access a gym-owned record through another gym context THEN the system SHALL reject access as forbidden.
4. **GWM-18:** The system SHALL provide an append-only security audit store containing event type, gym, actor when known, target, timestamp, and structured change metadata.
5. **GWM-19:** IF an audit event required by a security-sensitive database mutation cannot be persisted THEN the system SHALL reject and roll back that mutation.
6. **GWM-20:** The system SHALL retain audit events indefinitely without exposing an application deletion operation.

**Independent Test**: Create gym-owned records and an audited mutation, then verify cross-gym denial and rollback when audit persistence fails.

## Edge Cases

- **GWM-21:** IF a gym-scoped record has no valid gym relationship THEN the system SHALL reject its creation.
- **GWM-22:** IF an active gym identifier is malformed or references an unknown gym THEN the system SHALL reject the operation without disclosing gym existence.

---

## Implicit-Requirement Dimensions

| Dimension                                | Resolution                                                                                                                                       |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Input validation and bounds              | GWM-02 and GWM-22 cover unique email and invalid context input.                                                                                  |
| Failure and partial-failure states       | GWM-05 and GWM-19 require atomic rollback.                                                                                                       |
| Idempotency, retry, and duplicates       | GWM-02, GWM-06, and GWM-09 define uniqueness.                                                                                                    |
| Authorization boundaries and rate limits | GWM-10 through GWM-14 and GWM-17 define the tenant boundary; rate limits are N/A because this slice has no anonymous or high-frequency endpoint. |
| Concurrency and ordering                 | Database uniqueness plus GWM-05 enforce single-owner atomic provisioning.                                                                        |
| Data lifecycle and expiry                | GWM-03, GWM-16, and GWM-20 define preservation; expiry is N/A.                                                                                   |
| Observability                            | GWM-18 through GWM-20 define the audit foundation.                                                                                               |
| External-dependency failure              | N/A because authentication verification is consumed as an established identity attribute in this slice.                                          |
| State-transition integrity               | Owner immutability and context invalidation are defined by GWM-06, GWM-08, and GWM-13.                                                           |

## Requirement Traceability

| Requirement ID | Story                             | Phase  | Status      |
| -------------- | --------------------------------- | ------ | ----------- |
| GWM-01         | Establish Global Identity         | T3     | Implemented |
| GWM-02         | Establish Global Identity         | T3     | Implemented |
| GWM-03         | Establish Global Identity         | T3     | Implemented |
| GWM-04         | Provision Gym Workspaces          | Design | In Design   |
| GWM-05         | Provision Gym Workspaces          | Design | In Design   |
| GWM-06         | Provision Gym Workspaces          | T4     | In Progress |
| GWM-07         | Provision Gym Workspaces          | Design | In Design   |
| GWM-08         | Provision Gym Workspaces          | T4     | Implemented |
| GWM-09         | Resolve Active Gym Context        | T4     | In Progress |
| GWM-10         | Resolve Active Gym Context        | Design | In Design   |
| GWM-11         | Resolve Active Gym Context        | Design | In Design   |
| GWM-12         | Resolve Active Gym Context        | Design | In Design   |
| GWM-13         | Resolve Active Gym Context        | T4     | In Progress |
| GWM-14         | Resolve Active Gym Context        | Design | In Design   |
| GWM-15         | Gym-Owned Records and Audit Store | T9     | Planned     |
| GWM-16         | Gym-Owned Records and Audit Store | T9     | Planned     |
| GWM-17         | Gym-Owned Records and Audit Store | Design | In Design   |
| GWM-18         | Gym-Owned Records and Audit Store | T5     | Implemented |
| GWM-19         | Gym-Owned Records and Audit Store | T5     | In Progress |
| GWM-20         | Gym-Owned Records and Audit Store | T5     | Implemented |
| GWM-21         | Edge Cases                        | T9     | Planned     |
| GWM-22         | Edge Cases                        | Design | In Design   |

**Coverage:** 22 total, 22 mapped to draft tasks, 0 unmapped.

---

## Success Criteria

- [ ] One verified account can own or join two isolated gyms.
- [ ] Every gym-scoped operation validates exactly one active membership context.
- [ ] Gym-owned workout records cannot be accessed through another gym context.
- [ ] Required security audit writes are atomic with their mutations.
