# Feature 05 - Enemy Sound Detection

**Status: DONE for first-pass radius hearing and first-pass wall/door attenuation**

---

## Sound Visibility in Darkness

Player-facing sound cues are drawn after the lighting and fog passes, on top of darkness and the vision cone mask. They are visible regardless of light level, but no longer always reveal the true source through walls.

This is intentional:

- Darkness protects the player from sight, not sound.
- The player's own clear sound rings make noise risk readable.
- Clear sounds can reveal the true source when the player actually hears them through open space or open passages.
- Closed-door sound cues use a door/portal cone so the player knows something is beyond the door without seeing the exact source.
- Wall-muffled sound cues use vague pulses near the player/listener-side point rather than true-source rings.
- Enemy footsteps can create player-facing cues, but they do not alert other enemies.

Tuning note: sound now uses first-pass wall/door attenuation for both AI hearing and player-facing cues. True-source rings and per-listener attenuation paths remain available as debug options for inspecting propagation.

---

## Player-Facing Sound Cues - First Pass Implemented

The debug layer mostly answers "did an enemy hear this sound?" The gameplay layer inverts that perspective and answers "what did the player hear, and how much can the player infer from it?"

The player should become a normal sound listener that uses the same `evaluateSoundPath(...)` style as enemies. This keeps the system source/receiver agnostic: player, enemy, door, impact, and future object sounds all emit through one propagation model, and each listener receives a path result with `heard`, `localization`, `multiplier`, `effectiveRadius`, `distance`, `pathKind`, and path/proxy information.

Player-facing cues should be intentionally incomplete. They should communicate useful stealth information without becoming exact enemy radar.

### Cue Rules

| Path result | Player-facing cue | Gameplay meaning |
|-------------|-------------------|------------------|
| `heard: false` | No cue | The sound is lost after attenuation. |
| `localization: 'vague'` / wall-muffled | Weak pulse near the player or near the listener-side wall, not at the true source | Something is beyond the wall or nearby geometry, but the exact source is unknown. |
| Closed-door `muffled` portal path | Cone-shaped wave emitted from the relevant door/portal as a proxy source | Something is definitely beyond that closed door; loudness and cone reach imply approach/retreat or source magnitude. |
| `clear` direct/open passage | Circular wave from the actual source location | The player can localize the source because sound reached them clearly. |

### Visual Tuning Intent

- Door cone: show direction and magnitude, not exact enemy position.
- Wall cue: vague pulse near the player/wall, no exact source and no stable triangulation.
- Clear cue: exact circular source ring, but only when the player actually hears a clear/open-path sound.
- Gunshots: large, obvious, longer-lived, and able to produce strong door-cone or wall-vague cues even through attenuation.
- Footsteps: short, faint, rate-limited, and easy to lose through walls unless close or unusually loud.
- Enemy movement footsteps are emitted from the shared enemy movement step, not only patrol movement, so searching, returning, and chasing enemies can also be heard by the player.
- Enemy gunshots emit normal gunshot sound events from the shooter position.

Door-cone strength should scale from received sound strength, not just raw source radius. A useful first-pass formula is:

```javascript
receivedStrength = clamp01(1 - distance / effectiveRadius)
visualMagnitude = baseRadius * multiplier * receivedStrength
```

The cone should originate at the portal/door point on the player's side of the path, then fan into the player's room. The cone reach and arc count should grow when the source is louder, when the source is closer to the door, or when the door transmission is higher. It should not reveal the source's exact position behind the door.

Wall-vague cues should use the listener-side perceived point already produced for `localization: 'vague'`, or a nearby wall-intersection point if that is added later. The cue should be a soft pulse or small ripple, not a directional path line.

Clear cues should replace the current always-visible true-source ring for gameplay. The true-source ring should only be shown when the player receives a clear sound. Debug mode can still draw all evaluated paths and true sources.

### Implementation Shape

The first-pass implementation adds a player receiver pass beside the enemy receiver pass:

```javascript
function evaluatePlayerSound(sound) {
  const path = evaluateSoundPath(sound.x, sound.y, player.x, player.y, sound.radius);
  path.distance = path.pathDistance ?? distanceBetweenPoints(sound.x, sound.y, player.x, player.y);
  path.heard = path.distance <= path.effectiveRadius;
  return path;
}
```

Heard player paths route into a separate short-lived visual queue:

```javascript
playerSoundCueEvents.push({
  cueType, // 'clear-ring' | 'door-cone' | 'wall-pulse'
  sourceType,
  sourceX,
  sourceY,
  proxyX,
  proxyY,
  angle,
  magnitude,
  life,
});
```

Do not use the enemy attenuation debug records as the final gameplay renderer. Keep debug path drawing available separately for tuning.

