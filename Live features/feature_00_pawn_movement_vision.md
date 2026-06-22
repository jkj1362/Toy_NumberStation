# Live Feature 00 - Pawn Movement and Vision

**Live status: Implemented.**

The player pawn is a top-down character with position, facing angle, collision radius, projectiles, a 120-degree vision cone, and a small proximity reveal circle.

## Current Behavior

- The player starts near the lower entry area at design-space `(500, 680)`, scaled into the live `3200 x 1800` world.
- `input.js` normalizes keyboard/mouse and gamepad controls into action-level input consumed by `player.js` and `game.js`.
- Keyboard `WASD` / arrow keys and gamepad left stick move the pawn.
- Gamepad left-stick tilt controls analog sneak-to-walk strength.
- Keyboard `C` toggles digital sneak mode on/off.
- Keyboard `Shift` holds sprint; gamepad face-bottom / button `0` toggles sprint.
- Mouse position and gamepad right stick control facing direction.
- Right mouse button or gamepad left trigger holds hard aim, which also forces sneak movement.
- Left mouse button or gamepad right trigger fires a projectile along the current facing direction.
- `E` or gamepad face-left / button `2` performs regular interaction.
- Keyboard `]` or gamepad `B` resets the mission.
- Movement is pushed out of current movement blockers, which means walls plus closed doors.
- Fog is removed only inside the wall-occluded vision cone and the close proximity circle.

## Current Caveats

- Projectiles are simple line visuals and collision checks, not a generalized weapon system.
- Vision uses current ray blockers, so open door panels and closed doors affect visibility.

## Related Files

- `player.js`
- `input.js`
- `game.js`
