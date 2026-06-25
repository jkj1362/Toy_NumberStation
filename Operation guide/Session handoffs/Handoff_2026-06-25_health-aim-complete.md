# Session Handoff - 2026-06-25 - Health and Aim Pass Complete

Read this file at the start of a new chat session to resume work on the Number Stations prototype with full context.

---

## 1. Project Identity

Number Stations is a top-down Cold War stealth prototype validating the night mission loop: infiltrate, avoid or neutralize enemies, take the objective, and exfiltrate. The FDD is `Operation guide/Feature planning/[FDD]Number_Stations.md`; active scope is `Operation guide/Feature planning/prototype_scope.md`; operation rules are in `Operation guide/AGENT.md`; live source of truth is in `Live features/`. Since the last handoff, Feature 11 - Health, Damage, Death, and Corpses was added, and Feature 10 - Follow Camera and Hard-Aim Scouting was expanded with focused aim behavior. **NEXT: implement sound attenuation through walls/doors, then build the gameplay tuner/debug panel.**

Important source-of-truth rule: use `Live features/` plus the current codebase as authoritative. Session handoffs are context snapshots only and may be stale.

---

## 2. File Structure

```text
Toy_NumberStation/
|-- index.html                         (33 lines)
|-- input.js                           (213 lines)
|-- player.js                          (233 lines)
|-- lighting.js                        (562 lines)
|-- enemy.js                           (906 lines)
|-- game.js                            (1125 lines)
|-- Open Game.bat
|-- Live features/
|   |-- feature_00_pawn_movement_vision.md
|   |-- feature_01_walls_geometry.md
|   |-- feature_02_lighting.md
|   |-- feature_03_objective_exfil.md
|   |-- feature_04_enemy_sight.md
|   |-- feature_05_enemy_sound.md
|   |-- feature_06_enemy_patrol.md
|   |-- feature_07_enemy_ai_state_machine.md
|   |-- feature_08_walk_run_noise.md
|   |-- feature_09_doors.md
|   |-- feature_10_follow_camera_hardaim.md
|   |-- feature_11_health_damage.md
|   |-- feature_##_Metagame(TBD).md
|-- Operation guide/
|   |-- AGENT.md
|   |-- session handoff format.md
|   |-- Feature planning/
|   |   |-- [FDD]Number_Stations.md
|   |   |-- prototype_scope.md
|   |   |-- feature_00_pawn_movement_vision.md
|   |   |-- feature_01_walls_geometry.md
|   |   |-- feature_02_lighting.md
|   |   |-- feature_03_objective_exfil.md
|   |   |-- feature_04_enemy_sight.md
|   |   |-- feature_05_enemy_sound.md
|   |   |-- feature_06_enemy_patrol.md
|   |   |-- feature_07_enemy_ai_state_machine.md
|   |   |-- feature_08_walk_run_noise.md
|   |   |-- feature_09_doors.md
|   |   |-- feature_10_follow_camera_hardaim.md
|   |   |-- feature_11_health_damage.md
|   |   |-- feature_##_Metagame(TBD).md
|   |-- Session handoffs/
|   |   |-- Handoff_2026-05-12_walls-complete.md
|   |   |-- Handoff_2026-05-15_objective-exfil-complete.md
|   |   |-- Handoff_2026-05-21_enemy-patrol-complete.md
|   |   |-- Handoff_2026-06-05_enemy-navigation-debugging.md
|   |   |-- Handoff_2026-06-09_player-refactor.md
|   |   |-- Handoff_2026-06-19_doors-next.md
|   |   |-- Handoff_2026-06-22_doors-first-pass.md
|   |   |-- Handoff_2026-06-25_health-aim-complete.md
```

Current working tree at handoff time:

