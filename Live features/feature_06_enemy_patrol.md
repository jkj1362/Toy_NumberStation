# Live Feature 06 - Enemy Patrol

**Live status: Implemented.**

The prototype currently has three authored enemies with static and waypoint patrol behavior.

## Current Behavior

- Enemy 1 is a static upper-room melee sentry.
- Enemy 2 is a melee enemy patrolling between two lobby/center points.
- Enemy 3 is a shooter that patrols from Room A through the corridor to Room B/C and back.
- Patrol nodes can pause and sweep the enemy's facing direction.
- Patrol movement uses scaled coordinates and simple waypoint following.
- Patrol movement checks dynamic movement blockers.
- Enemies can auto-open nearby closed doors while moving along patrol/search paths.
- Moving enemies create visual footstep rings.

## Current Caveats

- Patrols are hardcoded in `enemy.js`.
- Enemy auto-door behavior is functional first pass and needs feel tuning.
- There is no route editor, schedule system, or investigation communication between enemies.

## Related Files

- `enemy.js`
- `game.js`

