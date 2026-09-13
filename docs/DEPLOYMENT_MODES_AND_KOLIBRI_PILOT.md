# DEPLOYMENT MODES AND KOLIBRI LOCAL PILOT FOUNDATION

## Phase

0.4C — Deployment Modes & Kolibri Local Pilot Foundation

## Purpose

Lock the three operating modes before any real server integration.

## Modes

### INDIVIDUAL

```
Learner phone
  ├─ Mzansi Learning Hub
  └─ Standalone learning PWAs
```

- no server required
- no local network required
- no internet required for core learning already cached locally
- no Kolibri or Moodle dependency

### LOCAL

```
Existing laptop / desktop
        │
   Kolibri local node
        │
   local Wi-Fi network
      ↙   ↓   ↘
   phone tablet phone
        │
  Mzansi Learning Hub
        │
       PWAs
```

- Kolibri is optional
- use an existing laptop or desktop first
- phones connect over the same local network
- internet is not required for the local learning session once the required content is available locally
- synthetic/test learner data only for the first integration pilot

### INSTITUTIONAL

```
Learner devices
      │
Mzansi Learning Hub
      │
MLH-ADAPTER-0.1
   ↙       ↘
Kolibri   Moodle
      institution-managed servers
```

- one or both open-source engines may be used
- server may be reachable over a LAN, VPN, hosted network, or internet
- internet is not a universal architectural requirement
- provider-specific data remains behind the adapter boundary

## Capability correction

The previous provider profile treated Moodle as inherently internet-dependent.

That was too restrictive.

Moodle is a server-based application, but the server can be made available on an institution's local network. The Mzansi capability model therefore distinguishes:

- server requirement
- local-network capability
- internet requirement

instead of equating server-based with internet-required.

## Kolibri pilot gates

A real LOCAL-mode pilot is ready only when:

1. a real Kolibri node is installed on an existing laptop or desktop;
2. the learner phone and the node are on the same local network;
3. the real node address is known;
4. only synthetic/test learner data is used;
5. no paid hosting has been introduced.

## Cost control

No hardware purchase is required for the first pilot if a suitable existing computer is available.

No paid cloud service is required.

No new Netlify deployment should be triggered until this phase has enough visible changes to justify a single preview.

## Truth boundary

This phase does not claim a live Kolibri integration.

It prepares and validates the deployment model only.

Live status can only be claimed after the Hub reaches a real Kolibri node and the connection is tested end to end.
