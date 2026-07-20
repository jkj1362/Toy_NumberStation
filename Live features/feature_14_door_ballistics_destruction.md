# Live Feature 14 - Geometry Ballistics, Penetration, and Destruction

**Live status: Core implementation complete for current geometry; Feature 13 AI impact integration and final map-level validation remain.**

Player and enemy bullets share a swept collision/penetration resolver. Fast projectiles resolve actors and geometry in true travel order, can cross explicitly penetrable targets while power remains, and stop at unconditional blockers.

## Current Behavior

- Every projectile has a stable `shotId`, damage, penetration power, remaining power, and crossed-target memory.
- Default bullets use `1.0` power against `1.0` unarmored body resistance. They damage the first person and stop. A test/upgrade value of `2.0` crosses one body and stops in the second.
- Damage and penetration are independent. Higher damage does not automatically grant penetration, and door/window damage is separately tuned.
- Each actor can be damaged only once by one projectile. Previously crossed actors/geometry cannot retrigger while the projectile exits the same intersection.
- Normal walls and the reinforced metal door are unconditional blockers regardless of remaining projectile power.
- Thin wooden doors are penetrable in closed, opening, open, and closing states. Each hit consumes resistance, deals `20` structural damage, and leaves a persistent panel-relative hole. Their `200` HP is exhausted on the tenth standard hit.
- Physical glass windows are thinner/weaker: `60` HP at `20` damage, breaking on the third hit. Intact glass blocks movement but is transparent to sight/light; destruction removes the blocker and leaves debris.
- Breaking a linked exterior window automatically activates its secondary exit. Silent close-range interaction opens the intact window and activates the same exit without damage.
- The reinforced metal door uses an `18`-unit panel, is non-destructible, has no HP, and stops every bullet.
- Wooden doors animate over `12` frames and the metal door over `24`; closing reverses opening. Intact swung panels remain movement/vision/projectile geometry.
- Every geometry collision records a canonical impact event and emits a separate material sound. Defaults are muzzle `350`, wall/wood impact `220`, glass `90`, metal `260`, and door/window destruction `240`.
- Muzzle and all derived impacts preserve the same incident ID. Projectile-impact player cues are active, while general impact-driven AI reactions are intentionally disabled until Feature 13 performs heard/witnessed classification and deduplication.
- Exterior windows feed the existing aperture system. Clear moonlight enables their light; rain or zero moonlight disables it through `setExternalWeatherState()`.

## Current Caveats

- General heard-impact suspicious investigation, geometry-independent witnessed-impact alert/search, and same-shot AI reaction priority are pending Feature 13.
- Armor coverage, equipment mitigation, player-facing ammunition variants, and upgrade inventory are deferred to the future gear/inventory systems. Only the underlying power/resistance hooks exist.
- Ricochet, deformation, speed/damage loss after penetration, material-specific resistance changes, and bullet-hole sight/sound leakage are not implemented.
- Final facility-wide tests remain after Feature 13 connects the neutral impact events to AI.

## Related Files

- `game.js`
- `player.js`
- `enemy.js`
- `sound.js`
- `tuning.js`
- `lighting.js`
