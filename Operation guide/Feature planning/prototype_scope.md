# Number Stations - Milestone 1 Prototype Scope

**Status: Milestone 1 wrapped.**

Milestone 1 proves the core **night mission interaction prototype**: a top-down stealth mission where the player infiltrates a facility, reads light and sound, avoids or fights enemies, collects an objective, and extracts alive.

This document is now the wrap-up record for the first prototype milestone. The next milestone is tracked separately in `prototype_scope_milestone_02.md`.

## What This Prototype Proves

A top-down Cold War stealth mission can work around these readable tactical layers:

- **Light** - darkness, lamps, open-door spill, fog of war, and lit/unlit enemy detection.
- **Sound** - player and enemy noise, wall/door attenuation, suspicious reactions, and player-facing sound cues.
- **Geometry** - walls, doors, ray blockers, door panels, collision, and hard-aim scouting limits.
- **Enemy behavior** - patrol, suspicion, alert, search, return, cautious patrol, melee and shooter behavior.
- **Player agency** - sneak, sprint, hard aim, shoot, open/destroy doors, choose combat or stealth, collect objective, exfil.

The current prototype is still a hardcoded test mission, but the main night-gameplay feel is now validated enough to close Milestone 1.

## Bigger Picture

This night mission phase eventually sits inside a larger roguelike day cycle from the FDD:

1. **Morning** - read newspaper, world events, and intel.
2. **Evening** - decode orders from a numbers station broadcast and prepare gear.
3. **Night** - execute the mission.
4. **End of day** - suspicion, trust, and world state update.

All day-cycle systems remain deferred. Milestone 1 focused only on making the **night mission feel right**.

## Milestone 1 System State

| System | Status |
|--------|--------|
| Character movement, aiming, shooting, interaction, and reset | Done |
| Fixed `1920 x 1080` internal gameplay resolution and presentation canvas | Done |
| Follow camera and hard-aim scouting | Done |
| Walls, rooms, collision, ray geometry, fog of war | Done |
| Lighting, lamps, darkness, door/window apertures, shootable lights | Done, with tuning caveats |
| Objective pickup and exfil loop | Done |
| Enemy sight and light-gated LOS/body-sample detection | Done |
| Enemy sound detection, suspicion behavior, wall/door attenuation | Done |
| Player-facing sound cues: clear rings, door cones, wall pulses | Done first pass |
| Enemy patrol, alert pursuit/combat, search, return, cautious behavior | Done |
| Walk/sneak/sprint movement noise tradeoff | Done |
| Door system: open/close, blockers, lighting, sound, HP, destruction | First pass done |
| Doorway enemy movement behavior | First pass done |
| Player/enemy health, damage, death, corpses, and local game over | First pass done |

## Feature Build Order Record

| # | Feature | Milestone 1 Result |
|---|---------|--------------------|
| 1 | **Walls & Rooms** | Done. Hardcoded facility geometry. |
| 2 | **Lighting** | Done. Geometry-blocked lamp light, darkness, fog, shootable lights, door/window spill. |
| 3 | **Objective Pickup & Exfil** | Done. Pickup-to-exfil mission loop. |
| 4 | **Enemy Sight Detection** | Done. FOV, LOS, light threshold, player-body sampling. |
| 5 | **Enemy Sound Detection** | Done. Gunshots, footsteps, suspicion, attenuation, player-facing sound cues. |
| 6 | **Enemy Movement & Patrol** | Done. Static and waypoint patrols, cross-room patrol, doorway movement fixes. |
| 7 | **Enemy AI State Machine** | Done. Suspicion, alert, search, return, cautious behavior, melee/shooter branches. |
| 8 | **Walk vs. Run + Noise Tradeoff** | Done. Sneak/walk/sprint speeds and sound radius tradeoff. |
| 9 | **Door System** | First pass done. Door collision, ray blocking, HP, sound leakage, light linkage, enemy auto-open. |
| 10 | **Follow Camera & Hard-Aim Scouting** | Done. Camera follow, hard-aim lookahead, aim guide, soft aim assist. |
| 11 | **Health, Damage, Death & Corpses** | First pass done. HP, projectiles, melee damage, corpses, local game-over reset. |
| ## | **Metagame & Daytime Systems** | Conceptual only. Deferred beyond Milestone 1. |

## Remaining Milestone 1 Debt

These are not blockers for closing Milestone 1, but they should be considered cleanup/tuning debt before or during Milestone 2:

- Door visuals are still first pass: instant animation, simple HP bar, simple destruction debris.
- Door light and sound tuning may need more playtest across future maps.
- Enemy pathing uses a small hardcoded graph, not a real navmesh.
- Patrols and facility layout are hardcoded in code.
- Enemy cones and several readability/debug elements are still prototype-visible.
- Damage values, sound radii, and lighting numbers are hardcoded rather than tuner-driven.
- The current mission has no result screen, scoring, or campaign consequence.
- Corpse interaction data exists, but loot/search/body hiding behavior is not implemented.

## Not Built In Milestone 1

- Morning newspaper.
- Numbers-station radio/cipher decoding.
- Gear preparation and inventory.
- NPC interaction and suspicion dialogue.
- End-of-day world-state updates.
- Persistent campaign/run state.
- Multiple mission types.
- Modular or generated mission maps.
- Body discovery system.
- Difficulty settings.
- Actual audio/music pass.

## Open Design Decisions

| Topic | Current State |
|-------|---------------|
| Facility maps | `hasMapKnowledge` is hardcoded on; how maps are earned is undecided. |
| Map knowledge detail | Whether maps reveal only geometry or also patrol/objective hints is undecided. |
| Mission completion | Current exfil resets locally; score/result/campaign consequence is undecided. |
| Gear persistence | Consumable vs. persistent tools is undecided. |
| Body discovery | Simple timer vs. patrol-based discovery is undecided. |
| Difficulty model | Designed single difficulty vs. selectable difficulty is undecided. |
| Narrative framing | Abstract, fictional-country, or real-Cold-War framing remains open. |

## Key Decisions Locked For This Prototype

| Decision | Choice |
|----------|--------|
| Prototype focus | Night mission feel before day-cycle systems. |
| Facility layout | Hardcoded test facility for Milestone 1. |
| Objective type | Physical pickup, then exfil. |
| Enemy movement | Authored patrol waypoints plus small navigation graph. |
| Detection model | Sight uses light + LOS; sound uses attenuation and listener-specific cues. |
| Camera target | Fixed `1920 x 1080` internal viewport in a `3200 x 1800` world. |
| Door role | Doors are shared dynamic geometry for movement, sight, light, projectiles, AI, and sound. |
