# Session Handoff - 2026-06-05 - Enemy Navigation, Suspicion Timing, and Docs Cleanup

Read this file at the start of a new chat session to resume work on the Number Stations prototype with full context.

---

## 1. Project Identity

**Name:** Number Stations - Cold War stealth roguelike prototype.  
**Prototype goal:** Validate the night-phase mission loop: infiltrate a facility, avoid or neutralize guards, grab an objective, and exfil.  
**Full FDD:** `design/[FDD]Number_Stations.md`  
**Prototype scope:** `design/prototype_scope.md`  
**Immediate next implementation:** Feature 08 - Walk vs. Run + Noise Tradeoff (`design/feature_08_walk_run_noise.md`)

Feature 08 should be implemented before Feature 09 follow camera / hard-aim scouting, because the Feature 09 doc depends on having a slow walk mode.

---

## 2. File Structure

Current meaningful project files:

```
Toys/
|-- index.html                         # fixed 1920x1080 browser canvas; loads enemy.js then game.js
|-- Open Game.bat                      # double-click launcher for non-IDE play
|-- game.js                            # core game systems, 650 lines
|-- enemy.js                           # enemy detection, sound, patrol, search, rendering, 841 lines
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
    `-- Handoff_2026-06-05_enemy-navigation-suspicion-docs.md
```

Note: The prior `design/feature_09_Metagame(TBD).md` appears to have been replaced by `design/feature_##_Metagame(TBD).md`, and `design/feature_09_follow_camera_hardaim.md` is now present. Treat those as current workspace state.

---

## 3. What Changed This Session

### Operation Guide

`Operation guide/CLAUDE.md` now includes a visual screenshot check rule:

- For codebase, game behavior, mathematics, geometry, rendering, UI, or player-facing visual work, open/run the game when practical.
- Take a screenshot or otherwise visually verify the current game screen.
- Use that visual result to guide implementation and QA.

This matters for upcoming visualization development and QA.

### Enemy Layout

Enemy 1 was moved out of the lobby:

```javascript
{ x: 580, y: 100, angle: Math.PI, targetAngle: Math.PI, archetype: 'melee', ... }
```

Rationale:

- Enemy 1 and Enemy 2 were contacting in the lobby.
- Enemy 1 now sits in the upper center room and faces south.
- Enemy 1 should not interfere with Enemy 3's Room A / Corridor / Room BC patrol path.

### Suspicion / Alert Timing

Current timing constants in `enemy.js`:

| Constant | Frames | Meaning |
|----------|--------|---------|
| `REACTION_DELAY` | 45 | Initial patrol reaction delay before entering suspicious |
| `SUSPICION_CONFIRM_DELAY` | 75 | Suspicious-to-alert confirmation delay |
| `SUSPICION_TIMEOUT` | 300 | First turn-only suspicion timeout |
| `ALERT_FRAMES` | 180 | Alert grace period after losing confirmation |

Important behavior:

- First sound from patrol schedules `patrol -> suspicious` after `REACTION_DELAY`.
- First suspicious phase is still turn-only. It turns toward the source and can time out.
- A second stimulus while suspicious schedules `suspicious -> alert` after `SUSPICION_CONFIRM_DELAY`.
- Seeing the player while suspicious also schedules `suspicious -> alert` after `SUSPICION_CONFIRM_DELAY`.
- Directly witnessed gunshots still bypass suspicion and immediately alert.
- Recently reactive enemies in searching, returning, or cautious patrol skip the first suspicion phase and snap to alert on sound.

### Enemy Navigation / Return Fixes

Reactive navigation was strengthened because enemies could collide with walls when chasing, searching, or returning.

Key implementation details:

- `buildPath(fromX, fromY, toX, toY)` now creates dynamic `start` and `goal` nodes.
- Dynamic start/goal nodes only connect to nav nodes when `_pathSegmentClear()` says the segment is clear for enemy collision radius.
- If the exact goal cannot be reached, `buildPath()` falls back to the closest reachable nav point instead of forcing a wall-colliding straight segment.
- Alert chase uses straight movement only when `_pathSegmentClear()` allows it; otherwise it follows a nav path.
- `beginReturnToPatrol(e)` and `finishReturnToPatrol(e)` add a `returning` state so enemies path back to a patrol/home point after failed searches or sound-only alert expiry.
- Patrol enemies return to nearest patrol node; static enemies return to their home position and facing.

### Feature Docs Updated

Updated:

- `design/feature_05_enemy_sound.md`
  - Rewritten/cleaned up to remove stale immediate-alert behavior and mojibake-heavy sections.
  - Documents `SUSPICION_CONFIRM_DELAY`, 5s suspicion timeout, sound reaction flow, and future through-wall sound tuning.
- `design/feature_07_enemy_ai_state_machine.md`
  - Documents `returning`, wall-aware dynamic paths, current Enemy 1 placement, suspicion confirmation delay, and updated alert/search/return behavior.

---

## 4. Key Systems

### index.html / Presentation

The visible canvas is fixed at 1920x1080 and CSS-scales to the monitor while preserving 16:9. The internal gameplay world is also 1920x1080. Existing 1100x750 authored coordinates are scaled at load time via helper functions in `game.js` and `enemy.js`.

### game.js

