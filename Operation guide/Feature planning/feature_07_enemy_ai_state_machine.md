# Feature 07 - Enemy AI State Machine

**Status: PARTIAL IMPLEMENTED** - base patrol/suspicion/alert/search is implemented. Melee and normal shooter archetypes are now implemented; precision shooter remains deferred.

---

## Overview

Feature 07 owns what enemies do after detection. The first implementation gave every enemy the same alert behavior: chase the player, refresh alert while the player is visible, search the last known position after losing sight, then return to patrol with lingering caution.

That behavior is still valid, but it should now become the **melee enemy archetype**, not the universal enemy response. Feature 07 is being expanded into an archetype-aware state machine:

- **Melee weapon enemy** - closes distance and overlaps the player, matching current behavior.
- **Normal shooting enemy** - moves until it reaches a dedicated shooting range, then repeatedly fires with imperfect aim.
- **Precision shooting enemy** - future sniper archetype. Longer firing interval, near-perfect aimed line. Do not implement fully until the player's aim system is improved.

The detection pipeline remains shared. The difference is in the `alert` state's combat behavior.

---

## Current Shared State Flow

```text
patrol
  -> suspicious
  -> alert
  -> searching
  -> returning
  -> patrol with cautiousTimer
```

Existing implemented behavior to keep:

- Patrol/search vision detection immediately enters `alert`.
- Sound enters `suspicious`; a second stimulus schedules alert after `SUSPICION_CONFIRM_DELAY`.
- Suspicious vision detection also schedules alert after `SUSPICION_CONFIRM_DELAY`.
- `alertTimer` refreshes while the player is visible.
- When alert expires with a last known player position, enemy enters `searching`.
- `searching` navigates to `lastKnownX/Y`, performs a sweep, then enters `returning`.
- `returning` navigates through the nav graph back to a patrol/home point before resuming patrol.
- `cautiousTimer` makes recently reactive guards skip suspicion and snap to alert on sound.

The revision changes only what an enemy does while `state === 'alert'`.

Current timing:

| Constant | Frames | Meaning |
|----------|--------|---------|
| `REACTION_DELAY` | 45 | Initial patrol reaction delay |
| `SUSPICION_CONFIRM_DELAY` | 75 | Suspicious-to-alert confirmation delay |
| `SUSPICION_TIMEOUT` | 300 | First turn-only suspicion timeout |
| `ALERT_FRAMES` | 180 | Alert grace period after losing confirmation |

### Reactive Navigation

Reactive navigation uses `buildPath(fromX, fromY, toX, toY)` and `followNavPath(e)`.

Current implementation detail:

- `buildPath()` no longer picks the nearest nav node blindly.
- Dynamic `start` and `goal` points connect to nav nodes only when the segment is clear for the enemy collision radius.
- If the exact goal is not reachable, the path falls back to the closest reachable nav point instead of forcing a wall-colliding straight segment.
- Alert chase uses straight movement only when `_pathSegmentClear()` says the segment is physically clear; otherwise it follows a nav path.
- Search completion and sound-only alert expiry enter `returning`, then path back to the nearest patrol node or home position before patrol resumes.

---

## Enemy Archetypes

### 1. Melee Weapon Enemy

**Status:** implemented.

Melee enemies are the existing guards:

- On detection, move directly toward the player.
- If the straight movement segment is collision-clear, chase straight.
- If the straight segment would collide with walls, route through the nav graph.
- No combat resolution yet; overlapping the player is acceptable until damage/death is engineered.

This should become explicit data:

```javascript
{
  archetype: 'melee',
  attackRange: 0,
}
```

Implementation rule:

```text
if e.archetype === 'melee':
  chase player exactly as current alert pursuit does
```

---

### 2. Normal Shooting Enemy

**Status:** implemented as the third enemy, the cross-room patrol.

Normal shooters should not blindly overlap the player. They have a dedicated shooting range. When alerted:

1. If the player is outside shooting range, approach.
2. If the player is inside shooting range and line of sight is clear, stop and shoot.
3. If line of sight is blocked, navigate until line of sight is restored.
4. Fire repeatedly on a cooldown.
5. Shots use aim spread so enemies do not hit too reliably.

Suggested data:

```javascript
{
  archetype: 'shooter',
  shootingRange: 360,
  shootingRangeTolerance: 40,
  shotCooldownFrames: 75,
  shotTimer: 0,
  shotSpeed: 25,
  aimSpreadRadians: 0.16,
}
```

FHD note: numeric distances in code should use the current scaling helpers, because the internal world is now 1920x1080.

#### Alert Behavior

```text
if e.archetype === 'shooter':
  face player

  if no collision-clear shot line:
    follow nav path toward player
    do not shoot

  else if distance > shootingRange:
    approach until shootingRange is reached

  else:
    hold position
    fire when shotTimer reaches 0
```

Optional later improvement:

```text
if distance < shootingRange - shootingRangeTolerance:
  back away or strafe
```

For the first pass, do not add retreat/strafe. Stopping at range is enough.

#### Aim Spread / Hit Probability

Normal shooter accuracy should be imperfect. Prefer a physical miss model over a pure dice roll:

```javascript
const baseAngle = Math.atan2(player.x - e.x, -(player.y - e.y));
const spread = (Math.random() * 2 - 1) * e.aimSpreadRadians;
const shotAngle = baseAngle + spread;
```

