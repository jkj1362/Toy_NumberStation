# Live Feature 04 - Enemy Sight Detection

**Live status: Implemented.**

Enemy sight combines a field-of-view cone, line-of-sight raycast, range, and lighting at the observed point. Ordinary darkness can therefore blind guards even when geometry and facing would otherwise allow detection.

## Current Behavior

- Enemies use a 120-degree standard vision cone.
- Authored enemies currently have infinite configured sight range, limited practically by line of sight and the facility geometry.
- Direct player sight requires at least one player-body sample to be sufficiently illuminated by non-player world light.
- Detection samples the player center and four nearby body points so a lit edge of the body may be detected.
- Player self-glow is excluded from enemy visibility checks.
- Open-door, window, lamp, ambient-zone, and transient muzzle-flash light contribute through the current lighting/aperture model.
- Line of sight uses current ray blockers, including walls, closed doors, and the rotated panels of intact swung doors.
- Ordinary corpses, door/window damage, projectile impacts, and companion observation also require illumination when their feature-specific visual checks run.
- A live muzzle flash is a self-illuminating exception. A guard may directly detect the muzzle in darkness when it remains inside cone/range with clear line of sight.
- The instant an active lamp is destroyed is another self-illuminating visual exception. Later recognition of an already broken lamp is separately allowed in darkness because the missing expected light is itself the evidence.
- Ordinary direct player detection uses the normal reaction delay. A suspicious guard uses the shorter suspicious-confirm delay.
- Proximity detection exists as a separate awareness bubble and does not use the sight-cone lighting test.

## Current Caveats

- There is no stealth posture or cover system beyond light, line of sight, proximity, movement noise, and sound.
- Enemy cones are visible debug/clarity elements in the current prototype.
- The muzzle flash can illuminate actors/evidence only during its short active frames and only through aperture-reachable space.

## Related Files

- `enemy.js`
- `lighting.js`
- `game.js`
- `tuning.js`
