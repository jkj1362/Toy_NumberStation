# Feature 09 - Door System

**Status: DESIGN READY - PENDING IMPLEMENTATION**

---

## Overview

Doors are dynamic geometry. A closed door behaves like a wall for movement, AI pathing,
line-of-sight, and lighting, but it does not suppress sound as strongly as a wall. An open
or destroyed door becomes a real passage: characters, AI, NPCs, projectiles, visibility rays,
and light may pass through the opening.

This feature exists because the lighting renovation depends on real openings. Window
apertures can be authored as always-open exterior gaps, but doorway light spill must be tied
to door state:

```text
closed door    = blocker exists, aperture closed, light is blocked
open door      = blocker removed, aperture open, light can pass/spill
destroyed door = blocker removed permanently, aperture open permanently
```

---

## Design Goals

- Doors should be understandable at a glance: closed blocks, open passes, destroyed cannot be
  closed again.
- Closed doors block player/enemy/NPC movement and lighting like walls.
- Closed doors reduce sound less than walls, so soundwaves still travel through them strongly.
- Open doors create believable light leakage between rooms.
- Destroyable doors use HP so future weapons can also damage them without special casing guns.
- Door state must be shared by collision, AI, lighting, LOS, and sound instead of being a
  visual-only flag.

---

## Door States

| State | Movement | Light | Sound | Interaction | Damage |
|-------|----------|-------|-------|-------------|--------|
| `closed` | Blocks player, AI, NPCs, and most projectiles | Blocks direct light and disables door aperture | Weak attenuation | Player can open | Takes damage |
| `open` | Passage is clear | Aperture enabled; direct light rays may pass | Minimal attenuation | Player can close | Usually no damage target |
| `destroyed` | Passage is clear | Aperture permanently enabled | Minimal attenuation | Cannot close | Already broken |

Closed doors should be treated as temporary walls by every blocker-dependent system. Open and
destroyed doors should not appear in blocker lists.

---

## Data Model

Mission-authored door data should stay near mission geometry until a dedicated mission data
file exists.

```javascript
const DOORS = [
  {
    id: 'corridor_left_door',
    x: 220,
    y: 420,
    w: 100,
    h: 20,
    orientation: 'horizontal',
    state: 'closed',
    defaultState: 'closed',
    hp: 60,
    maxHp: 60,
    soundTransmission: 0.75,
    apertureId: 'corridor_left_door_aperture',
  },
];
```

| Field | Meaning |
|-------|---------|
| `id` | Stable identifier for save/reset/debug and linked systems |
| `x`, `y`, `w`, `h` | Door slab rectangle in design-space coordinates before scaling |
| `orientation` | `horizontal` or `vertical`; used for drawing, interaction, and aperture direction |
| `state` | Runtime state: `closed`, `open`, or `destroyed` |
| `defaultState` | Reset state for the mission |
| `hp`, `maxHp` | Destruction health |
| `soundTransmission` | How much sound passes through a closed door; walls should be much lower |
| `apertureId` | Optional link to a lighting aperture created/enabled by this door |

Implementation can scale door coordinates using the same `scaleGameUnit()` pipeline as walls,
lamps, enemies, and patrol points.

---

## Initial Door Placements

The current prototype already contains doorway gaps in wall geometry. The first implementation
should place closed doors in those gaps instead of redesigning the map.

| Door | Approximate design-space gap | Notes |
|------|------------------------------|-------|
| Corridor left threshold | `x 220..320`, around `y 440` | Existing left corridor/entry gap |
| Corridor right threshold | `x 778..860`, around `y 440` | Existing right corridor/entry gap |
| Room A east door | `x 400`, `y 250..340` | Vertical interior room opening |
| Room B/C divider door | `x 760`, `y 160..260` | Vertical interior divider opening |
| Room F west door | `x 900`, `y 540..640` | Vertical room opening |

Exact rectangles should be checked visually during implementation so door slabs fill the gap
without overlapping adjacent wall ends.

---

## Movement and Collision

Closed doors must be included in collision checks as solid rectangles.

Implementation direction:

- Keep static walls as mission geometry.
- Add a dynamic blocker provider:

```javascript
function getClosedDoorRects() {}
function getMovementBlockers() {
  return WALLS.concat(getClosedDoorRects());
}
```

- Replace direct collision reads from `WALLS` with `getMovementBlockers()` where the object
  should be blocked by doors.
- Open and destroyed doors must not be returned as movement blockers.

This keeps the system scalable for future dynamic geometry without rewriting every feature
again.

---

## Lighting and Apertures

Closed doors block light. Open and destroyed doors let light pass.

There are two required lighting effects:

1. Direct rays from existing lamps should pass through the doorway once the door no longer
   contributes a blocker.
2. Doorway spill should partially brighten a dark neighboring room when the light source is
   positioned so it can reach the opening.

Implementation direction:

- Add closed doors to the raycast/light blocker set.
- Remove the door from the light blocker set when opened or destroyed.
- Link each door to a door aperture that is `open` only when the door state is `open` or
  `destroyed`.
- Mark the static lighting cache dirty whenever a door state changes.

Important: a door aperture should transmit light; it should not behave like a full-strength
lamp. If the adjacent room is already bright, the max-composed lighting model may show little
change. If the adjacent room is dark, the aperture should add a shaped spill based on the
doorway location, opening width, range, falloff, and source-side brightness.

Recommended first pass:

- Use dynamic blockers so existing lamp visibility can pass through open doors naturally.
- Add weak door aperture spill only when the direct lamp result is not enough to visibly
  communicate leakage.
- Keep max-composition from Feature 02 so multiple sources merge cleanly instead of creating
  overlap hotspots.

