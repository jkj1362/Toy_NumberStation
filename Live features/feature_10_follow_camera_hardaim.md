# Live Feature 10 - Follow Camera and Hard-Aim Scouting

**Live status: Implemented.**

The game renders a fixed `1920 x 1080` viewport into a larger `3200 x 1800` world with a following camera and hard-aim look-ahead.

## Current Behavior

- The browser canvas is internally `1920 x 1080` and scales to fit the window at 16:9.
- The camera follows the player with smoothing.
- A soft look-ahead follows the player's facing direction during normal movement.
- Holding hard aim uses a much larger look-ahead distance, clamped to keep the viewport inside the world.
- Hard aim is held with gamepad left trigger or keyboard `Shift`.
- Hard aim also forces sneak speed and suppresses sprint.
- The render loop draws world-space content through the camera transform, then composites to the screen canvas.

## Current Caveats

- There is no camera obstacle handling beyond world-edge clamping.
- There is no zoom mode.
- Hard aim is both a camera/scouting state and a movement/noise state.

## Related Files

- `game.js`
- `player.js`

