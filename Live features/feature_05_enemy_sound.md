# Live Feature 05 - Enemy Sound Detection

**Live status: Implemented, without wall/door sound occlusion.**

Sound is currently event-radius based. Footsteps, gunshots, door interaction, and door destruction can create sound events that enemies react to.

## Current Behavior

- Player footsteps emit periodic sound events while moving.
- Footstep radius scales with the player's current noise scale.
- Gunshots emit a larger sound event.
- If an enemy directly observes a gunshot/muzzle event in its cone and line of sight, it alerts immediately.
- First sound stimulus from patrol usually creates suspicion.
- A second sound while suspicious can confirm into alert.
- Enemies already searching, returning, or cautious can snap back to alert from sound.
- Sound rings are drawn as visual feedback.
- Opening or closing a door emits a modest sound event.
- Destroying a door emits a louder sound event.

## Current Caveats

- Sound does not attenuate through walls or closed doors yet.
- Enemy footstep rings are visual only and do not alert other enemies.
- Door data includes `soundTransmission`, but acoustic propagation does not use it yet.

## Related Files

- `enemy.js`
- `player.js`
- `game.js`

