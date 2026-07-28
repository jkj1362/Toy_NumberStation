# Live Feature 02 - Lighting

**Live status: Implemented, with final light-spill tuning pending.**

Lighting is a darkness-overlay system with ambient zones, wall lamps, physical window apertures, door apertures, player glow, cached static light, transient muzzle-flash lights, and dynamic viewport compositing.

## Current Behavior

- Global ambient light is `0.0`; authored ambient zones add low-level spill in selected areas.
- Twelve wall lamps provide warm radial light and can be shot off. Swept projectile collision prevents fast bullets from skipping fixtures or losing the hit to the supporting wall.
- Ordinary visual evidence and actor detection require sufficient illumination at the observed point in addition to cone/range and clear line of sight.
- Every player or enemy shot emits a visible, short-lived `360` degree muzzle-flash light. It uses the same wall, closed-door, and aperture clipping as other world light and can briefly illuminate nearby actors or evidence.
- A guard may see a muzzle flash in otherwise complete darkness because the flash illuminates itself, but the muzzle must still be inside the guard's cone/range with clear line of sight.
- A lamp broken in a guard's cone/range with line of sight is immediate `lamp-impact` alert evidence. The destruction instant is self-illuminating because the lamp was active when struck.
- A guard that later encounters an already broken fixture may recognize the absence of the expected active light even in darkness. This enters `broken-lamp` suspicion and performs a local investigation.
- The two exterior apertures have physical glass windows. Intact glass blocks movement but remains transparent to sight and aperture light; opening or destroying the window removes its blocker.
- Exterior window light is weather-gated through `setExternalWeatherState()`. Clear moonlit conditions provide light; rain or zero moonlight disables it. This is the current integration boundary for the future weather system.
- Door apertures are closed by default and open while the linked door is open, opening, closing, or destroyed as appropriate to its animated aperture state.
- Static light is cached at reduced resolution and invalidated when lamps, windows, or doors change.
- Player glow affects player visibility/fog feeling, but enemy sight checks use lamp/static light rather than player glow.
- Lighting uses current ray blockers: a closed door blocks the aperture, while an intact swung door panel still occludes rays along its rotated geometry.

## Current Caveats

- Door and window aperture spill are first-pass readable effects and still need visual tuning.
- Muzzle-flash radius, intensity, falloff, and four-frame default lifetime are first-pass values and remain tunable.
- Weather has only the external-light state boundary; a complete weather simulation does not exist yet.
- Lighting sources use max composition, so overlapping lights do not accumulate into brighter hotspots.
- There is no colored-light gameplay beyond current visual color choices.

## Related Files

- `lighting.js`
- `game.js`
- `enemy.js`
