# Feature 09 — Follow Camera & Hard-Aim Scouting

**Status: PENDING**

---

## Overview

The game currently renders the entire fixed map with a static camera, giving the player full
situational awareness. Feature 09 replaces this with a **player-following camera** to restore
the core stealth tension of *information denial* — threats arrive on-screen late, compounding
the existing line-of-sight fog and enemy vision cones.

The camera has two states: a calm **Look** state (dead-zone, player roughly centered) and a
**Hard-Aim** scouting state (hold Left Trigger) that pushes the camera forward so the player
can see much farther ahead at the cost of awareness behind them.

> Note: the payoff scales with map size. On the current 1920×1080 map (barely larger than the
> viewport) the camera mostly clamps at map edges. Keep zoom at 1:1; the effect grows as the
> map expands (many rooms / multiple floors).

---

## Camera States

| State | Trigger | Right stick | Camera behavior | Player on screen |
|-------|---------|-------------|-----------------|------------------|
| **Look** (default) | — | Rotates facing/view only | Holds still inside a center dead-zone box; scrolls only when the player pushes the box edge | ~Centered |
| **Hard-Aim** | Hold **Left Trigger** | Sweeps the extended view as the stick turns | Eases forward along `player.angle`, dropping the player toward a screen corner (kept off the edge by a padding margin) | Corner, opposite aim, padded |

Behavior details:
- **Dead zone:** a center rectangle the player can move within without moving the camera. The
  camera only scrolls to keep the player on the box edge.
- **Hard-aim look-ahead:** while LT is held, offset the camera target a large distance along the
  player's facing direction. Release returns to the dead-zone state.
- **Smooth transitions:** lerp the look-ahead offset on LT press/release (no snapping) — reuse
  the smoothing philosophy of `lerpAngle(current, target, t)` (Feature 00).
- **Corner padding:** the player settles into the corner with a margin, never flush to the edge.
- **Right stick** is purely a camera/view modifier — it does **not** gate firing.

---

## Movement Coupling

While Hard-Aim (LT) is held, the player may still move but is locked to the slowest gait
(**walk-slow**) from the three movement states (walk-slow / normal-walk / run) defined in
**Feature 08**. Scouting far forces the quietest, most exposed movement = built-in risk/reward.

If Feature 08 is not yet implemented, hard-aim may temporarily root the player in place; wire
the walk-slow lock once Feature 08 lands.

---

## Proposed Controls

| Input | Effect |
|-------|--------|
| Gamepad right stick | Rotate facing/view (both states) |
| Gamepad **Left Trigger** (hold) | Enter Hard-Aim: camera pushes forward, player to padded corner |
| Release Left Trigger | Ease back to centered dead-zone (Look state) |

Keyboard/mouse equivalents to be decided during implementation (e.g. hold a key for hard-aim).

---

## Proposed Tuning (expose as constants)

| Constant | Meaning | Starting guidance |
|----------|---------|-------------------|
| `CAM_DEADZONE_W/H` | Size of the center dead-zone box | ~30–40% of viewport |
| `CAM_HARDAIM_DIST` | How far the camera leads in hard-aim | enough to push player near a corner |
| `CAM_CORNER_PADDING` | Margin keeping the player off the screen edge | small, readable margin |
| `CAM_EASE` | Camera follow/lerp speed | similar feel to `lerpAngle` t=0.18 |
| `CAM_HARDAIM_EASE` | LT press/release transition speed | smooth, no snap |

---

## Implementation Notes

- Track `cameraX/cameraY`, eased each frame toward a target:
  `target = playerPos + lookaheadOffset`, where `lookaheadOffset` ramps to
  `CAM_HARDAIM_DIST` along `player.angle` while LT is held, else 0 (with dead-zone applied).
- **Clamp** the camera to map bounds `[0..GAME_WIDTH] / [0..GAME_HEIGHT]` so it never shows
  outside the world.
- Apply the camera as a single `ctx.translate(-cameraX, -cameraY)` before drawing world
  elements; restore before drawing HUD/UI (screen space).
- **Keep all collision and raycasting in world space** — do not transform `WALLS` /
  `WALL_SEGMENTS` or the vision/LOS math. Only the draw transform changes.
- **Fixed-canvas caveat:** fog/lighting/lamps are currently pre-rendered onto the fixed
  1920×1080 `gameCanvas` (assumes the world fits one screen). This still works at the current
  map size, but once the world exceeds the viewport these layers must become camera-aware
  (render only the visible region). Flag, don't block, for this first pass.

---

## Fairness (becomes important as the camera hides threats)

- **Shooter enemy:** gate shots behind player line-of-sight or telegraph them so enemies can't
  fire from off-screen.
- **Off-screen cues:** directional audio + subtle screen-edge indicators using existing sound
  events (footsteps, gunshot radius 350).

---

## Dependencies

- **Feature 00** — pawn `angle`/`targetAngle`, `lerpAngle` smoothing (reused for camera ease).
- **Feature 08** — three movement states; hard-aim locks movement to walk-slow.

---

## Success Criteria

- Default (Look) state: moving the player within the center box does not move the camera;
  pushing the edge scrolls it smoothly.
- Holding Left Trigger eases the camera forward so the player sits in a padded screen corner
  and sees noticeably farther ahead; turning the right stick sweeps that view.
- Releasing Left Trigger eases smoothly back to the centered dead-zone — no snapping.
- While hard-aiming, the player can still move but only at walk-slow (once Feature 08 exists).
- Camera never reveals area outside the map bounds.
- Collision, vision cones, and LOS behave identically to before (world-space unaffected).

---

## Files to Modify

| File | Change |
|------|--------|
| `game.js` | Add camera state (`cameraX/cameraY`, dead-zone, hard-aim offset, LT input, easing, clamping); apply `ctx.translate` in the draw pipeline; draw HUD after restore |
| `design/feature_09_follow_camera_hardaim.md` | This document (new) |

(Fog/lighting camera-awareness is deferred until the map exceeds the viewport.)
