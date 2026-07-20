# Session Handoff - 2026-07-20 - Feature 14 Ballistics Core

Read this file at the start of a new Codex task to continue the Number Stations prototype without reconstructing this session.

---

## 1. Project Identity

Number Stations is a top-down Cold War stealth prototype. The current playable loop is infiltration, light/sound reading, avoidance or combat, objective pickup, and exfiltration. The FDD is `Operation guide/Feature planning/[FDD]Number_Stations.md`; current Prototype 2 scope is `Operation guide/Feature planning/prototype_scope_milestone_02.md`.

This session completed the current-geometry core of **Feature 14 - Geometry Ballistics, Penetration, and Destruction**, plus substantial Feature 13 reaction/navigation fixes discovered during playtesting. The next feature remains **Feature 13 - Local AI Event Reactions and Body Discovery**. Its immediate next task is the projectile-impact reaction foundation and heard-impact investigation; all later Feature 13 work is ordered in section 6.

Current checkpoint is `228b21c` on `main` (`Bullet ballistics work`), but the implementation and documentation described here are still uncommitted in the working tree. Inspect `git status` before editing.

⚠ **Incomplete AI boundary:** projectile collisions already create neutral impact records and player-facing sounds, but those sounds deliberately use `canAlertEnemies: false`. General heard/witnessed impact reactions are not live yet.

⚠ **Unapplied priority proposal:** current code places heard `gunshot` below corpse and witnessed door/lamp impacts. The user proposed making gunshot the highest non-player alert reason. Resolve/apply this as part of Feature 13 reaction arbitration; do not assume the code already changed.

⚠ **No temporary test layout is active.** The three authored enemies and standard facility layout are intact.

---

## 2. Current File Structure

```text
Toys/
|-- index.html                                      (37 lines)
|-- tuning.js                                      (589 lines)
|-- input.js                                       (269 lines)
|-- player.js                                      (315 lines)
|-- lighting.js                                    (748 lines)
|-- enemy.js                                      (1870 lines)
|-- sound.js                                       (826 lines)
|-- game.js                                       (2007 lines)
|-- Open Game.bat
|-- Live features/
|   |-- feature_00...feature_12 live docs
|   |-- feature_13_ai_reactions_body_discovery.md  (37 lines, created in final sync)
|   |-- feature_14_door_ballistics_destruction.md  (37 lines, synchronized)
|   |-- feature_15_seeded_mission_generation.md    (11 lines, planned-only mirror)
|-- Operation guide/
|   |-- AGENT.md
|   |-- session handoff format.md
|   |-- Feature planning/
|   |   |-- [FDD]Number_Stations.md
|   |   |-- prototype_scope.md
|   |   |-- prototype_scope_milestone_02.md
|   |   |-- feature_00...feature_12 planning docs
|   |   |-- feature_13_ai_reactions_body_discovery.md (187 lines, synchronized)
|   |   |-- feature_14_door_ballistics_destruction.md  (152 lines, synchronized)
|   |   |-- feature_15_seeded_mission_generation.md
|   |-- Session handoffs/
|       |-- previous immutable handoffs
|       |-- Handoff_2026-07-20_feature14-ballistics-core.md
```

The end-of-session live-doc sync also corrected Feature 02, 03, 05, 07, 09, 11, and 12 pages because the final ballistics work changed window lighting/exfil, sound, AI, doors, health/projectile semantics, and tuning behavior. Feature 11's plan was corrected to reflect runtime tuning and default body resistance. A planned-only Feature 15 live mirror was added to restore the operation guide's one-to-one feature-document rule; it explicitly states that seeded generation is not implemented.

---

## 3. Key Systems and Current State

