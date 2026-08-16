# Gym Invitations Context

**Gathered:** 2026-08-16
**Spec:** `.specs/features/0004-gym-invitations/spec.md`
**Status:** Ready for design

## Feature Boundary

This slice covers invitation creation, delivery, token rotation, acceptance, concurrency, cancellation, expiry, retry, rate limiting, and audit behavior.

## Implementation Decisions

- One invitation record exists per gym and normalized email.
- Resend, role change, and reissue reuse the record and rotate the 48-hour token.
- States are pending, delivery-failed, cancelled, accepted, and expired.
- Delivery-failed tokens are unusable; successful retry uses a fresh token.
- Acceptance requires the matching verified account email and creates exactly one membership atomically.
- Signed-out pages mask email and do not disclose account existence.
- Owners manage admin/coach/trainee invitations; admins manage coach/trainee invitations.
- Sending and acceptance have layered configurable limits; raw tokens never enter persistence or telemetry.

### Agent's Discretion

- Choose email provider, token hashing, expiry evaluation mechanism, and exact deployment thresholds.

### Declined / Undiscussed Gray Areas → Assumptions

- None.

## Specific References

- Authentication may come from any provider that guarantees verified email ownership.

## Deferred Ideas

- Email provider-specific analytics and delivery webhooks beyond required failure handling.
