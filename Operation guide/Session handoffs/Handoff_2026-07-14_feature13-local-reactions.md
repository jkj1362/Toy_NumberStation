# Session Handoff - 2026-07-14 - Feature 13 Local Reactions

Read this file at the start of a new chat session to resume work on the Number Stations prototype with full context.

---

## 1. Project Identity

Number Stations is a top-down Cold War stealth prototype. The current playable build validates the night mission loop: infiltrate a facility, read light and sound, avoid or fight enemies, take an objective, and exfiltrate alive. The FDD is `Operation guide/Feature planning/[FDD]Number_Stations.md`; current Prototype 2 scope is `Operation guide/Feature planning/prototype_scope_milestone_02.md`. The current code, live feature docs, and current planning docs are authoritative. Older handoffs are stale about feature numbering: Feature 13 is now local AI event reactions/body discovery, Feature 14 is geometry ballistics/penetration/impact events, and Feature 15 is seeded mission generation.

Feature 13's existing local-reaction subset is implemented. The single next feature is **Feature 14 - Geometry Ballistics, Penetration, and Impact Events**, beginning with the shared ballistics/event foundation required by Feature 13's pending projectile-impact stimuli.

Checkpoint: the completed Feature 13 local-reaction work and this handoff were committed and pushed on `main` as `004af9f` (`AI Local reaction specified`). At handoff finalization, `main` matched `origin/main` and the worktree was clean. Incoming sessions should still inspect `git status` before editing because newer user changes may exist.

---

## 2. Current File Structure

```text
Toys/
|-- index.html                                      (37 lines)
|-- tuning.js                                      (557 lines)
|-- input.js                                       (269 lines)
|-- player.js                                      (310 lines)
|-- lighting.js                                    (716 lines)
|-- enemy.js                                      (1653 lines)
|-- sound.js                                       (790 lines)
|-- game.js                                       (1428 lines)
|-- Open Game.bat
|-- Live features/
|   |-- feature_00_pawn_movement_vision.md
|   |-- feature_01_walls_geometry.md
|   |-- feature_02_lighting.md
|   |-- feature_03_objective_exfil.md
|   |-- feature_04_enemy_sight.md
|   |-- feature_05_enemy_sound.md                   (54 lines, modified)
|   |-- feature_06_enemy_patrol.md
|   |-- feature_07_enemy_ai_state_machine.md       (32 lines, modified)
|   |-- feature_08_walk_run_noise.md
|   |-- feature_09_doors.md                        (39 lines)
|   |-- feature_10_follow_camera_hardaim.md
|   |-- feature_11_health_damage.md
|   |-- feature_12_tuning_debug_controls.md
|-- Operation guide/
|   |-- AGENT.md
|   |-- session handoff format.md
|   |-- Feature planning/
|   |   |-- [FDD]Number_Stations.md
|   |   |-- prototype_scope.md
|   |   |-- prototype_scope_milestone_02.md        (180 lines)
|   |   |-- feature_00...feature_12 planning docs
|   |   |-- feature_13_ai_reactions_body_discovery.md (151 lines, modified)
|   |   |-- feature_14_door_ballistics_destruction.md  (137 lines, modified)
|   |   |-- feature_15_seeded_mission_generation.md    (64 lines)
|   |-- Session handoffs/
|       |-- previous immutable handoffs
|       |-- Handoff_2026-07-14_feature13-local-reactions.md
```

Feature 13 behavior currently lives in the existing Feature 05/07/09 systems and their live docs; there is not yet a standalone Feature 13 live doc. Feature 14 is planning-only and also has no live doc yet. Create/update live-state documentation when those feature boundaries become implemented, without describing planned behavior as live.

---

## 3. Key Systems and Current State

