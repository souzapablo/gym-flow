# Gym Invitations Specification

**Prerequisites:** specs 0002 and 0003.

## Problem Statement

Gym owners and admins need to onboard members without creating duplicate accounts or weakening gym isolation. Invitation delivery, acceptance, retries, concurrency, and abuse controls form one security-sensitive lifecycle.

## Goals

- [ ] Authorized members can invite admins, coaches, and trainees within their authority.
- [ ] A secure emailed link connects exactly one verified global account to a gym.
- [ ] Resend, retry, cancellation, expiry, replay, concurrency, and rate limits have deterministic outcomes.

## Out of Scope

| Feature                           | Reason                                                 |
| --------------------------------- | ------------------------------------------------------ |
| Authentication provider selection | This spec consumes verified email identity from 0002.  |
| Email provider selection          | Delivery behavior is defined independently of vendor.  |
| Removed-member restoration        | Spec 0007.                                             |
| Ownership invitation              | Owners are immutable and created only by provisioning. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default                                                                                                 | Rationale                                                   | Confirmed? |
| --------------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ---------- |
| Token                 | Secure, single-use, 48-hour token stored only as a safe fingerprint or hash.                                   | Raw tokens must not persist.                                | Yes        |
| Invitation identity   | At most one invitation record exists per gym and normalized email.                                             | Resend and role changes reuse the record and audit history. | Yes        |
| States                | Pending, delivery-failed, cancelled, accepted, or expired.                                                     | Token rotation removes the need for a superseded state.     | Yes        |
| Delivery failure      | Invalidate the attempted token; retry generates a new token.                                                   | A failed-delivery token must not remain usable.             | Yes        |
| Acceptance            | The signed-in account must own the matching verified email.                                                    | Authentication without email control is insufficient.       | Yes        |
| Rate limiting         | Sending uses inviter, gym, and target email; acceptance uses IP and token fingerprint plus account when known. | Layered keys limit abuse without storing raw tokens.        | Yes        |

**Open questions:** none; all decisions are resolved or recorded above.

---

## User Stories

### P1: Manage Invitations ⭐ MVP

**User Story**: As an owner or admin, I want to invite members within my authority so that they can join the gym.

**Why P1**: Gym-managed onboarding is the acquisition path for staff and trainees.

**Acceptance Criteria**:

1. **INV-01:** WHEN an owner submits a valid email and admin, coach, or trainee role THEN the system SHALL create or reissue the invitation for that gym and normalized email.
2. **INV-02:** WHEN an admin submits a valid email and coach or trainee role THEN the system SHALL create or reissue the invitation for that gym and normalized email.
3. **INV-03:** IF an admin attempts to invite or manage an admin or owner THEN the system SHALL reject the operation as forbidden.
4. **INV-04:** WHEN an invitation is issued THEN the system SHALL generate a cryptographically secure single-use token expiring 48 hours after issuance.
5. **INV-05:** WHEN an invitation is resent THEN the system SHALL reuse its record, rotate the token, reset expiry, and set status to pending.
6. **INV-06:** WHEN an authorized inviter changes the requested role THEN the system SHALL reuse the record, rotate the token, reset expiry, and audit the old and new roles.
7. **INV-07:** WHEN an expired or cancelled invitation is reissued THEN the system SHALL reuse the record with a fresh pending token and expiry.
8. **INV-08:** WHEN an invitation is cancelled by an authorized member THEN the system SHALL invalidate its token and set status to cancelled.
9. **INV-09:** IF an email already belongs to any membership in that gym THEN the system SHALL reject invitation and leave the membership unchanged.

**Independent Test**: Issue, resend, role-change, cancel, and reissue an invitation while verifying one record and token invalidation.

---

### P1: Deliver and Accept Invitations ⭐ MVP

**User Story**: As an invited recipient, I want to verify my identity and join the gym exactly once.

**Why P1**: An invitation is useful only when it securely produces a membership.

**Acceptance Criteria**:

1. **INV-10:** IF email delivery fails THEN the system SHALL invalidate the attempted token, retain delivery-failed status, and report a retryable failure.
2. **INV-11:** WHEN delivery is retried THEN the system SHALL issue a fresh token and set status to pending only after provider acceptance.
3. **INV-12:** WHEN a signed-out recipient opens an invitation THEN the system SHALL require authentication and verification of the invited normalized email before acceptance.
4. **INV-13:** WHEN a signed-out recipient opens an invitation THEN the system SHALL reveal only gym name, invited role, expiry state, and masked email without revealing account existence.
5. **INV-14:** WHEN a signed-in user accepts a pending unexpired invitation matching the account's verified email THEN the system SHALL create an active membership with the invited role.
6. **INV-15:** WHEN acceptance succeeds THEN the system SHALL create membership, mark the invitation accepted, invalidate the token, and record audit evidence in one atomic operation.
7. **INV-16:** IF the verified email differs from the invited email THEN the system SHALL reject acceptance without changing or consuming the invitation.
8. **INV-17:** IF two requests concurrently accept the same invitation THEN the system SHALL create exactly one membership and reject the other as already accepted.
9. **INV-18:** IF an invitation is expired, cancelled, accepted, or delivery-failed THEN the system SHALL reject acceptance without changing a membership.
10. **INV-19:** IF the user already has a membership in the gym THEN the system SHALL reject acceptance without changing the membership or role.

**Independent Test**: Accept with new and existing accounts, then verify mismatch, replay, expiry, delivery failure, and concurrent duplicate rejection.

