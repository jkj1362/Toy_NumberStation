# Session Handoff - 2026-06-22 - Doors Complete For Prototype Pass

Read this file at the start of a new chat session to resume work on the Number Stations prototype with full context.

---

## 1. Project Identity

Number Stations is a top-down Cold War stealth prototype validating the night mission loop: infiltrate, avoid or neutralize enemies, take the objective, and exfiltrate. The FDD is `Operation guide/Feature planning/[FDD]Number_Stations.md`; active scope is `Operation guide/Feature planning/prototype_scope.md`; operation rules are in `Operation guide/AGENT.md`; current live feature state is in `Live features/`. **Feature 09 - Door System is complete for the current prototype pass.** The next session should choose the next prototype feature/polish item from the live/planning docs rather than continuing door implementation by default.

---

## 2. File Structure

```text
Toy_NumberStation/
|-- index.html
|-- game.js                         (963 lines)
|-- lighting.js                     (651 lines)
|-- enemy.js                        (946 lines)
|-- player.js                       (214 lines)
|-- Open Game.bat
|-- Live features/
|   |-- feature_00_pawn_movement_vision.md
|   |-- feature_01_walls_geometry.md
|   |-- feature_02_lighting.md
|   |-- feature_03_objective_exfil.md
|   |-- feature_04_enemy_sight.md
|   |-- feature_05_enemy_sound.md
|   |-- feature_06_enemy_patrol.md
|   |-- feature_07_enemy_ai_state_machine.md
|   |-- feature_08_walk_run_noise.md
|   |-- feature_09_doors.md
|   |-- feature_10_follow_camera_hardaim.md
|   |-- feature_##_Metagame(TBD).md
|-- Operation guide/
|   |-- AGENT.md
|   |-- session handoff format.md
|   |-- Feature planning/
|   |   |-- [FDD]Number_Stations.md
|   |   |-- prototype_scope.md
|   |   |-- feature_00_pawn_movement_vision.md
|   |   |-- feature_01_walls_geometry.md
|   |   |-- feature_02_lighting.md
|   |   |-- feature_03_objective_exfil.md
|   |   |-- feature_04_enemy_sight.md
|   |   |-- feature_05_enemy_sound.md
|   |   |-- feature_06_enemy_patrol.md
|   |   |-- feature_07_enemy_ai_state_machine.md
|   |   |-- feature_08_walk_run_noise.md
|   |   |-- feature_09_doors.md
|   |   |-- feature_10_follow_camera_hardaim.md
|   |   |-- feature_##_Metagame(TBD).md
|   |-- Session handoffs/
|   |   |-- Handoff_2026-05-12_walls-complete.md
|   |   |-- Handoff_2026-05-15_objective-exfil-complete.md
|   |   |-- Handoff_2026-05-21_enemy-patrol-complete.md
|   |   |-- Handoff_2026-06-05_enemy-navigation-debugging.md
|   |   |-- Handoff_2026-06-09_player-refactor.md
|   |   |-- Handoff_2026-06-19_doors-next.md
|   |   |-- Handoff_2026-06-22_doors-first-pass.md
```

Current working tree at handoff time:

```text
M  Operation guide/AGENT.md
M  Operation guide/Feature planning/feature_09_doors.md
M  Operation guide/Feature planning/prototype_scope.md
M  Live features/feature_09_doors.md
M  enemy.js
M  game.js
M  lighting.js
?? Operation guide/Session handoffs/Handoff_2026-06-22_doors-first-pass.md
```

Note: `Operation guide/AGENT.md` and `Operation guide/session handoff format.md` now document the new docs organization:
`Operation guide/Feature planning/`, `Live features/`, and `Operation guide/Session handoffs/`.

---

## 3. Key Systems

