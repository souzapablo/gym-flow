# Membership Administration and Audit Specification

**Prerequisites:** specs 0002, 0003, and 0005.

## Problem Statement

Gym administrators need reversible suspension, permanent removal, controlled restoration, and role changes without deleting global identity or gym-owned records. Every change must follow an explicit state machine and produce atomic security evidence.

## Goals

- [ ] Owners and admins administer only memberships within their authority.
- [ ] Suspension, reactivation, removal, restoration, and role changes have deterministic transitions.
- [ ] Global identity, other-gym memberships, and gym-owned history remain intact.
- [ ] Every lifecycle mutation is atomic with its audit event.

## Out of Scope

| Feature                                  | Reason                                          |
| ---------------------------------------- | ----------------------------------------------- |
| Owner mutation or transfer               | The owner is immutable in this feature family.  |
| Subscription-driven owner deactivation   | Belongs to future billing behavior.             |
| Invitation-based rejoining after removal | Restoration reuses the existing membership.     |
| User deletion and data export            | Requires separate privacy and retention policy. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default                                                                                              | Rationale                                                    | Confirmed? |
| --------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ---------- |
| Membership states     | Active, suspended, or removed.                                                                              | Invitation state remains separate.                           | Yes        |
| Owner                 | Exactly one immutable owner per gym.                                                                        | Ownership transfer is a separate privileged feature.         | Yes        |
| Role authority        | Owners manage all non-owners; admins manage coaches and trainees.                                           | Privileged administration remains owner-controlled.          | Yes        |
| Restoration           | Owners restore any non-owner; admins restore coaches and trainees with the prior role.                      | Avoids an owner bottleneck while protecting admin privilege. | Yes        |
| Assignments           | Suspension preserves; removal, restoration, or incompatible role changes do not recreate ended assignments. | Access must not silently return.                             | Yes        |
| Audit                 | Each mutation and its audit receipt succeed or fail together.                                               | No sensitive change may exist without evidence.              | Yes        |

**Open questions:** none; all decisions are resolved or recorded above.

---

## User Stories

### P1: Suspend and Reactivate Members ⭐ MVP

**User Story**: As an owner or admin, I want to suspend and reactivate members so that temporary access changes are reversible.

**Why P1**: Gyms need immediate access control without destroying relationships or history.

**Acceptance Criteria**:

1. **MEM-01:** WHEN an authorized owner or admin suspends an active coach or trainee THEN the system SHALL transition that membership to suspended and revoke gym access immediately.
2. **MEM-02:** WHEN an authorized owner or admin reactivates a suspended coach or trainee THEN the system SHALL transition that membership to active and restore policy-allowed access.
3. **MEM-03:** WHEN a coach or trainee is suspended THEN the system SHALL preserve coach-trainee and workout assignments while disabling their authorization effect.
4. **MEM-04:** WHEN a coach or trainee is reactivated THEN the system SHALL restore the authorization effect of preserved active assignments.
5. **MEM-05:** WHEN a membership is suspended or reactivated THEN the system SHALL preserve the global account, other-gym memberships, and gym-owned training history.

**Independent Test**: Suspend and reactivate a coach and trainee while verifying access, assignments, other gyms, history, and audit evidence.

---

### P1: Remove and Restore Members ⭐ MVP

**User Story**: As authorized gym administration, I want to remove and restore members so that ended relationships remain controlled without duplicate membership records.

**Why P1**: Permanent access removal must preserve business records and support controlled rejoining.

**Acceptance Criteria**:

1. **MEM-06:** WHEN an authorized owner or admin removes an active or suspended coach or trainee THEN the system SHALL transition that membership to removed and revoke access immediately.
2. **MEM-07:** WHEN a coach or trainee is removed THEN the system SHALL end active coach-trainee assignments while preserving assignment and training history.
3. **MEM-08:** WHILE an owner membership is active, the system SHALL permit that owner to restore a removed admin, coach, or trainee membership to active with its previous role.
4. **MEM-09:** WHILE an admin membership is active, the system SHALL permit that admin to restore a removed coach or trainee membership to active with its previous role.
5. **MEM-10:** IF an admin attempts to restore a removed admin THEN the system SHALL reject the operation as forbidden.
6. **MEM-11:** WHEN a removed membership is restored THEN the system SHALL preserve history without recreating ended assignments.
7. **MEM-12:** IF an invitation targets a removed membership THEN the system SHALL reject invitation and require restoration of the existing membership.

**Independent Test**: Remove and restore each permitted role while verifying authority, previous role, ended assignments, history, and invitation rejection.

---

### P1: Change Non-Owner Roles ⭐ MVP

**User Story**: As authorized gym administration, I want to change member roles so that responsibilities can evolve safely.

**Why P1**: Role changes affect privilege and relationship validity.

**Acceptance Criteria**:

