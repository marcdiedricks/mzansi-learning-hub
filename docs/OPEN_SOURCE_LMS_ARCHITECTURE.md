# OPEN-SOURCE LMS BRIDGE FOUNDATION

## Decision

Mzansi Learning Hub remains the lightweight programme-agnostic orchestration layer.

We do not rebuild mature LMS administration features that can be supplied by established open-source platforms.

## Preferred engines

### Kolibri
Primary fit for offline and weak-connectivity institutions.

Intended role:
- optional local learning node
- local learner/coach/admin services
- content and assessment services on a local network
- internet-independent operation after setup

### Moodle
Primary fit for connected institutions that need a mature institutional LMS backend.

Intended role:
- optional institutional backend
- mature user, role, course, grade and administration services
- integration through supported web services and open learning standards

## What remains Mzansi-owned

- Programme Package Manager
- UMLA learning-record contract
- PWA registration and activation rules
- offline-first learner experience
- local progress and evidence logic
- programme-agnostic orchestration
- South African occupational-learning profile

## Cost rule

No paid API is required for this foundation.
No hosted commercial LMS is required.
No provider is mandatory for individual/offline use.
The Hub must continue to work without either engine connected.

## Security rule

The Hub does not store provider passwords or API tokens in local programme-package data.
Connection credentials, if later required, must be handled by a dedicated secure connector or server-side mechanism.

## Phase 0.4A boundary

This phase defines only the open-source engine connection contract and provider capability profiles.

It does not:
- install Moodle or Kolibri
- create cloud infrastructure
- perform live synchronisation
- store credentials
- replace UMLA
- change existing programme activation behaviour

## Connection contract

Schema: `MLH-ENGINE-0.1`

Supported provider IDs:
- `KOLIBRI`
- `MOODLE`

Supported modes:
- `LOCAL_NODE`
- `INSTITUTIONAL_SERVER`

The bridge must fail closed on unsupported providers, invalid URLs, or incomplete enabled profiles.
