# Feature 04 — Enemy Sight Detection

**Status: PENDING**

---

## Why enemy.js

Features 04–08 cover the full enemy AI system: sight detection, sound detection, patrol movement, state machine, and the walk/run noise tradeoff. This is estimated at 200–350 lines of new logic. `game.js` is already 696 lines, and adding everything there would make the file hard to navigate.

**Solution:** a dedicated `enemy.js`, loaded via a second `<script>` tag in `index.html`. No build system or server required — the two files share the same global scope exactly as before.

```html
<!-- index.html load order -->
<script src="enemy.js"></script>
<script src="game.js"></script>
```

`enemy.js` defines functions as globals. `game.js` calls them. Because functions only execute after both scripts are fully parsed, cross-file references work in either load order — but loading `enemy.js` first is cleaner.

### What lives where

| Concern | File |
|---------|------|
| `INITIAL_ENEMIES`, `let enemies`, `ENEMY_HIT_RADIUS` | `enemy.js` (moved from game.js) |
| `drawEnemy()` | `enemy.js` (moved, renamed to `drawEnemies()`) |
| `updateEnemies()` | `enemy.js` (new) |
| `resetEnemies()` | `enemy.js` (new) |
| Projectile-hits-enemy collision | `game.js` (stays — involves projectiles, references `enemies` global) |
| `update()` → calls `updateEnemies()` | `game.js` (one-line addition) |
| `draw()` → calls `drawEnemies()` | `game.js` (replaces inline loop) |
| `reset()` → calls `resetEnemies()` | `game.js` (one-line addition) |

### Globals enemy.js reads from game.js

`WALLS`, `WALL_SEGMENTS`, `VISION_ANGLE`, `player`, `LAMPS`, `castVisRay`, `isLit`, `lerpAngle`, `pushOutOfWalls`

All of these are already module-scope globals in `game.js`. No changes needed there.

---

## Feature 04 — Enemy Sight Detection

Enemies can now detect the player. No movement yet — enemies remain static in their starting positions. No game-over yet — detection is a state change with visual feedback only.

---

## Enemy Data Model

The enemy object gains state fields:

```javascript
const INITIAL_ENEMIES = [
  { x: 600, y: 600, angle:  Math.PI,        targetAngle:  Math.PI        }, // Lobby — faces south
  { x: 580, y: 220, angle:  Math.PI * 1.5,  targetAngle:  Math.PI * 1.5  }, // Room B — faces west
  { x: 940, y: 590, angle: -Math.PI / 2,    targetAngle: -Math.PI / 2    }, // Room F — faces west
];
```

Full runtime object shape:

```javascript
{
  x, y,
  angle,        // current facing (game convention: 0 = up)
  targetAngle,  // lerp target for smooth rotation
  state: 'patrol',   // 'patrol' | 'alert' | 'cautious'
  alertTimer: 0,     // frames remaining in current alert window
}
```

`state` and `alertTimer` are added by `resetEnemies()` when building from `INITIAL_ENEMIES`.

---

## Detection Algorithm

### Core predicate — `enemyCanSeePlayer(e)`

Run once per enemy per frame in `updateEnemies()`.

```
1. dist ← distance(e, player)
2. if dist ≤ PROXIMITY_RADIUS (50px) → detected          // awareness bubble, ignores facing
3. if !pawnInCone(e.x, e.y, e.angle, player.x, player.y) → not detected
4. maxRange ← isLit(player.x, player.y) ? Infinity : DARK_SIGHT_RANGE (120px)
5. if dist > maxRange → not detected
6. if !hasLOS(e.x, e.y, player.x, player.y) → not detected
7. → detected
```

Step 4 is the light-level modifier: an enemy can only see a dark player out to 120px. This lets the player use lamp destruction as a stealth tool.

### Helper — `pawnInCone(ex, ey, eAngle, tx, ty)`

Parameterized version of `game.js`'s `inVisionCone`. Same math, no player coupling:

```javascript
function pawnInCone(ex, ey, eAngle, tx, ty) {
  const dx = tx - ex, dy = ty - ey;
  if (dx === 0 && dy === 0) return true;
  const bearing = Math.atan2(dx, -dy);
  let diff = bearing - eAngle;
  while (diff >  Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return Math.abs(diff) <= VISION_ANGLE / 2;
}
```

### Helper — `hasLOS(x1, y1, x2, y2)`

Casts a single ray from `(x1, y1)` toward `(x2, y2)` and checks whether the first wall hit is farther away than the target. One ray per call — not the full visibility polygon.

```javascript
function hasLOS(x1, y1, x2, y2) {
  const angle = Math.atan2(y2 - y1, x2 - x1); // canvas-math angle, 0 = right
  const hit = castVisRay(x1, y1, angle);
  if (!hit) return true; // no wall in that direction (shouldn't happen inside the perimeter)
  const distToTarget = (x2 - x1) ** 2 + (y2 - y1) ** 2;
  const distToWall   = (hit.x - x1) ** 2 + (hit.y - y1) ** 2;
  return distToWall >= distToTarget;
}
```

**Why `Math.atan2(y2 - y1, x2 - x1)` and not the game angle convention?**
`castVisRay` takes canvas-space angles (0 = right, increases clockwise). The game's pawn angle convention (0 = up) applies to *facing*, not to ray directions. `hasLOS` computes a ray direction, so it uses canvas math directly. No `-π/2` offset needed here.

---

## State Machine (Feature 04 scope)

| State | Enters when | Exits when | Facing |
|-------|------------|------------|--------|
| `patrol` | default / alertTimer expires | player detected | fixed initial angle |
| `alert` | player detected | player undetected for 180 frames | lerps toward player |
| `cautious` | alert timer expires | — (permanent until reset) | last known player direction |

`cautious` is permanent within the session — guards don't fully relax once they've spotted someone. This is a core design rule from the FDD.

### alertTimer behavior

- On detection: `alertTimer = 180` (3 seconds at 60fps), `state = 'alert'`
- Each frame in alert while player detected: `alertTimer = 180` (reset, stays alert)
- Each frame in alert while player NOT detected: `alertTimer--`
- When `alertTimer` reaches 0: `state = 'cautious'`, stop chasing angle

---

## Visual Feedback

| State | Enemy rendering | Overhead indicator |
|-------|----------------|--------------------|
| `patrol` | normal red pawn | none |
| `alert` | bright orange pawn (tint shift) | yellow `!` 30px above center |
| `cautious` | muted orange pawn | grey `?` 30px above center |

Indicator only visible when the enemy itself is visible to the player (same `inVisionCone` + `isLit` rule as pickups). No HUD element — all feedback is in-world.

No alarm, no game-over, no score penalty in this feature — consequences are Feature 07 scope.

---

## Integration changes to game.js (minimal)

```javascript
// update() — after pushOutOfWalls calls
updateEnemies();

// draw() — replace:
//   for (const e of enemies) drawEnemy(e);
// with:
drawEnemies();

// reset() — add:
resetEnemies();
```

Remove from `game.js`: `INITIAL_ENEMIES`, `let enemies`, `ENEMY_HIT_RADIUS`, `drawEnemy`.
Add to `index.html`: `<script src="enemy.js"></script>` before `game.js`.

---

## Coding conventions (enemy.js)

- Same angle convention as game.js: `angle=0` = facing up, `dx = sin(angle)`, `dy = -cos(angle)`
- Same lerp pattern: `e.angle = lerpAngle(e.angle, e.targetAngle, 0.12)` (slightly slower than player's 0.18)
- `enemies` is a module-scope `let` — global, mutable, reset each session
- No classes, no closures — plain objects and functions, matching game.js style
