# Live Feature 07 - Enemy AI State Machine

**Live status: Local state/reaction implementation complete; stability playtesting and bug fixing remain ongoing. Facility escalation is not implemented.**

Enemies run a state machine covering patrol, suspicious investigation, alert pursuit/combat, searching, returning, and cautious patrol. Feature 13 adds local incident memory and state-specific companion coordination without global player knowledge.

## Current Behavior

- Enemies start in `patrol` and move at `1.5` design units per frame.
- Active suspicious approach/search movement uses `1.2`. Return travel and ordinary behavior use `1.5`.
- Alert movement uses `2.5`. Melee guards pursue; shooters seek firing positions and fire with cooldown/spread.
- Ordinary direct player sight or a first proximity stimulus uses the normal `45`-frame confirmation window. A suspicious guard confirms player sight, proximity, a second gunshot, or a second independent ballistic impact after `10` frames.
- Locally visible corpses cause immediate alert and interrupt door investigations.
- Persistent illuminated door damage causes suspicious approach and close inspection before alert/transit. A sufficiently illuminated real-time door strike witness enters immediate alert.
- Witnessing a lamp break causes immediate `lamp-impact` alert. Later recognition of an already broken lamp causes moving `broken-lamp` suspicion even in darkness.
- Heard projectile impacts create moving suspicion at an approximate reachable point. Sufficiently illuminated witnessed impacts create immediate alert at a reachable geometry-side target.
- Later discovery of a sufficiently illuminated broken window causes a local structural investigation.
- Local action precedence is `player` > `gunshot` > `corpse` > active companion assignment > witnessed impact > structural door/lamp/window evidence > heard impact > ordinary sound.
- A companion assignment is a temporary travel commitment, not upgraded information. The shared event retains its original reason, priority, provenance, age, and fixed last-known/inferred position.
- A guard traveling under a companion assignment can be interrupted by direct player detection, a gunshot, or local corpse discovery. After reaching the assigned area and starting its sweep, it resumes ordinary local incident arbitration.
- Suspicion sharing uses one case roster with a default maximum of four active investigators: the original perceiver plus up to three companions. Other direct perceivers may become suspicious support without converging.
- Active suspicion-case members receive distributed search points. Distinct credible evidence and strictly better location information can retarget the team without increasing suspicion or creating another confirmation.
- Alert propagation has no numeric squad cap, but it remains a visual relay: each new guard must actually observe a sufficiently illuminated alerted companion inside cone/range with clear line of sight.
- An already-alerted receiver changes action only for higher-priority or strictly better information. Equal/worse relays do not refresh timers, restart sweeps, reset event age, or create alert loops.
- Stable incident IDs and per-observer `shotId` memory prevent muzzle, gunshot, penetration impacts, destruction, direct observation, and companion relays from double-confirming one physical shot.
- Muffled door investigation saves and restores interrupted patrol state, opens/crosses beyond the panel, searches, returns, and closes only an intact door opened by that investigation.
- Open swung panels remain movement and vision blockers. Temporary clearance nodes route enemies around panel ends.
- Living enemies resolve mutual separation after movement so they do not remain fully overlapped at shared targets.
- Debug labels show alert and suspicion reasons independently.

## Current Caveats

- The local implementation is not considered fully stable. Movement and overlapping-stimulus bugs should be fixed as reproducible cases are found.
- Pathfinding uses a small authored navigation graph plus temporary door-panel detours, not a general navmesh.
- Facility-wide evidence scoring, escalation levels, decay, and connected-room assignments do not exist; Feature 16 owns them.
- The precision archetype currently delegates to shooter behavior.

## Related Files

- `enemy.js`
- `game.js`
- `sound.js`
- `lighting.js`
- `tuning.js`
