# Gym Workspaces and Memberships Context

**Gathered:** 2026-08-16
**Spec:** `.specs/features/0002-gym-workspaces-memberships/spec.md`
**Status:** Ready for design

---

## Feature Boundary

This slice establishes global verified identity, gym tenancy, immutable ownership, memberships, active-gym context, gym-owned records, and the shared audit foundation. Later specs build authorization, invitations, assignments, workouts, and membership administration on it.

## Implementation Decisions

### Identity and Ownership

- One normalized verified email identifies at most one global account.
- Memberships use permanent user IDs and survive verified email changes.
- One account may own multiple gyms; each gym has exactly one immutable owner.
- Ownership transfer and subscription-driven owner deactivation are deferred.

### Active Gym Context

- Auto-select the only active gym membership.
- Require and persist a selection when multiple active memberships exist.
- Clear a selection when its membership becomes inactive.
- Revalidate membership and gym context at every server operation.

### Data and Audit

- Gym records belong to the gym; creator identity is attribution.
- No production data needs backfill. Development and test records may be recreated.
- Introduce the append-only audit store and atomic mutation contract in this slice.
- Retain audit events indefinitely in the MVP without application deletion.

### Agent's Discretion

- Select the authentication provider and normalized-email mechanics while enforcing verified, case-insensitive uniqueness.
- Choose the exact active-gym selector interface.

### Declined / Undiscussed Gray Areas → Assumptions

- None.

## Specific References

- Multi-gym membership must support arrangements such as Wellhub/Gympass without sharing data between gyms.

## Deferred Ideas

- Ownership transfer.
- Subscription-driven owner deactivation.
- Production audit retention and privacy-deletion policy.
