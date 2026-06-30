# Live Feature 05 - Enemy Sound Detection

**Live status: Implemented, with first-pass portal graph and wall/door attenuation.**

Sound is event-radius based with per-listener acoustic attenuation. Footsteps, gunshots, door interaction, and door destruction can create sound events that enemies react to.
The propagation and debug-visualization code lives in `sound.js`; enemy AI reactions remain in `enemy.js`.

## Current Behavior

- Player footsteps emit periodic sound events while moving.
- Footstep radius scales with the player's current noise scale.
- Gunshots emit a larger sound event.
- If an enemy directly observes a gunshot/muzzle event in its cone and line of sight, it alerts immediately.
- First sound stimulus from patrol usually creates suspicion.
- A second sound while suspicious can confirm into alert.
- Enemies already searching, returning, or cautious can snap back to alert from sound.
- Player-facing sound cues are drawn as visual feedback after fog/darkness.
- Clear sounds draw circular waves from the actual source only when the player hears them.
- Closed-door muffled sounds draw amber cone waves from the relevant door/portal as a proxy source.
- Wall-vague sounds draw a weak blue-gray pulse near the player/perceived listener-side point.
- Enemy movement emits player-facing footstep cues from patrol, search, return, and chase movement.
- Enemy gunshots emit sound cues and can propagate through the same attenuation model.
- Debug mode can draw short-lived attenuation cues from source to listener.
- Debug attenuation cues are cyan for direct clear sound, green for portal clear sound, amber dashed for closed-door muffled sound, and blue-gray dotted for wall-vague sound.
- All evaluated player/world-to-enemy sound paths are drawn in debug mode; unheard/lost paths are dim red-gray and labeled `lost`.
- Opening or closing a door emits a modest sound event.
- Destroying a door emits a louder sound event.
- Sound strength is evaluated per listener instead of by raw radius alone.
- Sound evaluates a dedicated room/door portal graph and a direct wall-muffle fallback, then uses the better path.
- Walls strongly attenuate sound and make the perceived source vague.
- Closed doors leak sound at reduced strength using `door.soundTransmission`, currently `0.8`.
- Open and destroyed doors transmit sound like open passages.
- Player, enemy, door, and future impact sounds share the same event/emitter shape. Enemy footsteps use the shared player-facing cue path, but remain non-alerting for enemy-to-enemy AI reactions.

## Current Caveats

- The portal graph is authored for the current hardcoded facility and uses nearest-room attachment, not full geometric acoustic simulation.
- Wall-muffled localization uses a simple nearby perceived source along the incoming direction.
- Enemy footsteps can create player-facing sound cues, but do not alert other enemies.
- Enemy footstep cue radius is tuned separately from slow patrol speed so guards can be heard through nearby doors/open passages.
- True-source sound rings are now source-debug only and are off by default.
- Attenuation path cues are a temporary debug/readability layer and should eventually be controlled by the gameplay tuner/debug panel.

## Related Files

- `sound.js`
- `enemy.js`
- `player.js`
- `game.js`

