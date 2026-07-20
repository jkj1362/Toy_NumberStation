# Live Feature 05 - Enemy Sound Detection

**Live status: Implemented for current sound types; general projectile-impact AI reactions remain queued in Feature 13.**

Sound is event-radius based with per-listener acoustic attenuation. Footsteps, gunshots, body falls, doors, destruction, and projectile collisions create world sound events. The propagation and debug visualization live in `sound.js`; enemy reactions live in `enemy.js`.

## Current Behavior

- Player footsteps emit periodic sounds whose radius scales with current movement noise.
- Gunshots emit a `350`-unit muzzle report and carry a stable shot ID shared with that bullet's later impacts.
- Open and destroyed doors transmit sound as open passages. A guard on the opposite side of an open doorway can hear and react to an unobstructed gunshot.
- Closed doors attenuate sound using `door.soundTransmission`, currently `0.8`; walls strongly attenuate sound and make localization vague.
- A shorter closed-door path may be preferred over a much longer open detour according to `soundDoorDetourRatio`, default `1.5`.
- Clear sounds use their actual source. Wall-vague sounds use a listener-side perceived point. Muffled sounds use the actual attenuating closed-door proxy, never the hidden exact source.
- A muffled doorway arc appears only while the sound source and player are on opposite sides of that same closed door. It is suppressed when the player is on the source side or the door is opening/open/closing/destroyed.
- A guard that hears a muffled sound can perform the complete closed-door investigation: approach, open, cross beyond the swung panel, sweep, return, conditionally close its own door, and resume patrol.
- A clearly heard gunshot can replace an older door alert and retarget the guard toward the perceived muzzle position. Current priority does not let it replace corpse or witnessed door/lamp impact evidence.
- A death emits one quiet `140`-unit body-fall event. Nearby guards react to the acoustic location as an unknown sound; visual confirmation is still required to identify a corpse.
- Projectile collisions emit material-tuned sounds: normal wall/wood `220`, glass `90`, and metal door `260`. Wooden-door and window destruction use `240`.
- Projectile-impact sounds preserve the shot ID but currently set `canAlertEnemies: false`. Player-facing collision waves work; general heard-impact AI investigation is the next Feature 13 integration task.
- Enemy footsteps and gunshots use the same presentation/attenuation framework. Enemy footsteps remain non-alerting to other enemies.
- Player-facing cues draw after fog/darkness: clear sources use circular waves, muffled doors use amber partial arcs, and vague wall sounds use weak blue-gray pulses.
- Debug attenuation paths distinguish clear, portal-clear, muffled, vague, and lost paths. General true-source rings are separately controlled and remain off by default.

## Current Caveats

- The portal graph and axis-aligned room partitions are authored for the current facility; this is not full geometric acoustic simulation.
- General projectile-impact heard/witnessed classification and same-shot AI deduplication are pending Feature 13.
- Wall-vague localization uses a simple nearby perceived source along the incoming direction.
- Exact-source enemy cues are suppressed if their direct line becomes blocked and no all-open portal route remains.

## Related Files

- `sound.js`
- `enemy.js`
- `player.js`
- `game.js`
- `tuning.js`
