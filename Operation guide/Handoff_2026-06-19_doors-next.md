# Session Handoff - 2026-06-19 - Lighting/Camera Docs Complete, Doors Next

Read this file at the start of a new chat session to resume work on the Number Stations prototype with full context.

---

## 1. Project Identity

Number Stations is a top-down Cold War stealth prototype. The current prototype validates the night mission loop: infiltrate, avoid or neutralize enemies, take the objective, and exfiltrate. The FDD is `design/[FDD]Number_Stations.md`; active scope is `design/prototype_scope.md`; operation rules are in `Operation guide/AGENT.md`. The next feature is exactly one item: **Feature 09 - Door System**. Start the next chat by reading `design/feature_09_doors.md` and implementing doors.

---

## 2. File Structure

```text
Toys/
|-- index.html
|-- game.js                         (603 lines)
|-- lighting.js                     (454 lines)
|-- enemy.js                        (936 lines)
|-- player.js                       (214 lines)
|-- Open Game.bat
|-- design/
|   |-- [FDD]Number_Stations.md
|   |-- prototype_scope.md
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
|   |-- Handoff_2026-05-12_walls-complete.md
|   |-- Handoff_2026-05-15_objective-exfil-complete.md
|   |-- Handoff_2026-05-21_enemy-patrol-complete.md
|   |-- Handoff_2026-06-05_enemy-navigation-debugging.md
|   |-- Handoff_2026-06-09_player-refactor.md
|   |-- Handoff_2026-06-19_doors-next.md
```

Current working tree note: there are uncommitted changes from the recent lighting/camera/doc work:

```text
M  design/feature_##_Metagame(TBD).md
M  design/feature_02_lighting.md
D  design/feature_09_follow_camera_hardaim.md
M  design/prototype_scope.md
M  game.js
M  lighting.js
?? design/feature_09_doors.md
?? design/feature_10_follow_camera_hardaim.md
?? Operation guide/Handoff_2026-06-19_doors-next.md
```

The delete/add pair is intentional: follow-camera/hard-aim was renumbered from Feature 09 to Feature 10.

---

## 3. Key Systems

| File | Key identifiers | Notes |
|------|-----------------|-------|
| `index.html` | Loads `player.js`, `lighting.js`, `enemy.js`, `game.js` | Load order matters. `lighting.js` and `enemy.js` depend on globals from `game.js` only at runtime after all scripts load. |
| `game.js` | `WALLS`, `WALL_SEGMENTS`, `WALL_CORNERS`, `MISSION_LIGHTING`, `pushOutOfWalls()`, `hitsWall()`, `castVisRay()`, `computeVisibilityPolygon()`, `drawFog()` | Door work must replace static-only wall reads with dynamic blockers where needed. `WALL_SEGMENTS` and `WALL_CORNERS` are currently built once from `WALLS`. |
| `game.js` | `GAME_WIDTH = 3200`, `GAME_HEIGHT = 1800`, `VIEWPORT_WIDTH = 1920`, `VIEWPORT_HEIGHT = 1080`, `camera`, `updateCamera()` | World is larger than the visible canvas. Camera is implemented. |
| `lighting.js` | `initLighting()`, `resetLighting()`, `getLightLevel()`, `getStaticLightLevel()`, `isLit()`, `isLitByLamps()`, `hitLampAt()`, `drawLighting()`, `drawLamps()` | Lighting is geometry-blocked, max-composed, and cached in a low-res static darkness map. Door state must invalidate the static lighting cache. |
| `lighting.js` | `lightingLamps`, `lightingZones`, `lightingApertures`, `STATIC_LIGHT_RENDER_SCALE = 4` | Current apertures are exterior window moonlight only. Door apertures are documented but not implemented. |
| `player.js` | `updatePlayer(gp, activeProjectiles, { hardAim })`, `PLAYER_SNEAK_SPEED`, `PLAYER_WALK_SPEED`, `PLAYER_SPRINT_SPEED`, `player.noiseScale` | Hard-aim forces sneak movement/noise. Projectile firing calls `emitSound()`. |
| `enemy.js` | `INITIAL_ENEMIES`, `NAV_NODES`, `NAV_EDGES`, `buildPath()`, `notifyPlayerMoved()`, `emitSound()`, `hasLOS()`, `enemyCanSeeCone()` | Enemy pathing and LOS still use static walls. Sound is radius-only. |

Critical distinctions:

- `isLit()` includes player glow; `isLitByLamps()` excludes player glow and is used for enemy sight gating.
- Soundwave visuals are intentional debug/readability UI and currently draw through walls.
- Enemy cones, labels, sound rings, and reaction rings are intentionally visible during prototype testing. Do not hide them unless the user explicitly asks.
- Lighting now uses max-composition. Do not return to additive/layered light cutouts; that caused artificial overlap hotspots.

