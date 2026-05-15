# Session Handoff — 2026-05-15 — Objective & Exfil Complete

Read this file at the start of a new chat session to resume work on the Number Stations prototype with full context.

---

## 1. Project Identity

**Name:** Number Stations — Cold War stealth roguelike  
**Prototype goal:** Validate the night-phase mission loop: infiltrate a facility, neutralize or avoid enemies, grab an objective, exfil.  
**Full FDD:** `design/[FDD]Number_Stations.md`  
**Prototype scope & feature order:** `design/prototype_scope.md`  
**Next feature:** Enemy AI & detection system (Features 04–07 in prototype_scope.md)

---

## 2. File Structure

```
Toys/
├── index.html          — canvas 1100×750, loads game.js
├── game.js             — all game code, single file (~680 lines)
├── CLAUDE.md           — coding behavior guidelines
├── design/
│   ├── [FDD]Number_Stations.md               — full game design document
│   ├── prototype_scope.md                    — feature build order (8 features)
│   ├── feature_00_pawn_movement_vision.md    — canonical pawn/vision spec (ALL pawns use this)
│   ├── feature_01_walls_geometry.md          — wall geometry spec (DONE)
│   ├── feature_02_lighting.md                — lighting system spec (DONE)
│   └── feature_03_objective_exfil.md         — pickup + exfil spec (DONE)
└── session handoff/
    ├── Handoff_2026-05-12_walls-complete.md  — previous session
    └── Handoff_2026-05-15_objective-exfil-complete.md  — this file
```

---

## 3. game.js — Implemented Systems

| System | Key identifiers |
|--------|----------------|
| Canvas | `canvas` 1100×750, `ctx` |
| Walls | `WALLS` array (16 AABB rects — perimeter walls split for ducts), `pushOutOfWalls(entity, radius)` ×2/frame, `hitsWall(x, y)` |
| Player | `player` object, `PLAYER_START {x:500, y:680}`, `PLAYER_RADIUS = 28` |
| Movement | WASD + gamepad left stick (axes 0,1), `player.speed = 4`, canvas-clamped |
| Aiming | Gamepad right stick (axes 2,3), `lerpAngle(current, target, t=0.18)`, `player.targetAngle` |
| Shooting | RT (button 7) → yellow line projectile at 25 px/frame, wall-culled via `hitsWall` |
| Enemies | `INITIAL_ENEMIES` (3 static red pawns in Lobby/Room B/Room F), `ENEMY_HIT_RADIUS = 20` |
| Lighting | `LAMPS` (12 wall-mounted lamps), `drawLighting()` with offscreen `lightCanvas`, `destination-out` radial gradients, half-plane clip per lamp, player ambient glow (80px), lamps shootable → `lamp.active = false` |
| Vision | `VISION_ANGLE = Math.PI*2/3` (120°), wall-occluded via `computeVisibilityPolygon()`, offscreen `fogCanvas`, 50px proximity circle. All pawns share these values — see `feature_00_pawn_movement_vision.md` |
| Vision helpers | `inVisionCone(wx, wy)` — angle-only check (no LOS). `isLit(wx, wy)` — checks lamp radius + player glow. Icons only shown when BOTH are true. |
| Raycasting | `WALL_SEGMENTS`, `WALL_CORNERS` (precomputed IIFEs from WALLS). `castVisRay(px, py, angle)`, `computeVisibilityPolygon(px, py, playerAngle)` |
| Mission | `gamePhase`: `'infiltrate'`→`'exfil'`→`'complete'`. `pickup` object. `exfilPoints` array. `gapExits` array. `INTERACT_RADIUS = 30`, `EXFIL_RADIUS = 40` |
| Pickup | `initPickup()` — random room (not Lobby). `drawPickup()` — `!` icon (always) or diamond shape (vision cone + lit). E key / button 2 (X) to collect when in range |
| Exfil | Primary at entry gap (500, 741). Wall duct exits in `WALL_GAP_EXITS` — manually activated by player interaction, hidden until lit+visible. `drawExfilPoints()`, `drawGapExits()` |
| Reset | B button (button 1) → full reset including lamp states, mission state, gap activations |
| Draw order | `clearRect` → `drawFloor` → `drawWalls` → `drawLamps` → enemies → projectiles → `drawPlayer` → `drawLighting` → `drawFog` → `drawExfilPoints` → `drawGapExits` → `drawPickup` |