| File | Key identifiers | Notes |
|------|-----------------|-------|
| `game.js` | `DOOR_SPECS`, `DOORS`, `getClosedDoorRects()`, `getMovementBlockers()`, `getRayBlockerRects()`, `getRayBlockerPolygons()` | Doors are mission-authored dynamic geometry. Closed doors block movement/rays; open rotated panels block rays only. |
| `game.js` | `DOOR_OPEN_ANGLE`, `markGeometryDirty()`, `rebuildRayGeometryIfNeeded()`, `WALL_SEGMENTS`, `WALL_CORNERS` | Ray geometry is mutable and rebuilt from walls, closed doors, and open door panels. `castVisRay()` and `computeVisibilityPolygon()` call the rebuild. |
| `game.js` | `toggleNearbyDoor()`, `isDoorBlockedByEnemy()`, `openDoorNearEntity()`, `hitDoorAt()`, `damageDoor()`, `drawDoors()` | Player `E` / gamepad face-left toggles nearby intact doors unless an enemy occupies the doorway/panel space. Bullets damage closed doors; destroyed doors stay passable. |
| `lighting.js` | `markStaticLightingDirty()`, `setLightingAperturesOpen()`, `rebuildLightingVisibilityPolygons()` | Door state dirties static lighting and opens/closes linked door apertures. Lighting polygons refresh before static cache rebuilds. |
| `lighting.js` | `staticLightValueCanvas`, `staticLightSourceCanvas`, `renderStaticLightCanvas()` | Static lighting was optimized from JS per-pixel lamp queries to canvas render-target composition. User observed static rebuild drop from about `3014 ms` to about `12.3 ms`. |
| `enemy.js` | `_pointHitsExpandedWall()`, `followNavPath()`, `moveTowardPlayer()`, patrol movement, `updateEnemyProjectiles()` | Enemies use dynamic blockers and auto-open nearby closed doors when routes reach them. Enemy projectiles can damage closed doors. |
| `player.js` | `updatePlayer(gp, activeProjectiles, { hardAim })` | Hard-aim still forces sneak speed. Keyboard sprint is still not implemented; sprint is gamepad-only. |

Critical distinctions:

- `isLit()` includes player glow; `isLitByLamps()` excludes player glow and is used by enemy detection.
- Sound attenuation remains TBD. Door opening/destruction emits sound events, but walls/doors do not attenuate sound propagation yet.
- Soundwave rings, enemy cones, labels, and reaction rings are debug/readability visuals and intentionally remain visible.
- Static lighting now uses render-target-style max/lighten composition. Do not return to additive overlap lighting.
- The perf overlay is intentionally still visible for now: FPS/update/draw/enemies/lighting/fog/static-light timing.

---

## 4. Facility Layout

Coordinates below are old 1100x750 authored coordinates. Runtime code scales them to the 3200x1800 game world.

```text
+------------------------------------------------------+
| Room A             | Corridor / Room B / Room C       |
|                    |                                  |
|   west window      |                       east window |
|        gap ---- Room A east gap ---- B/C gap          |
+--------------------+-------------------+--------------+
| Lobby / entry / lower rooms with two corridor gaps    |
|                                                      |
|                  Entry / primary exfil               |
+------------------------------------------------------+
```

Current passage / door references:

| Passage | Center point | Connects |
|---------|--------------|----------|
| Entry gap | `(500, 741)` | Outside / Lobby, primary exfil |
| Corridor left door | `(270, 449)` | Lobby / upper rooms |
| Corridor right door | `(819, 449)` | Lobby / Room F / right corridor |
| Room A east door | `(409, 295)` | Room A / Corridor |
| Room B/C divider door | `(769, 210)` | Room B / Room C |
| Room F west door | `(909, 590)` | Lobby/Corridor / Room F |
| Left perimeter duct/window | `(9, 190)` | Room A bonus exfil / moonlight aperture |
| Right perimeter duct/window | `(1091, 190)` | Room BC bonus exfil / moonlight aperture |

---

## 5. Feature Build Order

| # | Feature | Status |
|---|---------|--------|
| 00 | Pawn movement and vision spec | Done |
| 01 | Walls and room geometry | Done |
| 02 | Lighting renovation | Done; optimized static cache on 2026-06-22 |
| 03 | Objective pickup and exfil | Done |
| 04 | Enemy sight detection | Done |
| 05 | Enemy sound detection | Done, radius-only sound model |
| 06 | Enemy movement and patrol | Done |
| 07 | Enemy AI state machine | Done |
| 08 | Walk/run movement and noise tradeoff | Done |
| 09 | Door System | Done for prototype pass; polish/deferred systems listed below |
| 10 | Follow Camera & Hard-Aim Scouting | Done |
| ## | Next feature / polish item | NEXT - choose from live/planning docs |

---

## 6. Next Work

Start by reading the current live docs in `Live features/` and the planning docs in `Operation guide/Feature planning/`.
For doors specifically, use `Live features/feature_09_doors.md` as the current-state reference and
`Operation guide/Feature planning/feature_09_doors.md` as the deeper planning/history reference.

Door system implemented:

- Five mission doors were added in `game.js`:
  - `corridor_left_door`
  - `corridor_right_door`
  - `room_a_east_door`
  - `room_bc_divider_door`
  - `room_f_west_door`
