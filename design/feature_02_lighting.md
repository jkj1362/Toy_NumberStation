# Feature 01b — Wall-Mounted Lamps & Darkness

**Status: DONE** — implemented in game.js

## Concept

Lights are physically attached to walls — corridor sconces and wall-mounted lanterns. They project a soft radial glow outward from the wall face. The corridor has sparse lamps; rooms have fuller coverage. All lamps can be **shot out** by the player, creating tactical shadow cover.

Standalone room lamps (desk lamps, floor lamps) are deferred.

---

## Data Structure

```javascript
// wallSide: which face of the wall the lamp is on
// 'N' = lamp on north wall (top), light projects south
// 'S' = lamp on south wall (bottom), light projects north
// 'E' = lamp on east wall (right), light projects west
// 'W' = lamp on west wall (left), light projects east
// active: false when shot out (permanent until reset)

const LAMP_HIT_RADIUS = 10;
// Placement rules: (1) at least one lamp per room, (2) same-wall spacing >= radius.
// Uniform radius = 200. Same-wall gaps: top/corridor-S x-gaps 380 & 340; lobby N gap 300. All >= 200.
const LAMPS = [
  // Top wall — one per room section, spacing 380 / 340
  { x: 200, y:  18, wallSide: 'N', radius: 200, color: '#ffdc96', active: true },
  { x: 580, y:  18, wallSide: 'N', radius: 200, color: '#ffdc96', active: true },
  { x: 920, y:  18, wallSide: 'N', radius: 200, color: '#ffdc96', active: true },
  // Corridor wall south face — mirrors top wall, lights lower half of each room
  { x: 200, y: 440, wallSide: 'S', radius: 200, color: '#ffdc96', active: true },
  { x: 580, y: 440, wallSide: 'S', radius: 200, color: '#ffdc96', active: true },
  { x: 920, y: 440, wallSide: 'S', radius: 200, color: '#ffdc96', active: true },
  // Corridor wall south face (lobby side, y=458 = bottom edge of wall) — lights lobby from above
  { x: 350, y: 458, wallSide: 'N', radius: 200, color: '#ffdc96', active: true },
  { x: 700, y: 458, wallSide: 'N', radius: 200, color: '#ffdc96', active: true },
  // Bottom wall — lights lobby from below, flanking the entry gap (x:430–570), spacing 350
  { x: 350, y: 732, wallSide: 'S', radius: 200, color: '#ffdc96', active: true },
  { x: 700, y: 732, wallSide: 'S', radius: 200, color: '#ffdc96', active: true },
  // Entry area — left perimeter wall
  { x:  18, y: 630, wallSide: 'W', radius: 200, color: '#ffdc96', active: true },
  // Room F — right perimeter wall
  { x:1082, y: 590, wallSide: 'E', radius: 200, color: '#ffdc96', active: true },
];
```

All lamps use warm yellow (`#ffdc96`). Color distinction between rooms is deferred — not worth the visual noise in the prototype without the full atmosphere context.

---

## Light Projection Direction

The `wallSide` determines a small offset applied to the radial gradient center, pushing it slightly into the room (away from the wall face):

| wallSide | Gradient center offset | Light projects toward |
|----------|------------------------|-----------------------|
| N | `(0, +8)` | South (down, into room) |
| S | `(0, −8)` | North (up, into room) |
| E | `(−8, 0)` | West (left, into room) |
| W | `(+8, 0)` | East (right, into room) |

The gradient is a full radial circle — the offset is cosmetic, positioning the brightest point just off the wall face.

---

## Shootability

When a projectile's center comes within `LAMP_HIT_RADIUS` (10px) of a lamp, set `lamp.active = false`. The lamp goes dark permanently for the session. `reset()` restores all lamps to `active: true`.

---

## Darkness Rendering

Same compositing technique as the existing fog of war (`fogCanvas` / `destination-out`):

```
1. Create offscreen lightCanvas (same size as main canvas)
2. Fill with darkness: rgba(0, 0, 0, 0.82)
3. Set globalCompositeOperation = 'destination-out'
4. For each active lamp:
   a. Compute center = (lamp.x + offset.dx, lamp.y + offset.dy)
   b. Create radial gradient: inner alpha 1.0 → outer alpha 0.0
   c. Fill circle of lamp.radius — erases darkness proportional to gradient alpha
5. Reset to 'source-over'
6. ctx.drawImage(lightCanvas, 0, 0)
```

Net visual result:
- Lit area within player vision → fully visible
- Dark area within player vision → pitch black (lighting + fog both opaque)
- Outside vision cone → covered by fog regardless of lighting
- Shot-out lamp zone → dark; player has tactical cover there
- Wall surfaces block the vision cone — light pools behind walls are invisible even if the player faces that direction

---

## Draw Order

```
1.  clearRect
2.  drawFloor()          — dark floor (#1e1e1e)
3.  drawWalls()          — wall rects (#4a4a4a)
4.  drawLamps()          — fixture dots on wall faces  ← NEW
5.  enemies
6.  projectiles
7.  drawPlayer()
8.  drawLighting()       — darkness layer with lamp cutouts  ← NEW
9.  drawFog()            — player vision cone (on top of lighting)
```

`drawLamps()` goes before lighting so the fixture dot sits in the scene and is subject to the darkness layer — active lamps appear lit by their own cutout, shot-out lamps appear as a dark marker.

---

## Implementation Checklist

- [x] Add `LAMP_HIT_RADIUS` and `LAMPS` constants
- [x] Add offscreen `lightCanvas` / `lightCtx` (after `fogCanvas`)
- [x] Add `drawLamps()` — 4px dot per fixture, `lamp.color` when active, `#444` when shot out
- [x] Add `drawLighting()` — offscreen canvas + `destination-out` radial gradients
- [x] Add lamp hit detection inside projectile loop (after enemy check, before wall cull)
- [x] Add `for (const lamp of LAMPS) lamp.active = true` to `reset()`
- [x] Update `draw()` order: insert `drawLamps()` after `drawWalls()`, `drawLighting()` between `drawPlayer()` and `drawFog()`

---

## Resolved Open Questions

| # | Question | Decision |
|---|---------|----------|
| 1 | Windows? | **Deferred.** Walls are solid. No partial transparency in this prototype. |
| 2 | Lights shootable? | **Yes** — wall lamps can be shot out. Standalone lamps deferred. |
| 3 | Corridor lighting? | **Dim** — two sparse blue-white wall lamps. Player has cover between lamp pools. |
| 4 | Entry/exfil zone visuals? | **Decided in Feature 03.** Walls and lighting don't depend on this. |
