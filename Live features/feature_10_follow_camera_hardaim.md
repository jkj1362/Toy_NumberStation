# Live Feature 10 - Follow Camera and Hard-Aim Scouting

**Live status: Implemented.**

The game renders a fixed `1920 x 1080` viewport into a larger `3200 x 1800` world with a following camera and hard-aim look-ahead.

## Current Behavior

- The browser canvas is internally `1920 x 1080` and scales to fit the window at 16:9.
- The camera follows the player with smoothing.
- A soft look-ahead follows the player's facing direction during normal movement.
- Holding hard aim uses a much larger look-ahead distance, clamped to keep the viewport inside the world.
- Hard-aim look-ahead is also clamped by the first forward ray blocker so walls and doors limit camera scouting.
- Hard aim is held with right mouse button or gamepad left trigger.
- Hard aim also forces sneak speed and suppresses sprint.
- Hard aim narrows the player's vision cone by 50%, from 120 degrees to 60 degrees.
- Hard aim shows a thin fire guide line along the current projectile direction.
- The fire guide stops at the first ray blocker, including walls, closed doors, and open door panels.
- Hard aim eases player facing/fire direction more slowly toward aim input so aiming is less twitchy.
- Hard aim applies subtle soft magnetism toward living, lit enemies near the current fire line when line of sight is clear.
- Soft magnetism is strongest while the player actively moves mouse aim or right stick, then fades out over a short release window instead of tracking indefinitely.
- When soft magnetism is active, the assisted enemy gets a small cyan reticle and the fire guide line brightens.
- The render loop draws world-space content through the camera transform, then composites to the screen canvas.
- Camera look-ahead, hard-aim distance, occlusion padding, camera easing, lookahead easing, hard-aim vision, and aim-assist values are exposed in the tuning/debug panel.

## Current Caveats

- Camera obstacle handling is limited to the hard-aim forward ray; there is no full camera collision volume.
- There is no zoom mode.
- Hard aim is both a camera/scouting state and a movement/noise state.
- There is no hard lock-on; current aim assist is intentionally soft and constrained.

## Related Files

- `game.js`
- `input.js`
- `player.js`
