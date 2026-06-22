# Feature 03 — Objective Pickup & Exfil

**Status: DONE** — implemented in game.js

---

## Overview — Two-Phase Mission Loop

The night mission has two sequential phases:

| Phase | Name | Goal | Ends when |
|-------|------|------|-----------|
| 1 | **INFILTRATE** | Find and acquire the objective | Player interacts with the pickup |
| 2 | **EXFIL** | Escape the facility | Player reaches any active exfil point |

Exfil points are completely inert in Phase 1 — the player cannot escape before completing the objective. Phase transition is one-way and irreversible within a session.

The "objective" is defined loosely. For this prototype it is a physical pickup item. In future builds, any mission type (assassination, sabotage, intel collection) transitions to Phase 2 upon completion — the pickup is just one form of mission resolution.

---

## Room Registry

To support random placement, all rooms are registered with their navigable bounds and eligibility flags. This becomes a constant in `game.js` alongside `WALLS`.

```javascript
const ROOMS = [
  // id            cx    cy    Approx navigable bounds        startingSpace
  { id: 'lobby',   cx: 460, cy: 590, x:  18, y: 458, w: 882, h: 274, startingSpace: true  },
  { id: 'room_a',  cx: 200, cy: 229, x:  18, y:  18, w: 382, h: 422, startingSpace: false },
  { id: 'corridor',cx: 589, cy: 229, x: 418, y:  18, w: 342, h: 422, startingSpace: false },
  { id: 'room_bc', cx: 930, cy: 229, x: 778, y:  18, w: 304, h: 422, startingSpace: false },
  { id: 'room_f',  cx: 991, cy: 590, x: 918, y: 458, w: 164, h: 274, startingSpace: false },
];
```

`cx, cy` = room center, used as the default spawn point for any entity placed in that room.

**Eligibility rules:**

| | Pickup | Secondary exfil |
|--|--------|-----------------|
| Starting space | ❌ | ❌ |
| Same room as pickup | — | ❌ |
| Multiple secondaries in same room | — | ❌ (future) |

**Placement algorithm (run once per session / reset):**

1. Filter `ROOMS` to `startingSpace: false` → eligible pool
2. Shuffle pool → pick first room = **pickup room**
3. Remove pickup room from pool → pick first from remainder = **secondary exfil room**
4. (Future) Repeat step 3 for each additional secondary exfil, shrinking the pool

---

## Pickup / Objective

### Data

```javascript
let pickup = {
  x, y,           // world position (room center of chosen room)
  roomId,         // which room it landed in
  collected: false,
  visibleToPlayer: false, // recomputed each frame
};
```

### Placement

On `init()` and `reset()`: run the placement algorithm, assign `pickup.x/y` to the chosen room's `cx/cy`, store `roomId`.

### Visual States

| State | Render |
|-------|--------|
| Collected | Nothing |
| Not collected, outside vision cone | `!` exclamation mark icon (yellow, world-space, always drawn) |
| Not collected, inside vision cone | Actual pickup shape (glowing diamond / small square) |

The `visibleToPlayer` flag is computed each frame in `update()` by checking whether the pickup position falls inside the player's vision arc (same math used by future enemy sight detection — see `feature_00_pawn_movement_vision.md`).

**`!` icon:** White or yellow exclamation mark, drawn at `(pickup.x, pickup.y - 20)` so it floats above the ground position. Always rendered even through darkness — it is a HUD-style world marker.

**Actual shape:** A small glowing diamond (rotated square, ~12px, bright yellow `#ffe066`). Drawn only when `visibleToPlayer`.

### Interaction

- **Keyboard:** `E` key (one-shot — `eWasPressed` pattern, same as existing B/RT buttons)
- **Gamepad:** Button 0 (A button), one-shot

Trigger condition (checked every frame in `update()`):
```
distance(player, pickup) < INTERACT_RADIUS  AND  interact pressed (one-shot)
```

On trigger: `pickup.collected = true` → activate all exfil points → set `gamePhase = 'exfil'`.

---

## Exfil Points

### Data

```javascript
let exfilPoints = [
  { x: 500, y: 741, type: 'primary',   roomId: 'entry_gap', active: false, discovered: true  },
  { x,      y,      type: 'secondary', roomId,              active: false, discovered: false },
];
```

Primary exfil is always pre-discovered (the player came in through it). Secondary starts undiscovered.

### Primary Exfil — Entry Gap

- **Position:** `x: 500, y: 741` — center of the entry gap at the bottom of the canvas (`x:430–570, y:732`)
- **Always here.** Never randomised.
- **Always discovered.** No detection needed.
- **Activates** when `pickup.collected` becomes true.

### Secondary Exfil — Hidden

- **Position:** Room center of the randomly chosen secondary exfil room (not Lobby, not pickup room)
- **Discovery:** Each frame in Phase 1, check if the secondary exfil position falls inside the player's vision cone. If yes: `exfil.discovered = true` (permanent flag, never reverts)
- **Activates** simultaneously with primary when pickup is collected

### Placement

Run alongside pickup placement in `init()` / `reset()` using the algorithm above.

### Visual States

