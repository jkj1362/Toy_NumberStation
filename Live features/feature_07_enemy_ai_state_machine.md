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

## Current Caveats

- Pathfinding uses a small hardcoded navigation graph, not a full navmesh.
- The player does not have health/death flow beyond a hit flash from enemy projectiles.
- The precision archetype exists as a behavior branch but currently delegates to shooter behavior.

## Related Files

- `enemy.js`
- `game.js`