| File | System | Current identifiers and non-obvious behavior |
|------|--------|-----------------------------------------------|
| `index.html` | Script load order | `tuning.js`, `input.js`, `player.js`, `lighting.js`, `enemy.js`, `sound.js`, `game.js`. Preserve this order. |
| `game.js` | Geometry/projectiles | `createProjectile()`, `getProjectileCollision()`, `emitProjectileImpact()`, and `resolveProjectileTravel()` implement stable shot IDs, swept ordered collision, penetration, canonical impact records, and shared player/enemy behavior. `projectileImpactEvents` is capped at 128 and currently has no AI consumer. |
| `game.js` | Doors/windows | Wooden doors: thin `6`, `200` HP, `20` damage, `0.5` resistance. Windows: thin `3`, `60` HP, `20` damage, `0.15` resistance. `room_f_west_door` is thick `18`, metal, non-destructible, and projectile-blocking. Runtime getters are authoritative if defaults change. |
| `game.js` | Animated door geometry | Wooden swing is `12` frames, metal `24`; close reverses open; default opening is away from the actor. `getDoorPanelCorners()`, movement blockers, and ray blockers follow the rotated panel in opening/open/closing states. |
| `game.js` | Secondary exits | `room_a_west_window` and `room_bc_east_window` can be silently opened by close interaction or broken by three shots. Either path activates its linked secondary exit exactly once. |
| `lighting.js` | Lamps/exterior light | Lamps use swept projectile targets. `setExternalWeatherState()` gates physical-window aperture light: rain/zero moonlight off, clear moonlight on. Intact glass remains transparent to sight/light. |
| `sound.js` | Acoustic perception | `evaluateEnemySound()` and `getEnemySoundReactionPoint()` return clear/muffled/vague perceived locations. Closed-door arcs require player/source on opposite sides of the actual closed attenuating door. Open doors transmit fully. |
| `sound.js` | Impact boundary | Material impact radii: normal wall/wood `220`, glass `90`, metal `260`; destruction `240`; muzzle `350`; body fall `140`. `emitProjectileImpact()` sets `isProjectileImpact: true`, preserves `shotId`, and currently sets `canAlertEnemies: false`. |
| `enemy.js` | Local evidence | Corpse, damaged/destroyed door, witnessed door hit, witnessed/later-broken lamp, alerted companion, and muffled-door investigation are implemented. Debug displays alert and suspicion reasons separately. |
| `enemy.js` | Speeds/reaction | Ordinary `1.5`, active suspicious `1.2`, alert `2.5`; return after a completed suspicious sweep restores `1.5`. Normal confirmation `45` frames; suspicious confirmation `10`. |
| `enemy.js` | Door navigation/separation | `_getOpenDoorDetourNodes()` routes around swung panels. Door investigations cross beyond full panel depth into room space. `resolveEnemySeparation()` iteratively prevents living guards from remaining overlapped. |
| `enemy.js` | Alert precedence | `enemyAlertReasonPriority()`: player `500`, corpse `400`, door/lamp impact `300`, gunshot `275`, door `250`, alerted enemy `200`, sound `100`. This is current code, not the proposed new gunshot order. |
| `tuning.js` | Runtime controls | Includes projectile/body resistance and power, door/window HP/damage/resistance/thickness, material sound radii, door swing durations, AI state speeds/delays, separation/navigation, weather-light, and debug toggles. |

### Feature 14 behavior completed this session

- Player and enemy projectiles use one swept segment resolver and cannot tunnel through fast/thin targets under the current tests.
- The closest hit is processed in travel order. A projectile remembers every actor/geometry target it crossed.
- Default power `1.0` stops in the first unarmored body (`1.0` resistance). Test power `2.0` penetrates the first body and stops in the second.
- Walls and metal doors stop bullets regardless of remaining power.
- Wooden doors are penetrable without being immediately destroyed. Holes persist and move with the panel; accumulated damage destroys the tenth-hit door.
- Open, opening, and closing wooden doors use the same penetrable panel geometry as closed doors and show debug HP.
- Windows break on the third hit, emit quiet hit sounds and full destruction sounds, remove their blocker, and auto-activate linked exits.
- All geometry collisions create canonical impact data and material-specific player-facing sound feedback with the original shot ID.
- General sound source rings remain off by default; projectile collision feedback remains visible without the large all-sound ring clutter.

### Feature 13 behavior completed during this session

- Corpse evidence overrides door investigations and preserves `corpse` as the higher-priority debug reason.
- Door and broken-lamp evidence have transient witnessed and persistent later-discovery paths.
- Broken-lamp suspicion uses the existing moving investigation: reachable fixture stand-off, sweep, return, patrol restoration.
- Muffled investigation, alert search, and pursuit move into open room space and route around open door panels.
- Open panels block character movement and vision while leaving the unobstructed aperture usable.
- Guards do not remain overlapped when moving or sharing a stopping point.
- Open-door gunshots reach guards through unblocked apertures and can replace stale door alerts.
- Enemy death emits a quiet body-fall sound.

---

## 4. Facility Layout

Coordinates below are design-space values scaled into the `3200 x 1800` world.

```text
             Top perimeter wall
  +---------------------------------------------------+
  | Room A              | Corridor       | Room B/C    |
  | window/exit (9,190) |                | window/exit |
  |                     |                | (1091,190)  |
  |       door 409,295   |                | door 769,210|
  +---------------------+                +-------------+
  |                                      |             |
  | Lobby / lower entry                  | Room F      |
  | corridor doors 270,449 and 819,449   | metal door  |
  |                                      | 909,590     |
  |      entry/exfil gap x 430-570 at bottom           |
  +---------------------------------------------------+
```