| State | Render |
|-------|--------|
| `!discovered` (testing mode) | Dim grey circle, radius 16px — visible to developer, invisible in final |
| `!discovered` (final) | Nothing — completely hidden until player finds it |
| `discovered && !active` | Downward arrow (grey) — "exit found, not yet active" |
| `discovered && active` | Downward arrow (bright green `#44ff88`) — "escape here" |
| Primary, `!active` | Entry gap ground marker (grey chevron pointing down) |
| Primary, `active` | Entry gap ground marker (bright green chevron) |

> **Testing note:** Secondary exfil currently drawn as a dim circle regardless of `discovered` so it is easy to locate during development. Once testing is complete, remove the unconditional draw and show nothing until `discovered`.

### Exfil Trigger

Checked every frame in Phase 2 only:
```
for each exfil where active:
  if distance(player, exfil) < EXFIL_RADIUS → mission complete
```

On complete: `gamePhase = 'complete'`. For now: `console.log('MISSION COMPLETE')` and call `reset()` after a short delay. Full end-of-mission flow deferred to the day-cycle system.

---

## Constants

```javascript
const INTERACT_RADIUS = 30;  // px — pickup collection range
const EXFIL_RADIUS    = 40;  // px — exfil trigger range
```

---

## Vision Cone Check (shared helper)

Both pickup visibility and secondary exfil discovery use the same geometric test — "does this world point fall inside the player's vision cone?" This should be extracted as a reusable helper:

```javascript
function inVisionCone(px, py, wx, wy) {
  const dx = wx - px, dy = wy - py;
  if (dx === 0 && dy === 0) return true;
  // Bearing from player to world point, in game-angle space
  const bearing = Math.atan2(dx, -dy);
  let diff = bearing - player.angle;
  while (diff >  Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return Math.abs(diff) <= VISION_ANGLE / 2;
}
```

This function reuses `VISION_ANGLE` from `feature_00_pawn_movement_vision.md` and will be the basis for enemy sight detection in Feature 04.

---

## Phase Transition Summary

```
gamePhase = 'infiltrate'
  │
  │  player near pickup + interact key
  ▼
gamePhase = 'exfil'
  │  pickup.collected = true
  │  all exfil.active = true
  │
  │  player near any active exfil
  ▼
gamePhase = 'complete'
  │  console.log / reset (temporary)
```

---

## Draw Order

```
drawFloor()
drawWalls()
drawLamps()
drawExfilPoints()   ← NEW — drawn under pawns
drawPickup()        ← NEW — drawn under pawns
[ enemies ]
[ projectiles ]
drawPlayer()
drawLighting()
drawFog()
```

Pickup and exfil markers sit below the pawn layer so characters stand on top of them. Both are drawn **before** `drawLighting()` and `drawFog()` — the darkness and vision cone naturally occlude them. The `!` icon is an exception: it should remain visible even through darkness (draw it after fog, or give it special treatment — decide during implementation).

---

## Implementation Checklist

- [x] Add `ROOMS` constant
- [x] Add `INTERACT_RADIUS`, `EXFIL_RADIUS` constants
- [x] Add `inVisionCone(px, py, wx, wy)` helper
- [x] Add `pickup` object + `initPickup()` placement function
- [x] Add `exfilPoints` array + `initExfil(pickupRoomId)` placement function
- [x] Add `gamePhase` variable (`'infiltrate'` | `'exfil'` | `'complete'`)
- [x] Add `eWasPressed` one-shot state for E key / button 0
- [x] Add pickup collect logic in `update()` (phase 1 only)
- [x] Add exfil trigger logic in `update()` (phase 2 only)
- [x] Add secondary exfil discovery logic in `update()` (phase 1, vision cone check)
- [x] Add pickup `visibleToPlayer` recompute in `update()`
- [x] Add `drawPickup()` — `!` icon or diamond based on `visibleToPlayer`
- [x] Add `drawExfilPoints()` — primary chevron + secondary (dim circle testing / arrow final)
- [x] Insert `drawExfilPoints()` and `drawPickup()` in `draw()` before enemies
- [x] Update `reset()` to re-run `initPickup()` + `initExfil()`, reset `gamePhase`

---

## Open Questions (Deferred)

| # | Question | Decision |
|---|----------|----------|
| 1 | Cap on max exfil points relative to map size | Deferred — depends on final map scale |
| 2 | What "mission complete" triggers (score screen, day-cycle transition) | Deferred to day-cycle system |
| 3 | Secondary exfil hidden icon style post-testing | Currently dim circle; hide entirely once testing done |
| 4 | Multiple mission types beyond pickup (assassination, sabotage) | Phase 2 trigger generalises — mission type sets `gamePhase = 'exfil'` on completion |
| 5 | Wall openings as additional exfil points (windows, ducts) | **Next pass** — Add dedicated wall gaps (like the entry gap) in interior or perimeter walls that serve as exfil-only passages. Visually distinguished as a window frame or duct grate. Requires adding gap coordinates to the wall geometry and registering them as secondary exfil spawn candidates. Placement rules same as regular secondary exfil (not in starting space, not same room as pickup). |