---

## 4. Facility Layout

Canvas: 1100 × 750. All walls are axis-aligned rectangles in `WALLS`.

```
y=0   +====[top wall]===========================+=========+=========+
      |                  [duct]                 |         |   [duct]|
      |           ROOM A  y:160-220             | ROOM B  | y:160-220
      |                                         | B/C gap |  ROOM C |
      |         Room A east wall x=400          | x=760   |         |
      |         gap y:250–340                   | gap y:160-260      |
y=440 +==left gap x:220–320==+================+===right gap x:778–860=+
      |                      |                |                  |   |
      |       LOBBY          |                |    ROOM F        |   |
      |    player starts     |                |  x:900–1082      |   |
      |    x:500, y:680      |                |  door y:540-640  |   |
y=732 +----------------------+--[entry gap]---+------------------+---+
                                  x:430–570
```

**All gap coordinates:**

| Passage | Type | Coordinates |
|---------|------|-------------|
| Entry (outside → Lobby) | Navigation + Primary Exfil | x=430–570, y=732 |
| Left corridor (Lobby ↔ upper rooms) | Navigation | x=220–320, y=440 |
| Right corridor (Lobby ↔ upper rooms) | Navigation | x=778–860, y=440 |
| Room A east wall | Navigation | x=400, y=250–340 |
| Room B/C divider | Navigation | x=760, y=160–260 |
| Room F door | Navigation | x=900, y=540–640 |
| Left perimeter duct (Room A) | **Bonus Exfil** | x=0–18, y=160–220 |
| Right perimeter duct (Room B/C) | **Bonus Exfil** | x=1082–1100, y=160–220 |

**Enemy start positions (static, no AI yet):**
- `{ x: 600, y: 600, angle: 0 }` — Lobby
- `{ x: 580, y: 220, angle: 0 }` — Room B
- `{ x: 940, y: 590, angle: 0 }` — Room F

**Room registry (ROOMS constant):**

| id | cx | cy | startingSpace |
|----|----|----|---------------|
| lobby | 460 | 590 | true |
| room_a | 200 | 229 | false |
| corridor | 589 | 229 | false |
| room_bc | 930 | 229 | false |
| room_f | 991 | 590 | false |

---

## 5. Feature Build Order

| # | Feature | Status |
|---|---------|--------|
| 00 | Pawn movement & vision spec | ✅ **Done** (doc only) |
| 01 | Wall structures | ✅ **Done** |
| 02 | Lighting (wall-mounted lamps, darkness, shootable) | ✅ **Done** |
| 03 | Objective pickup + exfil (primary + manual duct exits) | ✅ **Done** |
| 04 | **Enemy sight detection** | ⬅ **NEXT** |
| 05 | Enemy sound detection | Pending |
| 06 | Enemy movement & patrol | Pending |
| 07 | Enemy AI state machine | Pending |
| 08 | Walk vs. run + noise tradeoff | Pending |

---

## 6. Next Feature: Enemy AI System (Features 04–07)

### What exists now
- 3 static enemies at fixed positions (they don't move, don't detect, just die when shot)
- Each enemy is `{ x, y, angle: 0 }` — they have a facing direction but it's unused
- `drawEnemy(e)` renders the same pawn shape as the player (red color)
- `VISION_ANGLE` (120°), `PROXIMITY_RADIUS` (50px), and the `inVisionCone()` helper are already built — use them for enemy sight

