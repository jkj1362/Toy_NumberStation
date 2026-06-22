# Live Feature 02 - Lighting

**Live status: Implemented, with door-light QA still pending.**

Lighting is a darkness-overlay system with ambient zones, wall lamps, window apertures, door apertures, player glow, cached static light, and dynamic viewport compositing.

## Current Behavior

- Global ambient light is `0.0`.
- Ambient zones add low-level spill in selected areas.
- Twelve wall lamps provide warm radial light and can be shot off.
- Two always-open exterior window apertures add moonlight into Room A and Room B/C.
- Door apertures are closed by default and open when the linked door is open or destroyed.
- Static light is cached at reduced resolution and invalidated when lamps or doors change.
- Player glow affects player visibility/fog feeling, but enemy sight checks use lamp/static light rather than the player glow.
- Lighting uses current ray blockers, so closed doors block light and open door panels still occlude rays.

## Current Caveats

- Door aperture spill is a first-pass readable effect and still needs visual tuning.
- Lighting sources use max composition, so overlapping lights do not accumulate into brighter hotspots.
- There is no colored-light gameplay beyond current visual color choices.

## Related Files

- `lighting.js`
- `game.js`

