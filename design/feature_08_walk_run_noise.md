# Feature 08 - Movement Modes and Noise Tradeoff

**Status: DONE**

---

## Overview

Feature 08 gives the player a deliberate movement/noise choice. The current prototype has one movement speed (`player.speed = 4`) and one footstep sound profile. This feature adds explicit movement mode state so the player can move quietly, walk normally, or intentionally sprint at the cost of making more noise.

This first implementation is focused on gamepad behavior. Keyboard movement can remain as a basic fallback, but keyboard sprint/sneak controls are out of scope for this pass.

---

## Movement Modes

| Mode | Control | Speed | Noise |
|------|---------|-------|-------|
| Sneak | Partial L-stick tilt | Slow, scales with stick tilt | Quiet, scales with stick tilt |
| Walk | Default movement / fuller L-stick tilt | Slower than current prototype speed | Current baseline noise, or close to it |
| Sprint | Tap face button A to toggle sprint state | Current prototype movement speed | Louder than walk, larger sound radius |

Walking is the default movement state. The current prototype speed feels too fast for baseline walking, so walking should be tuned slower than the current `player.speed = 4`.

Sneak is not a toggle state. It is controlled by analog stick sensitivity: the more lightly the player tilts the L-stick, the slower and quieter the character moves. The upper end of normal stick movement reaches walking speed/noise only.

Sprint is an intentional state toggled by tapping face button A. Stick tilt alone cannot activate sprint and cannot exceed walking speed/noise. Once sprint is toggled on, movement uses sprint speed and sprint noise while the player keeps moving. When the player releases the L-stick and stops moving, sprint automatically resets back to the default walking state.

Keyboard controls are not part of this feature pass. Existing WASD movement may remain as a simple walk fallback.

---

## Proposed Tuning Targets

| Mode | Speed | Sound behavior |
|------|-------|----------------|
| Sneak | ~0.8 px/frame at low tilt, scaling upward | Smaller footstep radius than walk |
| Walk | ~2.25 px/frame | Existing footstep radius or slightly reduced |
| Sprint | 4 px/frame | Larger footstep radius than walk |

Exact values should be tuned in implementation. Sprint should reuse the current movement speed because the current speed feels appropriate for sprinting. Walking should be slowed down so it becomes the normal cautious traversal pace.

Runtime tuning values should stay centralized in `game.js` so speed and noise can be adjusted without changing input logic:

| Constant | Purpose |
|----------|---------|
| `PLAYER_SNEAK_SPEED` | Minimum analog sneak speed |
| `PLAYER_WALK_SPEED` | Default full-tilt walking speed |
| `PLAYER_SPRINT_SPEED` | A-button sprint speed |
| `PLAYER_SNEAK_NOISE_SCALE` | Minimum analog sneak noise |
| `PLAYER_WALK_NOISE_SCALE` | Baseline walking noise |
| `PLAYER_SPRINT_NOISE_SCALE` | Sprint noise multiplier |

---

## Implementation Notes

- Keep `WALK_SPEED = 4` in `enemy.js` as the baseline for current footstep math.
- Add explicit movement-mode state in `game.js` so future UI/audio feedback can read it.
- Add sprint toggle state in `game.js`, driven by gamepad face button A (`button 0`).
- Use an edge check for button A so holding the button does not repeatedly toggle sprint.
- Reset sprint toggle state when the L-stick is released and the player stops moving.
- Track the player's current effective noise level separately from raw movement speed, so sneak can be quieter and sprint can be louder.
- Ensure `enemy.js` uses the current effective player noise value when calculating footstep hearing radius.
- Make the visible footstep ring use the same effective noise radius so the noise tradeoff is readable.
- Avoid sprint stamina for the first pass. The feature is about readable stealth tradeoffs, not resource management.
- Verify that run speed still behaves with `pushOutOfWalls()` called twice per frame.

---

## Success Criteria

- Default walking is slower than the current prototype movement speed.
- Partial L-stick tilt produces a slow, quiet sneak.
- Full L-stick tilt without sprint reaches walking speed/noise only.
- Tapping face button A toggles sprint on.
- Sprint uses the current prototype movement speed and produces visibly larger footstep rings.
- Sprint alerts enemies from farther away than walking.
- Releasing the L-stick and stopping movement resets sprint back to walking.
