# Number Stations - Prototype Scope

## What We're Making

A top-down stealth game set in a Cold War spy thriller. The core gameplay loop is a **night-phase mission**: infiltrate a facility, deal with enemies by sneaking past or neutralizing them, grab an objective, and extract alive.

The player has full freedom of approach:
- **Brute force** - eliminate every enemy, then walk out
- **Ghost** - never seen, never heard, in and out cleanly
- **Balanced** - neutralize threats selectively and use the environment

## The Bigger Picture

This mission phase eventually sits inside a larger roguelike day cycle from the FDD:

1. **Morning** - read newspaper, world events, and intel
2. **Evening** - decode orders from a numbers station broadcast and prepare gear
3. **Night** - execute the mission, which is the current prototype
4. **End of day** - suspicion, trust, and world state update

All day-cycle systems are deferred. The prototype is currently about making the **night mission feel right**.

## Current Prototype State

| System | Status |
|--------|--------|
| Character movement, aiming, shooting, and reset | Done |
| Walls, rooms, lamps, darkness, and fog of war | Done |
| Objective pickup and exfil loop | Done |
| Enemy sight and light-gated LOS detection | Done |
| Enemy sound detection and suspicion behavior | Done |
| Enemy patrol, alert pursuit, search, and cautious behavior | Done |
| Fixed FHD internal gameplay resolution and presentation canvas | Done |

## Feature Build Order

| # | Feature | Notes |
|---|---------|-------|
| 1 | **Walls & Rooms** | Done. Hardcoded facility geometry |
| 2 | **Lighting** | Done. Wall lamps, darkness layer, shootable lights |
| 3 | **Objective Pickup & Exfil** | Done. Pickup-to-exfil mission loop |
| 4 | **Enemy Sight Detection** | Done. FOV, LOS, and light checks |
| 5 | **Enemy Sound Detection** | Done. Gunshots, footsteps, suspicion, direct observation |
| 6 | **Enemy Movement & Patrol** | Done. Waypoint patrol routes, including cross-room patrol |
| 7 | **Enemy AI State Machine** | Done. Alert pursuit, last-known search, and lingering cautious behavior |
| 8 | **Walk vs. Run + Noise Tradeoff** | Next. Shift/run speed and louder movement |
| 9 | **Follow Camera & Hard-Aim Scouting** | Player-centered camera; LT hard-aim look-ahead. Depends on Feature 8 (walk-slow) |
| ## | **Metagame & Daytime Systems** | Conceptual. Deferred until night-phase prototype is validated |

## Key Design Decisions

| Decision | Choice |
|----------|--------|
| Facility layout | Hardcoded for this prototype |
| Objective type | Physical pickup, then exfil |
| Enemy movement | Patrol waypoints |
| Enemy AI consequence | State changes and pursuit for now; no full game-over flow yet |
| Presentation target | Fixed 1920x1080 internal world and screen canvas; CSS scales that FHD frame to the monitor |
