# Session Handoff — 2026-05-21 — F04–F06 Complete, F07 Designed

Read this file at the start of a new chat session to resume work on the Number Stations prototype with full context.

---

## 1. Project Identity

**Name:** Number Stations — Cold War stealth roguelike  
**Prototype goal:** Validate the night-phase mission loop: infiltrate a facility, neutralize or avoid enemies, grab an objective, exfil.  
**Full FDD:** `design/[FDD]Number_Stations.md`  
**Prototype scope & feature order:** `design/prototype_scope.md`  
**Next feature:** Feature 07 — Enemy AI State Machine (design doc written, implementation pending)

---

## 2. File Structure

```
Toys/
├── index.html               — canvas 1100×750; loads enemy.js THEN game.js (order matters)
├── game.js                  — game infrastructure (~700 lines)
├── enemy.js                 — all enemy logic: detection, patrol, sound, rendering (~580 lines)
├── Operation guide/
│   ├── CLAUDE.md            — coding behavior guidelines
│   ├── Handoff_2026-05-12_walls-complete.md
│   ├── Handoff_2026-05-15_objective-exfil-complete.md
│   └── Handoff_2026-05-21_F06-patrol-complete.md  ← this file
└── design/
    ├── [FDD]Number_Stations.md
    ├── prototype_scope.md
    ├── feature_00_pawn_movement_vision.md   — canonical pawn/vision spec
    ├── feature_01_walls_geometry.md         — DONE
    ├── feature_02_lighting.md               — DONE
    ├── feature_03_objective_exfil.md        — DONE
    ├── feature_04_enemy_sight.md            — DONE
    ├── feature_05_enemy_sound.md            — DONE
    ├── feature_06_enemy_patrol.md           — DONE
    └── feature_07_enemy_ai_state_machine.md — PENDING (design only, not yet coded)
```

---

## 3. game.js — Key Systems

| System | Key identifiers |
|--------|----------------|
| Canvas | `canvas` 1100×750, `ctx` |
| Walls | `WALLS` (16 AABB rects), `pushOutOfWalls(entity, radius)` ×2/frame, `hitsWall(x, y)` |
| Player | `player {x,y,speed:4,angle,targetAngle}`, `PLAYER_START {x:500,y:680}`, `PLAYER_RADIUS=28` |
| Movement | WASD + gamepad left stick; `lerpAngle(current, target, t)` for facing |
| Shooting | RT (button 7) → projectile 25px/frame; `emitSound(player.x, player.y, GUNSHOT_RADIUS, true)` on fire |
| Lighting | `LAMPS` (12 wall-mounted), `drawLighting()` offscreen canvas, `destination-out` radial gradients, half-plane clip per lamp; player glow 80px |
| Lit helpers | `isLit(wx, wy)` — lamps + player glow (for player-facing visibility checks). `isLitByLamps(wx, wy)` — lamps only + half-plane clip (for enemy detection — excludes player self-glow) |
| Vision | `VISION_ANGLE = Math.PI*2/3` (120°), `computeVisibilityPolygon(px, py, angle, visionAngle=VISION_ANGLE)` — wall-occluded polygon, `castVisRay(px, py, angle)` |
| Vision helpers | `inVisionCone(wx, wy)` — angle-only from player. `isLitByLamps()` — see above |
| Map overlay | `hasMapKnowledge = true` → `drawMapGeometry()` draws walls at 25% opacity as a grey-blue schematic |
| Mission | `gamePhase`: `'infiltrate'`→`'exfil'`→`'complete'`. `pickup`, `exfilPoints`, `gapExits` |
| Draw order | `drawFloor` → `drawWalls` → `drawLamps` → `drawEnemies()` → `drawProjectiles` → `drawPlayer` → `drawLighting` → `drawFog` → **`drawSoundEvents()`** → **`drawEnemyLabels()`** → `drawExfilPoints` → `drawGapExits` → `drawPickup` → `drawMapGeometry` |
| Input | Gamepad primary. E/button 2 (X) = interact. RT/button 7 = fire. B/button 1 = reset |
| Footstep | `notifyPlayerMoved()` called each frame player actually moved — enemy.js manages 30-frame footstep cadence |

