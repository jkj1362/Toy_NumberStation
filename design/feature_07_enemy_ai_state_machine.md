# Feature 07 — Enemy AI State Machine

**Status: DONE**

---

## Overview

Feature 07 completes the enemy AI behavior loop. Features 04–06 built detection predicates (when to change states) and patrol movement (what enemies do when unalerted). Feature 07 adds what enemies do when alerted: chase the player, lose sight, search the last known location, then give up.

Two pieces that slipped into F06 at user request are already implemented and stay there:
- Two-phase detection (suspicious/alert, reaction delay) — F05/F06
- Suspicion investigation movement (level 1/2 phases) — F06

F07 owns: **alert pursuit, alert timer refresh, SEARCHING state, nav graph BFS.**

---

## State Diagram

```
patrol ──(detection)──→ suspicious ──(confirmed)──→ alert ──(loses sight, has lastKnown)──→ searching ──(sweep done)──→ patrol
   ↑                          │                       ↑                    │                                              │
   │                          │                       └──(re-detected)─────┘                                              │
   └──(suspicion timeout)─────┘                                                                                            │
   │                                                                                                                       │
   └──(alert expires, no lastKnown — sound-only) ←─────────────────────────────────────────────────────────────────────────┘
```

Every reactive state eventually resolves back to `patrol`. The original `cautious` state from the design is now modeled as a **lingering vigilance flag** (`cautiousTimer`, 30 s) that coexists with `patrol`:

- Any reactive→patrol transition arms `cautiousTimer = CAUTIOUS_FRAMES` (1800 frames @ 60 fps).
- While `cautiousTimer > 0`, sound during patrol skips the suspicion delay and snaps straight to alert.
- The timer ticks down each frame regardless of state; after 30 s of no new reactive incidents the enemy fully relaxes.
- Visually, an enemy renders as `cautious` whenever `state === 'searching'` or `state === 'patrol' && cautiousTimer > 0`.

F07 adds the `searching` state and fills in what `alert` does beyond facing the player.

---

## Scope Boundary (F04–F07)

| Feature | Owns |
|---------|------|
| F04 | Detection predicates — cone, LOS, proximity, light check |
| F05 | Sound propagation, two-phase detection triggers |
| F06 | Patrol movement, suspicion investigation movement (bonus) |
| **F07** | **Alert pursuit, alert timer refresh, SEARCHING state, nav graph BFS** |

---

## Alert Timer Refresh

**Current gap:** `alertTimer` (180 frames) counts down from state entry. If the player stays visible the entire time, the enemy still drops to `cautious` after 3 seconds — even though the threat never left.

**Fix:** In the vision cone detection step, when `e.state === 'alert'`, refresh `alertTimer = ALERT_FRAMES` every frame the player is visible. The enemy stays alert continuously as long as it has eyes on the player.

```javascript
if (enemyCanSeeCone(e)) {
  e.state      = 'alert';
  e.alertTimer = ALERT_FRAMES; // refresh on every frame — not just on entry
  e.targetAngle = Math.atan2(player.x - e.x, -(player.y - e.y));
  e.lastKnownX  = player.x;
  e.lastKnownY  = player.y;
}
```

---

## Alert Pursuit

While `state === 'alert'`, the enemy actively moves toward the player. Uses the same movement primitives as patrol (`patrolSpeed`, `pushOutOfWalls`).

```javascript
if (e.state === 'alert') {
  const dx = player.x - e.x, dy = player.y - e.y;
  const dist2 = dx * dx + dy * dy;
  if (dist2 > ARRIVAL_RADIUS * ARRIVAL_RADIUS) {
    const dist = Math.sqrt(dist2);
    e.x += (dx / dist) * e.patrolSpeed;
    e.y += (dy / dist) * e.patrolSpeed;
    pushOutOfWalls(e, ENEMY_RADIUS);
    pushOutOfWalls(e, ENEMY_RADIUS);
  }
}
```

`targetAngle` is already set toward the player by the detection step — the enemy faces and moves in the same direction.

When `alertTimer` reaches 0 (player broke detection long enough):
- If `lastKnownX/Y` is set → transition to `searching`, build nav path to last known position
- If no last known position (edge case) → `cautious` directly

**Future:** Feature 08 can swap `e.patrolSpeed` for a faster `chaseSpeed` without structural changes.

---

