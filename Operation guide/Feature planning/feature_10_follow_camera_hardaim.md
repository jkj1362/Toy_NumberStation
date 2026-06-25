# Feature 10 - Follow Camera & Hard-Aim Scouting

**Status: DONE**

---

## Overview

The game currently renders the entire fixed map with a static camera, giving the player full
situational awareness. Feature 10 replaces this with a **player-following camera** to restore
the core stealth tension of *information denial* — threats arrive on-screen late, compounding
the existing line-of-sight fog and enemy vision cones.

The camera has two states: a calm **Look** state (soft-centered with a small forward bias) and
a **Hard-Aim** scouting state (hold Left Trigger) that pushes the camera farther forward so the
player can see much farther ahead at the cost of awareness behind them.

> Note: the payoff scales with map size. The current test world is larger than the viewport
> so the camera can move, but the same 1:1 zoom should remain as the facility expands into
> many rooms / multiple floors.

---

## Camera States

| State | Trigger | Right stick | Camera behavior | Player on screen |
|-------|---------|-------------|-----------------|------------------|
| **Look** (default) | — | Rotates facing/view only | Eases toward the player plus a small forward look-ahead | Slightly behind center, opposite aim |
| **Hard-Aim** | Hold **Left Trigger** | Sweeps the extended view as the stick turns | Eases forward along `player.angle`, dropping the player toward a screen corner (kept off the edge by a padding margin) | Corner, opposite aim, padded |

Behavior details:
- **Soft-centered look:** the camera continuously eases toward the player plus a small
  forward look-ahead so normal movement has useful view ahead without requiring hard-aim.
- **Hard-aim look-ahead:** while LT is held, offset the camera target a large distance along the
  player's facing direction. Release returns smoothly to the smaller soft look-ahead.
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

## Aim Focus and Assist Pass

This pass develops hard-aim beyond camera scouting. Hard aim should become a focused firing
state with a readable tradeoff: the player gains precision and fire prediction, but loses
peripheral awareness.

### Current Pass

Implement these in order:

1. **Tunnel vision while hard aiming**
   - Normal player vision cone remains `120` degrees.
   - Hard aim narrows the player vision cone by `50%`, to `60` degrees.
   - This affects player vision/fog and vision-gated interaction discovery.
   - This does not affect enemy vision cones.

1b. **Forward blocker camera clamp**
   - Hard-aim camera lead should only extend deeply into forward space when the player has an open line.
   - If the aim ray hits a wall, closed door, or open-door panel directly ahead, clamp the hard-aim camera lead before that blocker.
   - This prevents hard aim from becoming an indirect way to inspect sound rings or other readability cues beyond a wall.
   - Normal soft look-ahead can remain unchanged.

2. **Thin fire guide line while hard aiming**
   - Draw a thin line from the player along the current fire direction while hard aim is held.
   - The line should use the same direction as projectiles.
   - The line should stop at the first ray blocker so it previews walls, doors, and open-door panels blocking fire.
   - Keep this as a readable assist, not a lock-on system.

3. **Hard-aim turn smoothing**
   - Keep input intent responsive: mouse/right-stick still sets `player.targetAngle`.
   - While hard aim is held, ease the character/fire direction toward `targetAngle` more slowly than normal.
   - Normal non-aim turning should stay responsive.

4. **Soft aim magnetism test**
   - Keep this as soft aim magnetism, not hard lock-on or snapping.
   - Only active during hard aim.
   - Only considers living enemies.
   - Only considers enemies with line of sight from the player.
   - Only considers targets near the current fire line.
   - Require the target to be lit/visible enough for the player so magnetism does not become a free enemy detector.
   - Bias the fire angle gently toward the best target rather than snapping.
   - Apply full angle bias while the player is actively adjusting aim with mouse movement or right-stick input.
   - When input stops, fade the angle bias out over a very short release window instead of tracking forever.
   - After the release window, keep the current fire direction steady.
   - If the player moves aim away, the target naturally drops out and the assist releases or shifts.
   - Show a subtle reticle around the assisted target so the player can read when magnetism is engaged.
   - Slightly brighten/recolor the fire guide while magnetism is engaged.

### Deferred Aim Assist

Do not implement hard lock-on in this pass. If soft magnetism is not enough later, a stronger
lock-on system should still avoid snapping, hidden targets, and wall/fog detection exploits.