| File | System | Current identifiers and non-obvious behavior |
|------|--------|-----------------------------------------------|
| `index.html` | Script load order | `tuning.js`, `input.js`, `player.js`, `lighting.js`, `enemy.js`, `sound.js`, `game.js`. Preserve this order. |
| `tuning.js` | Runtime tuning/debug | Added `debugHiddenEnemies` and `enemyDamagedDoorConfirmDelay` (default `90` frames / 1.5 seconds). Hidden silhouettes remain under the master debug toggle. |
| `player.js` | Player projectiles | Player projectile records now carry `sourceActor` and `sourceType`. Projectile penetration power, shot IDs, swept collision, and impact events are not implemented yet. |
| `enemy.js` | Local AI reactions | Key entry points: `enterEnemyAlert()`, `scheduleMuffledDoorInvestigation()`, `detectLocalVisualStimulus()`, `notifyDoorDamaged()`, `updateDoorInvestigation()`, `updateDamagedDoorInvestigation()`, `updateAlertDoorTransit()`, `drawHiddenEnemiesDebug()`. |
| `sound.js` | Acoustic perception | `evaluateEnemySound()`, `evaluatePlayerSound()`, and `emitSoundEvent()` use the current room/portal attenuation model. Exact enemy source cues require direct/open-portal audibility; closed-door cues remain amber doorway arcs; wall-vague leakage uses a dim listener-side pulse. |
| `game.js` | Geometry, doors, player projectile loop | Key helpers: `openDoorNearEntity()`, `hitDoorAt()`, `damageDoor()`, `setDoorState()`, `getMovementBlockers()`, `hitsWall()`. Doors still terminate projectiles. Shared swept collision and penetration are not implemented. |
| `lighting.js` | Lighting/visibility | Preserve `isLit` versus `isLitByLamps`. Character/corpse observation uses normal lamp visibility; persistent structural door damage intentionally does not require lamp illumination. |

Committed baseline: `004af9f` on `main`, pushed to `origin/main`. The Feature 13 code, Feature 05/07 live-doc updates, Feature 13/14 planning updates, tuning changes, and this handoff are all part of that checkpoint.

### Implemented Feature 13 behavior

- Enemies locally discover enemy corpses using range, vision cone, lamp visibility, and line of sight. Evidence is remembered per observer.
- Enemies locally observe an alerted companion and copy only that companion's locally known target, never the hidden player's live coordinates.
- Persistent damaged doors (`hp < maxHp`) are structural evidence. A guard who later sees one becomes suspicious, approaches the observer-side interaction point without auto-opening it, inspects for the tunable delay, then alerts, opens/crosses, and searches the far side.
- A guard that sees a destroyed door alerts immediately.
- A guard that witnesses a door being damaged in real time enters immediate `door-impact` alert. It uses `alertDoorTransit` to approach the near side, open if needed, cross fully, and then search. Do not replace this with a generic far-side path while the door is closed.
- Door transit excludes the evidence door from generic enemy auto-open behavior. The explicit crossing uses the normal small arrival radius because the generic doorway arrival radius can falsely complete while the guard is still at the threshold.
- Muffled sound through a closed door starts a suspicious investigation: save interrupted patrol state, approach, open with ownership, cross, search, return, close only the owned/unblocked intact door, then restore patrol position/facing/index/pause/sweep.
- `enterEnemyAlert()` clears special investigations. Direct player detection overrides evidence and continuously refreshes only the directly observed player position.
- Hidden enemies can be redrawn after fog as dim debug silhouettes without changing AI detection.

### Player-hearing correction included in this work

- A blue exact-source enemy sound cue is suppressed when no direct line or all-open portal route exists.
- The intentionally designed amber closed-door cue remains when sound is heard through a closed portal.
- Close wall leakage can still produce a vague dim cue near the listener; it must not reveal the exact enemy source.

### Implemented versus planned boundary

- Existing door damage and real-time witnessed **door** impact reaction are implemented.
- General projectile impact sounds, wall/window impact events, heard-impact investigation, geometry-independent witnessed-impact search, penetration power/resistance, physical destructible windows, and bullet holes are planned only.
- Facility-wide escalation is not implemented. Keep all current reactions local until the ballistics/impact loop and local tuning are stable.

---

## 4. Facility Layout

The current facility remains hardcoded in design-space coordinates and scales to the `3200 x 1800` world.

```text
             Top perimeter wall
  +---------------------------------------------------+
  | Room A              | Corridor       | Room B/C    |
  | left exit gap       |                | right exit  |
  |                     |                | gap         |
  |       door 409,295   |                | door 769,210|
  +---------------------+                +-------------+
  |                                      |             |
  | Lobby / lower entry                  | Room F      |
  | corridor doors 270,449 and 819,449   | door 909,590|
  |      entry/exfil gap x 430-570 at bottom           |
  +---------------------------------------------------+
```

