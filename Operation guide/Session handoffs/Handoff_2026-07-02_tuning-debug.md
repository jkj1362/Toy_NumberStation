# Session Handoff - 2026-07-02 - Tuning and Debug Controls

Read this file at the start of a new chat session to resume work on the Number Stations prototype with full context.

---

## 1. Project Identity

Number Stations is a top-down Cold War stealth prototype. The current playable build validates the night mission loop: infiltrate a facility, read light and sound, avoid or fight enemies, take an objective, and exfiltrate alive. The FDD lives at `Operation guide/Feature planning/[FDD]Number_Stations.md`; the active scope docs are `Operation guide/Feature planning/prototype_scope.md` for Milestone 1 wrap-up and `Operation guide/Feature planning/prototype_scope_milestone_02.md` for Milestone 2. Live feature docs plus the current codebase are authoritative. Next feature: **Feature 13 - Mission Data Separation** in `Operation guide/Feature planning/feature_13_mission_data_separation.md`.

WARNING: The worktree is intentionally dirty at this handoff. Do not revert the uncommitted prototype changes unless the user explicitly asks.

---

## 2. Current File Structure

```text
Toy_NumberStation/
|-- index.html                         (37 lines)
|-- tuning.js                          (553 lines)
|-- input.js                           (269 lines)
|-- player.js                          (308 lines)
|-- lighting.js                        (716 lines)
|-- enemy.js                           (1137 lines)
|-- sound.js                           (754 lines)
|-- game.js                            (1385 lines)
|-- Open Game.bat
|-- Live features/
|   |-- feature_##_Metagame(TBD).md    (18 lines)
|   |-- feature_00_pawn_movement_vision.md (35 lines)
|   |-- feature_01_walls_geometry.md   (24 lines)
|   |-- feature_02_lighting.md         (29 lines)
|   |-- feature_03_objective_exfil.md  (26 lines)
|   |-- feature_04_enemy_sight.md      (30 lines)
|   |-- feature_05_enemy_sound.md      (53 lines)
|   |-- feature_06_enemy_patrol.md     (30 lines)
|   |-- feature_07_enemy_ai_state_machine.md (30 lines)
|   |-- feature_08_walk_run_noise.md   (29 lines)
|   |-- feature_09_doors.md            (39 lines)
|   |-- feature_10_follow_camera_hardaim.md (37 lines)
|   |-- feature_11_health_damage.md    (35 lines)
|   |-- feature_12_tuning_debug_controls.md (46 lines)
|-- Operation guide/
|   |-- AGENT.md                       (122 lines)
|   |-- session handoff format.md      (148 lines)
|   |-- Feature planning/
|   |   |-- [FDD]Number_Stations.md    (454 lines)
|   |   |-- prototype_scope.md         (117 lines)
|   |   |-- prototype_scope_milestone_02.md (224 lines)
|   |   |-- feature_00_pawn_movement_vision.md (160 lines)
|   |   |-- feature_01_walls_geometry.md (121 lines)
|   |   |-- feature_02_lighting.md     (367 lines)
|   |   |-- feature_03_objective_exfil.md (252 lines)
|   |   |-- feature_04_enemy_sight.md  (236 lines)
|   |   |-- feature_05_enemy_sound.md  (373 lines)
|   |   |-- feature_06_enemy_patrol.md (206 lines)
|   |   |-- feature_07_enemy_ai_state_machine.md (364 lines)
|   |   |-- feature_08_walk_run_noise.md (79 lines)
|   |   |-- feature_09_doors.md        (352 lines)
|   |   |-- feature_10_follow_camera_hardaim.md (247 lines)
|   |   |-- feature_11_health_damage.md (106 lines)
|   |   |-- feature_12_tuning_debug_controls.md (69 lines)
|   |   |-- feature_13_mission_data_separation.md (79 lines)
|   |   |-- feature_##_Metagame(TBD).md (97 lines)
|   |-- Session handoffs/
|   |   |-- Handoff_2026-05-12_walls-complete.md
|   |   |-- Handoff_2026-05-15_objective-exfil-complete.md
|   |   |-- Handoff_2026-05-21_enemy-patrol-complete.md
|   |   |-- Handoff_2026-06-05_enemy-navigation-debugging.md
|   |   |-- Handoff_2026-06-09_player-refactor.md
|   |   |-- Handoff_2026-06-19_doors-next.md
|   |   |-- Handoff_2026-06-22_doors-first-pass.md
|   |   |-- Handoff_2026-06-25_health-aim-complete.md
|   |   |-- Handoff_2026-06-30_milestone1-wrapup.md
|   |   |-- Handoff_2026-07-02_tuning-debug.md
```