| System | Key identifiers |
|--------|-----------------|
| Fixed presentation | `DESIGN_WIDTH`, `DESIGN_HEIGHT`, `GAME_WIDTH`, `GAME_HEIGHT`, `scaleGameX/Y/Unit()`, `gameCanvas`, `screenCtx`, `ctx` |
| Walls | `WALLS`, `WALL_SEGMENTS`, `WALL_CORNERS`, `pushOutOfWalls(entity, radius)`, `hitsWall(x, y)` |
| Player | `player`, `PLAYER_START`, `PLAYER_RADIUS`, `VISION_ANGLE` |
| Mission | `pickup`, `exfilPoints`, `gapExits`, `gamePhase` |
| Lighting | `LAMPS`, `drawLighting()`, `isLit()`, `isLitByLamps()` |
| Vision | `inVisionCone()`, `computeVisibilityPolygon()`, `castVisRay()` |
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
| FHD scaling | `ENEMY_DESIGN_WIDTH/HEIGHT`, `ENEMY_GAME_WIDTH/HEIGHT`, `scaleEnemyX/Y/Unit()` |
| Reactive navigation | `NAV_NODES`, `NAV_EDGES`, `buildPath()`, `followNavPath()`, `_pathSegmentClear()` |
| Alert/search/return | `alertTimer`, `lastKnownX/Y`, `searchPath`, `searching`, `returning`, `beginReturnToPatrol()`, `finishReturnToPatrol()`, `cautiousTimer` |
| Shooter behavior | `updateShooterAlert()`, `enemyProjectiles`, `fireEnemyShot()`, `playerHitFlashTimer` |
| Rendering | `drawEnemies()`, `drawSoundEvents()`, `drawEnemyLabels()` |

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
| 08 | Walk vs. Run + Noise Tradeoff | NEXT IMPLEMENTATION |
| 09 | Follow Camera & Hard-Aim Scouting | Pending, depends on Feature 08 |
| ## | Metagame and daytime systems | Conceptual / deferred |

---

## 7. Next Feature Spec

Read `design/feature_08_walk_run_noise.md` first.

What is already implemented:

- Player currently moves at one speed: `player.speed = scaleGameUnit(4)`.
- Enemy footstep detection already scales from `player.speed` in `notifyPlayerMoved()`.
- `WALK_SPEED = scaleEnemyUnit(4)` exists in `enemy.js` as the baseline for sound scaling.

What to implement next:

1. Add player movement mode state in `game.js`.
2. Keyboard: WASD walks; Shift + WASD runs.
3. Gamepad: partial left-stick tilt walks; full tilt runs.
4. Tune run speed around 7-8 design px/frame, scaled through existing helpers.
5. Verify run produces larger visible footstep rings and alerts enemies from farther away.

Important implementation note:

- Current enemy hearing radius scales from `player.speed`, but the player footstep visual ring in `notifyPlayerMoved()` still uses the standard walk radius. Feature 08 should make the visible footstep ring scale with the actual current movement speed so the noise tradeoff is readable.

Do not add stamina, crouch, or stealth crawl in the first pass unless explicitly requested.

---

## 8. Current Enemy Layout

| # | Current role |
|---|--------------|
| 1 | Static upper center room sentry at (580, 100), faces south, melee |
| 2 | Short lobby patrol between (420, 590) and (580, 590), melee |
| 3 | Cross-room Room A / Corridor / Room BC patrol, shooter |

Enemy 1 has been moved out of the lobby to avoid contacting Enemy 2 and to keep Enemy 3's patrol path clear.

---

## 9. Known Caveats / Follow-Up

- Sound still propagates through walls by pure radius. This can feel too vivid, as if enemies across walls are in the same room. The next tuning pass after current tasks should dampen or gate through-wall sound.
- Debug/test visuals remain: enemy labels, vision cones, sound rings, reaction rings.
- No player health/death system yet; enemy shots currently trigger a red screen flash.
- Precision shooter archetype is reserved but not placed.
- `hasMapKnowledge` is still hardcoded true for prototype testing.
- Browser screenshot capture timed out during one verification pass, but local page load checks showed the 1920x1080 canvas present and no console errors.

---

## 10. Coding Conventions

- `enemy.js` loads before `game.js`; do not reference `game.js` globals at `enemy.js` module scope.
- Angle convention: `angle = 0` means facing up. Direction vector is `(Math.sin(angle), -Math.cos(angle))`.
- `pushOutOfWalls()` is called twice after pawn movement.
- Keep new runtime gameplay coordinates in 1920x1080. When reusing old design-doc coordinates, scale them through the existing helper functions.
- Render gameplay to a 1920x1080 `gameCanvas`; the final blit goes 1:1 to the visible 1920x1080 canvas before CSS scales it to the monitor.
- For codebase, game behavior, mathematics, geometry, rendering, UI, or player-facing visual work, open/run the game when practical and perform a visual screenshot check.
- One feature at a time. Write/update a design doc before non-trivial implementation.
- Keep changes surgical and avoid speculative systems.

---

## 11. Verification Performed

- `node --check enemy.js` passed after enemy navigation and suspicion timing changes.
- Local game page loaded on localhost with the 1920x1080 canvas present and no browser console errors.
- Visual checks confirmed Enemy 1 moved out of the lobby and no longer contacts Enemy 2.
- Feature docs 05 and 07 were updated to match current code behavior.
