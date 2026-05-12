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

## What Comes Next (Feature by Feature)

The user drives the order. Likely candidates based on the FDD:

- Facility walls and rooms (hardcoded)
- Enemy patrol routes
- Enemy sight detection (FOV + range + line-of-sight)
- Sound detection (gunshot radius, running noise)
- Objective pickup + exfil point
- Enemy AI state machine (PATROLLING → ALERT → SEARCHING)
- Walk vs. run (speed + noise tradeoff)

## Key Design Decisions (From FDD Open Questions)

| Decision | Choice |
|----------|--------|
| Vision cone visibility | Arrow only for now; cone added later if needed |
| Facility layout | Hardcoded for this prototype |
| Objective type | Pick up an item, then reach exfil |
| Enemy movement | Patrol waypoints |
