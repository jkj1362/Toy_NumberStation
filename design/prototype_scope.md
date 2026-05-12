# Number Stations — Prototype Scope

## What We're Making

A top-down stealth game set in a Cold War spy thriller. The core gameplay loop is a **night-phase mission**: infiltrate a facility, deal with enemies (kill them, sneak past, or a mix of both), grab an objective, and extract alive.

The player has full freedom of approach:
- **Brute force** — eliminate every enemy, then walk out
- **Ghost** — never seen, never heard, in and out like a ninja
- **Balanced** — neutralize threats selectively, use the environment

## The Bigger Picture

This mission phase eventually sits inside a larger roguelike day cycle from the FDD:

1. **Morning** — read newspaper (world events + intel)
2. **Evening** — decode orders from numbers station radio broadcast, prepare gear
3. **Night** — execute the mission (this is what we're building now)
4. **End of day** — suspicion, trust, and world state update

All day-cycle systems (cipher decoding, NPC interaction, gauges) come later. The prototype is purely about making the **night mission feel right**.

## Current Prototype State

| System | Status |
|--------|--------|
| Character movement (WASD + gamepad) | ✅ Done |
| Directional fog of war + proximity circle | ✅ Done |
| Shooting (projectiles) | ✅ Done |
| 3 killable static enemies | ✅ Done |
| Canvas bounds + reset (B button) | ✅ Done |

## Feature Build Order

| # | Feature | Notes |
|---|---------|-------|
| 1 | **Walls & Rooms** | Geometry first — walls, doors, windows. Canvas border = building perimeter. Interior walls divide the floor into rooms. See `feature_01_walls_lighting.md` |
| 2 | **Lighting** | Built together with walls. Light sources per room; darkness layer; player visibility integration. See `feature_01_walls_lighting.md` |
| 3 | **Objective Pickup & Exfil** | Interact key to collect item in objective room. Two exfil options: original start point or alternative exfil room |
| 4 | **Enemy Sight Detection** | FOV arc + range + line-of-sight through walls. Light level affects detection range |
| 5 | **Enemy Sound Detection** | Sound radius per action (gunshot, run, walk). Enemies react to sounds through walls |
| 6 | **Enemy Movement & Patrol** | Waypoint patrol routes. Enemies navigate through doorways |
| 7 | **Enemy AI State Machine** | PATROLLING → ALERT → SEARCHING. Guards in CAUTIOUS never fully return to UNAWARE |
| 8 | **Walk vs. Run + Noise Tradeoff** | Shift = run (faster, louder). Sound radius changes by movement state |

## Key Design Decisions (From FDD Open Questions)

| Decision | Choice |
|----------|--------|
| Vision cone visibility | Arrow only for now; cone added later if needed |
| Facility layout | Hardcoded for this prototype |
| Objective type | Pick up an item, then reach exfil |
| Enemy movement | Patrol waypoints |
