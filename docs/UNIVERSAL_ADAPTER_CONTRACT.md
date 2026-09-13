# UNIVERSAL OPEN-SOURCE ADAPTER CONTRACT

## Phase

0.4B — Universal Adapter Contract

## Purpose

Provide one small integration boundary between Mzansi Learning Hub and optional open-source engines.

The Hub must not contain separate integration architectures for Kolibri and Moodle.

Instead:

```
PWA / Programme
      ↓
     UMLA
      ↓
Mzansi Learning Hub
      ↓
MLH-ADAPTER-0.1
   ↙       ↘
Kolibri   Moodle
```

## Required adapter interface

Every engine adapter must provide:

- `getProviderInfo()`
- `getStatus()`
- `validateConnectionProfile(profile)`
- `listCapabilities()`
- `healthCheck()`

## Optional integration functions

Adapters may later add:

- learner import
- enrolment import
- course import
- progress import
- enrolment export
- UMLA learning-record export
- evidence export
- explicit synchronisation

These are intentionally optional. A provider must not claim a capability until it is implemented and tested.

## Truth rule

The adapter contract separates:

1. **provider capability**
2. **Mzansi adapter implementation**
3. **live connection status**

A provider supporting a function does not mean Mzansi currently supports it.

## Cost rule

- no paid API required
- no commercial hosted LMS required
- no background cloud sync required
- no server required for Individual mode
- Kolibri and Moodle remain optional
- build integrations only when a real use case requires them

## Data rule

UMLA remains the Mzansi learning-record language.

Provider-native data is translated at the adapter boundary rather than leaking provider-specific structures throughout the Hub.

## Phase 0.4B boundary

This phase establishes and validates the common interface only.

It does not:

- install Kolibri
- install Moodle
- create a Moodle API token
- authenticate to either engine
- move genuine learner data
- activate live synchronisation
- introduce hosting cost
