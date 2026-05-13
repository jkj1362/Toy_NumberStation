# Feature 01a — Walls & Room Geometry

**Status: DONE** — implemented in game.js

## Overview

Adds the physical geometry of the facility: axis-aligned wall rectangles, collision, and a floor color. The canvas border is the outer perimeter. Interior walls create closed rooms with bare door gaps (no door objects).

---

## Geometry Rule

Every interior wall must touch a canvas edge or another wall face at one end. No floating walls. Walls are either:
- **Horizontal** — runs left-to-right
- **Vertical** — runs top-to-bottom

---

## Data Structure

```javascript
// Wall: axis-aligned rectangle, full collision
{ x, y, w, h }

// Door gap: empty space between two wall segments — no object needed.
```

---

## Collision Rules

- Player and enemies are pushed out of wall rects (`pushOutOfWalls`, run twice per frame for corner cases).
- Projectiles are culled when their center enters any wall rect.
- Wall lamps (Feature 01b) are wall decorations — no collision with the player.

---

## Floor Plan

```
+=====[top]=================================+=========+=========+
|                                           |         |         |
|              ROOM A                       | ROOM B  | ROOM C  |
|          [ OBJECTIVE ]                    | (guard) |[ALT EXF]|
|                                           |         |         |
+====+              +=======================+   +-----+         |
     |              |                           |               |
     |   ROOM D     |        CORRIDOR           |    ROOM E     |
     |              |      (dim-lit passage)    |               |
     |              |                           |               |
+=====+    +=========+===========================+======+   +====+
|          |                                          |         |
|  ENTRY   |               LOBBY                      | ROOM F  |
| [START / |                                          | (guard) |
|  EXFIL1] |                                          |         |
+----------+--------[entry gap]----------------------+---------+
                    [bottom edge]
```

---

## Room Definitions

| Room | Purpose |
|------|---------|
| Entry | Player start + **Primary exfil** (return here after objective) |
| Lobby | Open central area — first interior space |
| Room A | **Objective room** — top-left, most guarded |
| Room B | Guard room — top-center |
| Room C | **Alt exfil** — top-right corner, secondary escape route |
| Room D | Buffer room — left-side mid, connects Entry to Corridor |
| Room E | Buffer room — right-side mid, connects Corridor to Room C area |
| Room F | Guard room — bottom-right, controls lobby access |
| Corridor | East-west passage connecting all upper rooms; dim-lit |

---

## Exfil Logic

Implemented in Feature 03. Two options after collecting the objective:
1. **Primary exfil** — return to Entry room
2. **Alt exfil** — reach Room C

---

## Concrete Wall Coordinates (as implemented in game.js)

```javascript
const WALLS = [
  // Outer perimeter — entry gap x:430–570 at bottom
  { x:    0, y:   0, w: 1100, h:  18 },
  { x:    0, y: 732, w:  430, h:  18 },
  { x:  570, y: 732, w:  530, h:  18 },
  { x:    0, y:   0, w:   18, h: 750 },
  { x: 1082, y:   0, w:   18, h: 750 },
  // Corridor wall at y=440 — left gap x:220–320, right gap x:778–860
  { x:   18, y: 440, w:  202, h:  18 },
  { x:  320, y: 440, w:  458, h:  18 },
  { x:  860, y: 440, w:  222, h:  18 },
  // Room A (objective) east wall at x=400 — gap y:250–340
  { x:  400, y:  18, w:  18, h: 232 },
  { x:  400, y: 340, w:  18, h: 100 },
  // Room B/C divider at x=760 — gap y:160–260
  { x:  760, y:  18, w:  18, h: 142 },
  { x:  760, y: 260, w:  18, h: 180 },
  // Room F (guard) west wall at x=900 — gap y:540–640
  { x:  900, y: 440, w:  18, h: 100 },
  { x:  900, y: 640, w:  18, h:  92 },
];
```

---

## Implementation Checklist

- [x] Add `WALLS` constant
- [x] Add `drawWalls()` — fill each rect with `#4a4a4a`
- [x] Add floor background (`#1e1e1e`) drawn before walls
- [x] Add `pushOutOfWalls(entity, radius)` — AABB push-out, run twice per frame
- [x] Call `pushOutOfWalls(player, PLAYER_RADIUS)` after movement in `update()`
- [x] `draw()` order: `clearRect` → floor → `drawWalls()` → enemies → projectiles → player → fog
