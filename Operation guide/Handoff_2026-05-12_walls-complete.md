# Session Handoff — 2026-05-12 — Walls Complete

Read this file at the start of a new chat session to resume work on the Number Stations prototype with full context.

---

## 1. Project Identity

**Name:** Number Stations — Cold War stealth roguelike  
**Prototype goal:** Validate the night-phase mission loop: infiltrate a facility, neutralize or avoid enemies, grab an objective, exfil.  
**Full FDD:** `design/[FDD]Number_Stations.md`  
**Prototype scope & feature order:** `design/prototype_scope.md`  
**Next feature spec:** `design/feature_01_walls_lighting.md` (Step 2 — wall-mounted lamps)

---

## 2. File Structure

```
Toys/
├── index.html          — canvas 1100×750, loads game.js
├── game.js             — all game code, single file (~320 lines)
├── CLAUDE.md           — coding behavior guidelines
├── design/
│   ├── [FDD]Number_Stations.md             — full game design document
│   ├── prototype_scope.md                  — feature build order (8 features)
│   └── feature_01_walls_lighting.md        — walls + lighting spec (Step 1 done, Step 2 next)
└── session handoff/
    └── Handoff_2026-05-12_walls-complete.md   — this file
```

---

## 3. game.js — Implemented Systems

| System | Key identifiers |
|--------|----------------|
| Canvas | `canvas` 1100×750, `ctx` |
| Walls | `WALLS` array (14 AABB rects), `pushOutOfWalls(entity, radius)` called ×2/frame, `hitsWall(x, y)` |
| Player | `player` object, `PLAYER_START {x:500, y:680}`, `PLAYER_RADIUS = 28` |
| Movement | WASD + gamepad left stick (axes 0,1), `player.speed = 4`, canvas-clamped |
| Aiming | Gamepad right stick (axes 2,3), `lerpAngle(current, target, t=0.18)`, `player.targetAngle` |
| Shooting | RT (button 7) → yellow line projectile at 25 px/frame, wall-culled via `hitsWall` |
| Enemies | `INITIAL_ENEMIES` (3 static red pawns in Lobby/Room B/Room F), `ENEMY_HIT_RADIUS = 20` |
| Fog of war | Offscreen `fogCanvas`/`fogCtx`, front semicircle + 50px proximity circle, `destination-out` compositing |
| Reset | B button (button 1) → player to `PLAYER_START`, enemies respawn, projectiles cleared |
| Draw order | `clearRect` → `drawFloor` → `drawWalls` → enemies → projectiles → `drawPlayer` → `drawFog` |

---

## 4. Facility Layout

Canvas: 1100 × 750. All walls are axis-aligned rectangles in the `WALLS` array.

```
y=0   +============outer top================+=========+=========+
      |                                     |         |         |
      |           ROOM A                    | ROOM B  | ROOM C  |
      |        [objective]                  |         |[alt exfil
      |                                     | gap B↔C |         |
y=440 +==left gap===+====================+==+ y160-260+=========+
      | x:220–320   |                    |  right gap           |
      |    LOBBY    |     (open area)    |  x:778–860 ROOM F    |
      |             |                    |            x:900–1082|
y=732 +-------------+--[entry gap]-------+------wall+-----------+
                        x:430–570
```

**Door gap coordinates:**

| Passage | Coordinates |
|---------|-------------|
| Entry (outside → Lobby) | x=430–570, y=732 |
| Left corridor (Lobby → Room A area) | x=220–320, y=440 |
| Right corridor (Lobby → Room C area) | x=778–860, y=440 |
| Room A → Room B | x=400, y=250–340 |
| Room B → Room C | x=760, y=160–260 |
| Room F door (Lobby → Room F) | x=900, y=540–640 |

**Enemy start positions:**
- `{ x: 600, y: 600 }` — Lobby
- `{ x: 580, y: 220 }` — Room B
- `{ x: 940, y: 590 }` — Room F

---

## 5. Feature Build Order

| # | Feature | Status |
|---|---------|--------|
| 1a | Wall structures | ✅ **Done** |
| 1b | Wall-mounted lamps + darkness layer | ⬅ **NEXT** |
| 2 | Objective pickup + exfil (2 options) | Pending |
| 3 | Enemy sight detection | Pending |
| 4 | Enemy sound detection | Pending |
| 5 | Enemy patrol movement | Pending |
| 6 | Enemy AI state machine | Pending |
| 7 | Walk vs. run + noise tradeoff | Pending |

---

## 6. Next Feature: Wall-Mounted Lamps (Feature 1b)

Full spec in `design/feature_01_walls_lighting.md` — read the **Step 2** section.

**Key points:**
- `LAMPS` array: `{ x, y, wallSide: 'N'|'S'|'E'|'W', radius, color, active: true }`
- `wallSide` offsets the gradient center 8px away from the wall (into the room)
- Darkness layer: offscreen `lightCanvas`, fill dark `rgba(0,0,0,0.82)`, then `destination-out` radial gradient per active lamp
- `drawFog()` in game.js already uses this exact pattern — use it as a reference implementation
- Lamps are **shootable**: when a projectile comes within ~10px of a lamp → `lamp.active = false`
- Draw order insertion: `drawLighting()` goes **between** `drawPlayer()` and `drawFog()`
- `reset()` must restore all lamps to `active: true`
- Standalone room lamps (desk lamps etc.) are **deferred**

---

## 7. Coding Conventions

- **Single file:** All game code in `game.js`. No modules, no bundler.
- **Constants at top:** `WALLS`, `PLAYER_START`, `PLAYER_RADIUS`, etc.
- **Game loop:** `update()` → `draw()` via `requestAnimationFrame(loop)`
- **Angle convention:** `angle=0` = facing UP (not right). Direction vector = `(sin(angle), -cos(angle))`. World angles use `atan2(dx, -dy)`.
- **Offscreen canvas pattern:** Create once at module scope, reuse each frame. See `fogCanvas`/`fogCtx` for the exact pattern.
- **`pushOutOfWalls` called twice:** Resolves corner penetration edge cases.
- **Button one-shot pattern:** `let xWasPressed = false` → `if (pressed && !wasPressed) { ... } wasPressed = pressed`
- **CLAUDE.md rules:** Simplicity first, surgical changes only, no speculative features, no comments unless the WHY is non-obvious.

---

## 8. Working Style

- User provides one feature at a time. Do not implement ahead.
- Non-trivial features get a design doc written first (see `feature_01_walls_lighting.md` as the model).
- Plan mode is used before implementing anything with significant design decisions.
- Wall geometry and room layout are hardcoded for this prototype — no tile editor.
- Gamepad is the primary input; keyboard (WASD) is secondary.
- When in doubt, ask before implementing.