---

## 3. Key Systems

| File | System | Key identifiers and notes |
|------|--------|---------------------------|
| `index.html` | Load order | Scripts load as `tuning.js`, `input.js`, `player.js`, `lighting.js`, `enemy.js`, `sound.js`, `game.js`. Keep `tuning.js` first so runtime getters exist before other files use them. |
| `tuning.js` | Runtime panel | `TUNING_DEFAULTS`, `TUNING_SECTIONS`, `tuningState`, `getTuningNumber()`, `getTuningBoolean()`, `getTuningRadians()`, `isDebugOverlayEnabled()`, `setTuningValue()`, `initTuningWhenReady()`. Panel is collapsed by default and opens from the right-side `Tune` button. |
| `input.js` | Input normalization | `isTuningUiEvent()` prevents pointer/mouse input from the panel from reaching player aim/fire/interact handling. Gamepad deadzone reads from tuning. |
| `player.js` | Player movement, vision, combat | Movement speeds/noise, health, projectile damage, radius, vision angle, hard-aim multiplier, hard-aim magnet, glow radius, and proximity radius now read runtime tuning. Default proximity reveal is `35` design units. |
| `lighting.js` | Light simulation | Ambient, light thresholds, room lamp values, door aperture values, static/dynamic light behavior, and `applyLightingTuning()` use tuning getters. Preserve `isLit` versus `isLitByLamps`: enemies care about player visibility under lighting, while lamp-specific logic has separate checks. |
| `enemy.js` | Enemy AI, patrol, sight, combat | `INITIAL_ENEMIES`, `resetEnemies()`, `applyEnemyTuning()`, `applyEnemyTuningToAll()`, `drawEnemySightCone()`, `drawEnemyLabels()`. Current authored enemies: static upper-room sentry, short lobby patrol, and shooter crossing Room A/corridor/Room BC. |
| `sound.js` | Sound propagation and cues | `SOUND_ROOM_SPECS`, `SOUND_PORTAL_SPECS`, `evaluateDirectSoundPath()`, `evaluatePortalSoundPath()`, `evaluateSoundPath()`, `soundDoorDetourRatio()`, `drawPlayerDoorConeCue()`, `showSoundSourceDebug()`, `showSoundAttenuationDebug()`, `showSoundAllPathDebug()`. Door muffled cues are partial arcs generated at the door, perpendicular to the door and on the side opposite the sound source. |
| `game.js` | World, doors, camera, fog, overlays | `WALLS`, `DOOR_SPECS`, `DOORS`, `ROOMS`, `WALL_GAP_EXITS`, `applyDoorTuning()`, `showPerfOverlay()`, `showMapOverlay()`, `showDoorHpBars()`, `showSecondaryExfilDebug()`, `drawFog()`. Debug overlay master toggle must hide prototype-only information while leaving player-facing feedback visible. |

Current dirty worktree at handoff:

```text
 M Live features/feature_00_pawn_movement_vision.md
 M Live features/feature_05_enemy_sound.md
 M Live features/feature_10_follow_camera_hardaim.md
 M Operation guide/Feature planning/prototype_scope_milestone_02.md
 M enemy.js
 M game.js
 M index.html
 M input.js
 M lighting.js
 M player.js
 M sound.js
?? Live features/feature_12_tuning_debug_controls.md
?? Operation guide/Feature planning/feature_12_tuning_debug_controls.md
?? Operation guide/Feature planning/feature_13_mission_data_separation.md
?? Operation guide/Session handoffs/Handoff_2026-07-02_tuning-debug.md
?? tuning.js
```

---

## 4. Facility Layout

The layout is still the original hardcoded facility. Design-space coordinates are scaled to the live `3200 x 1800` world.

