# MZANSI LEARNING HUB — MASTER CONTROL

## Current phase
Phase 0.1A — Lightweight LMS Shell

## Purpose
Create the smallest useful offline-first LMS control layer above existing specialist learning PWAs.

## Locked architectural direction
- PWAs remain the learning engines.
- The Learning Hub manages programme discovery, navigation and later progress orchestration.
- UMLA Learning Record v0.1 is the current frozen learning-event contract proved in Mzansi Boilermaker.
- No cloud backend in Phase 0.1A.
- No central learner account in Phase 0.1A.
- No certificates, cohorts, educator dashboard or institution admin in Phase 0.1A.
- No Netlify deployment until the first complete useful slice is ready.

## Phase 0.1A acceptance scope
The shell must provide:
- Home
- My Learning
- Programmes
- Progress
- Profile
- one programme registry entry: Mzansi Boilermaker
- one visible pilot progress reference: KM-04 Lesson 3 — 4/4 (100%)
- offline app-shell caching
- mobile-first layout

## Important limitation
The progress shown in Phase 0.1A is a static pilot reference from the verified Boilermaker UMLA event. A separate Learning Hub origin cannot directly read Boilermaker IndexedDB. Phase 0.1B must prove an explicit UMLA handoff/import bridge before any claim of live cross-PWA progress aggregation.

## Next controlled phase
Phase 0.1B — UMLA local handoff/import proof.

The goal is one controlled record moving from Boilermaker into the Learning Hub without a cloud backend. Only after that passes should cloud sync be considered.
