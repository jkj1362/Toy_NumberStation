# Number Stations - Milestone 2 Prototype Scope

**Status: Active milestone. First task implemented.**

Milestone 1 proved the core night-mission interaction feel. Milestone 2 should turn that single hardcoded test mission into a more durable **mission-content and tuning prototype**: still not the full day-cycle game, but no longer only a mechanics sandbox.

## Milestone 2 Goal

Build a repeatable night-mission slice that can support content variation, tuning, and design decisions for the larger game.

The milestone should answer:

- Can the existing stealth systems hold up across more than one layout?
- Which door/light/sound/enemy tuning values are stable enough to become reusable defaults?
- What minimum mission result flow is needed before metagame work begins?
- Which content pipeline shape should replace hardcoded mission data?

## Recommended Scope

### 1. Collapsible Tuning and Debug Controls

Implementation status: first pass implemented in `tuning.js`; see `Live features/feature_12_tuning_debug_controls.md` and `Operation guide/Feature planning/feature_12_tuning_debug_controls.md`.

Build a lightweight in-game tuning/debug UI first, opened and collapsed by a button. The goal is to stop editing scattered constants during playtest and to make the current prototype-readable overlays intentional.

Minimum shape:

- A small button fixed to the screen edge that opens/closes the tuning panel.
- Grouped sections for Sound, Lighting, Enemy, Player, Doors, Mission, and Debug Overlays.
- Checkboxes/toggles for debug visuals and binary modes.
- A top-level "All Debug Overlays" toggle that controls every debug-only visual as one group.
- When all debug overlays are off, the screen should match the actual player-facing game view exactly.
- Sliders for numeric tunables, with the current numeric value shown beside each slider.
- Numeric inputs may be used only where a slider is awkward, such as very large ranges, Infinity-capable values, or reload-only render scale values.
- Values should apply at runtime where practical; values that still require reset/reload should be clearly separated in code.
- Defaults should match the current Milestone 1 behavior.

Numeric control rule:

- Every numeric tunable should default to a slider UI.
- Each slider must show its live numeric value beside the control, using units where helpful: pixels, frames, degrees/radians, multiplier, HP, damage, or 0-1 transmission/threshold.
- Sliders should have practical min/max bounds based on playtest usefulness, not just raw technical limits.
- Values that can be `Infinity`, are discrete mode selectors, or are unsafe to change during runtime can use a numeric field, select box, or reload-only label instead.
- Runtime sliders should update the active game immediately where safe; reset/reload-only controls should be visually separated.

Action model:

- Balance and feel tuning should primarily be slider actions because those values are numeric and benefit from quick playtest adjustment.
- Debug overlays should primarily be toggle actions because they are visibility layers that are either shown or hidden.
- Do not treat every toggle as a debug overlay. Some gameplay-facing binary settings may also be toggles, such as enabling aim assist or player-facing sound cues.
- The clean UI split is: numeric tuning sliders in gameplay/system sections, debug visibility toggles in the Debug Overlays section.

Debug overlay rule:

- Debug overlays are any visuals that reveal system state, tuning information, labels, hidden routes, perception geometry, sound paths, map knowledge not earned by the player, or testing-only markers.
- These overlays should be grouped under a single master toggle, with individual child toggles for targeted tuning.
- Turning the master debug overlay toggle off must hide all debug-only information while preserving normal player-facing HUD, health, mission prompts, discovered exfil visuals, sound cues intended for gameplay, and other shipped feedback.
- The panel should make the distinction clear between gameplay feedback and debug overlays. For example, player-facing muffled sound cues can remain a gameplay toggle, while true source rings, attenuation paths, enemy labels, enemy sight cones, perf stats, and testing markers belong under Debug Overlays.

Balance/tuning control inventory from the current codebase:

This table intentionally excludes debug overlay toggles. Debug-only visibility controls are listed separately in the next table.