---

### P1: Limit and Audit Invitation Abuse ⭐ MVP

**User Story**: As a gym owner, I want invitation abuse constrained and recorded so that onboarding cannot become an attack path.

**Why P1**: Invitation endpoints expose email delivery and token verification to abuse.

**Acceptance Criteria**:

1. **INV-20:** WHEN invitation sending is rate-limited THEN the system SHALL evaluate configured limits by inviter, gym, and target email.
2. **INV-21:** WHEN invitation acceptance is rate-limited THEN the system SHALL evaluate configured limits by source IP and token fingerprint plus account when authenticated.
3. **INV-22:** IF a configured invitation limit is exceeded THEN the system SHALL reject without creating an invitation or membership.
4. **INV-23:** WHEN invitation state changes THEN the system SHALL record its event, gym, actor when known, target, timestamp, and relevant old and new values.
5. **INV-24:** IF an invitation token or state, verified-email match, permission, or rate limit causes a security rejection THEN the system SHALL record the rejection.
6. **INV-25:** The system SHALL prevent raw invitation tokens from appearing in persistence, audit, or rate-limit records.
7. **INV-26:** IF ordinary email or role validation fails before authorization THEN the system SHALL return validation errors without a security audit event.

**Independent Test**: Exceed each configured limit and exercise security versus ordinary validation failures while inspecting audit evidence.

## Edge Cases

- **INV-27:** IF an invitation email is empty, malformed, or longer than 254 characters after normalization THEN the system SHALL reject it without changing an invitation.
- **INV-28:** IF an invitation role is not admin, coach, or trainee THEN the system SHALL reject it without changing an invitation.
- **INV-29:** The system SHALL restrict invitation status to pending, delivery-failed, cancelled, accepted, or expired.
- **INV-30:** IF a removed member is invited again THEN the system SHALL reject invitation and require the restoration flow from spec 0007.

---

## Implicit-Requirement Dimensions

| Dimension                                | Resolution                                         |
| ---------------------------------------- | -------------------------------------------------- |
| Input validation and bounds              | INV-27 and INV-28.                                 |
| Failure and partial-failure states       | INV-10, INV-11, and INV-15.                        |
| Idempotency, retry, and duplicates       | INV-05 through INV-07, INV-17, and INV-19.         |
| Authorization boundaries and rate limits | INV-01 through INV-03 and INV-20 through INV-22.   |
| Concurrency and ordering                 | INV-15 and INV-17.                                 |
| Data lifecycle and expiry                | INV-04 through INV-08, INV-18, and INV-29.         |
| Observability                            | INV-23 through INV-26.                             |
| External-dependency failure              | INV-10 and INV-11.                                 |
| State-transition integrity               | INV-05 through INV-08, INV-15, INV-18, and INV-29. |

## Requirement Traceability

| Requirement ID | Story                            | Phase  | Status  |
| -------------- | -------------------------------- | ------ | ------- |
| INV-01         | Manage Invitations               | Design | Pending |
| INV-02         | Manage Invitations               | Design | Pending |
| INV-03         | Manage Invitations               | Design | Pending |
| INV-04         | Manage Invitations               | Design | Pending |
| INV-05         | Manage Invitations               | Design | Pending |
| INV-06         | Manage Invitations               | Design | Pending |
| INV-07         | Manage Invitations               | Design | Pending |
| INV-08         | Manage Invitations               | Design | Pending |
| INV-09         | Manage Invitations               | Design | Pending |
| INV-10         | Deliver and Accept Invitations   | Design | Pending |
| INV-11         | Deliver and Accept Invitations   | Design | Pending |
| INV-12         | Deliver and Accept Invitations   | Design | Pending |
| INV-13         | Deliver and Accept Invitations   | Design | Pending |
| INV-14         | Deliver and Accept Invitations   | Design | Pending |
| INV-15         | Deliver and Accept Invitations   | Design | Pending |
| INV-16         | Deliver and Accept Invitations   | Design | Pending |
| INV-17         | Deliver and Accept Invitations   | Design | Pending |
| INV-18         | Deliver and Accept Invitations   | Design | Pending |
| INV-19         | Deliver and Accept Invitations   | Design | Pending |
| INV-20         | Limit and Audit Invitation Abuse | Design | Pending |
| INV-21         | Limit and Audit Invitation Abuse | Design | Pending |
| INV-22         | Limit and Audit Invitation Abuse | Design | Pending |
| INV-23         | Limit and Audit Invitation Abuse | Design | Pending |
| INV-24         | Limit and Audit Invitation Abuse | Design | Pending |
| INV-25         | Limit and Audit Invitation Abuse | Design | Pending |
| INV-26         | Limit and Audit Invitation Abuse | Design | Pending |
| INV-27         | Edge Cases                       | Design | Pending |
| INV-28         | Edge Cases                       | Design | Pending |
| INV-29         | Edge Cases                       | Design | Pending |
| INV-30         | Edge Cases                       | Design | Pending |

**Coverage:** 30 total, 0 mapped to tasks, 30 pending design.

---

## Success Criteria

- [ ] An invitation activates exactly one membership for the matching verified account.
- [ ] Resend, retry, cancellation, expiry, mismatch, and replay have deterministic outcomes.
- [ ] Rate limits reject abuse without storing raw tokens.
- [ ] Every security-sensitive invitation mutation and rejection produces audit evidence.
