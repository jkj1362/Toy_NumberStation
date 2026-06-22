# Live Feature 08 - Walk, Run, and Noise Tradeoff

**Live status: Implemented.**

Movement speed is tied to noise scale so player movement choice affects enemy hearing.

## Current Behavior

- Hard aim forces sneak speed and low noise.
- Gamepad left-stick tilt blends from sneak to walk when not sprinting.
- Gamepad face-bottom / button `0` toggles sprint when not hard aiming.
- Sprint increases speed and sound radius.
- Keyboard movement is walk speed, or sneak speed while hard aim is held.
- Footstep sound events use `player.noiseScale` to scale the radius.
- Enemies use the scaled footstep radius when reacting to player movement.

## Current Caveats

- Sprint toggle is gamepad-only in the current pass.
- Keyboard has no independent run key.
- There is no stamina, fatigue, or surface material sound variation.

## Related Files

- `player.js`
- `enemy.js`
- `game.js`