| Purpose | ID | Design-space coordinate |
|---------|----|-------------------------|
| Lobby/corridor left | `corridor_left_door` | `(270, 449)` |
| Lobby/corridor right | `corridor_right_door` | `(819, 449)` |
| Room A/corridor | `room_a_east_door` | `(409, 295)` |
| Corridor/Room B-C | `room_bc_divider_door` | `(769, 210)` |
| Lobby/Room F metal door | `room_f_west_door` | `(909, 590)` |
| Room A physical window/exit | `room_a_west_window` | `(9, 190)` |
| Room B-C physical window/exit | `room_bc_east_window` | `(1091, 190)` |
| Bottom entry/primary exfil | entry gap | `x 430-570` |

---

## 5. Feature Build Order

| Feature | Status | Notes |
|---------|--------|-------|
| 00-12 - Existing prototype systems | Done | Movement, walls, lighting, objective/exfil, sight, sound, patrol, AI states, movement noise, doors, camera/aim, health, tuning/debug. Their affected live docs were synchronized this session. |
| 13 - Local AI Event Reactions and Body Discovery | **NEXT / in progress** | Existing local evidence/navigation is implemented. Complete projectile-impact reactions, local tuning, facility escalation, and final regression in the order below. |
| 14 - Geometry Ballistics, Penetration, and Impact Events | Core complete | Current geometry/data/event foundation is live. AI-consumer acceptance and final map matrix depend on Feature 13. |
| 15 - Seeded Mission Generation | Pending | Start only after Feature 13's local reaction/escalation loop is accepted, unless the user reprioritizes. |
| Inventory/equipment/ammunition progression | Deferred | Player-facing ammo variants/upgrades and armor coverage belong to future inventory/gear systems. Do not add them during Feature 13. |
| Metagame | Pending | Outside the current implementation sequence. |

---

## 6. Complete Remaining Feature 13 Work, in Optimal Order

The authoritative plan is `Operation guide/Feature planning/feature_13_ai_reactions_body_discovery.md`. Work through the following order; item 1 is the immediate starting task, while items 2-7 are the visible queued backlog.

### 1. Immediate next - impact incident arbitration foundation and heard-impact investigation

- Resolve the alert-priority question before enabling events. Current code is `player > corpse > witnessed impact > gunshot`; the proposed order is `player > gunshot > corpse > witnessed impact > door > alerted-enemy > sound`.
- Add per-observer memory keyed by `shotId` so a muzzle report and one-or-more impacts from the same bullet can be compared rather than blindly treated as independent confirmations.
- Consume new `projectileImpactEvents` or route the existing `isProjectileImpact` sound through a dedicated classifier. Do not simply flip `canAlertEnemies` to `true`; that would bypass witnessed-versus-heard arbitration and can double-confirm one shot.
- For an enemy that hears but does not witness an impact, enter/refresh moving `suspicious` investigation at `getEnemySoundReactionPoint(path)`. Clear hearing may use the true collision point; muffled/vague hearing must use the proxy/perceived point.
- The first heard impact must cause movement, a short local sweep, return, and restoration of the interrupted patrol state. It must not directly reveal the shooter or enter alert by itself.

Suggested shape, not mandatory API:

```javascript
// Per observer, reset with the enemy.
e.shotReactions = new Map(); // shotId -> { rank, kind, frame }

classifyImpactForEnemy(e, impact, soundPath) {
  const witnessed = impactInConeRangeAndLOS(e, impact);
  return witnessed
    ? { rank: IMPACT_WITNESSED, kind: 'witnessed', point: reachableImpactTarget(e, impact) }
    : soundPath.heard
      ? { rank: IMPACT_HEARD, kind: 'heard', point: getEnemySoundReactionPoint(soundPath) }
      : null;
}
```

Acceptance for item 1:

- A heard-only wall/door/window/metal impact produces moving suspicion at the perceived reachable point.
- Muffled impact investigation uses the correct closed-door proxy and never the hidden source.
- One muzzle plus its impact does not count as two confirmations for the same guard.
- A guard outside the effective acoustic path does nothing.

### 2. Geometry-independent witnessed-impact alert/search

- Extend the existing explicit `notifyDoorDamaged()` / `notifyLampDestroyed()` idea to normal walls, windows, and metal doors through the canonical impact record.
- Require real-time cone, range, and line of sight to the collision point.
- A witness enters immediate alert without learning the hidden shooter position.
- Convert collision points inside blocking geometry into a reachable near-side or room-side search point. Never path directly through the struck wall/panel.
- For penetrable doors/windows, use an explicit near-side/portal transit only when the investigation belongs on the connected side; reuse the current deep room-side and hinge-clear rules.

### 3. Finalize per-shot priority and upgrades

- For each observer/shot, choose only the highest applicable route among direct shooter/muzzle observation, witnessed impact, and heard impact.
- Allow a later higher-ranked observation from the same shot to upgrade an earlier lower-ranked reaction, but never let a late heard impact downgrade/retarget a witnessed or direct reaction.
- Link presentation-only destruction sounds to the same incident so breaking one object does not create a second AI confirmation.
- Keep guard-local memory bounded/expired so old shot IDs do not grow forever.

