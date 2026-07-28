# Live Feature 09 - Door System

**Live status: Implemented for normal wooden and reinforced metal doors; final tuning and stability work remain.**

Doors are animated dynamic geometry. They affect movement, raycasting, lighting, enemy navigation, projectiles, interaction, evidence, and sound.

## Current Behavior

- The facility has thin penetrable wooden doors and one reinforced metal door at `room_f_west_door`.
- Normal wooden doors have `2000` HP and take `20` damage per standard bullet. They survive 99 standard hits and are destroyed by the hundredth.
- The high wooden-door HP intentionally makes destruction by ordinary gunfire impractical. Future explosives are the intended normal way to destroy a wooden door; explosives are not implemented yet.
- Penetrating shots leave persistent panel-relative bullet holes in every intact door state.
- The reinforced metal door uses an `18`-unit-thick panel, has no HP, is non-destructible, and blocks every projectile regardless of penetration power.
- Pressing `E` or gamepad face-left / button `2` toggles a nearby intact door.
- Doors open away from the interacting actor. Wooden doors swing over `12` frames; the heavier metal door uses `24`. Closing reverses the opening path.
- A closing actor stays on the side where closing began rather than being transferred when the closed blocker returns.
- Closed panels block movement, vision, light, and projectiles according to their material.
- Opening, open, and closing panels retain rotated geometry. The panel remains a character/vision/projectile blocker while the unobstructed aperture is passable.
- Destroyed wooden doors remove their blocker, leave debris, open linked light/sound paths, and emit the same-shot destruction event.
- Open and destroyed apertures transmit sound fully. Closed doors apply `soundTransmission`, currently `0.8`.
- Interaction/closing is blocked when an actor occupies the doorway or swing space.
- Enemies can open doors while navigating, route around swung panels, cross into deep room-side space, and close only doors owned by their investigation sequence when safe.
- Later visual discovery of door damage/destruction requires ordinary illumination, cone/range, and clear line of sight. A sufficiently illuminated real-time strike witness may alert immediately.
- A same-shot door destruction sound supersedes that door's ordinary impact sound and uses the current `560`-unit base radius without becoming a second confirmation.

## Current Caveats

- Standard bullet fire can technically destroy a wooden door after 100 hits as a stress/debug fallback; no explosive damage path exists yet.
- Door HP bars and state labels are debug presentation.
- Destruction uses simple debris; richer break visuals are deferred.
- There are no locked, keyed, half-open, or peek states.
- Animation timing, panel thickness, transmission, and light leakage remain tunable.

## Related Files

- `input.js`
- `game.js`
- `lighting.js`
- `sound.js`
- `enemy.js`
- `tuning.js`
