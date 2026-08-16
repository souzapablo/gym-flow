# Coach-Trainee Assignments Specification

**Prerequisites:** specs 0002 and 0003.

## Problem Statement

Coach access cannot be derived from role alone. Gyms need explicit many-to-many coach-trainee relationships that constrain access, respond safely to membership changes, and preserve historical evidence.

## Goals

- [ ] Owners and admins can manage same-gym coach-trainee assignments.
- [ ] Coaches access only assigned trainees' gym-specific information.
- [ ] Suspension, removal, and incompatible role changes affect assignments deterministically.

## Out of Scope

| Feature                               | Reason                                               |
| ------------------------------------- | ---------------------------------------------------- |
| Workout template and session behavior | Spec 0006 consumes assignments.                      |
| General membership mutations          | Spec 0007 owns lifecycle commands.                   |
| Self-service coach assignment         | Explicitly excluded to prevent self-expanded access. |

---

## Assumptions & Open Questions

| Assumption / decision   | Chosen default                                                         | Rationale                                                                  | Confirmed? |
| ----------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------- |
| Cardinality             | A trainee may have multiple coaches within one gym.                    | Supports substitute and specialist coaches.                                | Yes        |
| Management              | Active owners and admins create or end assignments.                    | Small gyms may grant trusted coaches the admin role.                       | Yes        |
| Suspension              | Preserve assignments but disable their authorization effect.           | Reactivation should restore the prior operating relationship.              | Yes        |
| Removal and role change | End incompatible assignments permanently while retaining history.      | Removed access must not silently return.                                   | Yes        |
| Visibility              | Coaches see basic identity and gym-specific training information only. | Assignment must not expose billing, other gyms, or unrelated account data. | Yes        |

**Open questions:** none; all decisions are resolved or recorded above.

---

## User Stories

### P1: Manage Coaching Relationships ⭐ MVP

**User Story**: As a gym owner or admin, I want to assign trainees to coaches so that coaches receive appropriate access.

**Why P1**: Relationship attributes are required by coach authorization.

**Acceptance Criteria**:

1. **CTA-01:** WHILE an owner or admin membership is active, the system SHALL permit that member to create a coach-trainee assignment when both target memberships are active and belong to the active gym.
2. **CTA-02:** WHILE an owner or admin membership is active, the system SHALL permit that member to end an active coach-trainee assignment in the active gym.
3. **CTA-03:** IF a coach attempts to create or end an assignment THEN the system SHALL reject the operation as forbidden.
4. **CTA-04:** The system SHALL permit one trainee to have active assignments to multiple coaches within the same gym.
5. **CTA-05:** The system SHALL permit at most one active assignment for each gym, coach, and trainee combination.
6. **CTA-06:** WHEN an assignment is created or ended THEN the system SHALL record the gym, actor, coach, trainee, action, and timestamp atomically with the mutation.

**Independent Test**: Assign one trainee to two coaches, reject duplicates and cross-gym targets, then end one relationship.

---

### P1: Enforce Assignment Visibility ⭐ MVP

**User Story**: As a coach, I want access to my assigned trainees so that I can coach them without seeing unrelated information.

**Why P1**: The assignment exists to constrain authorization.

**Acceptance Criteria**:

1. **CTA-07:** WHILE an active coach-trainee assignment exists, the system SHALL permit the coach to view that trainee's basic identity and gym-specific training data in the active gym.
2. **CTA-08:** IF no effective assignment exists between a coach and trainee THEN the system SHALL reject the coach's trainee-specific access as forbidden.
3. **CTA-09:** The system SHALL prevent an assignment from exposing billing information, memberships in other gyms, or unrelated account information.
4. **CTA-10:** IF the assignment gym differs from the active gym or either membership gym THEN the system SHALL reject access as forbidden.

**Independent Test**: Compare assigned, unassigned, suspended, ended, and cross-gym coach access to the same trainee.

---

### P1: Preserve Assignment History ⭐ MVP