---

## Proposed Controls

| Input | Effect |
|-------|--------|
| Gamepad right stick | Rotate facing/view (both states) |
| Gamepad **Left Trigger** (hold) | Enter Hard-Aim: camera pushes forward, player to padded corner |
| Release Left Trigger | Ease back to soft-centered Look state |

Keyboard/mouse equivalent is right mouse button hold.

---

## Proposed Tuning (expose as constants)

| Constant | Meaning | Starting guidance |
|----------|---------|-------------------|
| `CAM_SOFT_LOOKAHEAD_DIST` | Normal-look forward camera lead | ~10% of the shorter viewport side; enough to make forward movement comfortable without replacing hard-aim |
| `CAM_HARDAIM_DIST` | How far the camera leads in hard-aim | enough to push player near a corner |
| `CAM_CORNER_PADDING` | Margin keeping the player off the screen edge | small, readable margin |
| `CAM_EASE` | Camera follow/lerp speed | similar feel to `lerpAngle` t=0.18 |
| `CAM_LOOKAHEAD_EASE` | Normal/hard-aim look-ahead transition speed | smooth, no snap |
| `CAM_HARDAIM_OCCLUSION_PADDING` | Margin before forward blockers when hard aiming | keep the player from looking past immediate walls/doors |
| `HARD_AIM_VISION_MULTIPLIER` | Hard-aim player cone multiplier | `0.5` for 60-degree focused vision from the 120-degree base cone |
| `NORMAL_AIM_TURN_EASE` | Normal facing turn ease | current responsive value |
| `HARD_AIM_TURN_EASE` | Hard-aim facing turn ease | lower than normal for steadier fire direction |
| `HARD_AIM_MAGNET_ENABLED` | Enables hard-aim soft magnetism | `true` for test pass; easy to disable |
| `HARD_AIM_MAGNET_ANGLE` | Max angular distance from fire line | Current test: about 13 degrees; upper-bound test at 20 degrees felt too auto-targeting |
| `HARD_AIM_MAGNET_RANGE` | Max target distance | Long enough to help room-scale shooting, not whole-map |
| `HARD_AIM_MAGNET_STRENGTH` | Aim bias strength | Current test: 0.25; upper-bound test at 0.45 felt too auto-targeting |
| `HARD_AIM_MAGNET_RELEASE_FRAMES` | Frames for magnetism to fade after aim input stops | Current test: 10 frames |

### Future Tuning Notes

| Tunable | Current value | Raise when... | Lower when... |
|---------|---------------|---------------|---------------|
| `CAM_SOFT_LOOKAHEAD_DIST` | `min(viewportW, viewportH) * 0.10` (~108 px at 1920x1080) | normal movement feels cramped or the player cannot see enough forward without hard-aim | normal look feels too close to hard-aim, or turning the right stick moves the camera too much |
| `CAM_HARDAIM_DIST` | `max(viewportW, viewportH)`, clamped by corner padding | hard-aim does not reveal meaningfully more forward space than normal look | hard-aim hides too much behind the player or makes navigation disorienting |
| `CAM_CORNER_PADDING` | `scaleGameUnit(48)` | the player sits too close to the screen edge while hard-aiming | hard-aim does not push the player far enough toward the corner |
| `CAM_EASE` | `0.18` | the camera feels sluggish while the player moves | the camera feels twitchy or too locked to every small movement |
| `CAM_LOOKAHEAD_EASE` | `0.16` | aim-direction camera lead feels delayed, especially when entering hard-aim | right-stick turning causes too much camera sway or motion discomfort |
| `CAM_HARDAIM_OCCLUSION_PADDING` | `scaleGameUnit(48)` | hard aim still peeks too far past blockers | hard aim stops too far before open-feeling thresholds |
| `HARD_AIM_VISION_MULTIPLIER` | `0.5` | hard aim still gives too much peripheral awareness | hard aim feels too punishing or visually cramped |
| `HARD_AIM_TURN_EASE` | lower than normal turn ease | hard aim still feels twitchy | hard aim feels unresponsive |
| `HARD_AIM_MAGNET_ANGLE` | current test: about 13 degrees | assist is too hard to trigger | assist grabs targets too far from intent |
| `HARD_AIM_MAGNET_STRENGTH` | current test: 0.25 | assist is imperceptible | aim feels automated or sticky |
| `HARD_AIM_MAGNET_RELEASE_FRAMES` | current test: 10 frames | assist drops too abruptly after input stops | assist keeps tracking too long |

