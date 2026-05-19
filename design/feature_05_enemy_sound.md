# Feature 05 — Enemy Sound Detection

**Status: DONE**

---

## Sound Visibility in Darkness

Sound event rings (gunshots, footsteps) are drawn **after** the lighting and fog passes — on top of the darkness layer and the vision cone mask. They are always visible regardless of light level, and visible through walls.

This is a deliberate design decision with direct gameplay consequences:

**Darkness becomes asymmetric.** When lamps are shot out, enemies lose sight detection entirely. But both the player and enemies continue to emit sound. The player can "hear" threats in total darkness by watching the rings. Darkness is a tradeoff — protection from sight, not from sound.

**Noise awareness.** The player's own footstep ring is always visible. Before committing to a step near a guard, the player can see exactly whether their footstep radius overlaps the enemy's position. This makes silence a tactically readable choice, not a guess.

**Through-wall sound tracking.** Sound rings appear through walls because they are drawn after the fog pass (which is a vision-cone mask, not a wall-geometry mask). A gunshot ring from the adjacent room bleeds through — the player sees it before they can see the guard. This is correct: you hear what you cannot yet see.

**Future — enemy footstep rings.** When enemy patrol movement is implemented (Feature 06), enemy footstep rings will be visible in darkness too. This lets the player track guard positions by sound alone: stand still in a dark corridor, watch the ring patterns approach, time an interception or a hide.

---

## Overview — Sound as a two-tier detection system

Sound alone does **not** confirm player detection. It puts the enemy into a *suspicious* state. Full alert requires a second stimulus on top of that.

This is intentional. It creates breathing room: shoot and immediately go still in darkness → the enemy heard something, turns toward the source, scans, but cannot confirm. Shoot again, or be caught in the light while the enemy faces you → confirmed alert.

The only exception is a gunshot that the enemy **directly witnesses** (in their vision cone with LOS to the muzzle position) — that skips suspicion and goes straight to alert, because seeing a gun fire is unambiguous.

---

## Sound Sources

| Source | Radius | Trigger | Cadence | Direct-observation path? |
|--------|--------|---------|---------|--------------------------|
| Gunshot | 350px fixed | Once per shot (RT) | Discrete | Yes — skips suspicious if seen |
| Footstep | speed-proportional | Every 30 frames while moving | Periodic | No — always two-phase |

### Footstep radius — speed-proportional

Footstep radius scales linearly with movement speed. At rest, radius collapses to the enemy's own `proximityRadius` (sound detection gives no extra reach). At walk speed it reaches `FOOTSTEP_RADIUS`. At run speed (Feature 08) it grows further.

```
footstepRadius(e) = e.proximityRadius + (speed / WALK_SPEED) * (FOOTSTEP_RADIUS - e.proximityRadius)
```

Constants: `WALK_SPEED = 4` (current player speed), `FOOTSTEP_RADIUS = 120px`.

| Player speed | footstepRadius (for standard guard, proximityRadius = 50) |
|---|---|
| 0 (still) | 50px — equals proximity bubble, no added reach |
| 4 (walk) | 120px |
| 8 (run, Feature 08) | 190px |

The formula is open-ended: Feature 08 plugs in `speed = 8` without any structural change.

### Gunshot radius — fixed

Gunshots are a single discrete loud event. Radius = `GUNSHOT_RADIUS = 350px`. Not speed-dependent.

### Sound propagates through walls

No LOS check on sound. Pure circle distance. A gunshot in one room alerts guards in adjacent rooms if within radius. This is the standard stealth-game convention: sound travels through walls; only sight requires clear line-of-sight.

---

## State Machine — Revised with `suspicious`

```
patrol ──(sound)──→ suspicious ──(sound again)──→ alert ──(ALERT_FRAMES)──→ cautious
          ↑               │
          │         (sees player while suspicious)──→ alert
          │
          └──(SUSPICION_TIMEOUT = 3600 frames ≈ 60s, no new stimulus)──→ patrol

cautious ──(sound)──→ alert   (skips suspicious — already on edge)
```

### State descriptions

| State | Enters when | Enemy behaviour | Exits when |
|-------|------------|-----------------|------------|
| `patrol` | default; suspicion timeout | faces initial angle, idle | hears sound |
| `suspicious` | hears sound while patrolling | turns toward sound origin; does not move | hears sound again → alert; sees player → alert; 60s no input → patrol |
| `alert` | confirmed detection (see below) | faces player/source; full alert visual | `alertTimer` countdown → cautious |
| `cautious` | `alertTimer` expires | holds last facing; grey `?` | hears any sound → alert (no suspicion phase) |

**Cautious skips suspicious.** A guard who has already been alerted is on edge — any sound re-confirms immediately.

### Confirmation paths into `alert`

**From `suspicious`:**
- **Path A — Second sound:** `emitSound` reaches the enemy while already `suspicious`. → `alert`
- **Path B — Sight while facing source:** Enemy is `suspicious`, has turned toward the sound origin, and `enemyCanSeePlayer(e)` returns true (player in lit cone, LOS clear). → `alert`

Path B is the most tactically interesting: the enemy heard something and is now scanning in that direction. If the player is in the light and within the cone, they're caught.

