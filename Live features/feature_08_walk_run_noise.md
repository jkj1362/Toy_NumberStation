# Live Feature 08 - Walk, Run, and Noise Tradeoff

**Live status: Implemented.**

Movement speed is tied to noise scale so player movement choice affects enemy hearing.

## Current Behavior

- Hard aim forces sneak speed and low noise.
- Gamepad left-stick tilt blends from sneak to walk when not sprinting.
- Gamepad face-bottom / button `0` toggles sprint when not hard aiming.
- Keyboard `Shift` holds sprint while pressed.
- Keyboard `C` toggles digital sneak mode on/off.
- Sprint increases speed and sound radius.
- Keyboard movement is walk speed by default, sprint speed while `Shift` is held, and sneak speed while `C` sneak mode or hard aim is active.
- Footstep sound events use `player.noiseScale` to scale the radius.
- Enemies use the scaled footstep radius when reacting to player movement.

## Current Caveats

- There is no stamina, fatigue, or surface material sound variation.

## Related Files

- `player.js`
- `input.js`
- `sound.js`
- `enemy.js`
- `game.js`