This gives an understandable result: the enemy "tries" to shoot the player, but spread makes some shots miss naturally. Larger `aimSpreadRadians` means lower accuracy.

If we later need explicit hit probability, add it as a tuning layer:

```javascript
hitChance: 0.35
```

But the first pass should use spread only.

#### Enemy Projectile Model

Enemy shots can use the same movement logic as player projectiles, but should live in a separate array so collision rules stay clear:

```javascript
const enemyProjectiles = [];
```

Suggested projectile shape:

```javascript
{
  x, y,
  vx, vy,
  angle,
  owner: 'enemy',
}
```

Initial collision behavior:

- Wall collision removes the projectile.
- Player collision can be logged or visually indicated until health/death exists.
- Do not add a full health system as part of this pass.

---

### 3. Precision Shooting Enemy

**Status:** base data only, do not implement full behavior yet.

Precision shooters are future snipers. They should eventually:

- Have longer shooting range than normal shooters.
- Fire less often.
- Aim along a clear line.
- Punish the player for staying in the shooting line.
- Reuse the improved player aim mechanic once that exists.

For now, only reserve the archetype and data shape:

```javascript
{
  archetype: 'precision',
  shootingRange: 900,
  shotCooldownFrames: 180,
  aimSpreadRadians: 0,
}
```

Implementation rule for now:

```text
if e.archetype === 'precision':
  use shooter behavior temporarily, or leave unassigned in INITIAL_ENEMIES
```

Do not place precision enemies in the active level yet.

---

## Current Level Assignment

| Enemy | Location / patrol | Archetype |
|-------|-------------------|-----------|
| 1 | Upper center room static sentry at (580, 100), faces south | `melee` |
| 2 | Lobby short patrol | `melee` |
| 3 | Room A / Corridor / Room BC patrol | `shooter` |

Enemy 1 was moved out of the lobby so it no longer contacts Enemy 2 or interferes with Enemy 3's cross-room patrol. Enemy 2 keeps the lobby chase-and-overlap behavior. Enemy 3 holds shooting range and fires repeated spread shots when alerted.

---

## Data Model Additions

Add designer-set fields to `INITIAL_ENEMIES`:

```javascript
{
  archetype: 'melee' | 'shooter' | 'precision',
  shootingRange: 0,
  shootingRangeTolerance: 0,
  shotCooldownFrames: 0,
  shotSpeed: 0,
  aimSpreadRadians: 0,
}
```

Add runtime fields in `resetEnemies()`:

```javascript
{
  shotTimer: 0,
  returnTargetX: e.x,
  returnTargetY: e.y,
  returnTargetAngle: e.targetAngle,
  returnPatrolIndex: 0,
}
```

`returnTarget*` fields are used by the `returning` state after failed searches or sound-only alerts. Patrol enemies return to the nearest patrol node; static enemies return to their home position and facing.

Default rules:

- Missing `archetype` defaults to `'melee'`.
- Shooting fields only matter for `'shooter'` and future `'precision'`.
- Current enemies should initially remain melee unless explicitly reassigned.

---

## Alert Behavior Refactor

Current alert logic is a single pursuit block. Refactor it into small helpers:

```javascript
function updateAlertBehavior(e) {
  if (e.archetype === 'shooter') {
    updateShooterAlert(e);
  } else if (e.archetype === 'precision') {
    updatePrecisionAlert(e); // placeholder for now
  } else {
    updateMeleeAlert(e);
  }
}
```

Shared alert countdown remains outside these helpers:

```text
1. Detect/refresh alert and lastKnown.
2. Run archetype-specific alert behavior.
3. Decrement alertTimer only if player is not currently visible.
4. If lastKnown exists, expire into searching.
5. If alert was sound-only, expire into returning.
6. After searching, enter returning before normal patrol resumes.
```

---

## Implemented First Scope

Implemented:

- Explicit `archetype: 'melee'` support.
- Shooter archetype with range holding and repeated spread shots.
- Enemy projectile array, update, draw, and wall collision.
- Temporary player-hit handling via a red screen flash.
- Suspicious confirmation delay before suspicious enemies become alert.
- Wall-aware dynamic paths for suspicion movement, chase fallback, searching, and returning.
- `returning` state so enemies resume patrol/home behavior from valid positions.
- Enemy 1 moved to the upper center room to avoid Enemy 2 contact and Enemy 3 patrol interference.

Still deferred:

- No precision enemy placement.
- No player health/death system.
- No retreat, cover, strafing, reload animation, or ammo economy.

---

## Visual Feedback

Current enemy state colors remain:

| State | Visual |
|-------|--------|
| `patrol` | red pawn |
| `suspicious` | amber pawn + `?` |
| `alert` | orange pawn + `!` |
| `searching` / `returning` / cautious patrol | muted orange + `?` |

Add only minimal shooter feedback:

- Enemy bullets should be visually distinct from player bullets, likely red/orange.
- Optional muzzle flash can wait.
- Do not add UI text or tutorials.

---

## File Scope

Expected files to modify during implementation:

| File | Change |
|------|--------|
| `enemy.js` | Archetype fields, alert behavior helpers, enemy projectiles, shooter firing |
| `game.js` | Possibly draw/update call sites if enemy projectile drawing needs placement |

Keep the no-module script architecture. `enemy.js` still loads before `game.js`, so any `game.js` globals must only be referenced inside functions that run after both files load.
