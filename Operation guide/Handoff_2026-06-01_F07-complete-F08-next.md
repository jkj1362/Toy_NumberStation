# Session Handoff - 2026-06-01 - F07 Complete, F08 Next

Read this file at the start of a new chat session to resume work on the Number Stations prototype with full context.

---

## 1. Project Identity

**Name:** Number Stations - Cold War stealth roguelike prototype.  
**Prototype goal:** Validate the night-phase mission loop: infiltrate a facility, avoid or neutralize guards, grab an objective, and exfil.  
**Full FDD:** `design/[FDD]Number_Stations.md`  
**Prototype scope:** `design/prototype_scope.md`  
**Next feature:** Feature 08 - Walk vs. Run + Noise Tradeoff (`design/feature_08_walk_run_noise.md`)

---

## 2. File Structure

```
Toys/
|-- index.html                         # fixed 1920x1080 browser canvas; loads enemy.js then game.js
|-- Open Game.bat                      # double-click launcher for non-IDE play
|-- game.js                            # core game systems, 719 lines
|-- enemy.js                           # enemy detection, sound, patrol, search, rendering, 660 lines
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
|   `-- feature_09_Metagame(TBD).md
`-- Operation guide/
    |-- CLAUDE.md
    |-- session handoff format.md
    |-- Handoff_2026-05-12_walls-complete.md
    |-- Handoff_2026-05-15_objective-exfil-complete.md
    |-- Handoff_2026-05-21_F06-patrol-complete.md
    `-- Handoff_2026-06-01_F07-complete-F08-next.md
```

---

## 3. Key Systems

### index.html / presentation

The visible canvas is fixed at 1920x1080 and CSS-scales to the monitor while preserving 16:9. The internal gameplay world is also 1920x1080. Existing 1100x750 authored coordinates are scaled at load time via helper functions in `game.js` and `enemy.js`.

### game.js

| System | Key identifiers |
|--------|-----------------|
| Fixed presentation | `DESIGN_WIDTH = 1100`, `DESIGN_HEIGHT = 750`, `GAME_WIDTH = 1920`, `GAME_HEIGHT = 1080`, `scaleGameX/Y/Unit()`, `gameCanvas`, `screenCtx`, `ctx` |
| Walls | `WALLS`, `WALL_SEGMENTS`, `WALL_CORNERS`, `pushOutOfWalls(entity, radius)`, `hitsWall(x, y)` |
| Player | `player`, `PLAYER_START`, `PLAYER_RADIUS`, `VISION_ANGLE` |
| Mission | `pickup`, `exfilPoints`, `gapExits`, `gamePhase` |
| Lighting | `LAMPS`, `drawLighting()`, `isLit()`, `isLitByLamps()` |
| Vision | `inVisionCone()`, `computeVisibilityPolygon()`, `castVisRay()` |
| Draw flow | Draw to `gameCanvas` using `ctx`, then blit to the 1920x1080 screen canvas with `screenCtx.drawImage()` |

Critical distinction: enemy detection must use `isLitByLamps()`, not `isLit()`. `isLit()` includes the player's self-glow and is for player-facing visibility.

### enemy.js

| System | Key identifiers |
|--------|-----------------|
| Enemy setup | `INITIAL_ENEMIES`, `resetEnemies()` |
| Sight | `pawnInCone()`, `hasLOS()`, `enemyCanSeeCone()` |
| Sound | `emitSound()`, `notifyPlayerMoved()`, `applySoundReaction()` |
| Reaction delay | `scheduleReaction()`, `reactionTimer`, `pendingReaction` |
| Patrol | `patrolRoute`, `patrolIndex`, `patrolPauseTimer`, `patrolSweepAccum` |
| FHD scaling | `ENEMY_DESIGN_WIDTH/HEIGHT`, `ENEMY_GAME_WIDTH/HEIGHT`, `scaleEnemyX/Y/Unit()` |
| Reactive navigation | `NAV_NODES`, `NAV_EDGES`, `buildPath()`, `followNavPath()` |
| Alert/search | `alertTimer`, `lastKnownX/Y`, `searchPath`, `searching`, `cautiousTimer` |
| Rendering | `drawEnemies()`, `drawSoundEvents()`, `drawEnemyLabels()` |

Feature 07 is implemented in code: alert pursuit, alert timer refresh, last-known searching, and lingering cautious behavior all exist.

---

## 4. Facility Layout

Canvas gameplay coordinates are now 1920x1080. The table below lists old authored coordinates from the design docs; code scales them to FHD at load time.

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

## 5. Feature Build Order

| # | Feature | Status |
|---|---------|--------|
| 00 | Pawn movement and vision spec | Done |
| 01 | Walls and room geometry | Done |
| 02 | Lighting | Done |
| 03 | Objective pickup and exfil | Done |
| 04 | Enemy sight detection | Done |
| 05 | Enemy sound detection | Done |
| 06 | Enemy movement and patrol | Done |
| 07 | Enemy AI state machine | Done |
| 08 | Walk vs. Run + Noise Tradeoff | NEXT |
| 09 | Metagame and daytime systems | Conceptual |

---

## 6. Next Feature Spec

Read `design/feature_08_walk_run_noise.md` first.

What is already implemented:
- Player moves at `player.speed = 4`.
- Enemy footstep detection already scales from `player.speed` in `notifyPlayerMoved()`.
- `WALK_SPEED = 4` exists in `enemy.js` as the baseline for sound scaling.

What to implement next:
1. Add player movement mode state in `game.js`.
2. Keyboard: WASD walks; Shift + WASD runs.
3. Gamepad: partial left-stick tilt walks; full tilt runs.
4. Tune run speed around 7-8 px/frame.
5. Verify run produces larger visible footstep rings and alerts enemies from farther away.

Do not add stamina or a stealth crawl in the first pass unless explicitly requested.

---

## 7. Current Enemy Layout

| # | Current role |
|---|--------------|
| 1 | Static lobby sentry at (400, 590), faces north |
| 2 | Short lobby patrol between (420, 590) and (580, 590) |
| 3 | Cross-room patrol from Room A through Corridor to Room BC and back |

Note: the May 21 handoff warned that Enemy 1 and Enemy 2 were in a test layout. The current code still uses that general lobby-testing shape, though Enemy 1 has been restored to (400, 590). Decide whether to keep or rebalance before shipping the prototype.

---

## 8. Coding Conventions

- `enemy.js` loads before `game.js`; do not reference `game.js` globals at `enemy.js` module scope.
- Angle convention: `angle = 0` means facing up. Direction vector is `(Math.sin(angle), -Math.cos(angle))`.
- `pushOutOfWalls()` is called twice after pawn movement.
- Keep new runtime gameplay coordinates in 1920x1080. When reusing old design-doc coordinates, scale them through the existing helper functions.
- Render gameplay to a 1920x1080 `gameCanvas`; the final blit goes 1:1 to the visible 1920x1080 canvas before CSS scales it to the monitor.
- One feature at a time. Write/update a design doc before non-trivial implementation.
- Keep changes surgical and avoid speculative systems.