- Closed doors are dynamic blockers for movement, raycasting, fog, lighting, LOS, and projectile collision.
- Player interaction toggles the nearest intact door.
- Closed doors have HP (`60`) and take bullet damage (`20`) until destroyed.
- Destroyed doors become permanently passable and permanently light-transmitting.
- Door apertures were added as weak spill helpers and are toggled by door state.
- Enemies use dynamic blockers and can auto-open nearby closed doors.
- Open doors keep a fixed rectangular panel shape rotated 75 degrees; the visible open panel also blocks rays.
- Door interaction is blocked if an enemy occupies the doorway or open-panel space.
- Static lighting cache rebuild was optimized from about `3014 ms` to about `12.3 ms` in the user's screenshot.

Door work that is deferred, not blocking:

1. Sound attenuation through walls/doors is still TBD.
2. Door animation is instant; no animated swing yet.
3. No locked, keyed, half-open, peek, or tactical enemy door behavior.
4. Door aperture intensity/range can be tuned later if future layout changes make spill too bright/subtle.
5. Perf overlay remains visible via `SHOW_PERF_OVERLAY = true`; decide whether to keep, hide, or gate it before a cleaner presentation pass.
6. Retest the "slow motion" concern in the user's office environment. Current overlay showed 60 FPS and low per-frame costs; remaining slow feel may be local environment, input/tuning, keyboard sprint absence, or hard-aim/sneak behavior.

Do not start sound attenuation yet unless the user explicitly redirects. Sound attenuation through walls/doors remains TBD.

---

## 7. Gap / Navigation Coordinates

| Use | Coordinate / span | Notes |
|-----|-------------------|-------|
| Corridor left door | `x 220..320`, around `y 440` | Horizontal threshold near `(270, 449)` |
| Corridor right door | `x 778..860`, around `y 440` | Horizontal threshold near `(819, 449)` |
| Room A east door | `x 400`, `y 250..340` | Vertical door near `(409, 295)` |
| Room B/C divider door | `x 760`, `y 160..260` | Vertical door near `(769, 210)` |
| Room F west door | `x 900`, `y 540..640` | Vertical door near `(909, 590)` |

Current enemy layout from `INITIAL_ENEMIES`:

| # | Role |
|---|------|
| 1 | Static upper-room melee sentry at `(580, 100)`, faces south |
| 2 | Short center/lobby melee patrol between `(420, 590)` and `(580, 590)` |
| 3 | Shooter cross-room patrol: Room A -> Room A door -> corridor -> B/C door -> Room BC -> return |

Enemy 3 crosses two implemented doors and currently auto-opens them when close enough. This is acceptable for the current prototype pass.

---

## 8. Coding Conventions

- Source load order is `player.js`, `lighting.js`, `enemy.js`, `game.js`.
- Use `apply_patch` for manual code edits.
- Do not revert user changes or unrelated dirty worktree changes.
- Keep changes surgical and feature-focused.
- Use `rg` for search.
- For visual/gameplay/rendering changes, run or open the game and do screenshot/manual QA when practical.
- `angle = 0` faces up. Movement vectors often use `dx = Math.sin(angle)`, `dy = -Math.cos(angle)`.
- Use the current scale helpers when converting authored coordinates: `scaleGameX/Y/Unit`, `scalePlayerX/Y/Unit`, `scaleEnemyX/Y/Unit`.
- World is `3200x1800`; visible canvas is `1920x1080`.
- `pushOutOfWalls()` is commonly called twice to resolve collision.
- Enemy sight should use `isLitByLamps()`, not `isLit()`.
- Existing debug visuals are intentional for now.
- Refresh or reopen the game after code changes so the user can inspect the current behavior.

---

## 9. Verification Performed

- `node --check game.js` passed.
- `node --check lighting.js` passed.
- `node --check enemy.js` passed.
- `node --check player.js` passed.
- `git diff --check` reported only CRLF normalization warnings.
- `Open Game.bat` was launched after implementation so the user could inspect the updated browser game.
- User manually reported the door behavior "works well for now" after the open-panel ray blocker and fixed-shape 75-degree door visual changes.

---

## 10. Known Caveats / Follow-Up

- Door visual placement and open-panel ray blocking are accepted for now.
- Door aperture spill is a first-pass weak helper; tune later only if needed.
- Sound attenuation remains TBD. Door sounds emit radius events but do not model wall/door attenuation.
- Perf overlay remains visible intentionally. Remove or gate it after QA.
- Static lighting is now fast enough for first-pass door invalidation, but dirty-region rebuilds may be useful later if the map grows.
- Keyboard sprint is still not implemented; hard-aim via `Shift` forces sneak speed and may contribute to perceived slow motion.
