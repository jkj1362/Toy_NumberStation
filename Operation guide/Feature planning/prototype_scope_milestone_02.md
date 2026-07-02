# Number Stations - Prototype 2 Scope

**Status: Active prototype. Tuning/debug controls implemented; remaining work reordered for AI reactions, door combat, and seeded mission generation.**

Prototype 1 proved the core night-mission interaction feel. Prototype 2 should now close the most important missing gameplay reactions, make doors work as real stealth/combat objects, and reshape mission structure around the roguelike direction: a generated level stays fixed for the current character/run seed, then a new character starts with a newly generated level after death.

## Prototype 2 Goal

Build a stronger night-mission gameplay prototype that supports reactive AI, meaningful door combat, and seed-based mission generation.

The prototype should answer:

- Do enemies react believably to corpses, companions in combat, muffled/attenuated sounds, and suspicious events across rooms?
- Can doors support readable destruction, bullet holes, penetration, and alerts without becoming confusing?
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

### 1. Corpse, Body Discovery, and AI Event Reactions

Next feature planning doc: `Operation guide/Feature planning/feature_13_ai_reactions_body_discovery.md`.

Prototype 1 missed several important AI reactions. Prototype 2 should address those before broader content work.

Minimum shape:

- Decide and implement first-pass corpse discovery.
- If a living enemy sees a corpse, they should investigate or escalate instead of ignoring it.
- Enemies should react when they see another companion running toward, chasing, or fighting the player.
- Enemies should react to attenuated or muffled sounds from closed doors in a way that feels local and plausible.
- Suspicious events should be able to escalate into a broader alert/search state when repeated or severe.
- Avoid an omniscient hive mind. Reactions should come from visible events, audible events, local communication, or explicitly authored alert escalation.

Candidate event types:

| Event | Expected first-pass reaction |
|-------|------------------------------|
| Corpse seen | Investigate, then alert/search if confirmed. |
| Companion chasing player seen | Join alert or move toward the chase. |
| Companion sprinting/running suspiciously seen | Become suspicious and face/move toward the event. |
| Muffled sound through closed door | Investigate the relevant door/room side, not the exact hidden source. |
| Gunshot or door penetration | Escalate quickly to alert/search. |
| Repeated suspicious sounds | Escalate from suspicion to building search. |

### 2. Door and Destruction Polish with Bullet Penetration

Feature planning doc: `Operation guide/Feature planning/feature_14_door_ballistics_destruction.md`.

Doors should become intentional stealth/combat objects, not only blockers with HP bars.

Minimum shape:

- Shooting a closed door creates persistent bullet holes.
- Bullets can penetrate closed doors and continue to the other side.
- Door penetration can damage or kill the player/enemies behind the door.
- Bullet holes remain visible so the door records what happened.
- Door shots and penetration should create strong sound/alert stimuli.
- Enemies should respond by entering alert and quickly patrolling/searching connected building spaces.
- If the current alert behavior is not enough, add a high-alert/building-search layer instead of only local chase behavior.

Open design details:

- Decide whether bullet holes are visual-only or also create small visibility/sound leaks.
- Decide penetration damage/falloff through doors.
- Decide whether repeated holes weaken the door separately from door HP.
- Decide how much enemies infer from bullet direction versus just gunfire location.

### 3. Mission Data Separation for Seeded Procedural Runs

Feature planning doc: `Operation guide/Feature planning/feature_15_seeded_mission_generation.md`.

Mission data separation is still needed, but the reason has changed. It is not primarily for a hand-authored second map. It should become the boundary between gameplay systems and a seeded procedural mission generator.

Target direction:

- The game procedurally generates the dungeon/facility structure from modular room pieces.
- The generated level is tied to a seed.
- The same character/run keeps the same generated level until that character dies.
- After character death, a new character begins a new session with a newly generated level/seed.
- The current hardcoded facility can become a reference mission, fixed seed output, or module test case.

Data to separate:

- Room modules and connection rules.
- Walls, bounds, door openings, and wall gap exits.
- Door definitions, default states, HP, sound transmission, and light aperture links.
- Lamps, windows, ambient zones, and lighting hooks.
- Objective and exfil placement rules.
- Enemy spawn rules, archetypes, patrol route generation, and nav graph nodes.
- Sound room/portal graph data generated from room connections.
- Seed/run identity and reset behavior.

The goal is not a full editor. The goal is a clean runtime mission object that can be produced by either the current fixed facility data or a procedural generator.

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
| P0 | Corpse/body discovery and AI event reactions | Closes missed Prototype 1 stealth-reaction behavior. |
| P0 | Door destruction, holes, and bullet penetration | Makes doors central to stealth, sound, combat, and risk. |
| P0 | High-alert/building-search behavior | Needed if door penetration/gunfire should escalate the whole facility. |
| P0 | Seeded mission data separation | Required before modular procedural room generation can be reliable. |
| P1 | Modular room generation proof | Verifies that generated room structures can feed walls, doors, lighting, nav, enemies, and sound. |
| P1 | Run seed/death reset behavior | Keeps one generated level stable for a character and creates a new level after death. |
| P2 | Minimal gear/tool placeholder | Only if needed to test doors or room generation; otherwise defer. |

## Success Criteria

Prototype 2 is complete when:

- The collapsible tuning/debug panel exists and remains useful for playtesting.
- Enemies react to discovered corpses and visible companion combat/chase behavior.
- Enemies can investigate muffled/attenuated closed-door sounds without knowing the exact hidden source.
- Severe events such as gunshots, door penetration, or repeated suspicious events can escalate into a broader alert/search response.
- Closed doors can show bullet holes, allow penetration, and let bullets damage actors on the other side.
- Door shooting creates appropriate sound/alert consequences.
- Mission content is no longer trapped entirely inside gameplay logic.
- A fixed mission object or generator output can define walls, rooms, doors, lighting, enemy/nav data, objective/exfil placement, and sound portal data.
- A seed can produce a stable level for the current character/run, and a new seed can be used after death.
- Mission result flow and the second-map question are explicitly deferred or reframed for Prototype 3.

## Open Questions For Prototype 2

| Question | Notes |
|----------|-------|
| How much do guards communicate? | Prefer visible/audible/local escalation first; avoid instant global knowledge unless high alert is triggered. |
| What exactly counts as corpse discovery? | Direct LOS to corpse is the likely first pass. Blood trails/body hiding can wait. |
| Should door holes affect visibility or sound? | Visual-only is simplest; small LOS/sound leaks are more systemic but riskier. |
| How much damage passes through a door? | Needs tuning for fairness, readability, and player/enemy lethality. |
| What does building-wide high alert mean? | Could be fast patrol/search through connected spaces, not perfect knowledge of player position. |
| What is the minimum room module set? | Need enough room/connector types to test procedural reconstruction without building full content tools. |
| Should mission data be JS or JSON? | JS is fastest while generation rules are still changing; JSON may be better later for tooling. |
| What owns the run seed? | Prototype 2 can keep it local/runtime; Prototype 3 can connect it to metagame persistence. |
| Is a full result screen needed now? | Probably no. Only add a small restart/death hook if needed for seed testing. |