### 4. Local reaction tuning and overlapping-stimulus regression

- Tune suspicion duration, first-impact movement, sweep length, repeat-impact refresh, and short confirmation delay.
- Test overlapping corpse, door damage, lamp damage, muzzle, impact, companion, and body-fall stimuli; verify state target and debug reason always reflect the chosen priority.
- Recheck current speeds (`1.5` ordinary, `1.2` suspicious, `2.5` alert) and ensure all return paths restore ordinary speed.
- Preserve user-approved small impact/body-fall volumes unless playtesting identifies a specific tuning issue.

### 5. Facility-wide escalation design and implementation

- Only after local reactions are stable, assign explicit severity/weights to local evidence such as corpses, destroyed structures, repeated impacts/sounds, and active combat.
- Add a facility-level high-alert/search threshold without distributing perfect or continuously updated player coordinates.
- Guards may become more ready or search broader areas, but must still use locally perceived or explicitly communicated last-known positions.
- Keep this compartment separate from impact classification so local behavior remains testable on its own.

### 6. Final map-level validation for Features 13 and 14

- Test both projectile owners, all four wooden-door orientations/locations, the metal door, both windows, normal walls, actors behind penetrable geometry, and map bounds.
- Verify default one-body stopping and test-tuned `2.0` two-body stopping.
- Verify accumulated object resistance, stable impact count, destruction result, and no repeated target damage.
- Verify heard versus witnessed behavior through clear, open-door, closed-door, wall-vague, and long portal paths.
- Verify door transit, deep-room sweep, open-panel detours, enemy separation, patrol restoration, and owned-door closing under multiple guards.

### 7. Documentation/commit checkpoint after user acceptance

- During fixes, update only relevant planning/implementation docs.
- Update live docs again only when the user explicitly requests an end-of-session sync.
- Then run syntax/diff checks, inspect the dirty worktree, and commit/push only when explicitly requested.

---

## 7. Gap and Navigation Coordinates

| ID | Type | Coordinate / route role |
|----|------|-------------------------|
| `lobby` | nav room | `(460, 590)` |
| `room_a` | nav room | `(200, 229)` |
| `corridor` | nav room | `(589, 229)` |
| `room_bc` | nav room | `(930, 229)` |
| `room_f` | nav room | `(991, 590)` |
| `gap_corr_left` | nav/door anchor | `(270, 449)` |
| `gap_corr_right` | nav/door anchor | `(819, 449)` |
| `gap_room_a` | nav/door anchor | `(409, 295)` |
| `gap_room_bc` | nav/door anchor | `(769, 210)` |
| `gap_room_f` | nav/door anchor | `(909, 590)` |

Current enemies:

| Enemy | Role | Route |
|-------|------|-------|
| 1 | Static melee sentry | `(580, 100)` |
| 2 | Lobby melee patrol | starts `(500,590)`, route `(420,590) <-> (580,590)` |
| 3 | Cross-room shooter | `(200,229) -> (409,295) -> (589,229) -> (769,210) -> (930,229)` and return |

---

## 8. Coding Conventions and Verification

- Preserve the global script load order and current non-module architecture.
- `angle = 0` means up. Direction is `dx = sin(angle)`, `dy = -cos(angle)`.
- Use `apply_patch` for edits. Preserve unrelated/user changes in the dirty worktree.
- Use tuning getters for exposed values; do not create a second set of fixed defaults.
- Keep damage, penetration power, resistance, and destructibility separate.
- A `projectileBehavior: 'block'` result is terminal regardless of remaining power.
- Preserve `shotId`, source actor/type, and geometry metadata through all projectile/sound paths.
- Keep local perception local. Only direct player detection may continuously refresh live player coordinates.
- Do not enable projectile-impact AI by toggling one flag without per-enemy witnessed/heard classification and same-shot arbitration.
- Keep `isLit` versus `isLitByLamps` distinct. Structural evidence intentionally does not require its own lamp illumination.
- Keep door-investigation ownership and explicit transit rules. Generic portal arrival is not proof that the guard crossed into room space.
- Movement collision is resolved before and after open-panel detours/separation; preserve the existing ordering if changing navigation.
- General sound source rings must remain off by default; player-facing collision waves are separate.
- Planning docs may contain future behavior. Live docs must describe only implemented behavior and explicitly label pending boundaries.

Before ending the next implementation session:

```powershell
foreach ($f in @('tuning.js','input.js','player.js','lighting.js','enemy.js','sound.js','game.js')) { node --check $f }
git diff --check
git status --short --branch
```

After gameplay code changes, refresh/reopen `Open Game.bat` for user inspection. Automated VM/matrix tests should cover event counts and path/state transitions; user playtesting remains important for sound, animation, navigation readability, and overlapping stimulus behavior.