**Direct bypass (gunshot only):**
If an enemy has the muzzle position in their vision cone with clear LOS at the moment of the shot → immediate `alert`, suspicion phase skipped. Muzzle flash is self-illuminating; `isLitByLamps` is **not** checked for this path.

---

## Enemy Data Model — Additions

`suspicious` state needs one new field:

```javascript
{
  // existing
  x, y, angle, targetAngle,
  visionAngle, sightRange, proximityRadius,
  state,       // now: 'patrol' | 'suspicious' | 'alert' | 'cautious'
  alertTimer,

  // new
  suspicionTimer: 0,  // counts up each frame while suspicious; resets on new sound
}
```

`alertTimer` is unchanged. `suspicionTimer` is a separate counter used only in `suspicious` state.
`SUSPICION_TIMEOUT = 3600` frames (60 seconds at 60 fps).

---

## `emitSound(x, y, radius, isGunshot = false)` — Full Logic

```javascript
function emitSound(x, y, radius, isGunshot = false) {
  soundEvents.push({ x, y, radius, life: SOUND_LIFETIME });

  for (const e of enemies) {
    const dx = e.x - x, dy = e.y - y;
    if (dx * dx + dy * dy > radius * radius) continue; // outside radius

    // Gunshot direct-observation: enemy sees the muzzle flash → immediate alert
    // No lighting check — muzzle flash is self-illuminating
    if (isGunshot && pawnInCone(e.x, e.y, e.angle, e.visionAngle, x, y) && hasLOS(e.x, e.y, x, y)) {
      e.state      = 'alert';
      e.alertTimer = ALERT_FRAMES;
      e.targetAngle = Math.atan2(x - e.x, -(y - e.y));
      continue;
    }

    // Sound heard but not directly observed
    if (e.state === 'patrol') {
      e.state          = 'suspicious';
      e.suspicionTimer = 0;
      e.targetAngle    = Math.atan2(x - e.x, -(y - e.y));
    } else if (e.state === 'suspicious') {
      e.state      = 'alert';
      e.alertTimer = ALERT_FRAMES;
    } else if (e.state === 'cautious') {
      e.state      = 'alert'; // cautious skips suspicious
      e.alertTimer = ALERT_FRAMES;
    } else if (e.state === 'alert') {
      e.alertTimer = ALERT_FRAMES; // refresh
    }
  }
}
```

---

## `updateEnemies()` — Additions for `suspicious`

```javascript
// Inside the per-enemy loop, before sight check:
if (e.state === 'suspicious') {
  e.suspicionTimer++;
  if (e.suspicionTimer >= SUSPICION_TIMEOUT) {
    e.state = 'patrol';
  } else if (enemyCanSeePlayer(e)) {
    e.state      = 'alert'; // Path B: sight while suspicious
    e.alertTimer = ALERT_FRAMES;
  }
}
```

The sight check (`enemyCanSeePlayer`) is only escalated to `alert` while in `suspicious` because in `patrol` state, sight detection already sets alert independently (Feature 04 path).

---

## Visual Feedback

| State | Pawn colour | Overhead indicator |
|-------|-------------|--------------------|
| `patrol` | red | none |
| `suspicious` | amber (`#d47a20` head, `#a85010` shoulders) | yellow `?` |
| `alert` | bright orange | yellow `!` |
| `cautious` | muted orange | grey `?` |

The `suspicious` amber sits between red (patrol) and orange (alert), giving a clear visual gradient of threat level.

Sound event rings (test aid — remove before shipping):
- Gunshot: bright yellow ring (`#ffe066`), 2px, expands 20% → 100% of radius over 30 frames
- Footstep: dim grey ring (`#888888`), 1px, same fade

---

## Gunshot call site — `game.js`

```javascript
// in update(), after RT press:
emitSound(player.x, player.y, GUNSHOT_RADIUS, true); // true = isGunshot
```

Footstep call site (in `notifyPlayerMoved`, enemy.js):

```javascript
const fRadius = e.proximityRadius + (player.speed / WALK_SPEED) * (FOOTSTEP_RADIUS - e.proximityRadius);
emitSound(player.x, player.y, fRadius, false);
```

Wait — `notifyPlayerMoved` doesn't loop over enemies, it just calls `emitSound` once. The per-enemy radius formula means each enemy has a different footstep reach based on their own `proximityRadius`. This requires computing per-enemy radius inside `emitSound` rather than passing a single radius. Implementation note: `emitSound` can accept `isFootstep = false` flag and compute per-enemy radius internally when true.

---

## Integration changes summary

| File | Change |
|------|--------|
| `enemy.js` | Add `suspicionTimer` to `resetEnemies`; update `emitSound` with new state logic + `isGunshot` param; update `updateEnemies` for suspicious timeout + Path B sight escalation; update `drawEnemies` for amber suspicious colour and `?` indicator |
| `game.js` | Change `emitSound(player.x, player.y, GUNSHOT_RADIUS)` → add `true` as 4th arg |
| `enemy.js` `notifyPlayerMoved` | Replace static `FOOTSTEP_RADIUS` with per-enemy speed-proportional formula |
