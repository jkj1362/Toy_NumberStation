# Feature 05 - Enemy Sound Detection

**Status: DONE**

---

## Sound Visibility in Darkness

Sound event rings (gunshots, footsteps) are drawn after the lighting and fog passes, on top of darkness and the vision cone mask. They are always visible regardless of light level and visible through walls.

This is intentional:

- Darkness protects the player from sight, not sound.
- The player's own footstep ring makes noise risk readable.
- Through-wall sound rings let the player understand that something happened nearby even when they cannot see it.
- Enemy footstep rings are visual-only feedback for the player; they do not alert other enemies.

Future tuning note: sound currently propagates by radius only. It can feel too vivid through walls because rooms do not yet dampen sound. That is a separate tuning pass.

---

## Overview - Sound as a Two-Tier Detection System

Sound alone does not confirm player detection. It puts the enemy into a `suspicious` state. Full alert requires another confirming stimulus and then a short confirmation delay.

This creates breathing room: shoot or step loudly, then go still in darkness. The enemy heard something, turns toward the source, but has not confirmed the player. If another sound happens, or the player is seen while the enemy is suspicious, the enemy starts confirming and becomes alert only if that confirmation delay completes.

The only bypass is a gunshot directly witnessed by an enemy. If the muzzle position is inside an enemy's vision cone with clear LOS, the enemy enters alert immediately because seeing a gun fire is unambiguous.

---

## Sound Sources

| Source | Radius | Trigger | Cadence | Direct-observation path? |
|--------|--------|---------|---------|--------------------------|
| Gunshot | `GUNSHOT_RADIUS = 350` | Once per shot | Discrete | Yes, if muzzle flash is seen |
| Footstep | Speed-proportional | Player movement | Every 30 frames | No |

### Footstep Radius

Footstep radius scales linearly with movement speed:

```javascript
footstepRadius(e) = e.proximityRadius + (player.speed / WALK_SPEED) * (FOOTSTEP_RADIUS - e.proximityRadius)
```

Current constants:

| Constant | Value | Meaning |
|----------|-------|---------|
| `WALK_SPEED` | 4 design px/frame, scaled at runtime | Baseline for footstep math |
| `FOOTSTEP_RADIUS` | 120 design px, scaled at runtime | Walk-speed footstep reach |

Expected tuning:

| Player speed | Footstep radius for standard guard (`proximityRadius = 50`) |
|--------------|------------------------------------------------------------|
| 0 | 50 px |
| 4 | 120 px |
| 8 | 190 px |

Feature 08 can plug a run speed into `player.speed` and reuse this formula.

---

## State Machine

```text
patrol --(sound, REACTION_DELAY)--> suspicious
  suspicious --(second sound or sight, SUSPICION_CONFIRM_DELAY)--> alert
  suspicious --(SUSPICION_TIMEOUT, no confirmation)--> patrol
  alert --(ALERT_FRAMES after losing confirmation)--> searching/returning/cautious patrol

cautious/searching/returning --(sound)--> alert
```

Current timing constants:

| Constant | Frames | Seconds at 60 fps | Meaning |
|----------|--------|-------------------|---------|
| `REACTION_DELAY` | 45 | 0.75s | Initial notice delay before patrol becomes suspicious |
| `SUSPICION_CONFIRM_DELAY` | 75 | 1.25s | Confirmation delay before suspicious becomes alert |
| `SUSPICION_TIMEOUT` | 300 | 5s | First turn-only suspicion times out if nothing confirms it |
| `ALERT_FRAMES` | 180 | 3s | Alert grace period after losing player confirmation |

### State Descriptions

| State | Enters when | Enemy behavior | Exits when |
|-------|-------------|----------------|------------|
| `patrol` | Default or after suspicion/search return | Patrols or holds station | Hears sound, sees player, or proximity-detects player |
| `suspicious` | Hears sound while patrolling | First suspicion turns in place toward source; later suspicion can move/search/return | Confirmation delay completes, or timeout returns to patrol |
| `alert` | Confirmed detection | Archetype-specific combat behavior | Timer expires after losing confirmation |
| `searching` | Alert expires with last-known player position | Navigates to last-known point and sweeps | Sweep completes, then returns |
| `returning` | Search completes or sound-only alert expires | Navigates back to patrol/home point | Reaches return target |
| cautious patrol | Patrol with `cautiousTimer > 0` | Patrols with heightened readiness | Timer expires |

Recently reactive enemies skip the first suspicion phase: sound during `searching`, `returning`, or cautious patrol snaps to alert.

---

## Confirmation Paths Into Alert

From `suspicious`:

- **Second sound:** schedules `suspicious -> alert` with `SUSPICION_CONFIRM_DELAY`.
- **Sight while suspicious:** schedules `suspicious -> alert` with `SUSPICION_CONFIRM_DELAY` if the player remains in lit cone with LOS long enough.

Direct bypass:

- **Witnessed gunshot:** immediate alert if the enemy sees the muzzle flash with LOS. This path does not require `isLitByLamps()` because the muzzle flash is self-illuminating.

---

## Runtime Data

Important runtime fields in `resetEnemies()`:

```javascript
{
  state: 'patrol',
  alertTimer: 0,
  reactionTimer: 0,
  pendingReaction: null,
  suspicionTimer: 0,
  suspicionLevel: 0,
  suspicionPhase: 'turning',
  suspicionSourceX: 0,
  suspicionSourceY: 0,
  suspicionReturnX: 0,
  suspicionReturnY: 0,
  suspicionSearchAccum: 0,
  cautiousTimer: 0,
}
```

`reactionTimer` and `pendingReaction` are shared by the initial patrol reaction and the suspicious confirmation delay. `scheduleReaction()` accepts an optional delay; default is `REACTION_DELAY`, while suspicious confirmation passes `SUSPICION_CONFIRM_DELAY`.

---

## Current Implementation Notes

- `emitSound(x, y, radius, isGunshot = false)` creates a sound ring and checks each enemy by radius.
- Player footsteps are handled by `notifyPlayerMoved()` so each enemy can use its own proximity radius in the footstep formula.
- Sound has no LOS check yet; it propagates through walls by radius.
- Sound rings are a test/readability aid and are drawn after fog/darkness.
- The visible reaction ring uses whichever delay is active: `REACTION_DELAY` or `SUSPICION_CONFIRM_DELAY`.

---

## File Scope

| File | Responsibility |
|------|----------------|
| `enemy.js` | Sound rings, footstep/gunshot reactions, suspicion timers, confirmation delay |
| `game.js` | Calls `notifyPlayerMoved()` when the player moves and `emitSound(..., true)` on gunshot |
