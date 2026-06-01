# Feature 08 - Walk vs. Run + Noise Tradeoff

**Status: PENDING**

---

## Overview

Feature 08 gives the player a deliberate movement/noise choice. The current prototype has one movement speed (`player.speed = 4`) and one footstep sound profile. This feature adds a faster run state that helps traversal but increases the chance that enemies hear the player.

---

## Proposed Controls

| Input | Movement mode |
|-------|---------------|
| Keyboard WASD | Walk |
| Keyboard Shift + WASD | Run |
| Gamepad left stick partial tilt | Walk |
| Gamepad left stick full tilt | Run |

The exact gamepad threshold should be tuned in implementation.

---

## Proposed Tuning

| Mode | Speed | Sound behavior |
|------|-------|----------------|
| Walk | 4 px/frame | Existing footstep radius |
| Run | 7-8 px/frame | Larger footstep radius |

`enemy.js` already scales footstep reach from `player.speed`, so the first implementation can lean on the existing formula instead of adding a separate noise table.

---

## Implementation Notes

- Keep `WALK_SPEED = 4` in `enemy.js` as the baseline for current footstep math.
- Add explicit movement-mode state in `game.js` so future UI/audio feedback can read it.
- Avoid sprint stamina for the first pass. The feature is about readable stealth tradeoffs, not resource management.
- Verify that run speed still behaves with `pushOutOfWalls()` called twice per frame.

---

## Success Criteria

- Walking keeps the current movement feel.
- Holding Shift while moving makes the player clearly faster.
- Running produces visibly larger footstep rings and alerts enemies from farther away.
- Gamepad movement has an equivalent walk/run distinction.
