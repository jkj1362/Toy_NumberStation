# Feature 01 — Walls, Rooms & Lighting

## Overview

This feature adds the physical geometry of the facility and an atmospheric lighting layer. It is built in **three sequential steps**:

1. **Wall structures** — geometry only, no doors yet. Leave door gaps open (empty space in the wall).
2. **Wall-mounted lamps** — lights attached to walls, shootable. Standalone room lamps (desk lamps etc.) are deferred.
3. **Open questions resolved** → document updated → implement in that phase.

The canvas (1100×750) represents the entire floor plan of a building. The canvas border is the outer perimeter. Interior walls are axis-aligned rectangles that start from a canvas edge or another wall face (like a maze), creating closed rooms. Door gaps are bare openings — no door object yet.

---

## Step 1 — Wall Structures

### Geometry Rule

Every interior wall must touch a canvas edge or another wall face at one end. No floating walls. Walls are either:
- **Horizontal** — runs left-to-right, perpendicular to left/right edges
- **Vertical** — runs top-to-bottom, perpendicular to top/bottom edges

### Data Structure

```javascript
// Wall: axis-aligned rectangle, full collision
{ x, y, w, h }

// Door gap: just an empty space between two wall segments — no object needed.
// Door frames (cosmetic only, no collision) added in a later pass.
```

### Collision Rules

- Player and enemies are pushed out of wall rects (AABB push-out, same as canvas bounds).
- Projectiles are culled when their center enters any wall rect.
- Wall lamps (Step 2) are attached to walls and share no collision with the player — they are thin wall decorations, not physical obstacles.

### Floor Plan

```
+=====[top]=================================+=========+=========+
|                                           |         |         |
|              ROOM A                       | ROOM B  | ROOM C  |
|          [ OBJECTIVE ]                    | (guard) |[ALT EXF]|
|                                           |         |         |
+====+              +=======================+   +-----+         |
     |              |                           |               |
     |   ROOM D     |        CORRIDOR           |    ROOM E     |
     |              |      (dim-lit passage)     |               |
     |              |                           |               |
+=====+    +=========+===========================+======+   +====+
|          |                                          |         |
|  ENTRY   |               LOBBY                      | ROOM F  |
| [START / |                                          | (guard) |
|  EXFIL1] |                                          |         |
+----------+--------[entry gap]----------------------+---------+
                    [bottom edge]
```

### Room Definitions

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

### Exfil Logic (implemented in Feature 3)

Two exfil options after collecting the objective:
1. **Primary exfil** — return to Entry room (longer route, familiar path)
2. **Alt exfil** — reach Room C (shorter from Room A, but guarded differently)

### Concrete Wall Coordinates (starting values — tune during testing)

```javascript
const WALLS = [
  // Outer perimeter
  { x:    0, y:   0, w: 1100, h:  18 },   // top
  { x:    0, y: 732, w:  370, h:  18 },   // bottom-left  (gap x:370–520 = entry)
  { x:  520, y: 732, w:  580, h:  18 },   // bottom-right
  { x:    0, y:   0, w:   18, h: 750 },   // left
  { x: 1082, y:   0, w:   18, h: 750 },   // right

  // Vertical wall: Entry/Room D | Lobby/Corridor
  // gap at y:350–430 (lobby doorway), gap at y:308–480 (Room D south door)
  { x:  370, y: 480, w:  18, h: 252 },    // lower segment → bottom wall
  { x:  370, y:  18, w:  18, h: 290 },    // upper segment → top wall

  // Horizontal wall: upper rooms | lobby/corridor
  // gap at x:388–648 (main corridor pass-through)
  { x:   18, y: 480, w:  350, h:  18 },   // left segment
  { x:  648, y: 480, w:  434, h:  18 },   // right segment

  // Horizontal wall: Room D south boundary
  { x:   18, y: 600, w:  352, h:  18 },   // Room D south wall → left vertical wall

  // Vertical wall: Room A | Corridor/Room B
  // gap at y:300–380 (Room A east door)
  { x:  680, y:  18, w:  18, h: 282 },    // upper segment → top wall
  { x:  680, y: 380, w:  18, h: 100 },    // lower segment → horizontal wall

  // Vertical wall: Room B | Room C/Room E
  // gap at y:200–280 (Room B/C door)
  { x:  880, y:  18, w:  18, h: 182 },    // upper segment → top wall
  { x:  880, y: 280, w:  18, h: 200 },    // lower segment → horizontal wall
];
```

> Walk the player through every room during testing to confirm no dead ends and all gaps are passable.

### Implementation Checklist — Step 1

- [ ] Add `WALLS` constant
- [ ] Add `drawWalls()` — fill each rect with wall color (`#4a4a4a`)
- [ ] Add floor background color (`#1e1e1e`) drawn before walls
- [ ] Add `pushOutOfWalls(entity, radius)` — AABB push-out (run twice per frame for corners)
- [ ] Call `pushOutOfWalls(player, PLAYER_RADIUS)` after movement in `update()`
- [ ] Update `draw()`: `clearRect` → floor → `drawWalls()` → (existing draws) → fog

---

## Step 2 — Wall-Mounted Lamps

### Concept

Lights are physically attached to walls — like corridor sconces or wall-mounted lanterns. They project a soft light cone outward from the wall face. The corridor has a few sparse lamps. Rooms have lamps on their walls. All lamps can be **shot out** by the player (or enemies).

