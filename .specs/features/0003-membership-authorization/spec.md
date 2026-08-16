# Membership Authorization Specification

**Prerequisite:** `.specs/features/0002-gym-workspaces-memberships/spec.md`

## Problem Statement

Gym tenancy alone does not determine which operations a member may perform. Gym Flow needs one enforceable authorization contract combining role, membership status, active gym, resource gym, and later relationship attributes.

## Goals

- [ ] Every protected operation applies the same role-and-attribute policy.
- [ ] Cross-gym, inactive-member, and unauthorized role access is denied.
- [ ] Owner, admin, coach, and trainee capabilities are explicit and testable.

## Out of Scope

| Feature                                  | Reason                                                         |
| ---------------------------------------- | -------------------------------------------------------------- |
| Invitation lifecycle                     | Spec 0004.                                                     |
| Coach-trainee assignment management      | Spec 0005; this slice defines the policy hook it will satisfy. |
| Workout-template and session permissions | Spec 0006.                                                     |
| Membership mutations and restoration     | Spec 0007.                                                     |
| Subscription capabilities                | Commercial policy remains deferred.                            |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default                                                                                  | Rationale                                                  | Confirmed? |
| --------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ---------- |
| Roles                 | Owner, admin, coach, and trainee are gym-membership roles.                                      | Roles belong to a gym relationship, not global identity.   | Yes        |
| Authorization model   | Combine role, membership gym and status, active gym, resource gym, and relationship attributes. | Roles alone cannot enforce assignment or tenant isolation. | Yes        |
| Enforcement location  | Every server operation reauthorizes near the data boundary.                                     | UI visibility is not a security boundary.                  | Yes        |
| Security denials      | Cross-gym, role, membership-status, and relationship denials create audit events.               | Sensitive access attempts require evidence.                | Yes        |

**Open questions:** none; all decisions are resolved or recorded above.

---

## User Stories

### P1: Enforce the Membership Policy ⭐ MVP

**User Story**: As a gym member, I want access limited by my gym role and relationships so that gym data remains private.

**Why P1**: Every later multi-user operation relies on this boundary.

**Acceptance Criteria**:

1. **AUTHZ-01:** WHILE a membership is active, the system SHALL evaluate authorization using role, membership gym, active gym, membership status, resource gym, and applicable relationship attributes.
2. **AUTHZ-02:** IF the active gym differs from the resource gym THEN the system SHALL reject access as forbidden.
3. **AUTHZ-03:** IF the user has no active membership in the active gym THEN the system SHALL reject every gym-scoped operation as forbidden.
4. **AUTHZ-04:** The system SHALL prevent a membership in one gym from granting access to resources in another gym.
5. **AUTHZ-05:** IF a protected operation is denied for a cross-gym, role, membership-status, or relationship rule THEN the system SHALL record a security audit event.

**Independent Test**: Exercise the same resource operation with active, inactive, wrong-gym, and unauthorized memberships.

---

### P1: Define Role Capabilities ⭐ MVP

**User Story**: As a gym member, I want predictable permissions so that my access matches my responsibility.

**Why P1**: Role behavior must be stable before onboarding members.

**Acceptance Criteria**:

1. **AUTHZ-06:** WHILE an owner membership is active, the system SHALL permit management of non-owner memberships and all gym training resources within that gym.
2. **AUTHZ-07:** WHILE an admin membership is active, the system SHALL permit management of coaches, trainees, and all gym training resources within that gym.
3. **AUTHZ-08:** WHILE a coach membership is active, the system SHALL limit trainee-specific access to trainees related to that coach in the active gym.
4. **AUTHZ-09:** WHILE a trainee membership is active, the system SHALL limit training access to that trainee's assignments and history in the active gym.
5. **AUTHZ-10:** WHILE a membership is suspended or removed, the system SHALL deny access to that gym's training resources.
6. **AUTHZ-11:** The system SHALL expose a relationship-policy interface that defaults to denial when a required relationship is absent.

**Independent Test**: Verify each role against allowed, denied, inactive, unrelated, and cross-gym resource cases.

## Edge Cases

- **AUTHZ-12:** IF a role or membership status is unknown THEN the system SHALL deny the operation as forbidden.
- **AUTHZ-13:** IF required resource-gym or relationship attributes are absent THEN the system SHALL deny the operation as forbidden.

---

## Implicit-Requirement Dimensions

| Dimension                                | Resolution                                                                                          |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Input validation and bounds              | AUTHZ-12 and AUTHZ-13 reject unknown or missing attributes.                                         |
| Failure and partial-failure states       | Deny-by-default behavior is defined; this slice performs no mutation beyond atomic audit recording. |
| Idempotency, retry, and duplicates       | N/A because authorization evaluation is read-only.                                                  |
| Authorization boundaries and rate limits | AUTHZ-01 through AUTHZ-11 define boundaries; endpoint rate limits belong to their feature specs.    |
| Concurrency and ordering                 | Each operation reauthorizes current database state.                                                 |
| Data lifecycle and expiry                | AUTHZ-10 covers inactive memberships; resource lifecycle belongs to owning features.                |
| Observability                            | AUTHZ-05 records security denials.                                                                  |
| External-dependency failure              | N/A because policy inputs come from the application database.                                       |
| State-transition integrity               | Transitions belong to spec 0007; AUTHZ-10 defines their access effect.                              |

## Requirement Traceability

| Requirement ID | Story                         | Phase                 | Status      |
| -------------- | ----------------------------- | --------------------- | ----------- |
| AUTHZ-01       | Enforce the Membership Policy | T2/T4/T6/T7           | In Progress |
| AUTHZ-02       | Enforce the Membership Policy | T2/T6/T8/T9/T10       | In Progress |
| AUTHZ-03       | Enforce the Membership Policy | T2/T4/T6/T8/T9/T10    | In Progress |
| AUTHZ-04       | Enforce the Membership Policy | T2/T6/T8/T9/T10       | In Progress |
| AUTHZ-05       | Enforce the Membership Policy | T5/T6/T9/T10          | Planned     |
| AUTHZ-06       | Define Role Capabilities      | T1/T2/T8/T9/T10       | In Progress |
| AUTHZ-07       | Define Role Capabilities      | T1/T2/T8/T9/T10       | In Progress |
| AUTHZ-08       | Define Role Capabilities      | T1/T2/T3/T8/T9/T10    | In Progress |
| AUTHZ-09       | Define Role Capabilities      | T1/T2/T3/T8/T9/T10    | In Progress |
| AUTHZ-10       | Define Role Capabilities      | T1/T2/T4/T6/T8/T9/T10 | In Progress |
| AUTHZ-11       | Define Role Capabilities      | T3/T6/T7/T10          | In Progress |
| AUTHZ-12       | Edge Cases                    | T1/T2/T4/T6           | In Progress |
| AUTHZ-13       | Edge Cases                    | T2/T3/T4/T6/T8/T9/T10 | In Progress |

**Coverage:** 13 total, 13 mapped to draft tasks, 0 unmapped.

---

## Success Criteria

- [ ] The authorization matrix rejects every inactive, unrelated, and cross-gym case.
- [ ] All protected server operations use the centralized policy boundary.
- [ ] Security denials produce audit evidence without leaking resource existence.
