# Live Feature 09 - Door System

**Live status: Implemented for wooden and reinforced metal doors; final tuning remains.**

Doors are animated dynamic geometry. They affect movement, raycasting, lighting, enemy pathing, projectiles, interaction, and sound.

## Current Behavior

- The facility has thin destructible wooden doors and one reinforced metal door at `room_f_west_door`.
- Wooden doors have `200` HP, take `20` damage per standard hit, survive nine shots, and break on the tenth. Penetration creates persistent bullet holes but does not destroy the panel until HP reaches zero.
- The metal door uses the former `18`-unit thick panel, has no HP, is non-destructible, and blocks every projectile.
- Pressing `E` or gamepad face-left / button `2` toggles a nearby intact door.
- Doors open away from the interacting actor. Wooden doors swing over `12` frames; the heavier metal door uses `24`. Closing follows the same path in reverse.
- A closing actor stays on the side where closing began instead of being transferred through the doorway when the closed blocker returns.
- Closed panels block movement, vision, light, and projectiles according to their material.
- Opening, open, and closing panels retain rotated physical geometry. The panel blocks character paths and sight; only the unobstructed part of the aperture is passable.
- Destroyed wooden doors remove their blocker, leave debris, and emit a destruction sound.
- Intact wooden doors are projectile-penetrable in every state—closed, opening, open, or closing—and display their debug HP near the current panel when visible in the player's cone.
- Open and destroyed apertures transmit sound fully. Closed doors attenuate sound using `soundTransmission`, currently `0.8`.
- Interaction/closing is blocked when an actor occupies the doorway or swing space.
- Enemies can open doors while navigating, route around swung panels, cross into open room space, and close only doors owned by their investigation sequence when safe.

## Current Caveats

- Door HP bars and state labels are debug presentation and are intended to be hidden or removed later.
- Destruction uses simple debris; richer break visuals are deferred.
- There are no locked, keyed, half-open, or peek states.
- Animation timing, panel thickness, sound, and light leakage remain tunable.

## Related Files

- `input.js`
- `game.js`
- `lighting.js`
- `sound.js`
- `enemy.js`
- `tuning.js`
