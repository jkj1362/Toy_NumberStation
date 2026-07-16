# Feature 14 - Geometry Ballistics, Penetration, and Impact Events

**Status: Partially implemented.**

Player and enemy projectiles now use the same swept collision resolver. Collision is evaluated over each projectile's full frame movement, so fast projectiles cannot skip actors, closed doors, or walls merely because they cross a thin target between frames.

Each projectile has a stable shot ID, damage value, penetration power, and a set of targets already crossed. The default player and enemy bullet power is `1.0`; an unarmored body has `1.0` resistance, so a standard bullet damages the first person it hits and stops there. Raising bullet power to `2.0` in tuning is the first penetration upgrade: it passes through one unarmored person and stops in the second.

Walls are explicit unconditional blockers. Current doors use a thin destructible panel, distinct from a future thicker non-destructible metal door. An intact door is penetrable whether closed, open, opening, or closing: a bullet consumes the tunable door penetration resistance, applies the separate tunable door-damage amount, and leaves a persistent hole that moves with the panel. Penetrating a door does not destroy it; accumulated door damage must reduce its HP to zero. Doors interpolate their swing and open away from the actor interacting with them, so the actor pushes the panel open. A projectile impact event is recorded once for every geometry collision and emits a quieter player-facing impact sound: `220` design units by default versus the muzzle report's `350`. These impact sounds are deliberately not yet consumed by AI; Feature 13's heard/witnessed impact reactions remain pending.

The door HP debug bar follows intact open and closed panels. Wall, door, and lamp collisions emit projectile-impact sound events with the shot ID preserved. Projectile-impact radius rings remain visible for collision feedback, while the general Sound source rings debug overlay stays off by default so unrelated sound events do not clutter the screen.

Physical window hitboxes/destruction, armor coverage, and Feature 13 impact reactions are not implemented yet.