### Success Criteria

- Done: the player no longer sees true-source sound rings for sounds they could not actually hear unless source-debug drawing is explicitly enabled.
- Done: a closed-door sound produces a readable cone from the door, with stronger/larger waves for louder sounds or sources closer to the door.
- Done: a wall-muffled sound produces only a vague nearby pulse when it is still audible to the player.
- Done: a clear sound through open space or open doors produces a circular source wave from the real source.
- Done: enemy footsteps can become player-audible cues without also making those footsteps alert other enemies.
- Done: enemy movement cues are no longer patrol-only, and enemy gunshots emit player-audible sound events.

---

## Overview - Sound as a Two-Tier Detection System

Sound alone does not confirm player detection. It puts the enemy into a `suspicious` state. Full alert requires another confirming stimulus and then a short confirmation delay.

This creates breathing room: shoot or step loudly, then go still in darkness. The enemy heard something, turns toward the source, but has not confirmed the player. If another sound happens, or the player is seen while the enemy is suspicious, the enemy starts confirming and becomes alert only if that confirmation delay completes.

The only bypass is a gunshot directly witnessed by an enemy. If the muzzle position is inside an enemy's vision cone with clear LOS, the enemy enters alert immediately because seeing a gun fire is unambiguous.

---

## Attenuation Pass - Walls and Doors

Hearing strength depends on acoustic transmission from the source to each listener. This is source-agnostic: the same propagation rules apply to sounds made by the player, enemies, doors, impacts, and any future sound-emitting object. Sound is still less binary than line of sight: closed doors leak sound, open doors/passages transmit sound fully, and walls strongly dampen sound while preserving a vague sense of direction.

### Design Intent

- **Walls strongly dampen sound.** A wall-crossed sound should usually not give the enemy a precise source point. If heard, it should feel like the enemy detected a direction or muffled disturbance, not the player's exact location.
- **Closed doors partially transmit sound.** Current default is about `80%` transmission, tunable per door through `door.soundTransmission`.
- **Open doors and open passages transmit full sound.** If the sound path passes through an open door or existing wall gap, the sound should behave like current direct radius hearing.
- **Player and enemy sounds use the same propagation rules.** The system should not special-case player noise. Enemy footsteps, enemy gunshots, door sounds, and future thrown/impact sounds should all evaluate through the same acoustic helper when they need to be heard by another actor.
- **Lighting and sound differ deliberately.** Closed doors block light like walls, but closed doors still leak sound at reduced magnitude.
- **Muzzle-flash observation remains separate.** If an enemy sees a gunshot with cone + LOS, that direct visual confirmation still causes immediate alert regardless of acoustic attenuation.

### Proposed Runtime Model

For each sound event and listener:

```javascript
effectiveRadius = baseRadius * transmissionMultiplier
```

The listener hears the sound only if:

```javascript
distance(source, listener) <= effectiveRadius
```

The sound evaluation should return both audibility and localization quality:

```javascript
{
  multiplier,
  localization, // 'clear' | 'muffled' | 'vague'
  perceivedX,
  perceivedY
}
```

Suggested transmission defaults:

| Obstacle / passage | Transmission | Localization |
|--------------------|--------------|--------------|
| Direct open space / open passage | `1.0` | `clear` |
| Open door | `1.0` | `clear` |
| Closed door | `door.soundTransmission`, currently `0.8` | `muffled` |
| Wall | `0.08` to `0.15` | `vague` |

### Localization Behavior

Clear sound should use the real source position.

Muffled door sound can still use the real source position at first pass because the reduced radius already communicates leakage. If it feels too accurate later, bias the perceived source toward the door center crossed by the sound path.

Vague wall sound should not use perfect source localization. First-pass options, in increasing complexity:

1. Use the real source angle but clamp the perceived point to a short distance in front of the listener.
2. Bias the perceived point toward the first wall intersection on the listener/source line.
3. Add small angular jitter so repeated muffled sounds do not triangulate perfectly.

Start with option 1 or 2. Do not build a full acoustic graph unless the line-intersection model proves insufficient.

### Geometry Rules

The sound helper should evaluate the line from source to listener against current map geometry:

- Static walls strongly dampen sound.
- Closed doors use their own `soundTransmission`.
- Open and destroyed doors do not dampen sound.
- Existing wall gaps are naturally open because no wall rect exists there.
- Open door panels should not be treated as sound blockers. They block sight/light rays for readability, but an open doorway should acoustically behave as open.

Avoid blindly reusing visual ray-blocker helpers if they include open door panels. Sound should care about closed barriers, not the visual shape of an open door slab.

### Implementation Sketch

