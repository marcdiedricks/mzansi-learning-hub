# MZANSI LEARNING HUB — MASTER CONTROL

## Current phase
Phase 0.1B — UMLA Local Handoff / Import Proof

## Purpose
Create the smallest useful offline-first LMS control layer above existing specialist learning PWAs.

## Locked architectural direction
- PWAs remain the learning engines.
- The Learning Hub manages programme discovery, navigation and progress orchestration.
- UMLA Learning Record v0.1 is the frozen learning-event contract proved in Mzansi Boilermaker.
- No cloud backend in Phase 0.1B.
- No central learner account in Phase 0.1B.
- No certificates, cohorts, educator dashboard or institution admin in Phase 0.1B.
- No Netlify deployment until Phase 0.1A + 0.1B form one complete useful test slice.

## Phase 0.1A shell — built
- Home
- My Learning
- Programmes
- Progress
- Profile
- one programme registry entry: Mzansi Boilermaker
- offline app-shell caching
- mobile-first layout

## Phase 0.1B handoff/import — built in GitHub
The Hub now includes:
- local IndexedDB storage for imported UMLA records
- UMLA-LR-0.1 validation
- duplicate-event protection using eventId
- local JSON file import
- local-only persistence on the Hub device
- progress display driven by the imported record
- a controlled Boilermaker KM-04 Lesson 3 fixture for pre-deployment validation
- no network upload and no backend write

## Important limitation
A separate Learning Hub origin cannot directly read Boilermaker IndexedDB. Phase 0.1B therefore uses an explicit JSON handoff/import bridge. This is intentional and avoids hidden cross-origin assumptions.

## Acceptance gate before freeze
The deployed Hub must prove:
1. the pilot fixture imports successfully;
2. invalid/non-UMLA JSON is blocked;
3. duplicate eventId is not added twice;
4. imported progress survives reload/offline reopening;
5. a real Boilermaker UMLA JSON record can be handed into the Hub;
6. KM-04 / KM-04-L03 / 4 of 4 / 100% display correctly;
7. no cloud/backend call is required.

## Next controlled phase
After Phase 0.1B passes, freeze the local handoff contract and decide whether Phase 0.1C should add a low-cost real-device export action to Boilermaker, or whether to move directly to controlled cloud sync architecture.