```text
 M Live features/feature_07_enemy_ai_state_machine.md
 M Live features/feature_10_follow_camera_hardaim.md
 M Operation guide/Feature planning/feature_07_enemy_ai_state_machine.md
 M Operation guide/Feature planning/feature_10_follow_camera_hardaim.md
 M Operation guide/Feature planning/prototype_scope.md
 M enemy.js
 M game.js
 M input.js
 M player.js
?? Live features/feature_11_health_damage.md
?? Operation guide/Feature planning/feature_11_health_damage.md
?? Operation guide/Session handoffs/Handoff_2026-06-25_health-aim-complete.md
```

---

## 3. Key Systems

| File | Key identifiers | Notes |
|------|-----------------|-------|
| `input.js` | `input`, `updateInput(view)`, `aimActive`, `aimAdjusting`, `lastDevice` | Normalizes keyboard/mouse and gamepad. `aimActive` means an aim angle exists; `aimAdjusting` means fresh mouse movement or active right-stick input this frame. |
| `player.js` | `PLAYER_MAX_HEALTH`, `PLAYER_PROJECTILE_DAMAGE`, `damagePlayer(amount, options)`, `player.alive` | Player has 100 HP. Player projectile damage is 100, so a standard unarmored 100 HP enemy dies from one shot. |
| `player.js` | `HARD_AIM_VISION_MULTIPLIER`, `HARD_AIM_TURN_EASE`, `HARD_AIM_MAGNET_*`, `getHardAimAssist()` | Hard aim narrows player vision to 60 degrees, slows facing/fire direction easing, and applies constrained soft magnetism. |
| `game.js` | `camera`, `getCameraLookAhead()`, `CAM_HARDAIM_OCCLUSION_PADDING`, `updateCamera()` | Hard-aim camera lead is clamped by the first forward ray blocker so walls/doors/open panels limit scouting. |
| `game.js` | `drawFireGuide()`, `drawAimAssistReticle()`, `inVisionCone()`, `drawFog()` | Fire guide previews projectile direction and blockers. Aim assist target gets a cyan reticle. Fog/discovery use narrowed hard-aim vision. |
| `game.js` | `corpses`, `addEnemyCorpse()`, `addPlayerCorpse()`, `getNearbyCorpse()`, `drawCorpses()` | Corpses are dimmed, non-blocking, and keep interaction metadata for future loot/body-search behavior. |
| `enemy.js` | `ENEMY_MAX_HEALTH`, `ENEMY_PROJECTILE_DAMAGE`, `ENEMY_MELEE_DAMAGE`, `damageEnemy()` | Enemies have 100 HP. Enemy projectiles deal 50 player damage; melee deals 25 with cooldown. |
| `enemy.js` | `emitSound()`, `notifyPlayerMoved()`, `applySoundReaction()` | Sound remains radius-based. This is the next feature area: add attenuation through walls/doors. |
| `game.js` | `DOORS`, `soundTransmission`, `getRayBlockerRects()`, `getRayBlockerPolygons()` | Door data already includes `soundTransmission`, but sound propagation does not use it yet. |
| `lighting.js` | `markStaticLightingDirty()`, `setLightingAperturesOpen()` | Door state controls lighting apertures and static-light cache invalidation. |

Critical distinctions:

- `isLit()` includes player glow; `isLitByLamps()` excludes player glow and is used by enemy detection.
- Hard-aim soft magnetism only considers living, lit enemies with clear LOS, near the fire line.
- Magnetism is strongest while `input.aimAdjusting` is true, then fades over `HARD_AIM_MAGNET_RELEASE_FRAMES = 10`. It should not track indefinitely.
- The aim reticle is a readability cue, not hard lock-on.
- Sound rings, enemy cones, labels, and reaction rings are debug/readability visuals and intentionally remain visible for now.
- Sound attenuation is not implemented yet. Door sounds emit events, but walls/doors do not attenuate sound propagation.
- Static lighting uses render-target-style max/lighten composition. Do not return to additive overlap lighting.

---

## 4. Facility Layout

Coordinates below are old 1100x750 authored coordinates. Runtime code scales them to the 3200x1800 game world.