| Group | Current value/source | Control type | Notes |
|-------|----------------------|--------------|-------|
| Sound | `GUNSHOT_RADIUS` in `sound.js` | Slider + value | Player and enemy gunshot sound reach. |
| Sound | `FOOTSTEP_RADIUS`, `WALK_SPEED` in `sound.js` | Slider + value | Player footstep sound scaling baseline. |
| Sound | `SOUND_WALL_TRANSMISSION` in `sound.js` | Slider 0-1 | Wall attenuation for sound. |
| Sound | `SOUND_DEFAULT_CLOSED_DOOR_TRANSMISSION` in `sound.js` and per-door `soundTransmission` in `game.js` | Slider 0-1 | Closed-door sound attenuation. |
| Sound | `soundDoorDetourRatio()` in `sound.js` | Slider + value | Prefers a nearby closed-door muffled path over a long clear/open detour when the detour exceeds this ratio. |
| Sound | `SOUND_VAGUE_SOURCE_DISTANCE` in `sound.js` | Slider + value | Offset distance for vague wall-localized sound. |
| Sound | `SOUND_LIFETIME`, `SOUND_GUNSHOT_CUE_LIFETIME`, `SOUND_FOOTSTEP_CUE_LIFETIME`, `SOUND_DEFAULT_CUE_LIFETIME`, `SOUND_ATTENUATION_DEBUG_LIFETIME` in `sound.js` | Slider + value | Visual cue and debug event lifetimes. |
| Sound | `ENEMY_FOOTSTEP_CUE_RADIUS`, `ENEMY_FOOTSTEP_CUE_INTERVAL` in `sound.js` | Slider + value | Player-facing enemy footstep cues. |
| Lighting | `LIGHT_GLOBAL_AMBIENT`, mission `globalAmbient`, ambient zones in `lighting.js` / `game.js` | Slider 0-1 | Overall darkness and room spill. |
| Lighting | `PLAYER_VISIBLE_LIGHT_THRESHOLD`, `ENEMY_DIM_LIGHT_THRESHOLD`, `ENEMY_BRIGHT_LIGHT_THRESHOLD` in `lighting.js` | Slider 0-1 | Player visibility and enemy sight thresholds. |
| Lighting | `ROOM_LAMP_LIGHT.radius`, `.intensity`, `.falloffPower` in `game.js` | Slider + value | Shared room lamp reach and brightness. |
| Lighting | `DOOR_LIGHT_APERTURE.range`, `.intensity`, `.falloffPower`, `.spreadRadians` in `game.js` | Slider + value | Light spilling through open/destroyed doors. |
| Lighting/perf | `STATIC_LIGHT_RENDER_SCALE`, `DYNAMIC_LIGHT_RENDER_SCALE` in `lighting.js` | Numeric/reload-only | Render quality/performance tradeoff; likely reload-only. |
| Player | `PLAYER_SNEAK_SPEED`, `PLAYER_WALK_SPEED`, `PLAYER_SPRINT_SPEED` in `player.js` | Slider + value | Movement speed tuning. |
| Player | `PLAYER_SNEAK_NOISE_SCALE`, `PLAYER_WALK_NOISE_SCALE`, `PLAYER_SPRINT_NOISE_SCALE` in `player.js` | Slider | Noise emitted by movement mode. |
| Player | `WALK_MODE_STICK_THRESHOLD` in `player.js` | Slider | Analog stick threshold between sneak/walk. |
| Player | `PLAYER_MAX_HEALTH`, `PLAYER_PROJECTILE_DAMAGE`, `PLAYER_RADIUS` in `player.js` | Slider + value | Health, shot damage, collision size. |
| Player vision/aim | `VISION_ANGLE`, `HARD_AIM_VISION_MULTIPLIER` in `player.js` | Slider + value | Player cone and hard-aim cone narrowing. |
| Player aim assist | `HARD_AIM_MAGNET_ENABLED`, `HARD_AIM_MAGNET_ANGLE`, `HARD_AIM_MAGNET_RANGE`, `HARD_AIM_MAGNET_STRENGTH`, `HARD_AIM_MAGNET_RELEASE_FRAMES` in `player.js` | Toggle + sliders | Hard-aim target magnet tuning. |
| Player light | `PLAYER_GLOW_RADIUS`, `PLAYER_PROXIMITY_RADIUS` in `player.js` | Slider + value | Player glow and proximity-related radius. |
| Enemy | `ALERT_FRAMES`, `SUSPICION_TIMEOUT`, `REACTION_DELAY`, `SUSPICION_CONFIRM_DELAY`, `CAUTIOUS_FRAMES` in `enemy.js` | Slider + value | Enemy state timing and reaction windows. |
| Enemy | `ENEMY_RADIUS`, `ENEMY_HIT_RADIUS`, `ENEMY_PLAYER_VISIBILITY_SAMPLE_RADIUS` in `enemy.js` | Slider + value | Collision, hit, and player-body sight sampling. |
| Enemy | `STANDARD_VISION`, per-enemy `visionAngle`, `sightRange`, `proximityRadius` in `enemy.js` | Slider + value | Enemy sight cone and awareness bubble; sight range may need an Infinity option. |
| Enemy movement | `ARRIVAL_RADIUS`, `ENEMY_DOORWAY_ARRIVAL_RADIUS`, `ENEMY_DOORWAY_OPEN_RADIUS`, per-enemy `patrolSpeed` in `enemy.js` | Slider + value | Patrol/path arrival and doorway movement tuning. |
| Enemy combat | `ENEMY_MAX_HEALTH`, `ENEMY_PROJECTILE_DAMAGE`, `ENEMY_MELEE_DAMAGE`, `ENEMY_MELEE_RANGE`, `ENEMY_MELEE_COOLDOWN_FRAMES` in `enemy.js` | Slider + value | Enemy durability and damage output. |
| Enemy shooting | Per-enemy `shootingRange`, `shootingRangeTolerance`, `shotCooldownFrames`, `shotSpeed`, `aimSpreadRadians` in `enemy.js` | Slider + value | Shooter archetype tuning. |
| Enemy feedback | `PLAYER_HIT_FLASH_FRAMES`, `ENEMY_HIT_FLASH_FRAMES`, `SEARCH_SWEEP_RATE` in `enemy.js` | Slider + value | Hit feedback and search sweep pacing. |
| Doors | Door `hp`, `maxHp`, `soundTransmission` in `game.js` | Slider + value | Per-door durability and sound transmission. |
| Doors | `DOOR_DAMAGE`, `DOOR_INTERACT_RADIUS`, `DOOR_OPEN_ANGLE` in `game.js` | Slider + value | Door damage, interaction reach, open visual angle. |
| Mission | `INTERACT_RADIUS`, `EXFIL_RADIUS`, `CORPSE_INTERACT_RADIUS` in `game.js` | Slider + value | Interaction and exfil usability tuning. |
| Camera/perf | `CAM_SOFT_LOOKAHEAD_DIST`, `CAM_HARDAIM_DIST`, `CAM_CORNER_PADDING`, `CAM_HARDAIM_OCCLUSION_PADDING`, `CAM_EASE`, `CAM_LOOKAHEAD_EASE` in `game.js` | Slider + value | Camera feel tuning. |
| Fog/perf | `FOG_RENDER_SCALE` in `game.js` | Numeric/reload-only | Fog quality/performance tradeoff; likely reload-only. |
| Input | `INPUT_DEADZONE` in `input.js` | Slider | Controller stick deadzone. |

