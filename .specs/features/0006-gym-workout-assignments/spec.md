# Gym Workout Assignments Specification

**Prerequisites:** specs 0002, 0003, and 0005.

## Problem Statement

The current workout model is user-owned and self-directed. A gym workspace needs a shared template library, trainee assignments, role-aware editing, and sessions attributed to both the trainee and the person recording them.

## Goals

- [ ] Gym-owned templates remain available when staff leave.
- [ ] Owners, admins, and coaches create and assign workouts within their authority.
- [ ] Trainees complete only their assignments and see only their own gym history.
- [ ] Sessions identify the trainee and recording user.

## Out of Scope

| Feature                       | Reason                                                                    |
| ----------------------------- | ------------------------------------------------------------------------- |
| Personal coach-owned library  | The gym is the customer and owns templates.                               |
| Cross-gym template reuse      | Gym data remains isolated.                                                |
| History export or aggregation | Requires a separate privacy and portability policy.                       |
| Template deletion policy      | This slice preserves records and does not introduce destructive deletion. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default                                                                                   | Rationale                                          | Confirmed? |
| --------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------- | ---------- |
| Template ownership    | The gym owns templates; creator is attribution and controls coach editing.                       | Staff departure must not remove business records.  | Yes        |
| Shared library        | Active coaches may view and reuse all templates in their active gym.                             | Gym-owned knowledge should be reusable.            | Yes        |
| Editing               | Coaches edit templates they created; owners and admins edit any gym template.                    | Balances collaboration and accountability.         | Yes        |
| Assignment authority  | Owners/admins assign any active trainee; coaches assign only their active assigned trainees.     | Coach authority follows the relationship boundary. | Yes        |
| Session recording     | Trainees record self; coaches record assigned trainees; owners/admins record any active trainee. | Supports self-service and coached sessions.        | Yes        |

**Open questions:** none; all decisions are resolved or recorded above.

---

## User Stories

### P1: Manage the Gym Template Library ⭐ MVP

**User Story**: As gym staff, I want reusable gym-owned templates so that training knowledge survives staff changes.

**Why P1**: Templates are the basis for assignments and sessions.

**Acceptance Criteria**:

1. **GWA-01:** WHEN an active owner, admin, or coach creates a template THEN the system SHALL associate it with the active gym and record the creator.
2. **GWA-02:** WHILE a coach membership is active, the system SHALL permit that coach to view and reuse every template in the active gym.
3. **GWA-03:** WHILE a coach membership is active, the system SHALL permit that coach to edit only templates created by that coach.
4. **GWA-04:** WHILE an owner or admin membership is active, the system SHALL permit that member to edit every template in the active gym.
5. **GWA-05:** IF a trainee attempts to create or edit a template THEN the system SHALL reject the operation as forbidden.
6. **GWA-06:** IF a member attempts to move, reuse, or access a template through another gym context THEN the system SHALL reject the operation as forbidden.

**Independent Test**: Create templates as two coaches and verify shared visibility, editing boundaries, trainee denial, and cross-gym isolation.

---

### P1: Assign Workouts to Trainees ⭐ MVP

**User Story**: As authorized gym staff, I want to assign templates to trainees so that training is explicitly prescribed.

**Why P1**: Trainee access and session completion depend on an assignment.

**Acceptance Criteria**:

1. **GWA-07:** WHILE an owner or admin membership is active, the system SHALL permit that member to assign a gym template to any active trainee in the active gym.
2. **GWA-08:** WHILE a coach membership is active, the system SHALL permit that coach to assign a gym template only to an active trainee effectively assigned to that coach.
3. **GWA-09:** IF a trainee attempts to create a workout assignment THEN the system SHALL reject the operation as forbidden.
4. **GWA-10:** WHEN a workout assignment is created THEN the system SHALL associate it with the gym, trainee, template, and assigning user.
5. **GWA-11:** WHEN a coach or trainee membership becomes inactive THEN the system SHALL preserve existing workout assignments and their history.

**Independent Test**: Assign workouts as each role and verify relationship, activity, gym, and preservation rules.

---

### P1: Complete and Review Gym Sessions ⭐ MVP

**User Story**: As a trainee or coach, I want completed sessions recorded for the correct trainee so that gym history remains accurate.

