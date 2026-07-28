# Live Feature 05 - Enemy Sound Detection

**Live status: Implemented for current local sound types and projectile-impact reactions. Facility-level escalation is not implemented.**

Sound is event-radius based with per-listener acoustic attenuation. Footsteps, gunshots, body falls, doors, destruction, and projectile collisions create world sound events. Propagation and presentation live in `sound.js`; listener-specific reaction arbitration lives in `enemy.js`.

## Current Behavior

- Player footsteps emit periodic sounds whose effective hearing radius scales with current movement noise.
- Every unsuppressed player or enemy gunshot uses one `600`-unit base radius and carries the projectile's stable `shotId`.
- Gunshot audio is source-neutral: a listener reacts the same way whether the shooter is the player or another enemy. The shooter itself is excluded from its own sound.
- Open and destroyed doors transmit sound as open passages. Closed doors multiply the same base sound by `door.soundTransmission`, currently `0.8`; walls strongly attenuate and make localization vague.
- A shorter closed-door path may be preferred over a much longer open detour according to `soundDoorDetourRatio`, default `1.5`.
- Clear sounds use their actual source. Wall-vague sounds use a listener-side directional point. Muffled sounds use the actual attenuating closed-door proxy, never the hidden exact source.
- A muffled doorway arc appears only while the sound source and player occupy opposite sides of that same closed door. Opening the door or moving to the source side suppresses the arc.
- A guard that hears a muffled sound can approach the door, open it, cross beyond the swung panel, sweep, return, conditionally close the door it opened, and resume its interrupted behavior.
- A clearly heard gunshot outranks corpse, companion assignment, witnessed impact, structural evidence, heard impact, and ordinary sound. Only direct player detection has higher local action priority.
- Projectile impacts use material-tuned base radii: ordinary wall/wood `420`, window/glass `500`, metal door `480`, and same-object door/window destruction `560`.
- The current impact dispatch ensures a listener in the modeled impact room can hear the event before normal environmental transmission is considered for other spaces.
- Heard impact audio never supplies the exact collision coordinate. Clear hearing uses a short directional/reachable proxy; muffled hearing uses the relevant door proxy.
- One heard impact starts moving suspicion and a brief local investigation. Two different ballistic `shotId` values heard within `180` frames confirm alert.
- Several impacts from one penetrating projectile count once. Muzzle, impact, and destruction routes from one shot share identity and cannot create independent confirmations merely by arriving through different routes.
- A same-object destruction route supersedes that object's ordinary impact route. Window impact is acoustically more prominent than ordinary wall impact.
- A death emits one quiet `140`-unit body-fall event. Hearing it is unknown acoustic evidence; later visual confirmation identifies the corpse.
- Enemy footsteps use the same presentation framework but do not alert other enemies.
- Player-facing cues draw after fog/darkness: clear sources use circular waves, muffled doors use amber partial arcs, and vague wall sounds use weak blue-gray pulses.
- Debug paths distinguish clear, portal-clear, muffled, vague, and lost routes. General true-source rings remain separately controlled and off by default.

## Current Caveats

- Room partitions and the portal graph are authored specifically for the current facility; this is not a general geometric acoustic simulation.
- Wall-vague and impact-only localization use intentionally approximate nearby points.
- Facility-wide evidence accumulation, alert levels, and connected-room search assignments are deferred to Feature 16.
- A silencer is only a future item idea. No suppressed-shot behavior exists, although a future weapon can supply a smaller base radius through the existing sound path.

## Related Files

- `sound.js`
- `enemy.js`
- `player.js`
- `game.js`
- `tuning.js`