## SEARCHING State

New state between `alert` and `cautious`. Enemy knows roughly where the player was; makes one investigative sweep before giving up.

### Entry
From `alert` when `alertTimer` expires and `lastKnownX/Y` is set.
- Call `buildPath(e.x, e.y, e.lastKnownX, e.lastKnownY)` → store in `e.searchPath`
- Set `e.searchPathIndex = 0`, `e.searchSweepAccum = 0`

### Behavior phases
1. **Navigate** — follow `searchPath` waypoints to `lastKnownX/Y` using patrol movement
2. **Sweep** — on arrival, rotate ~270° (wider than suspicion search sweep of 180°)
3. **Resolve** — if `enemyCanSeeCone(e)` fires at any point → back to `alert`; if sweep completes → `cautious`

### Detection during search
`enemyCanSeeCone(e)` runs every frame (step 2 of `updateEnemies`). If the player is spotted while the enemy is navigating or sweeping, step 2 immediately fires `alert` — no additional check needed in the searching block.

---

## Nav Graph BFS

Designed in the F06 doc, now implemented. Used for reactive movement that needs to route around walls:

- **Alert pursuit** — **LOS-first**: if `hasLOS(e, player)` then straight-line chase; otherwise `buildPath(e.x, e.y, player.x, player.y)` rebuilt each frame. Same-room visible-target pursuit avoids the nav-graph detour and keeps the enemy facing the player cleanly.
- **Suspicion `moving`** — built once on phase entry to `suspicionSourceX/Y`.
- **Suspicion `returning`** — built when transitioning into the phase, target `suspicionReturnX/Y`.
- **SEARCHING navigate** — built once on alert→searching transition, target `lastKnownX/Y`.

A shared `followNavPath(e)` helper advances the enemy one tick along `e.searchPath` (the field is reused across reactive states since they don't overlap). The helper:
- Uses a while-loop so per-frame rebuilds don't oscillate on the start node.
- **Skips a waypoint if `pushOutOfWalls` fully reverts the move** — prevents indefinite stuck-on-wall oscillation when a waypoint sits behind a wall corner.
- Is bounded by `searchPath.length + 1` iterations so a fully-blocked path resolves to "arrived" rather than infinite-looping.

Patrol routes are unchanged — manually placed gap waypoints continue to drive patrol movement.

### Nodes and edges

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

### `buildPath(fromX, fromY, toX, toY)`

```
1. Find nearest NAV_NODE to (fromX, fromY) → startNode
2. Find nearest NAV_NODE to (toX, toY) → endNode
3. BFS from startNode to endNode along NAV_EDGES
4. Return ordered array of {x, y} waypoints (nav nodes along path + final destination)
```

Returns `[]` if from and to are in the same nav node (enemy is already there — skip navigation, go straight to sweep).

---

## Enemy Data Model Additions

```javascript
// Added to resetEnemies():
lastKnownX:      0,  // player position at last confirmed sighting
lastKnownY:      0,
searchPath:      [], // nav waypoints to last known position
searchPathIndex: 0,  // current waypoint index in searchPath
searchSweepAccum: 0, // accumulated rotation during search sweep at destination
```

---

## `updateEnemies()` Changes Summary

| Step | Current | F07 change |
|------|---------|------------|
| Step 2 (vision cone) | Sets alert on entry only | Also refreshes `alertTimer` + updates `lastKnownX/Y` every frame |
| Step 5 (alert countdown) | Expiry → `cautious` | Expiry → `searching` (with `buildPath`) if `lastKnownX/Y` set; else `cautious` |
| New step 5b | — | SEARCHING block: navigate `searchPath`, sweep on arrival, sweep done → `cautious` |
| Step 6 (patrol movement) | Runs when `patrol` state | Add alert pursuit block: moves toward player when `alert` |

---

## Visual Feedback

No new visual states needed — `alert` (orange + `!`) and `cautious` (muted + `?`) already exist. `searching` uses the same visual as `cautious` since the player may not know if the enemy is still actively searching or has given up. Could be differentiated later (e.g., amber `?` while navigating, grey `?` on sweep).

---

## File separation verdict

All changes go in `enemy.js`. A separate `enemyAI.js` would require 3-way dependencies (`enemy.js` + `game.js`) with no clean conceptual boundary. At ~580 lines post-F07 the file remains manageable.
