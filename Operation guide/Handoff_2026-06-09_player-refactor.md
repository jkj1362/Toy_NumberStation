# Session Handoff - 2026-06-09 - Feature 08 Movement Modes and Player Refactor Complete

Read this file at the start of a new chat session to resume work on the Number Stations prototype with full context.

---

## 1. Project Identity

**Name:** Number Stations - Cold War stealth roguelike prototype.  
**Prototype goal:** Validate the night-phase mission loop: infiltrate a facility, avoid or neutralize guards, grab an objective, and exfil.  
**Full FDD:** `design/[FDD]Number_Stations.md`  
**Prototype scope:** `design/prototype_scope.md`  
**Immediate next implementation:** Feature 09 - Follow Camera & Hard-Aim Scouting (`design/feature_09_follow_camera_hardaim.md`)

Feature 08 - Movement Modes and Noise Tradeoff is now complete, and player-specific code has been extracted into `player.js`. Any upcoming player movement, aiming, firing input, player rendering, or hard-aim movement-lock work should start in `player.js`, not `game.js`.

---

## 2. File Structure

Current meaningful project files:

```
Toys/
|-- index.html                         # fixed 1920x1080 browser canvas; loads player.js, enemy.js, then game.js
|-- Open Game.bat                      # double-click launcher for non-IDE play
|-- player.js                          # player state, movement modes, aiming, firing input, player rendering; 204 lines
|-- enemy.js                           # enemy detection, sound, patrol, search, return, rendering; 934 lines
|-- game.js                            # world, mission, collision helpers, projectiles, lighting/fog, main loop; 629 lines
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
|   |-- feature_09_follow_camera_hardaim.md
|   `-- feature_##_Metagame(TBD).md
`-- Operation guide/
    |-- CLAUDE.md
    |-- session handoff format.md
    |-- Handoff_2026-05-12_walls-complete.md
    |-- Handoff_2026-05-15_objective-exfil-complete.md
    |-- Handoff_2026-05-21_F06-patrol-complete.md
    |-- Handoff_2026-06-05_enemy-navigation-suspicion-docs.md
    `-- Handoff_2026-06-09_F08-player-refactor.md
