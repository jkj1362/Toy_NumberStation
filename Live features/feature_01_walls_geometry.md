# Live Feature 01 - Walls and Geometry

**Live status: Implemented.**

The facility layout is hardcoded as rectangular wall geometry authored in a `1100 x 750` design space and scaled to a `3200 x 1800` gameplay world.

## Current Behavior

- The map contains an outer perimeter, lobby/entry area, corridor, Room A, Room B/C, and Room F.
- Wall gaps exist for the bottom entry, side wall exits, corridor thresholds, and interior room connections.
- Collision uses current movement blockers instead of static walls only.
- Visibility, lighting, enemy line-of-sight, and projectile collision use dynamic ray geometry rebuilt from walls, closed doors, and open door panels.
- The player currently has map knowledge enabled, so a dim schematic wall overlay is drawn on top of the explored scene.

## Current Caveats

- Geometry is still hardcoded in `game.js`.
- There is no external level editor or mission data file.
- Door placement now occupies several wall gaps and should be considered part of the live geometry.

## Related Files

- `game.js`

