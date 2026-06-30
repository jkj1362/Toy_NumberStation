# Live Feature 09 - Door System

**Live status: First pass implemented; manual visual QA and tuning pending.**

Doors are dynamic geometry. They affect movement, raycasting, lighting, enemy pathing, projectiles, interaction, and sound events.

## Current Behavior

- Five closed doors are authored in existing wall gaps.
- Doors start closed with `60` HP.
- Pressing `E` or gamepad face-left / button `2` toggles a nearby intact door.
- Closed doors are movement blockers and ray blockers.
- Open doors are passable, but the rotated open panel is still a ray blocker.
- Destroyed doors are passable and do not add blocker geometry.
- Door state toggles linked lighting apertures, with open doors casting stronger light spill into the room on the other side.
- Door changes mark ray geometry and static lighting dirty.
- Player projectiles and enemy projectiles can damage closed doors.
- Closed doors draw an HP bar whenever the door is in the player's vision cone, regardless of lighting.
- At zero HP, a door becomes destroyed and emits a louder sound event.
- Closed doors leak sound at reduced strength using `soundTransmission`, currently `0.8`.
- Open and destroyed doors do not attenuate sound.
- Door interaction is blocked if an enemy occupies the doorway or swing/panel space.
- Enemies can auto-open nearby closed doors while pathing or patrolling.

## Current Caveats

- Door placement, light leakage, door HP bar presentation, and enemy door behavior need direct visual QA.
- Door destruction is currently represented by simple debris pieces; richer shatter/break visuals are deferred.
- Door animation is instant.
- There are no locked, keyed, half-open, or peek states.
- Door acoustic tuning is first pass and may need playtest adjustment.

## Related Files

- `input.js`
- `game.js`
- `lighting.js`
- `sound.js`
- `enemy.js`