Debug overlay group inventory:

| Overlay | Current source | Master toggle behavior |
|---------|----------------|------------------------|
| Enemy sight cones and proximity rings | `drawEnemySightCone()` in `enemy.js` | Hidden when debug overlays are off. |
| Enemy index labels | `drawEnemyLabels()` in `enemy.js` | Hidden when debug overlays are off. |
| Sound source rings | `SHOW_SOUND_SOURCE_DEBUG` / `drawSoundEvents()` in `sound.js` | Hidden when debug overlays are off. |
| Sound attenuation paths and labels | `SHOW_SOUND_ATTENUATION_DEBUG`, `SHOW_SOUND_ALL_PATH_DEBUG` / `drawSoundEvents()` in `sound.js` | Hidden when debug overlays are off. |
| Performance overlay | `SHOW_PERF_OVERLAY` / `drawPerfOverlay()` in `game.js` | Hidden when debug overlays are off. |
| Schematic map overlay | `hasMapKnowledge` / `drawMapGeometry()` in `game.js` | Hidden when debug overlays are off unless map knowledge has become a real player-earned mechanic. |
| Secondary exfil testing marker | Testing branch in `drawExfilPoints()` in `game.js` | Hidden when debug overlays are off. |
| Door HP bars | `drawDoorHealthBars()` in `game.js` | Hidden when debug overlays are off unless redesigned as player-facing damage feedback. |