Visual read:
- When soft magnetism has a target, the assisted enemy gets a small cyan reticle.
- The fire guide line also becomes brighter/cyan while assist is active.
- These cues should only appear for the same targets eligible for magnetism.

Useful ratios to preserve:
- Normal look should be noticeably weaker than hard-aim, roughly one quarter to one third of
  the visible hard-aim lead.
- Hard-aim should remain strong enough that the player gives up rear awareness, otherwise the
  slow-movement lock feels like pure penalty.
- If the map becomes room-dense, reduce `CAM_HARDAIM_DIST` or increase `CAM_CORNER_PADDING`
  before reducing normal look; hard-aim should not constantly stare into walls.

---

## Implementation Summary

- Track `cameraX/cameraY`, eased each frame toward a target:
  `target = playerPos + lookaheadOffset`, where `lookaheadOffset` ramps to
  a small `CAM_SOFT_LOOKAHEAD_DIST` during normal look and to `CAM_HARDAIM_DIST`
  along `player.angle` while LT is held.
- **Clamp** the camera to map bounds `[0..GAME_WIDTH] / [0..GAME_HEIGHT]` so it never shows
  outside the world.
- Apply the camera as a single `ctx.translate(-cameraX, -cameraY)` before drawing world
  elements; restore before drawing HUD/UI (screen space).
- **Keep all collision and raycasting in world space** — do not transform `WALLS` /
  `WALL_SEGMENTS` or the vision/LOS math. Only the draw transform changes.
- **Fixed-canvas caveat:** fog/lighting/lamps are currently pre-rendered onto full-world
  offscreen canvases and then camera-translated into the visible viewport. This works for the
  current `3200x1800` test world, but larger worlds should render only the visible region.
  Flag, don't block, for this first pass.

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

- Default (Look) state: the camera smoothly follows the player with a small forward bias.
- Holding Left Trigger eases the camera forward so the player sits in a padded screen corner
  and sees noticeably farther ahead; turning the right stick sweeps that view.
- Hard-aim camera lead is clamped by the first forward ray blocker so walls/doors cannot be used
  to scout beyond their far side.
- Releasing Left Trigger eases smoothly back to the smaller normal-look lead — no snapping.
- While hard-aiming, the player can still move but only at walk-slow (once Feature 08 exists).
- While hard-aiming, the player's vision cone narrows by 50%.
- While hard-aiming, a thin fire guide line previews projectile direction and ray blockers.
- While hard-aiming, facing/fire direction eases more slowly toward input aim than normal.
- While hard-aiming near a visible enemy, soft magnetism gently biases fire direction without snapping.
- Soft magnetism fades out shortly after aim input stops instead of tracking indefinitely.
- Soft magnetism provides a readable reticle/fire-line cue when it is active.
- Camera never reveals area outside the map bounds.
- Collision, vision cones, and LOS behave identically to before (world-space unaffected).

---

## Files to Modify

| File | Change |
|------|--------|
| `game.js` | Add camera state (`cameraX/cameraY`, soft look-ahead, hard-aim offset, LT input, easing, clamping); apply `ctx.translate` in the draw pipeline; draw HUD after restore |
| `player.js` | Accept hard-aim state from `game.js`; while held, disable sprint and force movement/noise to the sneak tier |
| `enemy.js` | Split the red player-hit flash into a screen-space draw helper so it stays outside the camera transform |
| `Operation guide/Feature planning/feature_10_follow_camera_hardaim.md` | This planning document |
| `Live features/feature_10_follow_camera_hardaim.md` | Current live-state reference |

(Fog/lighting camera-awareness is deferred until the map exceeds the viewport.)

---

## Implementation Notes

- `game.js` owns camera state, LT/Shift hard-aim input, soft-centered forward look-ahead,
  clamping, and the scoped world `ctx.translate(-camera.x, -camera.y)`.
- `player.js` owns hard-aim movement coupling through `updatePlayer(gp, projectiles,
  { hardAim })`.
- The world is now `3200x1800` while the visible canvas/viewport remains `1920x1080`, giving
  the soft follow and hard-aim look-ahead room to move without changing presentation size.