Implemented in `sound.js` with a sound-specific helper and a dedicated portal graph:

```javascript
function evaluateSoundPath(sourceX, sourceY, listenerX, listenerY, baseRadius) {}
```

The helper evaluates two candidates:

- direct wall/door fallback path, used for same-room open space and strongly muffled through-wall sound;
- room/door portal graph path, used when sound can travel through open or closed doorways better than a straight line through a wall.

Current integration:

- `notifyPlayerMoved()` to evaluate attenuation per enemy before footstep reactions.
- `emitSound(x, y, radius, isGunshot = false)` to evaluate attenuation per enemy before hearing reactions.
- `applySoundReaction(e, sourceX, sourceY)` call sites to pass the perceived source position, not always the true source position.

Longer-term, avoid making `notifyPlayerMoved()` the only footstep path. The cleaner shape is a source-agnostic sound emitter, for example:

```javascript
emitSound({
  x,
  y,
  radius,
  sourceType, // 'player' | 'enemy' | 'door' | 'impact'
  sourceActor,
  canAlertEnemies,
})
```

The current implementation keeps enemy footsteps non-alerting for AI, but they use the shared event shape and player receiver path so the player can hear them without creating enemy-to-enemy alerts.

Keep `soundEvents.push(...)` using the original source/radius for now. The ring is currently a player/debug readability visual, not a physically exact acoustic renderer. Store separate short-lived attenuation records for heard sounds so the debug layer can draw source-to-listener propagation and perceived source points.

### Success Criteria

- A gunshot behind several walls should no longer alert enemies by unchanged radius alone.
- A footstep or door sound behind a closed door should be detectable at shorter range than the same sound through an open door.
- Opening a door should make sound behave like it is passing through an open passage.
- A wall-muffled sound should turn or draw enemies in a general direction without giving perfect source knowledge.
- Directly observed muzzle flashes should still cause immediate alert.

---

## Sound Sources

| Source | Radius | Trigger | Cadence | Direct-observation path? |
|--------|--------|---------|---------|--------------------------|
| Gunshot | `GUNSHOT_RADIUS = 350` | Once per shot | Discrete | Yes, if muzzle flash is seen |
| Footstep | Speed-proportional | Player movement | Every 30 frames | No |
| Enemy footstep | Archetype/tuning dependent | Enemy movement | Periodic | No |
| Door interaction/destruction | Door action radius | Door open/close/destroy | Discrete | No |

Current implementation note: enemy footsteps use the shared event shape and acoustic path evaluation for player-facing cues, but `canAlertEnemies: false` prevents them from triggering enemy-to-enemy sound reactions.
Current player-facing tuning uses `ENEMY_FOOTSTEP_CUE_RADIUS = 600` design px and `ENEMY_FOOTSTEP_CUE_INTERVAL = 18` frames, separate from slow patrol speed, so guards can be heard through nearby doors and open passages without making those footsteps alert other enemies.

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

- `emitSound(x, y, radius, isGunshot = false)` creates a sound ring and checks each enemy with attenuated effective radius.
- Player footsteps are handled by `notifyPlayerMoved()` so each enemy can use its own proximity radius in the footstep formula.
- Sound uses a first-pass room/door portal graph plus a direct line-based wall fallback.
- Walls multiply sound range by `SOUND_WALL_TRANSMISSION`.
- Closed doors multiply sound range by `door.soundTransmission`.
- Open and destroyed doors do not dampen sound.
- Wall-muffled sound reactions use a nearby perceived source along the incoming direction instead of the exact source.
- Player-facing sound cues are drawn after fog/darkness: clear rings, closed-door proxy cones, and wall-vague pulses.
- True-source sound rings are retained as a source-debug option and are off by default.
- Heard sounds draw attenuation debug cues: cyan for direct clear, green for portal clear, amber dashed for closed-door muffled, and blue-gray dotted for wall-vague.
- With `SHOW_SOUND_ALL_PATH_DEBUG`, all evaluated paths are drawn. Heard paths are labeled `heard`; unheard paths are dim red-gray and labeled `lost`.
- Wall-vague cues draw the perceived source near the listener rather than only marking the true source.
- The visible reaction ring uses whichever delay is active: `REACTION_DELAY` or `SUSPICION_CONFIRM_DELAY`.

---

## File Scope

| File | Responsibility |
|------|----------------|
| `sound.js` | Sound constants, sound events, attenuation/path evaluation, footstep emission, sound debug drawing |
| `enemy.js` | Enemy reaction state changes, suspicion timers, confirmation delay |
| `player.js` | Calls `notifyPlayerMoved()` on movement and `emitSound(...)` on gunshot |
| `game.js` | Emits door interaction/destruction sounds and draws sound debug output |