| Purpose | ID | Design-space coordinate |
|---------|----|-------------------------|
| Lobby/corridor left | `corridor_left_door` | `(270, 449)` |
| Lobby/corridor right | `corridor_right_door` | `(819, 449)` |
| Room A/corridor | `room_a_east_door` | `(409, 295)` |
| Corridor/Room B-C | `room_bc_divider_door` | `(769, 210)` |
| Lobby/Room F | `room_f_west_door` | `(909, 590)` |
| Room A exterior gap | `room_a` wall gap | `(9, 190)` |
| Room B-C exterior gap | `room_bc` wall gap | `(1091, 190)` |
| Bottom entry/exfil | entry gap | `x 430-570` |

---

## 5. Feature Build Order

| Feature | Status | Notes |
|---------|--------|-------|
| 00-12 - Existing prototype systems | Done | Movement, walls, lighting, objective/exfil, sight, sound, patrol, AI states, noise, doors, camera/aim, health, tuning/debug. |
| 13 - Local AI Event Reactions and Body Discovery | In progress | Corpse, door evidence, alerted companion, and muffled-door investigation implemented. General projectile-impact stimuli, tuning, and facility escalation remain. |
| 14 - Geometry Ballistics, Penetration, and Impact Events | **NEXT** | Implement the shared ballistics/event dependency first, then return to Feature 13 impact reactions. |
| 15 - Seeded Mission Generation | Pending | Do not start before the local ballistics/reaction loop is stable unless the user reprioritizes. |
| Metagame | Pending | Out of current implementation scope. |

---

## 6. Next Feature Spec

Next work is **Feature 14 - Geometry Ballistics, Penetration, and Impact Events**. The authoritative detailed plan is `Operation guide/Feature planning/feature_14_door_ballistics_destruction.md`; Feature 13's consumer behavior is in `Operation guide/Feature planning/feature_13_ai_reactions_body_discovery.md`.

### Agreed model

Do not infer ballistics from an object being a `door` or `window`. Use explicit target data:

```javascript
{
  destructible: true,
  projectileBehavior: 'penetrate', // or 'block'
  penetrationResistance: 0.5,
  geometryId: 'room_a_east_door',
  geometryType: 'door',
}
```

Projectiles need separate damage and penetration values plus stable identity/deduplication:

```javascript
{
  damage: 100,
  penetrationPower: 2.0,
  shotId,
  hitTargetIds: new Set(),
  sourceActor,
  sourceType,
}
```

Collision resolution, in travel order:

```javascript
applyDamage(target, projectile.damage);

if (target.projectileBehavior === 'block') {
  emitCanonicalImpact(projectile, target, hit);
  destroyProjectile();
  return;
}

projectile.penetrationPower -= resolvePenetrationResistance(target, hit);
projectile.hitTargetIds.add(target.id);
emitCanonicalImpact(projectile, target, hit);

if (projectile.penetrationPower <= 0) destroyProjectile();
else advanceJustPastExitFaceAndContinue();
```

First-pass normalized behavior:

- Standard bullet initial power: `2.0`.
- Unarmored body resistance: `1.0`. First body is hit and penetrated; second body is hit and stops the bullet; a third body is not hit.
- Future covered bullet-proof armor/helmet resistance: `2.0` or greater. Armor resistance overrides the default body resistance for a covered hit; damage mitigation remains separate, so stopped bullets may still cause reduced damage/blunt trauma.
- Lightweight penetrable doors/windows use lower tunable resistance. Multiple objects consume power cumulatively; penetration is not unlimited.
- Normal walls and configured reinforced/non-destructible doors are unconditional `block`, regardless of remaining projectile power.
- Object HP and penetration resistance are separate. A bullet may damage an object but stop in it, or pass through without destroying it.

Current physical-world caveat: the authored `window` entries are lighting apertures/exterior gaps, not destructible collision objects. Do not treat lighting aperture records as projectile hitboxes. Add a physical window data/state boundary before implementing actual window destruction.

### Recommended implementation compartments