```text
             Top perimeter wall
  +---------------------------------------------------+
  | Room A              | Corridor       | Room B/C    |
  | left exit gap       |                | right exit  |
  |                     |                | gap         |
  |          door 409,295|                |door 769,210 |
  +---------------------+                +-------------+
  |                                      |             |
  |                                      |             |
  | Lobby / lower entry                  | Room F      |
  | doors to corridor at 270,449 and 819,449           |
  |                                      |door 909,590 |
  |                                      |             |
  |          entry/exfil gap at bottom x 430-570        |
  +---------------------------------------------------+
```

Gap and portal coordinate table:

| Purpose | Id | Design-space coordinate |
|---------|----|-------------------------|
| Lobby to corridor left door | `corridor_left_door` | `(270, 449)` |
| Lobby to corridor right door | `corridor_right_door` | `(819, 449)` |
| Room A to corridor door | `room_a_east_door` | `(409, 295)` |
| Corridor to Room B/C divider door | `room_bc_divider_door` | `(769, 210)` |
| Lobby to Room F door | `room_f_west_door` | `(909, 590)` |
| Room A exterior wall gap | `room_a` wall gap exit | `(9, 190)` |
| Room B/C exterior wall gap | `room_bc` wall gap exit | `(1091, 190)` |
| Bottom entry/exfil opening | entry gap | `x 430-570`, bottom wall |

---

## 5. Feature Build Order

| Feature | Status | Notes |
|---------|--------|-------|
| Feature 00 - Pawn Movement and Vision | Done | Updated live doc for tuning UI input guard and default proximity radius `35`. |
| Feature 01 - Walls and Geometry | Done | Hardcoded facility still active. |
| Feature 02 - Lighting | Done | Runtime tunables now drive light thresholds, lamps, and door apertures. |
| Feature 03 - Objective and Exfil | Done | Current objective/exfil data is still hardcoded. |
| Feature 04 - Enemy Sight | Done | Debug sight cones are controlled by tuning/debug panel. |
| Feature 05 - Enemy Sound | Done | Door detour ratio and final door partial-arc cue behavior documented. |
| Feature 06 - Enemy Patrol | Done | Patrol data remains in `INITIAL_ENEMIES`. |
| Feature 07 - Enemy AI State Machine | Done | Runtime timing/reaction tunables added. |
| Feature 08 - Walk/Run Noise | Done | Movement noise values are tunable. |
| Feature 09 - Doors | Done | Door HP/transmission/interact/open-angle values are tunable. |
| Feature 10 - Follow Camera and Hard-Aim Scouting | Done | Camera and hard-aim values are tunable. |
| Feature 11 - Health and Damage | Done | Player/enemy health and damage values are tunable. |
| Feature 12 - Tuning and Debug Controls | Done | First pass implemented and documented. |
| Feature 13 - Mission Data Separation | NEXT | Extract current hardcoded mission data into an authored mission definition. |
| Metagame TBD | Pending | Still out of scope for current prototype pass. |

---

## 6. Next Feature Spec

Next work is **Feature 13 - Mission Data Separation**. Do not rebuild the tuning panel first; it already exists as Feature 12.

Already implemented:

- Current playable mission with walls, doors, rooms, lighting, objective, exfil, enemies, sound portals, and debug/tuning controls.
- `tuning.js` owns runtime controls and should remain separate from mission authoring.
- Current sound door detour behavior uses `soundDoorDetourRatio`, default `1.5`.

Concrete next subtasks:

1. Create a mission definition, likely plain JS first, for the existing facility.
2. Move hardcoded mission content out of gameplay logic in small steps: walls, wall gaps, rooms, doors, lights, objective/exfil, enemies, enemy nav, and sound rooms/portals.
3. Add loader/normalization helpers so gameplay systems consume the same runtime shapes they use now.
4. Keep tuning defaults in `tuning.js`; only mission-specific authored values belong in the mission definition.
5. Preserve behavior before adding a second map.
6. Verify reset behavior, door state, enemy patrols, lighting, fog, sound routing, objective pickup, and exfil.

Suggested starting shape:

```javascript
const CURRENT_MISSION = {
  id: 'facility_night_01',
  world: { width: 3200, height: 1800 },
  geometry: { walls: [], wallGapExits: [] },
  rooms: [],
  lighting: { lamps: [], ambientZones: [], windowApertures: [], doorApertures: [] },
  doors: [],
  objective: { pickup: {}, exfilPoints: [] },
  enemies: [],
  enemyNav: { nodes: [], edges: [] },
  sound: { rooms: [], portals: [], attachBounds: [] },
};
```

Reference planning doc: `Operation guide/Feature planning/feature_13_mission_data_separation.md`.

---

## 7. Gap / Navigation Coordinates

Static room and portal reference in design-space coordinates:

| Id | Type | Coordinate / Notes |
|----|------|--------------------|
| `lobby` | room center | `(460, 590)`, starting space |
| `room_a` | room center | `(200, 229)` |
| `corridor` | room center | `(589, 229)` |
| `room_bc` | room center | `(930, 229)` |
| `room_f` | room center | `(930, 590)` |
| `corridor_left_door` | sound/door portal | `(270, 449)`, lobby to corridor |
| `corridor_right_door` | sound/door portal | `(819, 449)`, lobby to corridor |
| `room_a_east_door` | sound/door portal | `(409, 295)`, Room A to corridor |
| `room_bc_divider_door` | sound/door portal | `(769, 210)`, corridor to Room B/C |
| `room_f_west_door` | sound/door portal | `(909, 590)`, lobby to Room F |
| `room_a` wall gap | exterior exit | `(9, 190)` |
| `room_bc` wall gap | exterior exit | `(1091, 190)` |
| Entry gap | bottom perimeter | `x 430-570` |

Current enemy route anchors:

| Enemy | Role | Route |
|-------|------|-------|
| 1 | Static melee sentry | `(580, 100)`, upper-room sentry |
| 2 | Melee lobby patrol | `(420, 590)` to `(580, 590)` |
| 3 | Shooter cross-room patrol | `(200,229) -> (409,295) -> (589,229) -> (769,210) -> (930,229)` and return |

---

## 8. Coding Conventions

- Keep current script load order: `tuning.js`, `input.js`, `player.js`, `lighting.js`, `enemy.js`, `sound.js`, `game.js`.
- Use runtime tuning getters where a value is exposed; do not reintroduce parallel constants that bypass the panel.
- Debug overlays must remain grouped under `debugAll`. When `debugAll` is off, prototype-only visuals should disappear and the screen should match the player-facing view.
- Do not classify normal gameplay feedback as debug just because it is visual. Player-facing sound cues, mission prompts, discovered exfil feedback, and health/game-over UI can remain visible.
- Mouse/pointer input from the tuning panel must not reach player aim, shooting, movement, or interaction code.
- `angle = 0` means facing up for player/enemy gameplay orientation. Canvas arc math still uses standard radians where needed.
- `pushOutOfWalls()` is intentionally called more than once in movement resolution; do not simplify it without testing door/wall edge cases.
- Keep `isLit` and `isLitByLamps` separate; they answer different gameplay questions.
- Enemy patrol route values and sound/facility coordinate values are authored in design-space units and scaled at load/runtime.
- Closed-door sound cues should remain door-centered partial arcs perpendicular to the door on the side opposite the sound source, not full circles and not player-centered.
- The sound door detour rule should prefer a nearby muffled door only when the open/clear route is longer than direct distance times `soundDoorDetourRatio`.
- Top-level `const`/`let` values are not properties of `window` in VM-style smoke tests; expose only deliberate runtime APIs.
- Use `Live features/` plus current code as the source of truth. Handoffs are snapshots.
- Before ending future implementation sessions, run `node --check` on changed JS files, run `git diff --check`, and relaunch the game when behavior changed.

Verification already completed before this handoff:

```powershell
foreach ($f in @('tuning.js','input.js','player.js','lighting.js','enemy.js','sound.js','game.js')) { node --check $f }
git diff --check
Start-Process -FilePath "C:\Users\jkj1362\Desktop\Toys\Open Game.bat" -WorkingDirectory "C:\Users\jkj1362\Desktop\Toys" -WindowStyle Hidden
```

`git diff --check` reported only CRLF normalization warnings earlier in the session.
