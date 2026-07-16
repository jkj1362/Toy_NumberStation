# Live Feature 07 - Enemy AI State Machine

**Live status: Implemented.**

Enemies run a state machine covering patrol, suspicious reaction, alert pursuit/combat, searching, returning, and cautious patrol.

## Current Behavior

- Enemies start in `patrol`.
- Stimuli can schedule delayed reactions through a reaction timer.
- `suspicious` turns toward or investigates a stimulus, with later suspicion levels allowing movement/search behavior.
- `alert` pursues or attacks the player while refreshing an alert timer if sight is maintained.
- After alert expires, enemies search the last known player position when available.
- Search completion leads into return-to-patrol behavior.
- Returning enemies path back to a home or nearest patrol route target.
- Cautious behavior persists after returning to patrol.
- Melee archetypes chase the player directly when alert.
- Shooter archetypes move until they can shoot, then fire enemy projectiles with cooldown and spread.
- Debug overlays can redraw enemies that are outside the player's current cone/light/clear-view result as dim silhouettes after fog, allowing hidden AI behavior to be observed without changing detection.
- The hidden-silhouette overlay is controlled by `Debug Overlays > Hidden enemy silhouettes` and remains subordinate to the master debug toggle.
- Persistent door damage discovered later produces suspicious approach and close inspection. A guard that witnesses the bullet impact in its cone and line of sight skips inspection and enters immediate `door-impact` alert.

## Current Caveats

- Pathfinding uses a small hardcoded navigation graph, not a full navmesh.
- Defeated enemies leave non-blocking corpses. Local corpse, damaged-door, and alerted-companion reactions are implemented; a newly visible corpse immediately overrides pending or active door investigations, including an active door-impact alert.
- Alert causes have explicit precedence (`player` > `corpse` > `door-impact` > `door` > `alerted-enemy` > `sound`). Lower-priority events can refresh alert duration but do not replace the current target or the debug reason label. Facility-wide escalation is still pending.
- Enemy debug labels identify `ALERT` reasons in orange-red and `SUSPICIOUS` reasons in yellow so multiple guards' non-default reactions can be distinguished at a glance.
- The precision archetype exists as a behavior branch but currently delegates to shooter behavior.

## Related Files

- `enemy.js`
- `game.js`
