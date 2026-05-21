# Feature 06 — Enemy Movement & Patrol

**Status: PENDING**

---

## Overview

Feature 06 adds autonomous movement to enemies. All three patrol profile types (static, rotation, waypoint) use a unified data model and are composable — any waypoint stop can include a pause and a rotation sweep, allowing complex behaviors from simple building blocks. Cross-room patrol uses a navigation graph with automatic BFS pathfinding so the designer only specifies high-level destinations.

---

## Patrol Profile Types

### Type 1 — None (static)
Enemy stays at spawn position. Current behavior. `patrolRoute: []`.

### Type 2-1 — Pivot rotation
Enemy stays at a fixed position and rotates. Implemented as a single waypoint with `pauseFrames: Infinity` and a `sweep` value. No translation. Full 360° rotation or partial arc depending on `sweep`.

### Type 2-2 — In-room waypoints
Enemy moves between 2+ explicitly placed positions within one room. Can optionally pause and sweep at each stop before continuing to the next.

### Type 3 — Cross-room waypoints
Same as 2-2 but the route spans multiple rooms. The designer specifies high-level destination positions (or nav node IDs). At `resetEnemies()`, `buildPatrolPath` runs BFS on the navigation graph and inserts intermediate gap-crossing nodes automatically. No manual gap waypoints required in `INITIAL_ENEMIES`.

### Composability

All types share the same `patrolRoute` array. Any route can mix translation, pausing, and rotation at each node. Examples:
- Walk to point → pause 3s → sweep 90° → continue
- Pivot rotation at corner (one node, infinite pause, full sweep)
- Multi-stop cross-room route with a sweep at each room entrance

---

## Patrol Node Data Model

Each entry in `patrolRoute` describes one stop:

```javascript
{
  x, y,              // world position to move to
  pauseFrames: 0,    // frames to wait after arrival (0 = continue immediately)
  sweep: 0,          // total rotation in radians while paused (0 = face next node on arrival)
  sweepSpeed: 0.012, // radians/frame during sweep (positive = clockwise)
}
```

Special values:
- `pauseFrames: Infinity` — wait indefinitely at this node (used for pure rotation)
- `sweep: Math.PI * 2` — full 360° rotation
- `sweep: 0` — on arrival, face toward the next waypoint and proceed

---

## Enemy Data Model Additions

Fields added to each enemy in `INITIAL_ENEMIES` (designer-set):

```javascript
patrolRoute: [],   // array of patrol nodes; [] = static (Type 1)
patrolSpeed: 1.5,  // px/frame during translation between nodes
```

Fields added by `resetEnemies()` (runtime state):

```javascript
patrolIndex:      0,  // index of current target node in patrolRoute
patrolPauseTimer: 0,  // counts down while waiting at a node
patrolSweepAccum: 0,  // accumulated |rotation| at current node so far
```

`patrolIndex` cycles: 0 → 1 → … → n-1 → 0.

---

## Navigation Graph

Defined in `enemy.js` for BFS pathfinding. Used when patrol routes reference nav node IDs instead of raw coordinates.

```javascript
const NAV_NODES = {
  lobby:          { x: 460, y: 590 },
  gap_corr_left:  { x: 270, y: 449 }, // corridor wall left gap
  gap_corr_right: { x: 819, y: 449 }, // corridor wall right gap
  corridor:       { x: 589, y: 229 },
  gap_room_a:     { x: 409, y: 295 }, // Room A east wall gap
  room_a:         { x: 200, y: 229 },
  gap_room_bc:    { x: 769, y: 210 }, // Room B/C divider gap
  room_bc:        { x: 930, y: 229 },
  gap_room_f:     { x: 909, y: 590 }, // Room F west wall gap
  room_f:         { x: 991, y: 590 },
};

const NAV_EDGES = [
  ['lobby',          'gap_corr_left'],
  ['gap_corr_left',  'corridor'],
  ['lobby',          'gap_corr_right'],
  ['gap_corr_right', 'gap_room_f'],
  ['gap_room_f',     'room_f'],
  ['corridor',       'gap_room_a'],
  ['gap_room_a',     'room_a'],
  ['corridor',       'gap_room_bc'],
  ['gap_room_bc',    'room_bc'],
];
```

`buildPatrolPath(fromId, toId)` runs BFS on this graph and returns the ordered list of nav nodes between the two points (inclusive). Called at `resetEnemies()` to pre-expand any high-level route into a flat `patrolRoute` array of `{ x, y, pauseFrames, sweep, sweepSpeed }` nodes.

