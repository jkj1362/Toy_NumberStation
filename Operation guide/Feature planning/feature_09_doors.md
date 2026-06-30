# Feature 09 - Door System

**Status: IMPLEMENTED FIRST PASS - MANUAL VISUAL QA / TUNING PENDING**

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
closed door    = doorway blocker exists, aperture closed, light is blocked
open door      = doorway is passable, aperture open, swung panel still blocks rays
destroyed door = doorway clear permanently, aperture open permanently
```

---

## Design Goals

- Doors should be understandable at a glance: closed blocks, open passes, destroyed cannot be
  closed again.
- Closed doors block player/enemy/NPC movement and lighting like walls.
- Sound attenuation makes closed doors reduce sound less than walls, so soundwaves still leak
  through them at reduced strength.
- Open doors create believable light leakage between rooms.
- Destroyable doors use HP so future weapons can also damage them without special casing guns.
- Door state must be shared by collision, AI, lighting, LOS, and sound attenuation
  instead of being a visual-only flag.

---

## Door States

| State | Movement | Light | Sound | Interaction | Damage |
|-------|----------|-------|-------|-------------|--------|
| `closed` | Blocks player, AI, NPCs, and projectiles | Doorway blocks rays and disables door apertures | Leaks sound through `soundTransmission` | Player can open if no enemy occupies door space | Takes damage |
| `open` | Passage is clear | Apertures enabled; swung panel still blocks rays | No sound attenuation | Player can close if no enemy occupies door/panel space | No damage target in first pass |
| `destroyed` | Passage is clear | Apertures permanently enabled; no panel blocker | No sound attenuation | Cannot close | Already broken |

Closed doors are treated as temporary walls by blocker-dependent systems. Open doors are not
movement blockers, but the rotated physical panel is still included in the ray-blocker geometry
so player fog, enemy sight cones, and lighting do not pass through the slab. Destroyed doors do
not contribute movement or ray blockers.

---

## Data Model

Mission-authored door data should stay near mission geometry until a dedicated mission data
file exists.

```javascript
const DOOR_SPECS = [
  {
    id: 'corridor_left_door',
    x: 220,
    y: 440,
    w: 100,
    h: 18,
    orientation: 'horizontal',
    soundTransmission: 0.8,
    apertureIds: ['corridor_left_door_n', 'corridor_left_door_s'],
  },
];
```

| Field | Meaning |
|-------|---------|
| `id` | Stable identifier for save/reset/debug and linked systems |
| `x`, `y`, `w`, `h` | Door slab rectangle in design-space coordinates before scaling |
| `orientation` | `horizontal` or `vertical`; used for drawing, interaction, and aperture direction |
| `state` | Runtime state: `closed`, `open`, or `destroyed`; created on scaled `DOORS` |
| `defaultState` | Reset state for the mission; created on scaled `DOORS` |
| `hp`, `maxHp` | Destruction health; currently `60` / `60` on scaled `DOORS` |
| `soundTransmission` | How much sound passes through a closed door; walls should be much lower |
| `apertureIds` | Door-linked lighting apertures toggled by door state |

Current implementation scales door coordinates using the same `scaleGameUnit()` pipeline as
walls, lamps, enemies, and patrol points.

---

## Initial Door Placements

The current prototype already contains doorway gaps in wall geometry. The first implementation
placed closed doors in those gaps instead of redesigning the map.

| Door | Approximate design-space gap | Notes |
|------|------------------------------|-------|
| Corridor left threshold | `x 220..320`, around `y 440` | Existing left corridor/entry gap |
| Corridor right threshold | `x 778..860`, around `y 440` | Existing right corridor/entry gap |
| Room A east door | `x 400`, `y 250..340` | Vertical interior room opening |
| Room B/C divider door | `x 760`, `y 160..260` | Vertical interior divider opening |
| Room F west door | `x 900`, `y 540..640` | Vertical room opening |

Exact rectangles have a working first-pass placement, but should still be checked visually from
both sides so door slabs fill the gap without awkward overlap.

---

## Movement and Collision

Closed doors are included in collision checks as solid rectangles.

Implemented shape:

- Keep static walls as mission geometry.
- Dynamic blocker providers live in `game.js`:

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

Closed doors block light. Open and destroyed doors let light pass through the doorway, but an
open door's rotated physical panel still blocks rays where that panel is drawn.

There are two required lighting effects:

1. Direct rays from existing lamps should pass through the doorway once the door no longer
   contributes a blocker.
2. Doorway spill should partially brighten a dark neighboring room when the light source is
   positioned so it can reach the opening.

Implemented behavior:

- Add closed doors to the raycast/light blocker set.
- Remove the closed doorway blocker when opened or destroyed.
- Add a rotated open-panel polygon to ray blockers when a door is open.
- Link each door to door apertures that are `open` only when the door state is `open` or
  `destroyed`.
- Mark the static lighting cache dirty whenever a door state changes.

Important: a door aperture should transmit light; it should not behave like a full-strength
lamp. If the adjacent room is already bright, the max-composed lighting model may show little
change. If the adjacent room is dark, the aperture should add a shaped spill based on the
doorway location, opening width, range, falloff, and source-side brightness.

Current first pass:

- Use dynamic blockers so existing lamp visibility can pass through open doors naturally.
- Add weak door aperture spill helpers to communicate leakage.
- Keep max-composition from Feature 02 so multiple sources merge cleanly instead of creating
  overlap hotspots.

---

## Sound Behavior

Sound attenuation should not make closed doors mute sound like walls. Doors reduce sound at a
tunable partial transmission value, so sound still leaks through the door while remaining safer
than an open passage.

Current prototype sound is radius/event based with first-pass line attenuation for AI hearing.

Current behavior:

- Soundwave visuals may continue to draw through doors.
- Enemy hearing attenuates through walls and closed doors.
- Door opening emits a modest sound event.
- Door destruction emits a louder sound event.
- Door data carries `soundTransmission: 0.8` for closed-door sound propagation.

The current sound attenuation uses the same dynamic blocker concept:

```text
wall segment = strong attenuation
closed door segment = weak attenuation
open/destroyed door = no attenuation
```

---

## Damage and Destruction

Doors need HP because guns are only the current weapon type, not the final weapon set.

Implemented damage rules:

- A projectile that hits a closed door applies door damage.
- Current first pass uses `DOOR_DAMAGE = 20`.
- When `hp <= 0`, set `state = 'destroyed'`.
- Destroyed doors stop blocking movement, lighting, LOS, and pathing.
- Destroyed doors create a loud sound event so enemies can react.

Future weapon data can expose fields like:

```javascript
{
  damage: 20,
  doorDamage: 20,
  breaksDoors: true,
}
```

Future weapon data should replace `DOOR_DAMAGE` when weapon types become more formal.

---

## Player Interaction

The player can toggle a nearby, non-destroyed door.

Implemented first pass:

- Keyboard `E` and gamepad face-left / button 2 use the existing interaction input.
- Interaction radius is short enough that the player must be near the door.
- Closed door + interact = open.
- Open door + interact = closed.
- Destroyed door + interact = no effect.
- Opening and closing create modest sound events.
- Door interaction is blocked if an enemy occupies the doorway or the open panel's swing/panel
  space, so the player cannot toggle a door through an enemy standing in it.

Do not add locks, keys, lockpicking, or restricted doors in this feature unless explicitly
requested later.

---

## AI and NPC Behavior

Door implementation does not block existing enemy patrols permanently in the current first pass.

Implemented first pass:

- Enemies treat open/destroyed doors as passable. Future NPCs should use the same rule.
- Closed doors are treated as blockers for movement/path clearance.
- If an enemy route reaches a closed door, the enemy auto-opens a nearby closed door.
- Enemy projectiles can damage closed doors.

Enemy 3's cross-room patrol currently opens the Room A and B/C doors as needed. This is
functional but still needs manual feel/tuning review.

---

## Dynamic Blocker Architecture

The prototype previously had static wall-derived ray geometry such as `WALL_SEGMENTS` and
`WALL_CORNERS`. Doors made that static-only model insufficient.

Implemented dynamic geometry source covers:

- lighting visibility
- fog/visibility rays
- enemy line-of-sight
- projectile collision for closed door rectangles
- sound attenuation when implemented

Implemented structure:

```javascript
function getClosedDoorRects() {}
function getMovementBlockers() {}
function getRayBlockerRects() {}
function getRayBlockerPolygons() {}
function rebuildRayGeometryIfNeeded() {}
```

Door state changes mark both ray geometry and the static lighting cache dirty. Open doors add
rotated rectangular panel polygons to the ray blocker set; closed doors add doorway rectangles;
destroyed doors add neither.

---

## Rendering

Closed doors read as solid slabs in the existing wall gaps. Open doors keep the same rectangular
panel shape and rotate 75 degrees around the hinge. Destroyed doors show debris markers near the
gap without blocking the opening.

Keep the first visual pass simple:

- Closed: dark rectangular slab, slightly distinct from wall color.
- Open: same rectangular slab shape rotated around the hinge.
- Destroyed: broken low-contrast fragments near the gap.

The closed door visual matches the closed movement blocker. The open door visual matches the
rotated ray blocker, while the doorway remains passable.

---

## Files Modified

| File | Change |
|------|--------|
| `game.js` | Door mission data, state reset, interaction input, dynamic blockers, open-panel ray blockers, projectile-door hits, door drawing, cache invalidation |
| `lighting.js` | Door aperture state helpers; static light cache invalidation; lighting visibility polygon rebuilds against current dynamic geometry |
| `enemy.js` | Dynamic blockers for path clearance; enemy auto-open behavior; enemy projectile damage to doors |
| `player.js` | No changes required |
| `Operation guide/Feature planning/feature_09_doors.md` | Planning and implementation guide |
| `Live features/feature_09_doors.md` | Current live-state reference |

---

## Implementation Status

1. Done: door data, reset state, and rendering.
2. Done: dynamic closed-door rectangles for movement collision.
3. Done: dynamic ray geometry for fog, LOS, enemy cones, and lighting.
4. Done: player interaction to open/close nearby intact doors.
5. Done: projectile hits, HP, destruction state, and destruction sound.
6. Done: door state connected to lighting blockers and aperture open/closed state.
7. Done first pass: enemies auto-open nearby closed doors when pathing/patrolling reaches them.
8. Done first pass: weak closed-door sound attenuation for enemy hearing.
9. In progress: manual visual QA/tuning for placement, light leakage, and enemy door behavior.

---

## Current Success Criteria

- Closed doors block player/enemy movement and do not allow light through the doorway.
- Open doors allow movement through the doorway.
- Open door apertures allow light spill, while the rotated open panel still blocks rays where
  the panel is drawn.
- Closing the door blocks light spill again.
- Projectiles damage closed doors and destroy them at zero HP.
- Destroyed doors become permanently passable and permanently light-transmitting.
- Enemy LOS/pathing does not treat closed doors as open space.
- Static lighting cache updates immediately when a door opens, closes, or is destroyed.
- Manual QA should verify all of the above from both sides of each doorway.

---

## Deferred

- Locked doors, keys, lockpicking, and electronic access.
- Door animations beyond instant open/closed visual state changes.
- Door peek/half-open states.
- Enemy tactical door behavior such as breaching, listening, or guarding doors.
- Save/load persistence for door HP and state.
- Advanced acoustic propagation through connected room graphs.
