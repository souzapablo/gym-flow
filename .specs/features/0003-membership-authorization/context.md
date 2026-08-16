# Membership Authorization Context

**Gathered:** 2026-08-16
**Spec:** `.specs/features/0003-membership-authorization/spec.md`
**Status:** Ready for design

## Feature Boundary

This slice centralizes role-and-attribute authorization after gym tenancy exists and before invitations or relationship-dependent workflows ship.

## Implementation Decisions

- Authorization combines role, membership gym and status, active gym, resource gym, and relationship attributes.
- Every protected server operation reauthorizes near the data boundary and denies missing attributes by default.
- Owners manage non-owners and all gym training resources; admins manage coaches, trainees, and gym training resources.
- Coaches and trainees receive only relationship-scoped access defined by later specs.
- Security denials are audited through the 0002 audit foundation.

### Agent's Discretion

- Choose the policy module organization and error representation without leaking resource existence.

### Declined / Undiscussed Gray Areas → Assumptions

- None.

## Specific References

- Next.js UI visibility is not an authorization boundary; Server Actions and data operations require their own checks.

## Deferred Ideas

- Subscription capabilities as future authorization attributes.