---

## Example Configurations

**Enemy 1 — Lobby, 2-point in-room patrol (Type 2-2):**
```javascript
patrolRoute: [
  { x: 250, y: 590, pauseFrames: 90, sweep: 0 },
  { x: 700, y: 590, pauseFrames: 90, sweep: 0 },
],
patrolSpeed: 1.5,
```

**Enemy 2 — Room B, pivot rotation (Type 2-1):**
```javascript
patrolRoute: [
  { x: 580, y: 220, pauseFrames: Infinity, sweep: Math.PI * 2, sweepSpeed: 0.008 },
],
patrolSpeed: 0,
```

**Enemy 3 — Room F, cross-room excursion into lobby (Type 3):**
```javascript
// High-level intent: Room F interior → lobby side → back
// System expands gap_room_f automatically via buildPatrolPath
patrolRoute: [
  { x: 950, y: 540, pauseFrames: 60,       sweep: 0 },
  { x: 820, y: 590, pauseFrames: 60,       sweep: Math.PI / 2, sweepSpeed: 0.015 },
],
// After buildPatrolPath expansion:
// (950,540) → gap_room_f (909,590) → (820,590) → gap_room_f (909,590) → back
patrolSpeed: 1.5,
```

---

## Patrol Update Logic

Added to `updateEnemies()`. Runs only when `e.state === 'patrol'` and `e.patrolRoute.length > 0`.

```
node ← patrolRoute[patrolIndex]

if patrolPauseTimer > 0:
    patrolPauseTimer--
    if node.sweep ≠ 0 and patrolSweepAccum < |node.sweep|:
        e.targetAngle += node.sweepSpeed
        patrolSweepAccum += |node.sweepSpeed|
    if patrolPauseTimer === 0:
        patrolIndex = (patrolIndex + 1) % patrolRoute.length
        patrolSweepAccum = 0

else:  // moving toward node
    dx ← node.x − e.x,  dy ← node.y − e.y
    dist ← √(dx² + dy²)
    if dist ≤ ARRIVAL_RADIUS (8px):
        if node.sweep === 0:
            next ← patrolRoute[(patrolIndex+1) % n]
            e.targetAngle ← atan2(next.x−e.x, −(next.y−e.y))
        patrolPauseTimer ← node.pauseFrames
        patrolSweepAccum ← 0
    else:
        e.x += (dx/dist) × patrolSpeed
        e.y += (dy/dist) × patrolSpeed
        e.targetAngle ← atan2(dx, −dy)   // face direction of travel
        pushOutOfWalls(e, ENEMY_RADIUS)
        pushOutOfWalls(e, ENEMY_RADIUS)
```

`ENEMY_RADIUS = 16px` (smaller than player's 28px, fits through corridor gaps comfortably).

**Interruption:** When an enemy enters `suspicious` or `alert`, the patrol update block is skipped entirely (it gates on `e.state === 'patrol'`). On return to `patrol`, movement resumes from `patrolIndex` — the enemy continues toward their current waypoint, not from the start of the route.

---

## Sound Integration

Moving enemies generate footstep sound events exactly like the player. In `updateEnemies`, after position is updated, if the enemy moved this frame: push a footstep event to `soundEvents` for the test visualization. The radius uses the enemy's `proximityRadius` as the base.

Enemy footstep rings are visible to the player in darkness — the sound-as-hearing mechanic from Feature 05 is now realized. The player can track patrol routes by watching the rings in dark areas.

**Friendly fire:** Enemy footsteps do NOT trigger detection in other enemies. Only the player's sound system reacts to enemy footstep rings.

---

## Door Behavior (Future Extension)

Current level has no door entities — gaps are permanent openings. When doors are implemented, nav nodes at gap positions will trigger a door-open interaction on arrival and door-close on departure. The nav graph node coordinates are already placed at gap centers, so no change to `NAV_NODES` or patrol data is needed. The behavior is triggered by checking proximity to a future `DOORS` array at the waypoint arrival step.

---

## Files to Modify

| File | Change |
|------|--------|
| `enemy.js` | Add `NAV_NODES`, `NAV_EDGES`, `buildPatrolPath()`; add patrol fields to `resetEnemies()`; add patrol update block to `updateEnemies()`; add enemy footstep emission |
| `game.js` | No changes needed |