### Build order recommendation
Implement features 04–07 in sequence; each depends on the previous:
1. **Sight detection first** — enemy spots player if in vision cone + LOS. No movement yet.
2. **Patrol movement** — enemies follow waypoints. Pathfinding through doorways.
3. **State machine** — `PATROLLING → ALERT → SEARCHING → CAUTIOUS`. CAUTIOUS never resets fully.
4. **Sound detection** — gunshots, running, walking each have a sound radius. Enemies react.
5. **Walk/run** — Shift = run (player), faster but louder. Sound radius changes per state.

### Key design decisions (from FDD + prototype_scope.md)
- Enemy FOV: use same `VISION_ANGLE` (120°) and `PROXIMITY_RADIUS` (50px) as player — canonical for all pawns
- LOS: `inVisionCone()` is angle-only. Enemy sight needs a full LOS ray cast against `WALL_SEGMENTS` — use `castVisRay()` already in game.js
- Light level affects detection range: lit area = full range, dark area = reduced range. `isLit(enemy.x, enemy.y)` and `isLit(player.x, player.y)` are available
- Patrol: waypoint arrays per enemy, enemy moves toward next waypoint, advances on arrival
- State machine: CAUTIOUS state means the guard never fully relaxes even if player hides — they stay at elevated alertness for the session

### Relevant existing functions to reuse
- `castVisRay(px, py, angle)` — game.js line ~420. Used for player visibility, reuse for enemy LOS.
- `inVisionCone(wx, wy)` — game.js line ~124. Angle check from PLAYER. Will need a version parameterized by any pawn's position+angle.
- `isLit(wx, wy)` — game.js line ~133. Checks lamp coverage.
- `pushOutOfWalls(entity, radius)` — game.js line ~167. Reuse for enemy movement.
- `lerpAngle(current, target, t)` — game.js line ~219. Reuse for enemy rotation.

### Note on inVisionCone
Currently `inVisionCone(wx, wy)` is hardcoded to check from `player.x/y/angle`. For enemies, you'll need a generalized version: `pawnCanSee(px, py, pAngle, tx, ty)` that takes the observer's position and angle as parameters. The current `inVisionCone` can be kept as a player-specific shorthand or replaced.

---

## 7. Coding Conventions

- **Single file:** All game code in `game.js`. No modules, no bundler.
- **Constants at top:** `WALLS`, `PLAYER_START`, `PLAYER_RADIUS`, `VISION_ANGLE`, `ROOMS`, `WALL_GAP_EXITS`, etc.
- **Game loop:** `update()` → `draw()` via `requestAnimationFrame(loop)`
- **Angle convention:** `angle=0` = facing UP. Direction = `(sin(angle), -cos(angle))`. Canvas arc angle = `pawn.angle - Math.PI/2`. World bearing = `atan2(dx, -dy)`.
- **Offscreen canvas pattern:** Create once at module scope, reuse each frame. See `fogCanvas`/`lightCanvas`.
- **`pushOutOfWalls` called twice:** Resolves corner penetration.
- **Button one-shot pattern:** `let xWasPressed = false` → check `pressed && !wasPressed`, then update `wasPressed = pressed` at end of block.
- **Icon display condition:** `inVisionCone(x, y) && isLit(x, y)` — both required before showing any world-space indicator.
- **WALL_SEGMENTS / WALL_CORNERS:** Precomputed IIFEs; rebuilt automatically when WALLS changes at load time. Static — walls never move.
- **CLAUDE.md rules:** Simplicity first, surgical changes only, no speculative features, no comments unless the WHY is non-obvious.

---

## 8. Working Style

- User provides one feature at a time. Do not implement ahead.
- Non-trivial features get a design doc written first (see `feature_03_objective_exfil.md` as the current model).
- Plan mode is used before implementing anything with significant design decisions.
- Wall geometry and room layout are hardcoded for this prototype.
- Gamepad is the primary input; keyboard (WASD + E) is secondary. Interact = E key / button 2 (X face left). Fire = RT (button 7). Reset = B (button 1).
- When in doubt, ask before implementing.
- Feature docs live in `design/`. Update checklist items to `[x]` and status to `DONE` when complete.
