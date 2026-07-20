# Live Feature 07 - Enemy AI State Machine

**Live status: Implemented for current local evidence; general projectile-impact reactions and facility escalation remain pending.**

Enemies run a state machine covering patrol, suspicious investigation, alert pursuit/combat, searching, returning, and cautious patrol.

## Current Behavior

- Enemies start in `patrol` and move at `1.5` design units per frame.
- Active suspicious approach/search movement uses `1.2`, imitating cautious observation. Once the sweep finishes, return travel and ordinary behavior restore `1.5`.
- Alert movement uses `2.5`. Melee guards pursue; shooters seek a firing position and fire with cooldown/spread.
- Ordinary direct player sight or a first proximity stimulus uses the normal `45`-frame confirmation window. A suspicious guard confirms player sight, proximity, or a second sound after `10` frames. Already searching/returning/cautious guards and severe evidence keep immediate heightened responses.
- Locally visible corpses cause immediate alert and override pending or active door investigations.
- Persistent damaged doors cause suspicious approach and close inspection. Witnessing the bullet strike in real time causes immediate `door-impact` alert and an explicit near-side door transit/search sequence.
- Witnessing a lamp break causes immediate `lamp-impact` alert. Later discovery of an already broken lamp causes `broken-lamp` suspicion, a reachable stand-off investigation, local sweep, return, and patrol restoration.
- A guard can join after seeing an alerted companion, using the companion's locally known investigation point rather than the hidden player's live position.
- Muffled closed-door sounds use an explicit investigation sequence. The guard crosses into open room space beyond the full swung panel before sweeping, then returns and closes only an intact door it opened itself.
- Open swung panels are movement and vision blockers. Navigation adds temporary clearance nodes around panel ends so patrol, investigation, and pursuit route around them.
- Living enemies resolve mutual separation after movement and cannot remain fully overlapped when converging on one destination.
- Debug labels show `ALERT` reasons in orange-red and `SUSPICIOUS` reasons in yellow.
- Current alert precedence is `player` > `corpse` > `door-impact` / `lamp-impact` > heard `gunshot` > `door` > `alerted-enemy` > ordinary `sound`. Lower-priority events may refresh the timer but do not replace the target or displayed reason.

## Current Caveats

- Pathfinding uses a small authored navigation graph plus temporary door-panel detours, not a general navmesh.
- General heard projectile-impact suspicion, geometry-independent witnessed-impact alert/search, and same-shot reaction deduplication remain pending Feature 13.
- A proposal to make heard gunshots the highest non-player alert reason has not been applied; current priority is documented above.
- Facility-wide escalation is not implemented; AI knowledge remains local.
- The precision archetype currently delegates to shooter behavior.

## Related Files

- `enemy.js`
- `game.js`
- `sound.js`
- `tuning.js`
