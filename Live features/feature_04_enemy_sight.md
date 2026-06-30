# Live Feature 04 - Enemy Sight Detection

**Live status: Implemented.**

Enemy sight is based on a field-of-view cone, line-of-sight raycast, and lamp/static-light threshold sampled on the player's body.

## Current Behavior

- Enemies use a 120-degree standard vision cone.
- Enemy sight range is currently infinite for authored enemies, limited practically by line-of-sight and map blockers.
- Enemy sight requires at least one player-body sample to be in sufficiently bright non-player lighting.
- Open-door light spill contributes to the same static-light threshold used by enemy sight.
- Line of sight uses current ray blockers, including walls, closed doors, and open door panels.
- Detection samples the player center and four nearby body points so visibly lit edges of the player can still be detected.
- If an enemy directly sees the player outside suspicion, it enters alert.
- If an enemy sees the player while suspicious, it confirms into alert after a short delay.
- Proximity detection exists as a separate awareness bubble.

## Current Caveats

- There is no stealth posture or cover system beyond light, LOS, proximity, and sound.
- Enemy cones are visible debug/clarity elements in the current prototype.
- Player self-glow is intentionally excluded from enemy visibility checks.

## Related Files

- `enemy.js`
- `lighting.js`
- `game.js`