**User Story**: As a gym administrator, I want relationship history preserved while inactive access is revoked.

**Why P1**: Staff changes must not destroy evidence or restore access accidentally.

**Acceptance Criteria**:

1. **CTA-11:** WHEN a coach or trainee membership is suspended THEN the system SHALL preserve its assignments while disabling their authorization effect.
2. **CTA-12:** WHEN a suspended coach or trainee membership is reactivated THEN the system SHALL restore the authorization effect of preserved active assignments.
3. **CTA-13:** WHEN a coach or trainee membership is removed THEN the system SHALL end its active assignments while preserving historical records.
4. **CTA-14:** WHEN a membership changes to a role incompatible with an assignment THEN the system SHALL end that assignment while preserving historical records.
5. **CTA-15:** WHEN a removed membership is restored or a prior role is reassigned THEN the system SHALL leave ended assignments inactive.

**Independent Test**: Suspend, reactivate, remove, restore, and role-change both sides while verifying access and history.

## Edge Cases

- **CTA-16:** IF the proposed coach does not have the coach role or the proposed trainee does not have the trainee role THEN the system SHALL reject assignment creation.
- **CTA-17:** IF an assignment end request targets an already ended or unknown assignment THEN the system SHALL reject without changing assignment history.

---

## Implicit-Requirement Dimensions

| Dimension                                | Resolution                                                                                                 |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Input validation and bounds              | CTA-01, CTA-10, CTA-16, and CTA-17.                                                                        |
| Failure and partial-failure states       | CTA-06 requires atomic audit writes.                                                                       |
| Idempotency, retry, and duplicates       | CTA-05 and CTA-17.                                                                                         |
| Authorization boundaries and rate limits | CTA-01 through CTA-03 and CTA-07 through CTA-10; rate limits are N/A for authenticated administrative use. |
| Concurrency and ordering                 | CTA-05 requires database-enforced active uniqueness.                                                       |
| Data lifecycle and expiry                | CTA-11 through CTA-15.                                                                                     |
| Observability                            | CTA-06 and authorization-denial auditing from spec 0003.                                                   |
| External-dependency failure              | N/A.                                                                                                       |
| State-transition integrity               | CTA-11 through CTA-17.                                                                                     |

## Requirement Traceability

| Requirement ID | Story                         | Phase  | Status  |
| -------------- | ----------------------------- | ------ | ------- |
| CTA-01         | Manage Coaching Relationships | Design | Pending |
| CTA-02         | Manage Coaching Relationships | Design | Pending |
| CTA-03         | Manage Coaching Relationships | Design | Pending |
| CTA-04         | Manage Coaching Relationships | Design | Pending |
| CTA-05         | Manage Coaching Relationships | Design | Pending |
| CTA-06         | Manage Coaching Relationships | Design | Pending |
| CTA-07         | Enforce Assignment Visibility | Design | Pending |
| CTA-08         | Enforce Assignment Visibility | Design | Pending |
| CTA-09         | Enforce Assignment Visibility | Design | Pending |
| CTA-10         | Enforce Assignment Visibility | Design | Pending |
| CTA-11         | Preserve Assignment History   | Design | Pending |
| CTA-12         | Preserve Assignment History   | Design | Pending |
| CTA-13         | Preserve Assignment History   | Design | Pending |
| CTA-14         | Preserve Assignment History   | Design | Pending |
| CTA-15         | Preserve Assignment History   | Design | Pending |
| CTA-16         | Edge Cases                    | Design | Pending |
| CTA-17         | Edge Cases                    | Design | Pending |

**Coverage:** 17 total, 0 mapped to tasks, 17 pending design.

---

## Success Criteria

- [ ] A trainee can have multiple same-gym coaches without duplicate relationships.
- [ ] Coaches cannot create assignments or access unassigned trainees.
- [ ] Suspension restores preserved relationships; removal and role changes do not.
- [ ] Assignment mutations produce atomic audit evidence.