**Critical: `isLit` vs `isLitByLamps`**
- `isLit` returns true within 80px of player (player's own glow) — use for pickup/exfil visibility
- `isLitByLamps` excludes the player glow AND applies half-plane clip matching `drawLighting` — use for enemy cone detection. Without the half-plane clip, a lamp on the far side of a wall wrongly passes the circle-distance test.

---

## 4. enemy.js — Architecture

`enemy.js` loads before `game.js`. Any constant in `enemy.js` that references a `game.js` global at module scope (not inside a function) will be `undefined`. This is why `STANDARD_VISION = Math.PI * 2 / 3` is a local literal rather than referencing `VISION_ANGLE`.

### Enemy data model (full runtime object)

```javascript
{
  // INITIAL_ENEMIES fields (designer-set):
  x, y, angle, targetAngle,
  visionAngle,      // cone width (STANDARD_VISION = 120°)
  sightRange,       // max detection distance in lit conditions (Infinity = unlimited)
  proximityRadius,  // awareness bubble radius (50px default)
  patrolSpeed,      // px/frame during movement (1.5 default)
  patrolRoute,      // array of patrol nodes ([] = static)

  // resetEnemies() adds:
  index,            // 1-based debug label (shown as cyan badge above enemy)
  state,            // 'patrol' | 'suspicious' | 'alert' | 'cautious'
  alertTimer,       // 180 frames (3s) countdown in alert state
  suspicionTimer,   // counts up while suspicious; 300 frames (5s) timeout for level-1
  reactionTimer,    // 45-frame delay before pending state change applies (opportunity window)
  pendingReaction,  // { state, targetAngle, sourceX, sourceY }
  suspicionLevel,   // how many times entered suspicious from patrol this session
  suspicionPhase,   // 'turning' | 'moving' | 'searching' | 'returning'
  suspicionSourceX/Y,   // position of the stimulus that triggered suspicion
  suspicionReturnX/Y,   // position to return to after level-2+ investigation
  suspicionSearchAccum, // accumulated rotation during investigation search sweep
  suspicionOriginalAngle, // targetAngle saved at suspicion entry; restored on return to patrol
  patrolIndex,      // current target waypoint index
  patrolPauseTimer, // counts UP to node.pauseFrames
  patrolSweepAccum, // accumulated |rotation| at current node
  enemyFootstepTimer, // counts up; emits footstep ring every 30 frames while moving
}
```

### Key functions in enemy.js

| Function | Purpose |
|----------|---------|
| `resetEnemies()` | Initializes enemies array from INITIAL_ENEMIES + runtime fields |
| `scheduleReaction(e, toState, targetAngle, sourceX, sourceY)` | Queues a delayed state change (noop if already reacting) |
| `applySoundReaction(e, sourceX, sourceY)` | Applies sound-triggered state transitions |
| `notifyPlayerMoved()` | Manages 30-frame footstep cadence; emits per-enemy radius footstep |
| `emitSound(x, y, radius, isGunshot)` | Gunshot with direct-observation bypass; footstep two-phase |
| `pawnInCone(ex, ey, eAngle, visionAngle, tx, ty)` | Parameterized cone angle check |
| `hasLOS(x1, y1, x2, y2)` | Single ray; true if no wall between two points |
| `enemyCanSeeCone(e)` | Vision cone + LOS + light check (no proximity bubble) |
| `updateEnemies()` | Main per-frame AI loop (6 steps — see below) |
| `drawSoundEvents()` | Expanding rings for gunshot (yellow) and footstep (grey) |
| `drawEnemies()` | Sight cones, proximity circles, pawn bodies, overhead indicators |
| `drawEnemyLabels()` | Always-visible cyan number badges (1, 2, 3) drawn after fog |

### updateEnemies() step order

1. Tick sound event lifetimes
2. Per enemy: apply pending reaction if reactionTimer expired (sets suspicion fields)
3. Immediate: vision cone detection → always overrides to alert, clears pending
4. Delayed: proximity detection → scheduleReaction to alert if not already reacting
5. Suspicious state machine (4 phases: turning / moving / searching / returning)
6. Alert countdown → cautious on expiry
7. Patrol movement (only when state === 'patrol' and patrolRoute.length > 0)
8. Angle lerp: `t=0.04` in patrol, `t=0.10` in all other states

### Suspicion two-level system

- **Level 1** (first time suspicious from patrol): turn toward source in place; `?` shown; 5s timeout → patrol + restore original facing
- **Level 2+**: move to source position; 180° search sweep at source; return to original position + restore original facing; then patrol resumes

### Sound detection rules

- Sound → suspicious (two-phase). Second sound while suspicious → immediate alert.
- Gunshot directly observed (in enemy vision cone + LOS) → immediate alert, skips suspicious.
- Cautious + any sound → immediate alert (skips suspicious).
- Proximity from behind (avoids cone) → 45-frame delayed alert (opportunity window).
- Sound rings visible through darkness and fog (drawn after both layers).

---

## 5. Patrol Node Data Model

```javascript
{ x, y, pauseFrames: 0, sweep: 0, sweepSpeed: 0.012 }
// sweep: radians to rotate while paused (0 = face next waypoint on arrival)
// sweepSpeed: positive = CW, negative = CCW
// pauseFrames: Infinity = wait forever (for pure pivot rotation)
```

Patrol update sequence per node: **move to position → sweep (if any) → pause → advance**.

---

## 6. Current Enemy Positions (TEST LAYOUT — see note)

> ⚠️ Enemies 1 and 2 are in a **test layout** for debugging the suspicion system. Restore to production layout before implementing Feature 07.

| # | Current (test) | Production | Behavior |
|---|---------------|------------|----------|
| 1 | (250, 520) lobby, static | Lobby left-right patrol | patrolRoute: [] for test |
| 2 | (500, 520) lobby, short patrol | Lobby left-right patrol | 420↔580, pauseFrames:240 |
| 3 | (200, 229) Room A | Room A → Corridor → Room BC | Cross-room patrol, 180° sweep at ends |

**Production INITIAL_ENEMIES to restore for Enemy 1:**
```javascript
{ x: 400, y: 590, patrolSpeed: 1.5, patrolRoute: [
  { x: 150, y: 590, pauseFrames: 240, sweep: 0, sweepSpeed: 0 },
  { x: 750, y: 590, pauseFrames: 240, sweep: 0, sweepSpeed: 0 },
]}
```

**Enemy 3 cross-room patrol (already correct in code):**
```javascript
{ x: 200, y: 229, patrolSpeed: 1.5, patrolRoute: [
  { x: 200, y: 229, pauseFrames: 60, sweep: Math.PI, sweepSpeed: 0.008 }, // Room A — sweep CW
  { x: 409, y: 295, pauseFrames: 0,  sweep: 0,       sweepSpeed: 0     }, // Room A gap
  { x: 589, y: 229, pauseFrames: 0,  sweep: 0,       sweepSpeed: 0     }, // Corridor
  { x: 769, y: 210, pauseFrames: 0,  sweep: 0,       sweepSpeed: 0     }, // Room BC gap
  { x: 930, y: 229, pauseFrames: 60, sweep: Math.PI, sweepSpeed: 0.008 }, // Room BC — sweep CW
  { x: 769, y: 210, pauseFrames: 0,  sweep: 0,       sweepSpeed: 0     }, // Room BC gap (return)
  { x: 589, y: 229, pauseFrames: 0,  sweep: 0,       sweepSpeed: 0     }, // Corridor (return)
  { x: 409, y: 295, pauseFrames: 0,  sweep: 0,       sweepSpeed: 0     }, // Room A gap (return)
]}
```

---

## 7. Feature Build Order

| # | Feature | Status |
|---|---------|--------|
| 00 | Pawn movement & vision spec | ✅ Done |
| 01 | Wall structures | ✅ Done |
| 02 | Lighting | ✅ Done |
| 03 | Objective pickup + exfil | ✅ Done |
| 04 | Enemy sight detection | ✅ Done |
| 05 | Enemy sound detection | ✅ Done |
| 06 | Enemy movement & patrol | ✅ Done |
| 07 | **Enemy AI state machine** | ⬅ **NEXT** (design doc written) |
| 08 | Walk vs. run + noise tradeoff | Pending |

---

## 8. Next Feature: Feature 07 — Enemy AI State Machine

Design doc: `design/feature_07_enemy_ai_state_machine.md` — read it before implementing.

### What's already done (slipped in from F06)
- Suspicion investigation movement (level 1/2 phases) — fully implemented in enemy.js

### What F07 needs to implement

**1. Alert timer refresh**
Currently `alertTimer` counts down even if the player stays visible. Fix: in step 3 (vision cone detection), when `e.state === 'alert'`, reset `alertTimer = ALERT_FRAMES` each frame. Enemy stays alert as long as it can see the player. Also update `lastKnownX/Y` every frame while alert.

**2. Alert pursuit**
While `state === 'alert'`, enemy moves toward player's current position. Same movement primitives as patrol (patrolSpeed, pushOutOfWalls). targetAngle already set by detection step.

**3. SEARCHING state** (new state — between alert and cautious)
- Entry: when `alertTimer` reaches 0 and `lastKnownX/Y` is set
- Navigate to `lastKnownX/Y` using nav graph BFS path (see below)
- On arrival: 270° search sweep
- If player spotted during search → back to alert
- If sweep completes → cautious

**4. Nav graph BFS** (designed in F06 doc, not yet coded)
```javascript
const NAV_NODES = {
  lobby: {x:460,y:590}, gap_corr_left: {x:270,y:449}, gap_corr_right: {x:819,y:449},
  corridor: {x:589,y:229}, gap_room_a: {x:409,y:295}, room_a: {x:200,y:229},
  gap_room_bc: {x:769,y:210}, room_bc: {x:930,y:229}, gap_room_f: {x:909,y:590}, room_f: {x:991,y:590},
};
const NAV_EDGES = [
  ['lobby','gap_corr_left'],['gap_corr_left','corridor'],
  ['lobby','gap_corr_right'],['gap_corr_right','gap_room_f'],['gap_room_f','room_f'],
  ['corridor','gap_room_a'],['gap_room_a','room_a'],
  ['corridor','gap_room_bc'],['gap_room_bc','room_bc'],
];
```
`buildPath(fromX, fromY, toX, toY)` → BFS → ordered `{x,y}` waypoint array.

**New fields to add to resetEnemies():**
```javascript
lastKnownX: 0, lastKnownY: 0,
searchPath: [], searchPathIndex: 0, searchSweepAccum: 0,
```

### F07 state diagram
```
patrol → suspicious → alert → searching → cautious
                        ↑          │
                        └──────────┘ (re-detected during search)
```

---

## 9. Gap/Door Coordinates

| Passage | Center point | Connects |
|---------|-------------|----------|
| Entry gap (bottom) | (500, 741) | Outside → Lobby (primary exfil) |
| Corridor left gap | (270, 449) | Lobby ↔ upper rooms |
| Corridor right gap | (819, 449) | Lobby ↔ Room F area |
| Room A east wall gap | (409, 295) | Room A ↔ Corridor |
| Room B/C divider gap | (769, 210) | Room B ↔ Room C |
| Room F west wall gap | (909, 590) | Lobby/Corridor ↔ Room F |
| Left perimeter duct | (9, 190) | Room A → bonus exfil |
| Right perimeter duct | (1091, 190) | Room BC → bonus exfil |

---

## 10. Coding Conventions

- **Two files:** `enemy.js` (enemy logic) loaded before `game.js` (game infrastructure). No modules, no bundler.
- **Load order constraint:** `enemy.js` module-scope code cannot reference `game.js` globals. Use local literals for mirrored constants (e.g., `STANDARD_VISION = Math.PI * 2 / 3` not `VISION_ANGLE`).
- **Angle convention:** `angle=0` = facing UP. Direction = `(sin(angle), -cos(angle))`. Canvas ray angle = `pawn.angle - Math.PI/2`. World bearing = `atan2(dx, -dy)`.
- **Visibility polygon:** Corner angles stored as `forward + diff` (unwrapped), NOT raw `atan2` — prevents crossed polygon edges when facing near ±180°.
- **`isLitByLamps` vs `isLit`:** Always use `isLitByLamps` for enemy detection. `isLit` includes player self-glow and lacks half-plane clip — both cause false positives.
- **`computeVisibilityPolygon(px, py, angle, visionAngle)`:** 4th param defaults to `VISION_ANGLE`. Pass `e.visionAngle` for enemy sight cone visualization.
- **Patrol turn rate:** `0.04` in patrol state, `0.10` when suspicious/alert/cautious.
- **Sound rings draw order:** After `drawFog()` in `draw()` — visible through darkness and walls.
- **`pushOutOfWalls` called twice:** Standard for all moving entities (resolves corner cases).
- **Plan mode before non-trivial changes.** Design doc before implementation for each feature.
- **CLAUDE.md rules:** Simplicity first, surgical changes only, no speculative features.

---

## 11. Working Style

- One feature at a time. Do not implement ahead.
- Non-trivial features get a design doc written first before any code.
- Plan mode is used for anything with significant design decisions.
- Gamepad is primary; keyboard (WASD + E) secondary. Interact = E/button 2 (X). Fire = RT/button 7. Reset = B/button 1.
- Feature doc status lines updated to `DONE` when complete.
- Session handoff docs live in `Operation guide/`.