Implementation note: do not try to make every value editable on day one. Start by routing the panel through a central tuning/debug object, then expose the highest-value controls first: the master debug overlay toggle, individual overlay toggles, sound transmission, wall transmission, lamp strength, enemy sight thresholds, door HP, and player/enemy movement noise.

### 2. Mission Data Separation

Next feature planning doc: `Operation guide/Feature planning/feature_13_mission_data_separation.md`.

Move hardcoded mission data toward authored mission definitions:

- Walls and room centers.
- Doors and door aperture links.
- Lamps, ambient zones, and window apertures.
- Enemy spawn points, archetypes, patrol routes, and nav graph nodes.
- Pickup/exfil placement rules.
- Sound portal graph data.

The goal is not a full editor yet. A simple mission data file or structured mission object is enough.

### 3. Second Test Map

Create one additional small mission layout to validate that systems are not overfit to the current facility.

The second map should intentionally test:

- More than one closed-door sound cone scenario.
- At least one useful wall-vague sound cue.
- A room with enough darkness/obstacles for hiding.
- One alternate exfil or side exit.
- Doorway pathing in at least two orientations.
- A patrol route that crosses multiple rooms.

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
| P0 | Collapsible tuning/debug UI | Speeds up balancing and makes prototype overlays intentional before deeper content work. |
| P0 | Mission data extraction | Required before more maps or repeatable tuning. |
| P0 | Second test map | Validates systems outside the original hardcoded layout. |
| P1 | Result screen | Gives missions closure and prepares for metagame consequence. |
| P1 | Door visual/destruction polish | Doors are now central to stealth, sound, light, and combat. |
| P1 | Body discovery decision/prototype | Determines how lethal play changes mission risk. |
| P2 | Enemy coordination/corpse reaction | Builds on body discovery if selected. |
| P2 | Basic gear/tool placeholder | Prepares for future daytime equipment without full inventory. |

## Success Criteria

Milestone 2 is complete when:

- A collapsible tuning/debug panel exists, defaults to the current Milestone 1 behavior, and exposes the highest-value sound, light, door, enemy, player, map, and overlay controls.
- Debug overlays are grouped under one master toggle, and turning that toggle off makes the game view match the actual player-facing screen.
- At least two authored mission layouts run through the same systems.
- Mission geometry, doors, lighting, enemies, and sound portal data are no longer trapped entirely in one hardcoded block.
- The player can complete a mission and see a basic result summary instead of immediate reset.
- The team has decided whether body discovery is part of the next playable slice.
- The remaining path toward daytime/metagame systems is clearer than it was at the end of Milestone 1.

## Open Questions For Milestone 2

| Question | Notes |
|----------|-------|
| Which controls should be runtime-editable first? | Highest value likely: debug overlays, sound attenuation, light thresholds, door HP, enemy sight, and movement/noise. |
| Should tuning values persist across reloads? | Local storage may be enough for playtesting; authored defaults should remain in source. |
| Should mission data live in plain JS, JSON, or a future editor format? | Plain JS is fastest; JSON is cleaner for tools. |
| Is the second map hand-authored or assembled from reusable room modules? | Hand-authored is likely enough for Milestone 2. |
| Do we keep `hasMapKnowledge` hardcoded on? | Milestone 2 may need a toggle to test known vs unknown layouts. |
| Should body discovery be implemented before mission result scoring? | It affects stealth grading and consequences. |
| What is the minimum useful gear placeholder? | A single tool like lockpick/flashlight may be enough. |
| Should debug overlays be hidden by default? | Likely yes once result flow and tuning controls exist. |
