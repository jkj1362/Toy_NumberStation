# Feature 00 — Pawn Movement & Vision System

**Status: DONE** — implemented in game.js. This document is the canonical reference for all pawn behavior.

---

## What Is a Pawn?

A **pawn** is any mobile entity in the game world: the player character, enemy guards, and future NPCs. All pawns share the same movement model, collision radius, angle convention, and vision parameters. When implementing enemy or NPC logic, use the values defined here as the standard — do not introduce per-type overrides unless explicitly decided.

---

## Pawn Data Model

```javascript
{
  x, y,         // world position (center of the pawn)
  angle,        // current facing angle (radians, see convention below)
  targetAngle,  // angle the pawn is rotating toward (used for smooth lerp)
  speed,        // movement speed in px/frame
}
```

---

## Angle Convention

**`angle = 0` means facing straight up (north).** Angles increase clockwise.

The forward direction vector from any angle:

```javascript
const dx = Math.sin(angle);
const dy = -Math.cos(angle);
```

| angle | facing |
|-------|--------|
| 0 | up (north) |
| π/2 | right (east) |
| π | down (south) |
| −π/2 | left (west) |

This convention applies everywhere: player aiming, enemy facing, vision cone orientation, projectile direction.

---

## Collision

All pawns use a circular collision radius resolved against AABB wall rectangles via `pushOutOfWalls(entity, radius)`.

- **`PLAYER_RADIUS = 28`** — used for the player character
- Enemies and NPCs use the same `pushOutOfWalls` function with their own radius (match `PLAYER_RADIUS` unless there is a specific design reason to differ)
- `pushOutOfWalls` is called **twice per frame** to resolve corner cases

---

## Movement

### Player

- **Keyboard:** WASD, 4 px/frame, axis-aligned
- **Gamepad left stick:** axes 0 (x) and 1 (y), scaled by `player.speed`, deadzone 0.15

### Enemies / NPCs (future)

- Move by updating `entity.x` and `entity.y` each frame, then calling `pushOutOfWalls`
- Rotate by setting `entity.targetAngle` and lerping toward it with `lerpAngle(current, target, t)`

### Facing / Aiming

- **Player:** Gamepad right stick (axes 2, 3) sets `player.targetAngle`. Each frame, `player.angle` lerps toward `player.targetAngle` at `t = 0.18`.
- **Enemies / NPCs:** Set `targetAngle` from AI logic (patrol direction, detected player bearing, etc.). Same lerp applies.

```javascript
function lerpAngle(current, target, t) {
  let diff = target - current;
  while (diff >  Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * t;
}
```

---

## Vision System

> **This is the canonical standard for all pawns — player, enemies, and NPCs.**
> Do not deviate from these values without an explicit design decision.

### Parameters

| Constant | Value | Meaning |
|----------|-------|---------|
| `VISION_ANGLE` | `Math.PI * 2 / 3` | **120° total field of view** — applies to every pawn |
| `PROXIMITY_RADIUS` | `50 px` | Ambient awareness circle — always visible regardless of facing direction |
| `VISION_RADIUS` | `Math.hypot(canvas.width, canvas.height)` | Max sight reach (effectively unlimited within the canvas) |

### Vision Cone Geometry — Wall Occluded

The visible area is a **wall-occluded polygon**, not a simple arc. Rays are cast from the pawn toward every wall corner within the cone (plus ±ε for clean shadow edges), and each ray stops at the nearest wall surface. The resulting hit points form the boundary of what is actually visible.

```javascript
// canvas-space forward direction
const forward = pawn.angle - Math.PI / 2;

// rays at cone boundaries + one per in-cone wall corner (±ε)
// each ray: nearest intersection against WALL_SEGMENTS
// sorted by angle → polygon connecting player to all hit points
```

Key functions (in `game.js`):
- `castVisRay(px, py, angle)` — single ray, returns nearest hit `{x, y}`
- `computeVisibilityPolygon(px, py, playerAngle)` — full cone polygon
- `WALL_SEGMENTS` / `WALL_CORNERS` — precomputed static arrays (walls never move)

**`inVisionCone(wx, wy)` (angle-only check)** — a lighter helper that tests whether a world point falls within the cone angle but does **not** check line-of-sight. Used for pickup reveal and exfil discovery (Feature 03). Full LOS check against walls is deferred.

### Proximity Circle

A separate full circle of radius `PROXIMITY_RADIUS` is always visible — it represents close-range ambient awareness (the pawn can sense what is immediately around them regardless of which way they are facing).

### Tuning Range

`VISION_ANGLE` was chosen as `2π/3` (120°) to match realistic human peripheral vision. If tuning is needed, stay within:
- **Minimum:** `Math.PI / 2` (90°) — narrow, high tension
- **Maximum:** `Math.PI * 5 / 6` (150°) — wide, more forgiving

### Enemy Vision (Future)

When enemy sight detection is implemented (Feature 04), it uses this same cone to determine whether the player is spotted:

1. Compute bearing from enemy to player
2. Check if bearing falls within the enemy's `VISION_ANGLE` cone
3. Check line-of-sight (ray against wall geometry)
4. Apply light-level modifier (Feature 02 — lamps affect detection range)

---

## Draw Order Reference

Pawns are drawn between walls and the lighting/fog layers so that darkness and vision correctly occlude them:

```
drawFloor()
drawWalls()
drawLamps()
[ enemies ]        ← pawn sprites
[ projectiles ]
drawPlayer()       ← pawn sprite
drawLighting()     ← darkness + lamp cutouts occludes pawns
drawFog()          ← vision cone + proximity circle occludes pawns
```