1. Add explicit geometry material metadata and tunable projectile/target resistance defaults.
2. Build one shared swept-segment collision query for player and enemy projectiles; sort actor/geometry hits by travel distance to prevent tunneling and wrong hit order.
3. Add `penetrationPower`, stable `shotId`, and per-projectile target deduplication.
4. Implement actor penetration (two unarmored maximum by default), armor-resistance resolution hook, cumulative door/object resistance, and unconditional walls.
5. Emit one canonical impact event for every geometry collision, including impact position, incoming direction, source, geometry identity/material, and destruction result.
6. Emit a projectile-impact sound at every geometry collision using the same first-pass radius as the muzzle sound. Muzzle and impacts from one bullet share `shotId` so AI does not double-confirm one shot.
7. Add persistent door bullet holes and the physical window record/state boundary after core collision behavior is stable.
8. Then implement Feature 13 heard-impact suspicious investigation and witnessed-impact immediate alert/reachable connected-space search.

### Required acceptance tests before Feature 13 consumes impact events

- Player and enemy projectiles produce equivalent collision/penetration results.
- A standard unobstructed shot hits two unarmored actors and stops on the second; the third remains unharmed.
- A covered armor test target stops a standard bullet on the first actor while damage is resolved separately.
- Door/window resistance accumulates and eventually exhausts the projectile budget.
- Every normal wall and configured non-destructible door stops every bullet.
- Fast projectiles do not tunnel through actors, thin doors, or walls.
- One projectile damages each target and emits each geometry impact only once.
- A target behind a penetrable door can be hit in correct travel order.
- Every geometry hit emits one impact sound/event; bullet-triggered door destruction does not generate duplicate AI confirmation for the same incident.

Do not implement building-wide escalation during this task. After the ballistics/event contract is stable, Feature 13 should consume it with reaction priority: direct shooter/muzzle observation, then witnessed impact, then heard impact.

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
| 2 | Lobby melee patrol | `(420,590) <-> (580,590)` |
| 3 | Cross-room shooter | `(200,229) -> (409,295) -> (589,229) -> (769,210) -> (930,229)` and return |

---

## 8. Coding Conventions and Verification

- Preserve script load order and existing global-script architecture.
- `angle = 0` means facing up. Gameplay direction is `dx = sin(angle)`, `dy = -cos(angle)`.
- Use `apply_patch` for manual edits. Preserve unrelated user changes and never revert a dirty worktree without explicit instruction.
- Use runtime tuning getters for exposed values. Add ballistics values to `tuning.js` instead of introducing an independent untunable constant set.
- Keep `isLit` and `isLitByLamps` distinct.
- Keep local perception local. Do not substitute `player.x/y` for an evidence target unless the player is directly detected.
- Door evidence visibility intentionally ignores lamp illumination; corpse/actor observation does not.
- Keep door investigation ownership rules: only close an intact, unblocked door opened by that investigation.
- Keep explicit door alert transit. Generic nav/path arrival near a portal is deliberately generous and is not sufficient to prove a threshold crossing.
- Shared projectile collision should use structured swept-intersection results, not ad hoc string/type checks or frame-point sampling.
- Separate `damage`, `penetrationPower`, and target `penetrationResistance`; do not hardcode actor count as a projectile counter.
- Keep actor/equipment damage mitigation separate from penetration stopping power.
- A `block` geometry result always wins over remaining penetration power.
- Source/incident metadata must survive player and enemy projectile paths.
- Current sound propagation and player-facing cues must remain portal/attenuation aware.
- Live docs describe implemented behavior only; planning docs may describe future work. Handoffs are snapshots and never override newer plan docs or code.

Verification completed for the current Feature 13 changes:

- `node --check` passed for `enemy.js`, `game.js`, `player.js`, `sound.js`, and `tuning.js`.
- `git diff --check` passed; PowerShell displayed only expected LF-to-CRLF working-copy warnings.
- Map-level VM simulations covered all five doors for partial damage and destruction. Guards approached without moving away, completed the explicit crossing, and entered ordinary searching.
- The user manually verified corpse alert, persistent damaged-door inspection/delay/escalation, destroyed-door response, real-time witnessed door-damage transit, exact blue sound-ring suppression, and hidden-enemy debug silhouettes.

Before ending the next implementation session:

```powershell
foreach ($f in @('tuning.js','input.js','player.js','lighting.js','enemy.js','sound.js','game.js')) { node --check $f }
git diff --check
```

Run automated ballistics matrices for both projectile owners and visually refresh/reopen `Open Game.bat` after gameplay changes.
