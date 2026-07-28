# Live Feature 14 - Geometry Ballistics, Penetration, and Destruction

**Live status: Core implementation and Feature 13 impact-reaction integration complete for current geometry; stability playtesting and final map-level validation remain.**

Player and enemy bullets share a swept collision/penetration resolver. Fast projectiles resolve actors and geometry in true travel order, can cross explicitly penetrable targets while power remains, and stop at unconditional blockers.

## Current Behavior

- Every projectile has a stable `shotId`, damage, penetration power, remaining power, and crossed-target memory.
- Default bullets use `1.0` power against `1.0` unarmored body resistance. They damage the first person and stop. A test/upgrade value of `2.0` crosses one body and stops in the second.
- Damage and penetration are independent. Each actor can be damaged only once by one projectile.
- Hitting or penetrating an actor creates no separate geometry-impact event or ballistic sound stimulus.
- Normal walls and the reinforced metal door are unconditional blockers regardless of remaining projectile power.
- Thin normal wooden doors are penetrable in closed, opening, open, and closing states.
- Wooden doors have `2000` HP and take `20` damage per standard bullet, so they survive 99 hits and break on the hundredth. This is a stress/debug fallback; future explosives are the intended destruction method.
- Each wood-door hit consumes resistance and leaves a persistent panel-relative bullet hole.
- Physical glass windows use `60` HP and `20` damage, breaking on the third standard hit. Intact glass blocks movement but remains transparent to sight and light.
- Breaking a linked exterior window removes its blocker and activates its secondary exit. Silent close interaction opens the same window/exit without damage.
- The reinforced metal door uses an `18`-unit panel, is non-destructible, has no HP, and stops every bullet.
- Wooden doors animate over `12` frames and the metal door over `24`; closing reverses opening. Intact swung panels remain movement, vision, and projectile geometry.
- Every geometry collision creates canonical impact data containing shot/source identity, position/direction, geometry identity/type/material, behavior, destructibility, and destruction result.
- Current sound defaults are gunshot `600`, ordinary wall/wood impact `420`, window/glass impact `500`, metal-door impact `480`, and same-object door/window destruction `560`.
- Feature 13 consumes impact data per listener. Heard impacts create approximate moving suspicion; sufficiently illuminated witnesses create immediate reachable alert/search.
- Muzzle, gunshot, penetrated impacts, and destruction preserve one `shotId` and are deduplicated by observer.
- Same-shot window prominence, information refinement, destruction precedence, distinct-shot confirmation, and the two-impact/three-second threshold are implemented.
- Exterior windows feed the aperture system. Clear moonlight enables their light; rain or zero moonlight disables it through `setExternalWeatherState()`.

## Current Caveats

- Normal-door destruction is technically possible with 100 bullets because explosive damage does not exist yet.
- Armor coverage, equipment mitigation, ammunition variants, and upgrade inventory are deferred. Only power/resistance hooks exist.
- Ricochet, deformation, speed/damage loss after penetration, and bullet-hole sight/sound leakage are not implemented.
- Final player-facing map regression remains, including both projectile owners, all door orientations, both windows, the metal door, actors behind penetrable geometry, and overlapping AI stimuli.

## Related Files

- `game.js`
- `player.js`
- `enemy.js`
- `sound.js`
- `tuning.js`
- `lighting.js`
