# Number Stations - Milestone 2 Prototype Scope

**Status: Proposed next milestone.**

Milestone 1 proved the core night-mission interaction feel. Milestone 2 should turn that single hardcoded test mission into a more durable **mission-content and tuning prototype**: still not the full day-cycle game, but no longer only a mechanics sandbox.

## Milestone 2 Goal

Build a repeatable night-mission slice that can support content variation, tuning, and design decisions for the larger game.

The milestone should answer:

- Can the existing stealth systems hold up across more than one layout?
- Which door/light/sound/enemy tuning values are stable enough to become reusable defaults?
- What minimum mission result flow is needed before metagame work begins?
- Which content pipeline shape should replace hardcoded mission data?

## Recommended Scope

### 1. Mission Data Separation

Move hardcoded mission data toward authored mission definitions:

- Walls and room centers.
- Doors and door aperture links.
- Lamps, ambient zones, and window apertures.
- Enemy spawn points, archetypes, patrol routes, and nav graph nodes.
- Pickup/exfil placement rules.
- Sound portal graph data.

The goal is not a full editor yet. A simple mission data file or structured mission object is enough.

### 2. Second Test Map

Create one additional small mission layout to validate that systems are not overfit to the current facility.

The second map should intentionally test:

- More than one closed-door sound cone scenario.
- At least one useful wall-vague sound cue.
- A room with enough darkness/obstacles for hiding.
- One alternate exfil or side exit.
- Doorway pathing in at least two orientations.
- A patrol route that crosses multiple rooms.

### 3. Tuning and Debug Controls

Add a lightweight in-game or code-level tuning surface for values that are currently hardcoded:

- Enemy footstep cue radius/interval/lifetime.
- Door sound transmission.
- Wall sound transmission.
- Lamp radius/falloff/intensity.
- Enemy sight threshold.
- Door HP and projectile damage.
- Debug overlays: enemy cones, sound paths, source rings, map overlay.

This does not need a polished UI. A small debug panel, constants table, or query-parameter toggles are enough for Milestone 2.

### 4. Door and Destruction Polish

Make doors read like intentional gameplay objects rather than debug rectangles:

- Replace direct always-available HP bar with a better damage/readability presentation.
- Add first-pass break/shatter visual state.
- Consider door interaction feedback, such as small motion/flash/sound.
- Re-evaluate enemy auto-open behavior and player door-block edge cases.
- Decide whether locked, half-open, or peek states are needed now or deferred.

### 5. Mission Result Flow

Replace instant exfil reset with a minimal result screen or summary state:

- Mission success/failure.
- Enemies killed or avoided.
- Times detected or alerts triggered.
- Shots fired / doors destroyed.
- Optional ghost/violent/noisy labels.

This is not yet campaign consequence, but it creates the bridge to future end-of-day systems.

### 6. Corpse and Body Discovery Decision

Decide the first body-discovery scope:

- Defer fully.
- Simple timed discovery if a living guard sees a corpse.
- Patrol/LOS-based discovery using existing sight checks.

Milestone 2 should at least decide the direction because it strongly affects stealth/combat balance.

## Explicitly Out Of Scope For Milestone 2

These should remain deferred unless the project direction changes:

- Full morning newspaper system.
- Full numbers-station cipher minigame.
- Full NPC dialogue/suspicion system.
- Full gear inventory and economy.
- Full campaign persistence.
- Multiple mission types beyond a simple objective/exfil variant.
- Procedural generation.
- Final art/audio pass.

## Candidate Milestone 2 Feature List

| Priority | Work | Why It Matters |
|----------|------|----------------|
| P0 | Mission data extraction | Required before more maps or repeatable tuning. |
| P0 | Second test map | Validates systems outside the original hardcoded layout. |
| P0 | Debug/tuning controls | Speeds up balancing light, sound, doors, and enemy behavior. |
| P1 | Result screen | Gives missions closure and prepares for metagame consequence. |
| P1 | Door visual/destruction polish | Doors are now central to stealth, sound, light, and combat. |
| P1 | Body discovery decision/prototype | Determines how lethal play changes mission risk. |
| P2 | Enemy coordination/corpse reaction | Builds on body discovery if selected. |
| P2 | Basic gear/tool placeholder | Prepares for future daytime equipment without full inventory. |

## Success Criteria

Milestone 2 is complete when:

- At least two authored mission layouts run through the same systems.
- Mission geometry, doors, lighting, enemies, and sound portal data are no longer trapped entirely in one hardcoded block.
- The player can complete a mission and see a basic result summary instead of immediate reset.
- Door, sound, light, and enemy debug/tuning values can be adjusted without hunting through unrelated code.
- The team has decided whether body discovery is part of the next playable slice.
- The remaining path toward daytime/metagame systems is clearer than it was at the end of Milestone 1.

## Open Questions For Milestone 2

| Question | Notes |
|----------|-------|
| Should mission data live in plain JS, JSON, or a future editor format? | Plain JS is fastest; JSON is cleaner for tools. |
| Is the second map hand-authored or assembled from reusable room modules? | Hand-authored is likely enough for Milestone 2. |
| Do we keep `hasMapKnowledge` hardcoded on? | Milestone 2 may need a toggle to test known vs unknown layouts. |
| Should body discovery be implemented before mission result scoring? | It affects stealth grading and consequences. |
| What is the minimum useful gear placeholder? | A single tool like lockpick/flashlight may be enough. |
| Should debug overlays be hidden by default? | Likely yes once result flow and tuning controls exist. |
