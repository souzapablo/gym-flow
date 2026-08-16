# Membership Administration and Audit Context

**Gathered:** 2026-08-16
**Spec:** `.specs/features/0007-membership-administration-audit/spec.md`
**Status:** Ready for design

## Feature Boundary

This slice owns non-owner suspension, reactivation, removal, restoration, role changes, assignment cleanup, and their atomic audit evidence.

## Implementation Decisions

- Owner membership is immutable in this feature family.
- Owners manage every non-owner; admins manage coaches and trainees.
- Owners restore admins, coaches, and trainees; admins restore coaches and trainees.
- Restoration uses the existing membership and previous role without recreating ended assignments.
- Suspension preserves relationships; removal or incompatible role change ends them.
- Every lifecycle mutation and its audit receipt succeed or fail together.

### Agent's Discretion

- Choose transaction and locking details while enforcing the specified state machine.

### Declined / Undiscussed Gray Areas → Assumptions

- None.

## Specific References

- Subscription-driven owner deactivation may be introduced only with the future billing feature.

## Deferred Ideas

- Ownership transfer, user deletion, and history export.