---

## Sound Behavior

Closed doors should not mute sound like walls. They should reduce sound only weakly, so the
visible soundwave circle can still communicate that sound travels through the door.

Current prototype sound is radius/event based, so the first pass should avoid overbuilding a
full acoustic simulation.

Recommended behavior:

- Soundwave visuals may continue to draw through doors.
- Enemy hearing may apply attenuation when a closed door lies between sound source and enemy.
- Wall attenuation should be strong.
- Door attenuation should be weak, for example `soundTransmission: 0.75`.
- Open and destroyed doors should apply no meaningful attenuation.

If precise sound occlusion is added later, reuse the same dynamic blocker concept:

```text
wall segment = strong attenuation
closed door segment = weak attenuation
open/destroyed door = no attenuation
```

---

## Damage and Destruction

Doors need HP because guns are only the current weapon type, not the final weapon set.

Damage rules:

- A projectile that hits a closed door applies door damage.
- Door damage should use weapon data, not hardcoded gun logic.
- When `hp <= 0`, set `state = 'destroyed'`.
- Destroyed doors stop blocking movement, lighting, LOS, and pathing.
- Destroyed doors should create a loud sound event so enemies can react.

Future weapon data can expose fields like:

```javascript
{
  damage: 20,
  doorDamage: 20,
  breaksDoors: true,
}
```

For now, current bullets can map to a default door damage value.

---

## Player Interaction

The player should be able to toggle a nearby, non-destroyed door.

Suggested first pass:

- Use a keyboard interaction key such as `E`.
- Use gamepad face button mapping later if needed.
- Interaction radius should be short enough that the player must be near the door.
- Closed door + interact = open.
- Open door + interact = closed.
- Destroyed door + interact = no effect.
- Opening and closing should create modest sound events.

Do not add locks, keys, lockpicking, or restricted doors in this feature unless explicitly
requested later.

---

## AI and NPC Behavior

Door implementation should not block existing enemy patrols permanently.

Minimum AI behavior:

- Enemies and future NPCs should treat open/destroyed doors as passable.
- Closed doors should be treated as blockers for movement.
- If an enemy route requires a closed door, the enemy can open it at the doorway node.

The existing patrol graph already has future door behavior notes. This feature should connect
that idea to real door state rather than making enemies walk through closed door rectangles.

---

## Dynamic Blocker Architecture

The current prototype has static wall-derived ray geometry such as `WALL_SEGMENTS` and
`WALL_CORNERS`. Doors make that static-only model insufficient.

Implementation must introduce a shared dynamic geometry source for systems that cast rays:

- lighting visibility
- fog/visibility rays
- enemy line-of-sight
- projectile collision where appropriate
- sound attenuation when implemented

Suggested structure:

```javascript
function getStaticWallRects() {}
function getClosedDoorRects() {}
function getCollisionRects() {}
function getRayBlockerRects() {}
function rebuildRayGeometryIfNeeded() {}
```

Door state changes should mark the ray geometry and static lighting cache dirty. This prevents
stale LOS/light behavior after opening or destroying a door.

---

## Rendering

Closed doors should read as solid slabs in the existing wall gaps. Open doors should read as an
open passage, either by hiding the slab or drawing it swung to the side. Destroyed doors should
show a broken slab/debris marker without blocking the opening.

Keep the first visual pass simple:

- Closed: dark rectangular slab, slightly distinct from wall color.
- Open: thin swung panel or hinge marker outside the passage.
- Destroyed: broken low-contrast fragments near the gap.

The door visual must match the collision rectangle so the player can understand what blocks
movement.

---

## Files to Modify

| File | Change |
|------|--------|
| `game.js` | Door mission data, state reset, interaction input, dynamic blockers, projectile-door hits, door drawing, cache invalidation |
| `lighting.js` | Accept dynamic blockers and door aperture state; invalidate static light cache when door state changes |
| `player.js` | Optional interaction helper only if player-owned input is cleaner than `game.js` |
| `enemy.js` | Use dynamic blockers for LOS/pathing and door-aware movement decisions |
| `design/feature_02_lighting.md` | Reference that door apertures are implemented through Feature 09 door state |
| `design/feature_09_doors.md` | This document |

---

## Implementation Steps

1. Add door data, reset state, and rendering.
2. Add dynamic closed-door rectangles to player collision.
3. Route LOS/raycast geometry through dynamic blocker rebuilds.
4. Add player interaction to open/close doors.
5. Add projectile hits, HP, destruction state, and destruction sound.
6. Connect door state to lighting blockers and aperture open/closed state.
7. Add enemy pathing behavior for doors on patrol routes.
8. Add weak closed-door sound attenuation for enemy hearing.
9. Screenshot-check closed, open, and destroyed states from both sides of the doorway.

---

## Success Criteria

- Closed doors block player movement and do not allow light through.
- Open doors allow player movement and show light spilling through the doorway when a nearby
  light source can reach the opening.
- Closing the door blocks that light spill again.
- Projectiles damage closed doors and destroy them at zero HP.
- Destroyed doors become permanently passable and permanently light-transmitting.
- Sound is much less blocked by closed doors than by walls.
- Enemy LOS/pathing does not treat closed doors as open space.
- Static lighting cache updates immediately when a door opens, closes, or is destroyed.

---

## Deferred

- Locked doors, keys, lockpicking, and electronic access.
- Door animations beyond a simple open/closed visual.
- Door peek/half-open states.
- Enemy tactical door behavior such as breaching, listening, or guarding doors.
- Save/load persistence for door HP and state.
- Advanced acoustic propagation through connected room graphs.