---

## 4. Facility Layout

Coordinates below are old 1100x750 authored coordinates. Runtime code scales them to the 3200x1800 game world.

Approximate structure:

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

Current passage references:

| Passage | Center point | Connects |
|---------|--------------|----------|
| Entry gap | `(500, 741)` | Outside / Lobby, primary exfil |
| Corridor left gap | `(270, 449)` | Lobby / upper rooms |
| Corridor right gap | `(819, 449)` | Lobby / Room F area |
| Room A east wall gap | `(409, 295)` | Room A / Corridor |
| Room B/C divider gap | `(769, 210)` | Room B / Room C |
| Room F west wall gap | `(909, 590)` | Lobby/Corridor / Room F |
| Left perimeter duct/window | `(9, 190)` | Room A bonus exfil / moonlight aperture |
| Right perimeter duct/window | `(1091, 190)` | Room BC bonus exfil / moonlight aperture |

---

## 5. Feature Build Order

| # | Feature | Status |
|---|---------|--------|
| 00 | Pawn movement and vision spec | Done |
| 01 | Walls and room geometry | Done |
| 02 | Lighting renovation | Done, with window apertures and max-composed cached renderer |
| 03 | Objective pickup and exfil | Done |
| 04 | Enemy sight detection | Done |
| 05 | Enemy sound detection | Done, radius-only sound model |
| 06 | Enemy movement and patrol | Done |
| 07 | Enemy AI state machine | Done |
| 08 | Walk/run movement and noise tradeoff | Done |
| 09 | Door System | NEXT |
| 10 | Follow Camera & Hard-Aim Scouting | Done |
| ## | Metagame and daytime systems | Conceptual / deferred |

---

## 6. Next Feature Spec

Start with `design/feature_09_doors.md`.

What is already implemented:

- `game.js` has static `WALLS`, static `WALL_SEGMENTS`, static `WALL_CORNERS`, wall collision, raycasting, fog, projectile wall hits, and camera rendering.
- `lighting.js` has lamps, ambient zones, exterior window apertures, max-composed light sampling, and cached static lighting.
- `player.js` already has an interaction key pattern: `E` / gamepad face-left is used around pickup/exfil checks in `game.js`.
- `enemy.js` already has patrol/pathing and LOS, but it only understands static walls.
- Sound exists as radius-based enemy hearing plus visible rings. It is not wall-attenuated yet.

Door implementation sub-tasks:

1. Add mission door data and reset state in `game.js`.
2. Draw closed/open/destroyed doors in existing wall gaps.
3. Add `getClosedDoorRects()` and route movement collision through `getMovementBlockers()`.
4. Replace static-only ray blockers with a dynamic blocker rebuild, because `castVisRay()`, fog, enemy LOS, and lighting need door-aware geometry.
5. Add player interaction: closed -> open, open -> closed, destroyed -> no effect.
6. Add projectile-door hits: closed doors have HP and become destroyed at zero.
7. Connect door state to lighting: closed doors block rays and close linked apertures; open/destroyed doors remove blockers and enable aperture spill.
8. Mark lighting cache dirty when a door opens, closes, or is destroyed.
9. Add minimal enemy pathing behavior so enemies do not walk through closed doors unless they open them at a doorway node.
10. Screenshot-check closed, open, and destroyed states from both sides.
11. After doors are implemented, finish an aperture check: verify that light from a lit room
    actually leaks into a neighboring dark room through an open door/passage, and verify that
    closing the door blocks that leakage again.

Suggested data shape:

```javascript
{
  id: 'corridor_left_door',
  x: 220,
  y: 420,
  w: 100,
  h: 20,
  orientation: 'horizontal',
  state: 'closed',
  defaultState: 'closed',
  hp: 60,
  maxHp: 60,
  soundTransmission: 0.75,
  apertureId: 'corridor_left_door_aperture',
}
```

Suggested blocker API:

```javascript
function getClosedDoorRects() {}
function getMovementBlockers() {
  return WALLS.concat(getClosedDoorRects());
}
function getRayBlockerRects() {
  return WALLS.concat(getClosedDoorRects());
}
function markGeometryDirty() {}
function rebuildRayGeometryIfNeeded() {}
```

Important implementation constraint: do not make doors only visual. Door state must be shared by collision, lighting, LOS, pathing, projectiles, and later sound.

---

## 7. Gap / Navigation Coordinates

Use these authored coordinates for door placement and nav-door behavior:

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
| 3 | Shooter cross-room patrol: Room A -> Room A gap -> corridor -> B/C gap -> Room BC -> return |