1. **MEM-13:** WHILE an owner membership is active, the system SHALL permit that owner to change a non-owner membership among admin, coach, and trainee.
2. **MEM-14:** WHILE an admin membership is active, the system SHALL permit that admin to change a membership only between coach and trainee.
3. **MEM-15:** IF an admin attempts to change an owner or admin role THEN the system SHALL reject the operation as forbidden.
4. **MEM-16:** IF any user attempts to suspend, remove, or change an owner membership THEN the system SHALL reject the operation as forbidden.
5. **MEM-17:** WHEN a role change makes an assignment incompatible THEN the system SHALL end the assignment while preserving historical records.
6. **MEM-18:** WHEN a prior role is reassigned later THEN the system SHALL leave previously ended assignments inactive.

**Independent Test**: Exercise every permitted and forbidden role change and verify resulting assignments and access.

---

### P1: Audit Membership Administration ⭐ MVP

**User Story**: As a gym owner, I want lifecycle changes recorded so that access decisions can be investigated.

**Why P1**: Membership administration changes access to personal training information.

**Acceptance Criteria**:

1. **MEM-19:** WHEN a membership is suspended, reactivated, removed, restored, or role-changed THEN the system SHALL record old value, new value, gym, actor, target user, and timestamp.
2. **MEM-20:** IF the required audit event cannot be persisted THEN the system SHALL reject and roll back the membership mutation.
3. **MEM-21:** IF a membership administration operation is forbidden THEN the system SHALL record a security rejection without changing the membership.

**Independent Test**: Perform each mutation and forbidden attempt, then simulate audit-write failure and verify rollback.

## Edge Cases

- **MEM-22:** The system SHALL restrict membership status to active, suspended, or removed.
- **MEM-23:** IF a requested transition is not active-to-suspended, suspended-to-active, active-to-removed, suspended-to-removed, or removed-to-active through authorized restoration THEN the system SHALL reject it without change.
- **MEM-24:** IF a mutation targets a membership outside the active gym THEN the system SHALL reject it as forbidden.

---

## Implicit-Requirement Dimensions

| Dimension                                | Resolution                                                                                                       |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Input validation and bounds              | MEM-13 through MEM-16 and MEM-22 through MEM-24.                                                                 |
| Failure and partial-failure states       | MEM-20 requires rollback.                                                                                        |
| Idempotency, retry, and duplicates       | MEM-23 rejects repeated or invalid transitions without change.                                                   |
| Authorization boundaries and rate limits | MEM-01, MEM-02, MEM-06, MEM-08 through MEM-16, and MEM-24; rate limits are N/A for authenticated administration. |
| Concurrency and ordering                 | Transitions validate current state and commit atomically with audit.                                             |
| Data lifecycle and expiry                | MEM-03 through MEM-12 and MEM-17 through MEM-18.                                                                 |
| Observability                            | MEM-19 through MEM-21.                                                                                           |
| External-dependency failure              | N/A.                                                                                                             |
| State-transition integrity               | MEM-01 through MEM-18 and MEM-22 through MEM-23.                                                                 |

## Requirement Traceability

| Requirement ID | Story                           | Phase  | Status  |
| -------------- | ------------------------------- | ------ | ------- |
| MEM-01         | Suspend and Reactivate Members  | Design | Pending |
| MEM-02         | Suspend and Reactivate Members  | Design | Pending |
| MEM-03         | Suspend and Reactivate Members  | Design | Pending |
| MEM-04         | Suspend and Reactivate Members  | Design | Pending |
| MEM-05         | Suspend and Reactivate Members  | Design | Pending |
| MEM-06         | Remove and Restore Members      | Design | Pending |
| MEM-07         | Remove and Restore Members      | Design | Pending |
| MEM-08         | Remove and Restore Members      | Design | Pending |
| MEM-09         | Remove and Restore Members      | Design | Pending |
| MEM-10         | Remove and Restore Members      | Design | Pending |
| MEM-11         | Remove and Restore Members      | Design | Pending |
| MEM-12         | Remove and Restore Members      | Design | Pending |
| MEM-13         | Change Non-Owner Roles          | Design | Pending |
| MEM-14         | Change Non-Owner Roles          | Design | Pending |
| MEM-15         | Change Non-Owner Roles          | Design | Pending |
| MEM-16         | Change Non-Owner Roles          | Design | Pending |
| MEM-17         | Change Non-Owner Roles          | Design | Pending |
| MEM-18         | Change Non-Owner Roles          | Design | Pending |
| MEM-19         | Audit Membership Administration | Design | Pending |
| MEM-20         | Audit Membership Administration | Design | Pending |
| MEM-21         | Audit Membership Administration | Design | Pending |
| MEM-22         | Edge Cases                      | Design | Pending |
| MEM-23         | Edge Cases                      | Design | Pending |
| MEM-24         | Edge Cases                      | Design | Pending |

**Coverage:** 24 total, 0 mapped to tasks, 24 pending design.

---

## Success Criteria

- [ ] Every allowed and forbidden transition matches the state and authority matrix.
- [ ] Suspension preserves relationships; removal and incompatible role changes end them.
- [ ] Restoration reuses the membership and never silently restores ended assignments.
- [ ] Every lifecycle mutation is atomic with its audit event.