Standalone room lamps (desk lamps, floor lamps) are **deferred**.

### Data Structure

```javascript
// wallSide: which face of the wall the lamp is on
// 'N' = lamp on north face, light projects south
// 'S' = lamp on south face, light projects north
// 'E' = lamp on east face, light projects west
// 'W' = lamp on west face, light projects east
// active: false when shot out

const LAMPS = [
  { x, y, wallSide: 'S', radius: 110, color: '#ffdc96', active: true },
  // ...
];
```

The light from each lamp is a **wide arc** (~240°) projecting away from its wall face, implemented as a radial gradient centered at the lamp position. The 240° approximation is good enough — a narrow cone would require clipping math not worth the complexity here.

### Light Projection Direction

Each `wallSide` maps to a direction vector used to offset the gradient center slightly into the room (so the brightest point is just off the wall):

| wallSide | Gradient center offset | Light projects toward |
|----------|------------------------|-----------------------|
| N | `(0, -8)` | South (down) |
| S | `(0, +8)` | North (up) |
| E | `(-8, 0)` | West (left) |
| W | `(+8, 0)` | East (right) |

### Shootability

When a projectile hits within `LAMP_HIT_RADIUS` (≈10px) of a lamp, set `lamp.active = false`. The lamp goes dark. This is permanent for the session (reset restores all lamps).

### Proposed Lamp Positions

> Coordinates to finalize once wall positions are confirmed in Step 1.

```javascript
const LAMPS = [
  // Room A (objective room) — south face of top wall, north face of corridor wall
  { x: 200, y:  20, wallSide: 'N', radius: 130, color: '#ffdc96', active: true },
  { x: 480, y:  20, wallSide: 'N', radius: 120, color: '#ffdc96', active: true },

  // Room B — south face of top wall
  { x: 780, y:  20, wallSide: 'N', radius: 110, color: '#ffdc96', active: true },

  // Room C (alt exfil) — south face of top wall
  { x: 990, y:  20, wallSide: 'N', radius: 110, color: '#ffdc96', active: true },

  // Corridor — sparse lamps on north face of corridor divider wall (y≈480)
  { x: 430, y: 480, wallSide: 'S', radius:  70, color: '#c8d4ff', active: true },
  { x: 580, y: 480, wallSide: 'S', radius:  70, color: '#c8d4ff', active: true },

  // Lobby — lamps on south face of corridor wall
  { x: 430, y: 480, wallSide: 'N', radius: 100, color: '#ffdc96', active: true },
  { x: 700, y: 480, wallSide: 'N', radius:  90, color: '#ffdc96', active: true },

  // Room F — west face of right canvas wall
  { x:1082, y: 620, wallSide: 'E', radius:  90, color: '#ffdc96', active: true },

  // Entry — east face of left canvas wall
  { x:   18, y: 670, wallSide: 'W', radius: 100, color: '#ffdc96', active: true },
];
```

### Darkness Rendering

Same compositing technique as the existing fog of war (offscreen canvas + `destination-out`):

```
1. Reuse or create lightCanvas (same size as main canvas)
2. Fill with darkness: rgba(0, 0, 0, 0.82)
3. Set globalCompositeOperation = 'destination-out'
4. For each active lamp:
   a. Compute center = (lamp.x + offset.x, lamp.y + offset.y)
   b. Draw radial gradient at center:
      - inner radius 0, alpha 1.0 (fully erase darkness)
      - outer radius lamp.radius, alpha 0.0 (no erase)
5. Reset to 'source-over'
6. ctx.drawImage(lightCanvas, 0, 0)
```

### Draw Order (after both steps)

```
1.  clearRect
2.  drawFloor()          — dark floor (#1e1e1e)
3.  drawWalls()          — wall rects (#4a4a4a)
4.  [ future: exfil/objective markers ]
5.  [ future: enemies ]
6.  [ future: projectiles ]
7.  drawPlayer()
8.  drawLighting()       — darkness layer with lamp cutouts  ← NEW
9.  drawFog()            — player vision cone (on top of lighting)
10. [ future: HUD ]
```

Net visual effect:
- Lit areas within the player's view cone → fully visible
- Shadow areas within the player's view cone → visible but dimly
- Anything outside the view cone → covered by fog
- Shot-out lamps → that zone goes dark; player has tactical cover there

### Implementation Checklist — Step 2

- [ ] Add `LAMPS` constant
- [ ] Add `drawLighting()` using offscreen canvas + `destination-out` radial gradients
- [ ] Add lamp hit detection: after projectile moves, check proximity to each lamp → `lamp.active = false`
- [ ] Add `drawLamps()` — render a small bright dot + wall bracket at each lamp position (so the physical fixture is visible even when dark)
- [ ] Add lamp reset to `reset()` — set all lamps back to `active: true`
- [ ] Add `drawLighting()` call in `draw()` between player and fog

---

## Step 3 — Resolved Open Questions

| # | Question | Decision |
|---|---------|----------|
| 1 | Windows? | **Deferred.** Walls are solid. No partial transparency in this prototype. |
| 2 | Lights shootable? | **Yes** — wall lamps can be shot out. Standalone lamps deferred. |
| 3 | Corridor lighting? | **Dim** — a few sparse wall lamps in the corridor. Not dark, not bright. Player has some cover between lamp pools. |
| 4 | Entry/exfil zone visuals? | **Decided in Feature 3.** Walls and lighting don't depend on this. |
