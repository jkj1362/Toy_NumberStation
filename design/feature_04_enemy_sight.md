# Feature 04 — Enemy Sight Detection

**Status: DONE**

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

`WALLS`, `WALL_SEGMENTS`, `player`, `LAMPS`, `castVisRay`, `isLit`, `lerpAngle`, `pushOutOfWalls`, `computeVisibilityPolygon`, `inVisionCone`, `ctx`

All of these are already module-scope globals in `game.js`. No changes needed there.

**Note on load order:** `enemy.js` loads first, `game.js` second. `enemy.js` must not reference any `game.js` global at module scope (parse time) — only inside functions, which execute after both scripts are loaded. Enemy constants that mirror game.js values (e.g. the standard 120° cone) are defined as local literals in `enemy.js` rather than referencing `game.js` globals.

---

## Feature 04 — Enemy Sight Detection

Enemies can now detect the player. No movement yet — enemies remain static in their starting positions. No game-over yet — detection is a state change with visual feedback only.

---

## Enemy Data Model

### Per-enemy detection parameters

Each enemy carries three tunable detection parameters directly on its object:

| Parameter | Type | Description |
|-----------|------|-------------|
| `visionAngle` | radians | Width of the forward sight cone |
| `sightRange` | px or `Infinity` | Maximum detection distance in lit conditions |
| `proximityRadius` | px | Radius of the awareness bubble — detects player regardless of facing |

**Why per-object rather than global constants?**

Different enemy roles need different sensor profiles. A sniper has a narrow, long-range cone and a small proximity bubble — it must be flanked. A brute has a wide cone, short range, and a large proximity bubble — hard to sneak past close up. A standard guard sits in between. Putting these values on each enemy object means adding a new type is a single entry in `INITIAL_ENEMIES` with no new code. Global constants would require branching on enemy type throughout the detection and rendering logic.

`DARK_SIGHT_RANGE` (120px) remains a global constant because it represents an environmental constraint (how far any guard can see in darkness), not a unit-specific trait.

### INITIAL_ENEMIES

```javascript
const STANDARD_VISION = Math.PI * 2 / 3; // 120° literal — not a reference to game.js's VISION_ANGLE

const INITIAL_ENEMIES = [
  { x: 600, y: 600, angle: 0, targetAngle: 0, visionAngle: STANDARD_VISION, sightRange: Infinity, proximityRadius: 50 }, // Lobby
  { x: 580, y: 220, angle: 0, targetAngle: 0, visionAngle: STANDARD_VISION, sightRange: Infinity, proximityRadius: 50 }, // Room B
  { x: 940, y: 590, angle: 0, targetAngle: 0, visionAngle: STANDARD_VISION, sightRange: Infinity, proximityRadius: 50 }, // Room F
];
```

Example future types (not yet implemented):

```javascript
// Sniper — narrow cone, unlimited range, small bubble
{ ..., visionAngle: Math.PI / 6, sightRange: Infinity, proximityRadius: 20 }

// Brute — wide cone, short range, large bubble
{ ..., visionAngle: Math.PI * 5/6, sightRange: 250, proximityRadius: 80 }
```

### Full runtime object shape

`resetEnemies()` spreads `INITIAL_ENEMIES` and adds runtime-only state fields:

```javascript
{
  x, y,
  angle,           // current facing (0 = up)
  targetAngle,     // lerp target for smooth rotation
  visionAngle,     // cone width (from INITIAL_ENEMIES)
  sightRange,      // max lit detection distance (from INITIAL_ENEMIES)
  proximityRadius, // awareness bubble radius (from INITIAL_ENEMIES)
  state: 'patrol', // 'patrol' | 'alert' | 'cautious'
  alertTimer: 0,   // frames remaining in current alert window
}
```

---

## Detection Algorithm

### Core predicate — `enemyCanSeePlayer(e)`

Run once per enemy per frame in `updateEnemies()`.

```
1. dist ← distance(e, player)
2. if dist ≤ e.proximityRadius → detected    // awareness bubble: ignores facing AND light
3. if !isLitByLamps(player.x, player.y) → not detected  // cone sight is fully blind in darkness
4. if !pawnInCone(e.x, e.y, e.angle, e.visionAngle, player.x, player.y) → not detected
5. if dist > e.sightRange → not detected
6. if !hasLOS(e.x, e.y, player.x, player.y) → not detected
7. → detected
```

The light check (step 3) is a hard gate: a player in darkness is completely invisible to the cone, regardless of how close or how squarely they are in the enemy's facing direction. Only the proximity bubble (step 2) can still trigger — it represents the guard hearing or sensing movement at very close range, independent of sight.

**`isLitByLamps` vs `isLit`:** The player always emits a personal 80px ambient glow, which means `isLit(player.x, player.y)` returns true even in complete darkness. Enemy detection uses `isLitByLamps()` (defined in `game.js`) which checks wall lamp coverage only — no self-glow — and also applies the same half-plane clip used by `drawLighting`. Without the half-plane clip, a lamp on the other side of a wall passes the circle-distance test even though it is visually blocked, causing enemies to detect a player who appears dark on screen. See `feature_02_lighting.md` — *Lit-area Helpers* for the full rationale.

Shooting out lamps is therefore a fully reliable stealth tool: once the player is genuinely dark on screen, `isLitByLamps` returns false and all cone detection stops. The only remaining risk is walking into a guard's proximity bubble.

### Helper — `pawnInCone(ex, ey, eAngle, visionAngle, tx, ty)`

Parameterized version of `game.js`'s `inVisionCone`. Same math, no player coupling. `visionAngle` is passed explicitly so each enemy uses its own value:

```javascript
function pawnInCone(ex, ey, eAngle, visionAngle, tx, ty) {
  const dx = tx - ex, dy = ty - ey;
  if (dx === 0 && dy === 0) return true;
  const bearing = Math.atan2(dx, -dy);
  let diff = bearing - eAngle;
  while (diff >  Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return Math.abs(diff) <= visionAngle / 2;
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

### Detection zone overlay (testing aid — to be removed)

Each enemy renders two overlapping zones using `drawEnemySightCone(e)`, drawn before the pawn shape so the pawn sits on top:

- **Vision cone:** wall-occluded polygon via `computeVisibilityPolygon(e.x, e.y, e.angle, e.visionAngle)`. Both the cone angle and the maximum reach automatically reflect the enemy's own `visionAngle` parameter.
- **Proximity circle:** stroke circle at `e.proximityRadius`. Uses the same `color` and `alpha` variables as the cone fill so the two zones always match visually.

Both zones shift from red → orange when the enemy enters `alert` state.

### Enemy pawn and indicator

| State | Enemy rendering | Overhead indicator |
|-------|----------------|--------------------|
| `patrol` | red pawn | none |
| `alert` | bright orange pawn | yellow `!` 38px above center |
| `cautious` | muted orange pawn | grey `?` 38px above center |

Indicator only visible when the enemy itself is in the player's vision cone and lit — same `inVisionCone` + `isLit` gate used for pickups and exfil points. No HUD element — all feedback is in-world.

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
