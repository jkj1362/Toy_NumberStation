# Number Stations - Prototype 2 Scope

**Status: Active prototype. Features 13 local reactions and 14 ballistics are implemented but still need regression/stability work. Features 15A mission-data separation and 15B seeded generation are implemented, with generated-mission gameplay/visual regression ongoing. Feature 16 remains deferred until the generated scale is accepted for facility-level escalation design.**

Prototype 1 proved the core night-mission interaction feel. Prototype 2 now needs to stabilize local AI and ballistics, generate larger seeded facilities through the normalized mission boundary, and then design facility-wide escalation at a scale that can exercise it meaningfully.

## Prototype 2 Goal

Build a stronger night-mission gameplay prototype that supports locally grounded AI reactions, mission-level escalation, meaningful door combat, and seed-based mission generation through a clean mission-data boundary.

The prototype should answer:

- Do enemies react believably to corpses, companions in combat, muffled/attenuated sounds, and suspicious events without receiving omniscient player knowledge?
- Can doors support readable destruction, bullet holes, penetration, and alerts without becoming confusing?
- Can serious or accumulated local evidence raise facility readiness and coordinate connected-room searches without making every enemy rush one point?
- What mission-data boundary is needed so procedural room reconstruction can generate a stable playable level from a seed?
- Which systems should wait for Prototype 3 because they depend on metagame or full run-cycle design?

## Completed Pre-Work

### Collapsible Tuning and Debug Controls

Implementation status: first pass implemented in `tuning.js`; see `Live features/feature_12_tuning_debug_controls.md` and `Operation guide/Feature planning/feature_12_tuning_debug_controls.md`.

This remains important support work for Prototype 2:

- Right-side collapsible tuning/debug panel.
- Numeric tunables exposed as sliders with live values.
- Debug overlays separated from balance tuning.
- Master debug overlay toggle.
- Runtime tuning for sound, lighting, player, enemy, doors, mission, camera, fog, and input controls.

## Recommended Scope

Execution order:

`Feature 13 local reactions -> Feature 14 ballistics -> Feature 15A mission separation -> Feature 15B seeded generation -> Feature 16 facility escalation`

### 1. Feature 13 - Local AI Event Reactions and Body Discovery

Feature planning doc: `Operation guide/Feature planning/feature_13_ai_reactions_body_discovery.md`.

The local-reaction implementation exists, including corpse/evidence discovery, ballistic impact reactions, suspicion teams, and locally observed alert propagation. It remains subject to playtest tuning and bug fixing, but mission-level escalation is no longer part of Feature 13.

Minimum shape:

- Preserve and stabilize first-pass corpse discovery.
- If a living enemy sees a corpse, they should investigate or escalate instead of ignoring it.
- Enemies should react when they see another companion running toward, chasing, or fighting the player.
- Enemies should react to attenuated or muffled sounds from closed doors in a way that feels local and plausible.
- Suspicious cases use capped local investigation teams, while locally observed alert propagation remains uncapped.
- Avoid an omniscient hive mind. Feature 13 reactions come only from visible events, audible events, or locally observed companion information.

Candidate event types:

| Event | Expected first-pass reaction |
|-------|------------------------------|
| Corpse seen | Investigate, then alert/search if confirmed. |
| Companion chasing player seen | Join alert or move toward the chase. |
| Companion sprinting/running suspiciously seen | Become suspicious and face/move toward the event. |
| Muffled sound through closed door | Investigate the relevant door/room side, not the exact hidden source. |
| Gunshot or door penetration | Escalate quickly to alert/search. |
| Repeated suspicious sounds | Confirm local alert according to Feature 13 thresholds; later contribute deduplicated evidence to Feature 16. |

### 2. Door and Destruction Polish with Bullet Penetration

Feature planning doc: `Operation guide/Feature planning/feature_14_door_ballistics_destruction.md`.

Doors should become intentional stealth/combat objects, not only blockers with HP bars.

Minimum shape:

- Shooting a closed door creates persistent bullet holes.
- Bullets can penetrate closed doors and continue to the other side.
- Door penetration can damage or kill the player/enemies behind the door.
- Bullet holes remain visible so the door records what happened.
- Door shots and penetration should create strong local sound/alert stimuli.
- Facility-level consequences from those incidents belong to Feature 16, not Feature 14.

Open design details:

- Decide whether bullet holes are visual-only or also create small visibility/sound leaks.
- Decide penetration damage/falloff through doors.
- Decide whether repeated holes weaken the door separately from door HP.
- Decide how much enemies infer from bullet direction versus just gunfire location.

### 3. Feature 15A - Reference Mission Data Separation

Feature planning doc: `Operation guide/Feature planning/feature_15_seeded_mission_generation.md`.

Extract the current hardcoded facility into one normalized reference mission before adding either facility escalation or generation.

Minimum shape:

- Preserve the current layout and gameplay exactly.
- Give rooms, connectors, walls, gaps, doors, windows, lamps, objective/exfil points, enemy spawns/patrols, navigation nodes/edges, and sound rooms/portals stable normalized identities.
- Instantiate mutable runtime state from immutable authored data.
- Make gameplay, lighting, enemy navigation/spawns, and sound topology consume that same source.
- Keep `resetGame()` on the same reference facility and restore all mutable state.
- Add no procedural variation in this phase.

### 4. Feature 15B - Seeded Procedural Runs

Feature planning doc: `Operation guide/Feature planning/feature_15_seeded_mission_generation.md`.

Generate larger facilities through the same normalized mission contract before designing facility-wide escalation.

Target direction:

- Generate the dungeon/facility structure from modular room pieces and connector rules.
- Keep the same generated level for the current character/run.
- Start a new character after death with a newly generated seed and level.
- Keep the reference mission as a deterministic regression fixture.
- Generate geometry, lighting hooks, objective/exfil placement, enemy/nav data, and sound topology consistently from the same connector graph.

The goal is not a full editor or production-scale variety. The goal is a reliable seed-to-mission proof using the same boundary already exercised by the reference facility, with enough rooms and enemies to support later Feature 16 design.

### 5. Feature 16 - Facility Alert and Escalation

Feature planning doc: `Operation guide/Feature planning/feature_16_facility_alert_escalation.md`.

Build the mission-level alert layer after Feature 15B supplies larger connected facilities.

Minimum shape:

- Consume immutable, deduplicated incident snapshots from Feature 13/14.
- Accumulate severe or repeated independent evidence into explicit facility alert levels.
- Select affected connected rooms and distribute readiness/search work instead of sending every enemy to one coordinate.
- Keep individual local knowledge authoritative. Facility state never broadcasts the hidden player's live position.
- Provide explicit reset, decay, tuning, and debug visibility.

## Deferred To Prototype 3 / Metagame-Aligned Work

### Mission Result Flow

Move result flow to Prototype 3 unless a tiny death/restart hook is needed for seeded run testing.

Reason: mission results become more meaningful once the larger run loop and metagame consequences exist. A full result screen should align with campaign/day-cycle design rather than being bolted onto Prototype 2 too early.

Mission data separation and result flow do not need to be bound together. Mission data answers "what level/run was generated and loaded?" Result flow answers "how did this run end and what consequences follow?"

### Second Test Map

Move the manually authored second test map to Prototype 3 or replace it with a seeded generation validation pass.

Reason: if the game direction is roguelike procedural generation, Prototype 2 should invest in modular generation and seed stability rather than building a one-off second hand-authored map.

## Explicitly Out Of Scope For Prototype 2

These should remain deferred unless the project direction changes:

- Full morning newspaper system.
- Full numbers-station cipher minigame.
- Full NPC dialogue/suspicion system.
- Full gear inventory and economy.
- Full campaign persistence.
- Full mission result/scoring screen.
- Full production procedural-generation variety.
- Visual mission editor.
- Final art/audio pass.

## Candidate Prototype 2 Feature List

| Priority | Work | Why It Matters |
|----------|------|----------------|
| Done | Collapsible tuning/debug UI | Speeds up balancing and makes prototype overlays intentional. |
| Implemented; stabilization ongoing | Feature 13 local AI reactions | Closes missed local stealth-reaction behavior without global knowledge. |
| Implemented; regression pending | Feature 14 door ballistics core | Makes doors and windows part of stealth, sound, combat, and risk. |
| Done | Feature 15A reference mission separation | Gives every later system one stable topology and data boundary without changing the map. |
| Implemented; regression pending | Feature 15B modular seeded generation | Generated structures now feed geometry, lighting, nav, enemies, sound, and later escalation through one contract. |
| Implemented; regression pending | Feature 15B run seed/death reset behavior | One generated level remains stable for ordinary resets; death starts a new seeded run. |
| Deferred until after 15B | Feature 16 facility alert/escalation | Needs a larger facility and guard population to validate connected-space readiness and search behavior. |
| P2 | Minimal gear/tool placeholder | Only if needed to test doors or room generation; otherwise defer. |

## Success Criteria

Prototype 2 is complete when:

- The collapsible tuning/debug panel exists and remains useful for playtesting.
- Enemies react to discovered corpses and visible companion combat/chase behavior.
- Enemies can investigate muffled/attenuated closed-door sounds without knowing the exact hidden source.
- Severe or repeated independent local incidents can escalate into a broader facility alert/search response without sharing the player's live position.
- Closed doors can show bullet holes, allow penetration, and let bullets damage actors on the other side.
- Door shooting creates appropriate sound/alert consequences.
- Mission content is no longer trapped inside gameplay logic, and the fixed reference mission reproduces the current facility exactly.
- A fixed mission object or generator output can define walls, rooms, connectors, doors, lighting, enemy/nav data, objective/exfil placement, and sound portal data.
- Feature 16 consumes stable room/connector IDs and deduplicated incidents to coordinate facility readiness/search behavior.
- A seed can produce a stable level for the current character/run, and a new seed can be used after death.
- Mission result flow and the second-map question are explicitly deferred or reframed for Prototype 3.

## Open Questions For Prototype 2

| Question | Notes |
|----------|-------|
| How much do guards communicate? | Feature 13 keeps direct/local sharing. Feature 16 may assign broader readiness/search work, but never broadcasts the hidden player's live position. |
| What exactly counts as corpse discovery? | Direct LOS to corpse is the likely first pass. Blood trails/body hiding can wait. |
| Should door holes affect visibility or sound? | Visual-only is simplest; small LOS/sound leaks are more systemic but riskier. |
| How much damage passes through a door? | Needs tuning for fairness, readability, and player/enemy lethality. |
| What does building-wide high alert mean? | Feature 16 will define levels, thresholds, decay, affected connected spaces, and distributed assignments without perfect player knowledge. |
| What is the minimum room module set? | Need enough room/connector types to test procedural reconstruction without building full content tools. |
| Should mission data be JS or JSON? | JS is fastest while generation rules are still changing; JSON may be better later for tooling. |
| What owns the run seed? | Prototype 2 can keep it local/runtime; Prototype 3 can connect it to metagame persistence. |
| Is a full result screen needed now? | Probably no. Only add a small restart/death hook if needed for seed testing. |