**Why P1**: Completed sessions are the core training record.

**Acceptance Criteria**:

1. **GWA-12:** WHEN a trainee records a session THEN the system SHALL require an active assignment belonging to that trainee in the active gym.
2. **GWA-13:** WHEN a coach records a session for a trainee THEN the system SHALL require an effective coach-trainee assignment and active workout assignment in the active gym.
3. **GWA-14:** WHEN an owner or admin records a session for a trainee THEN the system SHALL require an active trainee membership and active workout assignment in the active gym.
4. **GWA-15:** WHEN a session is recorded THEN the system SHALL associate it with the gym, trainee, workout assignment, and recording user.
5. **GWA-16:** WHILE a trainee membership is active, the system SHALL permit that trainee to view only that trainee's own assignments and gym-specific history.
6. **GWA-17:** WHEN a coach or trainee membership is suspended or removed THEN the system SHALL preserve templates, assignments, sessions, and training history owned by the gym.

**Independent Test**: Record sessions as trainee, coach, and admin, then verify attribution, denial cases, isolation, and preservation after membership changes.

## Edge Cases

- **GWA-18:** IF a template, assignment, trainee, or session belongs to another gym THEN the system SHALL reject the operation as forbidden.
- **GWA-19:** IF a workout assignment is inactive or unknown THEN the system SHALL reject session creation without partial persistence.

---

## Implicit-Requirement Dimensions

| Dimension                                | Resolution                                                                                                    |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Input validation and bounds              | Existing workout validation remains; GWA-18 and GWA-19 add relationship validation.                           |
| Failure and partial-failure states       | GWA-19 requires no partial session.                                                                           |
| Idempotency, retry, and duplicates       | Existing session-set uniqueness remains; new client retry semantics are N/A until an offline workflow exists. |
| Authorization boundaries and rate limits | GWA-01 through GWA-16; rate limits are N/A for authenticated training operations.                             |
| Concurrency and ordering                 | Session persistence remains atomic with its completed sets.                                                   |
| Data lifecycle and expiry                | GWA-11 and GWA-17 preserve gym records.                                                                       |
| Observability                            | Security denials use spec 0003 audit behavior; business-event analytics are N/A.                              |
| External-dependency failure              | N/A.                                                                                                          |
| State-transition integrity               | GWA-11, GWA-12 through GWA-14, and GWA-19.                                                                    |

## Requirement Traceability

| Requirement ID | Story                            | Phase  | Status  |
| -------------- | -------------------------------- | ------ | ------- |
| GWA-01         | Manage the Gym Template Library  | Design | Pending |
| GWA-02         | Manage the Gym Template Library  | Design | Pending |
| GWA-03         | Manage the Gym Template Library  | Design | Pending |
| GWA-04         | Manage the Gym Template Library  | Design | Pending |
| GWA-05         | Manage the Gym Template Library  | Design | Pending |
| GWA-06         | Manage the Gym Template Library  | Design | Pending |
| GWA-07         | Assign Workouts to Trainees      | Design | Pending |
| GWA-08         | Assign Workouts to Trainees      | Design | Pending |
| GWA-09         | Assign Workouts to Trainees      | Design | Pending |
| GWA-10         | Assign Workouts to Trainees      | Design | Pending |
| GWA-11         | Assign Workouts to Trainees      | Design | Pending |
| GWA-12         | Complete and Review Gym Sessions | Design | Pending |
| GWA-13         | Complete and Review Gym Sessions | Design | Pending |
| GWA-14         | Complete and Review Gym Sessions | Design | Pending |
| GWA-15         | Complete and Review Gym Sessions | Design | Pending |
| GWA-16         | Complete and Review Gym Sessions | Design | Pending |
| GWA-17         | Complete and Review Gym Sessions | Design | Pending |
| GWA-18         | Edge Cases                       | Design | Pending |
| GWA-19         | Edge Cases                       | Design | Pending |

**Coverage:** 19 total, 0 mapped to tasks, 19 pending design.

---

## Success Criteria

- [ ] Coaches share gym templates without editing one another's work.
- [ ] Workout assignments respect role, active gym, and coach relationships.
- [ ] Sessions identify both trainee and recording user.
- [ ] Staff lifecycle changes preserve gym-owned training history.