```

Load order is now important:

```html
<script src="player.js"></script>
<script src="enemy.js"></script>
<script src="game.js"></script>
```

`player.js` must load before `enemy.js` because `enemy.js` reads `player`, `PLAYER_RADIUS`, and `lerpAngle()` at runtime.

---

## 3. What Changed This Session

### Feature 08 Completed

`design/feature_08_walk_run_noise.md` is now marked `DONE`.

Implemented gamepad-focused movement/noise states:

| Mode | Control | Speed | Noise |
|------|---------|-------|-------|
| Sneak | Partial L-stick tilt | Slow, analog | Quiet, analog |
| Walk | Default / fuller L-stick tilt | Slower than original prototype speed | Baseline |
| Sprint | Tap face button A to toggle | Original prototype speed | Loud |

Current player movement tuning constants in `player.js`:

| Constant | Current value |
|----------|---------------|
| `PLAYER_SNEAK_SPEED` | `scalePlayerUnit(0.8)` |
| `PLAYER_WALK_SPEED` | `scalePlayerUnit(2.25)` |
| `PLAYER_SPRINT_SPEED` | `scalePlayerUnit(4)` |
| `PLAYER_SNEAK_NOISE_SCALE` | `0.45` |
| `PLAYER_WALK_NOISE_SCALE` | `1` |
| `PLAYER_SPRINT_NOISE_SCALE` | `1.6` |
| `WALK_MODE_STICK_THRESHOLD` | `0.85` |

Sprint behavior:

- Face button A (`button 0`) toggles `player.sprintActive`.
- Sprint cannot be triggered by stick tilt alone.
- Releasing the L-stick and stopping movement resets sprint back to walking.
- Keyboard remains a simple walking fallback only.

### Noise Tradeoff

`enemy.js` now uses `player.noiseScale` for player footstep hearing and visible footstep rings:

- Sneak produces smaller visible rings and shorter hearing reach.
- Walk uses baseline ring/reach.
- Sprint produces larger visible rings and longer hearing reach.

The player footstep ring is now readable as the actual stealth cost of the current movement mode.

### Player Refactor

Player-specific code was extracted from `game.js` into new `player.js`.

Moved into `player.js`:

- Player constants and tuning.
- `player` object.
- `keys` keyboard fallback state.
- `lerpAngle()`, `readStick()`, `readMoveStick()`, and generic `lerp()`.
- `resetPlayer()`.
- `updatePlayer(gp, activeProjectiles)`.
- `drawPlayer()`.

Still in `game.js`:

- Canvas setup and scale helpers.
- Walls, lamps, pickup/exfil, mission state.
- `inVisionCone()`, `isLit()`, `isLitByLamps()`.
- Wall collision helpers.
- Projectile collision/culling.
- Fog, lighting, map/objective/exfil drawing.
- Main `update()`, `draw()`, and loop.

Important follow-up for Feature 09:

- Camera state and draw transforms should primarily live in `game.js`, because the camera changes the global render pipeline.
- Hard-aim player movement lock should live in `player.js`, because it changes player movement resolution.
- If Feature 09 needs to force the slowest movement while LT is held, add a clear hook/parameter to `updatePlayer()` rather than reintroducing player movement logic into `game.js`.

---

## 4. Key Systems

### index.html / Presentation

The visible canvas is fixed at 1920x1080 and CSS-scales to the monitor while preserving 16:9. Script order is now `player.js`, `enemy.js`, `game.js`.

### player.js

| System | Key identifiers |
|--------|-----------------|
| Scaling | `PLAYER_DESIGN_WIDTH`, `PLAYER_GAME_WIDTH`, `scalePlayerX/Y/Unit()`, `scalePlayerPoint()` |
| Player state | `PLAYER_START`, `player`, `PLAYER_RADIUS`, `VISION_ANGLE`, `PLAYER_GLOW_RADIUS`, `PLAYER_PROXIMITY_RADIUS` |
| Movement tuning | `PLAYER_SNEAK_SPEED`, `PLAYER_WALK_SPEED`, `PLAYER_SPRINT_SPEED`, `PLAYER_SNEAK_NOISE_SCALE`, `PLAYER_WALK_NOISE_SCALE`, `PLAYER_SPRINT_NOISE_SCALE`, `WALK_MODE_STICK_THRESHOLD` |
| Input helpers | `keys`, `DEADZONE`, `readStick()`, `readMoveStick()` |
| Motion / aim | `resetPlayer()`, `updatePlayer(gp, activeProjectiles)`, `lerpAngle()` |
| Rendering | `drawPlayer()` |

Critical distinction: player-related feature work now belongs here first. This includes movement tuning, hard-aim movement locks, aim input behavior, player firing input, and player body rendering.

### game.js

| System | Key identifiers |
|--------|-----------------|
| Fixed presentation | `DESIGN_WIDTH`, `DESIGN_HEIGHT`, `GAME_WIDTH`, `GAME_HEIGHT`, `scaleGameX/Y/Unit()`, `gameCanvas`, `screenCtx`, `ctx` |
| Walls | `WALLS`, `WALL_SEGMENTS`, `WALL_CORNERS`, `pushOutOfWalls(entity, radius)`, `hitsWall(x, y)` |
| Mission | `pickup`, `exfilPoints`, `gapExits`, `gamePhase` |
| Lighting | `LAMPS`, `drawLighting()`, `isLit()`, `isLitByLamps()` |
| Vision | `inVisionCone()`, `computeVisibilityPolygon()`, `castVisRay()` |
| Projectiles | `projectiles`, `drawProjectiles()`, projectile collision/culling in `update()` |
| Draw flow | Draw to `gameCanvas` using `ctx`, then blit to the 1920x1080 screen canvas |

Critical distinction: enemy detection must use `isLitByLamps()`, not `isLit()`. `isLit()` includes the player's self-glow and is for player-facing visibility.

### enemy.js

| System | Key identifiers |
|--------|-----------------|
| Enemy setup | `INITIAL_ENEMIES`, `resetEnemies()` |
| Sight | `pawnInCone()`, `hasLOS()`, `enemyCanSeeCone()` |
| Sound | `emitSound()`, `notifyPlayerMoved()`, `applySoundReaction()` |
| Reaction delay | `REACTION_DELAY`, `SUSPICION_CONFIRM_DELAY`, `scheduleReaction()`, `reactionTimer`, `pendingReaction` |
| Patrol | `patrolRoute`, `patrolIndex`, `patrolPauseTimer`, `patrolSweepAccum` |
| Reactive navigation | `NAV_NODES`, `NAV_EDGES`, `buildPath()`, `followNavPath()`, `_pathSegmentClear()` |
| Alert/search/return | `alertTimer`, `lastKnownX/Y`, `searchPath`, `searching`, `returning`, `beginReturnToPatrol()`, `finishReturnToPatrol()`, `cautiousTimer` |
| Shooter behavior | `updateShooterAlert()`, `enemyProjectiles`, `fireEnemyShot()`, `playerHitFlashTimer` |
| Rendering | `drawEnemies()`, `drawSoundEvents()`, `drawEnemyLabels()` |

`enemy.js` still has its own enemy coordinate scaling helpers. It depends on globals from `player.js` and `game.js` at runtime, but should not reference `game.js` globals at module load when avoidable.

---

## 5. Facility Layout

Coordinates below are old 1100x750 authored coordinates. Runtime code scales them to FHD.

| Passage | Center point | Connects |
|---------|--------------|----------|
| Entry gap | (500, 741) | Outside / Lobby, primary exfil |
| Corridor left gap | (270, 449) | Lobby / upper rooms |
| Corridor right gap | (819, 449) | Lobby / Room F area |
| Room A east wall gap | (409, 295) | Room A / Corridor |
| Room B/C divider gap | (769, 210) | Room B / Room C |
| Room F west wall gap | (909, 590) | Lobby/Corridor / Room F |
| Left perimeter duct | (9, 190) | Room A bonus exfil |
| Right perimeter duct | (1091, 190) | Room BC bonus exfil |

---

## 6. Feature Build Order

| # | Feature | Status |
|---|---------|--------|
| 00 | Pawn movement and vision spec | Done |
| 01 | Walls and room geometry | Done |
| 02 | Lighting | Done |
| 03 | Objective pickup and exfil | Done |
| 04 | Enemy sight detection | Done |
| 05 | Enemy sound detection | Done, updated for suspicion confirmation |
| 06 | Enemy movement and patrol | Done |
| 07 | Enemy AI state machine | Done, updated for returning/pathing fixes |
| 08 | Movement modes and noise tradeoff | Done |
| 09 | Follow Camera & Hard-Aim Scouting | NEXT IMPLEMENTATION |
| ## | Metagame and daytime systems | Conceptual / deferred |

---

## 7. Next Feature Spec

Read `design/feature_09_follow_camera_hardaim.md` first.

Feature 09 goals:

1. Add player-follow camera with a central dead-zone.
2. Add hard-aim camera state held by Left Trigger.
3. Ease the camera forward along `player.angle` during hard-aim.
4. Clamp camera to world bounds.
5. Apply camera transform to world rendering only.
6. Keep collision, vision cones, LOS, and enemy detection in world space.
7. While hard-aiming, force player movement to the slowest gait from Feature 08.

Recommended implementation split:

| File | Responsibility |
|------|----------------|
| `game.js` | Camera state, camera target/ease/clamp, render transform, screen-space blit/HUD separation |
| `player.js` | Hard-aim movement lock hook inside `updatePlayer()`, any player aim/input state needed by LT hard-aim |
| `enemy.js` | Only if off-screen fairness or shooter gating is implemented in this pass |
| `design/feature_09_follow_camera_hardaim.md` | Update if implementation details diverge |

Important caveat:

- The current world is 1920x1080 and the presentation canvas is also 1920x1080. Camera movement may be subtle or clamped often until the map grows. Feature 09 doc already notes this.
- Fog and lighting are currently rendered to full-size offscreen canvases. This is acceptable for the current map size, but future larger maps will need camera-aware fog/lighting rendering.

---

## 8. Current Enemy Layout

| # | Current role |
|---|--------------|
| 1 | Static upper center room sentry at (580, 100), faces south, melee |
| 2 | Short lobby patrol between (420, 590) and (580, 590), melee |
| 3 | Cross-room Room A / Corridor / Room BC patrol, shooter |

Enemy 1 was previously moved out of the lobby to avoid contacting Enemy 2 and to keep Enemy 3's patrol path clear.

---

## 9. Known Caveats / Follow-Up

- Sound still propagates through walls by pure radius. This can feel too vivid, as if enemies across walls are in the same room.
- Debug/test visuals remain: enemy labels, vision cones, sound rings, reaction rings.
- No player health/death system yet; enemy shots currently trigger a red screen flash.
- Precision shooter archetype is reserved but not placed.
- `hasMapKnowledge` is still hardcoded true for prototype testing.
- Stamina was considered for sprint limiting but intentionally deferred. Current sprint tradeoff is noise/detection risk, not resource management.
- Feature 08 passed syntax and visual render checks, but final controller feel is still subject to hands-on tuning.

---

## 10. Coding Conventions

- Script load order is `player.js`, then `enemy.js`, then `game.js`.
- Player-facing work starts in `player.js`.
- Camera/global render pipeline work starts in `game.js`.
- Angle convention: `angle = 0` means facing up. Direction vector is `(Math.sin(angle), -Math.cos(angle))`.
- `pushOutOfWalls()` is called twice after pawn movement.
- Keep gameplay coordinates in 1920x1080. When reusing old design-doc coordinates, scale them through the relevant helper functions.
- Render gameplay to a 1920x1080 `gameCanvas`; the final blit goes 1:1 to the visible 1920x1080 canvas before CSS scales it to the monitor.
- Enemy detection must use `isLitByLamps()`, not `isLit()`.
- For codebase, game behavior, mathematics, geometry, rendering, UI, or player-facing visual work, open/run the game when practical and perform a visual screenshot check.
- One feature at a time. Write/update a design doc before non-trivial implementation.
- Keep changes surgical and avoid speculative systems.

---

## 11. Verification Performed

- `node --check player.js` passed.
- `node --check enemy.js` passed.
- `node --check game.js` passed.
- Local browser loaded `http://127.0.0.1:8000/index.html`.
- Browser reported a 1920x1080 canvas with no console errors.
- Visual screenshot confirmed the game rendered normally after the `player.js` split.
- Before creating this handoff file, `git status --short -uall` reported clean. After creation, this handoff file itself is the only new untracked file.
