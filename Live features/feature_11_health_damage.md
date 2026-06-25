# Live Feature 11 - Health, Damage, Death, and Corpses

**Live status: First pass implemented.**

Player and enemies now use explicit HP, combat damage, death state, corpses, and a game-over flow.

## Current Behavior

- The player starts each reset with `100` HP.
- Living enemies start with `100` HP.
- Player projectiles deal `100` enemy damage, so an unarmored standard enemy dies from one player shot.
- Enemy projectiles deal `50` player damage.
- Melee enemies deal `25` player damage when they reach the player, with a short attack cooldown.
- Player damage triggers the red hit flash.
- Damaged living enemies show a small health bar and briefly flash white when hit.
- Enemies at `0` HP are removed from the living enemy list and leave dimmed corpses.
- Enemy corpses are non-colliding and do not block player or enemy passage.
- Enemy corpses keep interaction metadata and an overlap radius for future body-search/loot behavior.
- At `0` player HP, the player leaves a dimmed corpse and the game enters `gameover`.
- Game over freezes gameplay updates and displays a mission-failed overlay.
- Pressing keyboard `]` or gamepad `B` resets from game over.

## Current Caveats

- Corpse interaction exists only as data/overlap support; loot behavior is not implemented yet.
- There is no armor, critical hit, stagger, bleed, healing, revive, body hiding, or campaign consequence.
- Game over is a local reset flow, not a metagame consequence.
- Damage values are hardcoded and should eventually move into the gameplay tuner.
- Armor is intentionally deferred and should become a separate feature doc later.

## Related Files

- `player.js`
- `enemy.js`
- `game.js`
