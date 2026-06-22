# Live Feature 00 - Pawn Movement and Vision

**Live status: Implemented.**

The player pawn is a top-down character with position, facing angle, collision radius, projectiles, a 120-degree vision cone, and a small proximity reveal circle.

## Current Behavior

- The player starts near the lower entry area at design-space `(500, 680)`, scaled into the live `3200 x 1800` world.
- Keyboard `WASD` moves the pawn as a walking fallback.
- Gamepad left stick moves the pawn with analog sneak-to-walk strength.
- Gamepad right stick controls facing direction.
- Right trigger fires a projectile along the current facing direction.
- Gamepad `B` resets the mission.
- Movement is pushed out of current movement blockers, which means walls plus closed doors.
- Fog is removed only inside the wall-occluded vision cone and the close proximity circle.

## Current Caveats

- Keyboard aiming is not implemented; keyboard movement keeps the last target angle unless gamepad aiming changes it.
- Projectiles are simple line visuals and collision checks, not a generalized weapon system.
- Vision uses current ray blockers, so open door panels and closed doors affect visibility.

## Related Files

- `player.js`
- `game.js`