```text
+------------------------------------------------------+
| Room A             | Corridor / Room B / Room C       |
|                    |                                  |
|   west window      |                       east window |
|        gap ---- Room A east gap ---- B/C gap          |
+--------------------+-------------------+--------------+
| Lobby / entry / lower rooms with two corridor gaps    |
|                                                      |
|                  Entry / primary exfil               |
+------------------------------------------------------+
```

Current passage / door references:

| Passage | Center point | Connects |
|---------|--------------|----------|
| Entry gap | `(500, 741)` | Outside / Lobby, primary exfil |
| Corridor left door | `(270, 449)` | Lobby / upper rooms |
| Corridor right door | `(819, 449)` | Lobby / Room F / right corridor |
| Room A east door | `(409, 295)` | Room A / Corridor |
| Room B/C divider door | `(769, 210)` | Room B / Room C |
| Room F west door | `(909, 590)` | Lobby/Corridor / Room F |
| Left perimeter duct/window | `(9, 190)` | Room A bonus exfil / moonlight aperture |
| Right perimeter duct/window | `(1091, 190)` | Room BC bonus exfil / moonlight aperture |

---

## 5. Feature Build Order

| # | Feature | Status |
|---|---------|--------|
| 00 | Pawn movement and vision spec | Done |
| 01 | Walls and room geometry | Done |
| 02 | Lighting renovation | Done |
| 03 | Objective pickup and exfil | Done |
| 04 | Enemy sight detection | Done |
| 05 | Enemy sound detection | Done, radius-only model |
| 05B | Sound attenuation through walls/doors | NEXT |
| 06 | Enemy movement and patrol | Done |
| 07 | Enemy AI state machine | Done |
| 08 | Walk/run movement and noise tradeoff | Done |
| 09 | Door System | First pass implemented; QA/tuning pending |
| 10 | Follow Camera & Hard-Aim Scouting | Done for current pass; tuning caveat |
| 11 | Health, Damage, Death, and Corpses | First pass implemented |
| 12 | Gameplay tuner/debug panel | Pending after sound attenuation |
| ## | Metagame / daytime systems | Deferred |

---

## 6. Next Work

Start by reading:

1. `Live features/feature_05_enemy_sound.md`
2. `Live features/feature_09_doors.md`
3. `Operation guide/Feature planning/feature_05_enemy_sound.md`
4. `Operation guide/Feature planning/feature_09_doors.md`
5. Current `enemy.js` sound functions and `game.js` door data

Implement **sound attenuation through walls and doors** before the gameplay tuner.

Current sound behavior:

- `notifyPlayerMoved()` emits footstep events and checks enemy hearing by radius.
- `emitSound(x, y, radius, isGunshot)` emits gunshot/door sounds and checks enemy hearing by radius.
- Enemies react via `applySoundReaction()`.
- Gunshots can immediately alert enemies who directly observe the muzzle flash in cone and LOS.
- Door opening/closing emits a modest sound.
- Door destruction emits a louder sound.
- Enemy footstep rings are visual only and do not alert other enemies.

Suggested sound attenuation direction:

- Add a helper that evaluates sound travel from source to listener.
- Keep direct radius behavior as the baseline, but reduce effective radius or sound strength when the source/listener line crosses blockers.
- Use `DOORS[*].soundTransmission` for door crossings.
- Closed doors should attenuate more than open/destroyed doors.
- Walls should attenuate strongly; do not let radius-only hearing pass through several rooms unchanged.
- Avoid using the visual fire-guide/camera ray helpers blindly if their geometry includes open door panels in a way that would make sound too binary. Sound should be less exact than LOS.
- Keep muzzle-flash direct observation separate from hearing attenuation.
- Update `Live features/feature_05_enemy_sound.md` and likely `Operation guide/Feature planning/feature_05_enemy_sound.md` after implementation.

After sound attenuation, build the gameplay tuner/debug panel:

- Expandable/collapsible overlay.
- Toggle perf overlay instead of hardcoded `SHOW_PERF_OVERLAY = true`.
- Expose key tunables for movement, sound radii/attenuation, damage, door HP, aim assist, lighting/fog, and enemy behavior.

Do not start metagame/day cycle yet.

---

## 7. Gap / Navigation Coordinates

| Use | Coordinate / span | Notes |
|-----|-------------------|-------|
| Corridor left door | `x 220..320`, around `y 440` | Horizontal threshold near `(270, 449)` |
| Corridor right door | `x 778..860`, around `y 440` | Horizontal threshold near `(819, 449)` |
| Room A east door | `x 400`, `y 250..340` | Vertical door near `(409, 295)` |
| Room B/C divider door | `x 760`, `y 160..260` | Vertical door near `(769, 210)` |
| Room F west door | `x 900`, `y 540..640` | Vertical door near `(909, 590)` |

Current enemy layout from `INITIAL_ENEMIES`:

| # | Role |
|---|------|
| 1 | Static upper-room melee sentry at `(580, 100)`, faces south |
| 2 | Short center/lobby melee patrol between `(420, 590)` and `(580, 590)` |
| 3 | Shooter cross-room patrol: Room A -> Room A door -> corridor -> B/C door -> Room BC -> return |

Enemy 3 crosses two implemented doors and auto-opens them when close enough.

---

## 8. Coding Conventions

- Source load order is `input.js`, `player.js`, `lighting.js`, `enemy.js`, `game.js`.
- Use `apply_patch` for manual code edits.
- Do not revert user changes or unrelated dirty worktree changes.
- Keep changes surgical and feature-focused.
- Use `rg` for search.
- For visual/gameplay/rendering changes, run or open the game and do screenshot/manual QA when practical.
- Refresh or reopen the game after code changes so the user can inspect current behavior.
- `angle = 0` faces up. Movement/projectile vectors often use `dx = Math.sin(angle)`, `dy = -Math.cos(angle)`.
- Use current scale helpers when converting authored coordinates: `scaleGameX/Y/Unit`, `scalePlayerX/Y/Unit`, `scaleEnemyX/Y/Unit`.
- World is `3200x1800`; visible canvas is `1920x1080`.
- `pushOutOfWalls()` is commonly called twice to resolve collision.
- Enemy sight should use `isLitByLamps()`, not `isLit()`.
- Player discovery/fog uses `getPlayerVisionAngle()`, which narrows during hard aim.
- Existing debug visuals are intentional for now.

---

## 9. Verification Performed

During the health and aim pass:

- `node --check game.js` passed.
- `node --check player.js` passed.
- `node --check enemy.js` passed.
- `node --check input.js` passed.
- `git diff --check` reported only CRLF normalization warnings.
- `Open Game.bat` was relaunched after code changes so the user could inspect behavior.
- User manually reported:
  - Health feature looked good after player projectile damage was raised to 100.
  - Camera clamp against walls/doors was well implemented.
  - Upper-bound aim magnetism felt too auto-targeting.
  - Softer/decaying magnetism is playable enough, but likely needs later external feedback.

---

## 10. Known Caveats / Follow-Up

- Sound attenuation through walls/doors is the next implementation target.
- Door data includes `soundTransmission`, but it is unused.
- Door placement, light leakage, and enemy door behavior still need direct visual QA.
- Door animation is instant.
- Soft aim magnetism is intentionally subtle and should be revisited after external playtest feedback.
- Camera obstacle handling is limited to the hard-aim forward ray; there is no full camera collision volume.
- Corpse interaction exists only as data/overlap support; loot/body-search behavior is not implemented.
- Armor is deferred and should become a separate feature doc later.
- Damage and aim values are hardcoded and should move into the gameplay tuner.
- Perf overlay is still visible and should be gated by the upcoming tuner/debug panel.
- Metagame/day-cycle systems remain deferred until the night mission is more fully tuned.