WARNING: Enemy 3's route crosses the future Room A and B/C door locations. If those doors start closed, enemy pathing must either open them or the route must be adjusted for testing.

---

## 8. Coding Conventions

- Read `Operation guide/AGENT.md` before coding.
- One feature at a time. Update or read the design doc before implementation.
- Keep changes surgical. Do not refactor unrelated systems.
- Use `apply_patch` for manual file edits.
- Do not revert user changes or unrelated dirty worktree changes.
- Use `rg` for search.
- For visual/gameplay/rendering changes, run or open the game and do screenshot QA when practical.
- Source load order is `player.js`, `lighting.js`, `enemy.js`, `game.js`.
- Angle convention: `angle = 0` faces up. Movement vectors often use `dx = Math.sin(angle)`, `dy = -Math.cos(angle)`.
- Use the current scale helpers when converting authored coordinates: `scaleGameX/Y/Unit`, `scalePlayerX/Y/Unit`, `scaleEnemyX/Y/Unit`.
- World is `3200x1800`; visible canvas is `1920x1080`.
- `pushOutOfWalls()` is commonly called twice to resolve collision.
- Enemy sight should use `isLitByLamps()`, not `isLit()`.
- Existing debug visuals are intentional for now.

---

## 9. Known Caveats / Follow-Up

- Sound attenuation through walls is not implemented. `notifyPlayerMoved()` and `emitSound()` are radius-only. Doors should not solve this unless the user asks during Feature 09; likely defer wall/door acoustic attenuation to a later pass.
- Soundwave rings are visual readability aids and currently draw through walls and doors. Keep this unless explicitly changed.
- Door apertures are documented but not implemented. Current lighting only uses exterior window moonlight apertures.
- After door implementation, do not consider Feature 09 visually complete until aperture leakage
  has been checked in-game: lit room -> open door/passage -> neighboring dark room should show
  believable spill; closed door should block it.
- `WALL_SEGMENTS` and `WALL_CORNERS` are static. Door work must introduce dynamic blocker rebuilds.
- Lighting cache is static until lamps are shot or initialized; door state changes must mark it dirty.
- Player/enemy projectiles currently collide with walls, not dynamic doors.
- No player health/death system yet; enemy hits trigger red screen flash.

---

## 10. What Was Done In This Session

- Implemented/kept larger world and follow camera/hard-aim behavior from prior work:
  - World: `3200x1800`.
  - Canvas/viewport: `1920x1080`.
  - Normal camera has weaker forward bias.
  - Hard-aim pushes view forward and locks movement to sneak.
- Renovated lighting into `lighting.js`:
  - Geometry-blocked lamp visibility.
  - Distance falloff and max range.
  - Global ambient remains `0.0`.
  - Ambient/spill zones for authored readability only.
  - Exterior window moonlight apertures.
  - Max-composed static light sampling to avoid overlapping hotspot artifacts.
- Removed temporary fake directional door beams from lighting because they caused seams/artifacts before real doors existed.
- Updated docs:
  - `design/feature_02_lighting.md` now documents apertures, max-composition, and future door state.
  - `design/feature_09_doors.md` is the new door system implementation doc.
  - `design/feature_10_follow_camera_hardaim.md` is the renumbered camera/hard-aim doc.
  - `design/prototype_scope.md` marks Feature 09 as Doors and Feature 10 as Follow Camera/Hard-Aim.
  - `design/feature_##_Metagame(TBD).md` no longer claims Feature 09.
- Diagnosed sound:
  - Current game does not degrade sound through walls.
  - Door sound attenuation should be deferred unless the user explicitly asks; the immediate next work is door geometry/light behavior.

---

## 11. Verification Performed

- `node --check lighting.js game.js enemy.js player.js` passed during lighting work.
- Browser/screenshot QA was performed during lighting work; max-composed lighting fixed overlap hotspots and preserved debug cones.
- `git diff --check` after doc renumbering reported only CRLF normalization warnings.
- No code was changed after the sound attenuation diagnosis; only this handoff file was added.

---

## 12. Start Here In The Next Chat

1. Read `Operation guide/AGENT.md`.
2. Read `design/feature_09_doors.md`.
3. Inspect `game.js`, `lighting.js`, `enemy.js`, and `player.js` around the identifiers listed above.
4. Implement **Feature 09 - Door System** first. Do not start with sound attenuation unless the user explicitly redirects.
5. Remind the user after door implementation that aperture leakage must be checked and tuned:
   light should visibly pass from one room into a neighboring room through open doors/passages,
   then stop when the door is closed.
