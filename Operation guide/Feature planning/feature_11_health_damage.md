# Feature 11 - Health, Damage, Death, and Corpses

## Purpose

Add a concrete combat consequence and failure state for the night mission while keeping the system simple enough to tune before the later aim/lock-on/fire redesign.

## Current Pass Scope

- Player max HP is `100`.
- Enemy max HP is `100`; player and enemy HP should work by the same basic rules.
- Player projectile damage is `100`, so an unarmored standard enemy dies from one player shot.
- Enemy projectile damage is `50`.
- Enemy melee damage is `25`.
- Enemy melee attacks use a short cooldown so contact does not drain HP every frame.
- Player damage triggers the red hit flash.
- Damaged living enemies show a small health bar and briefly flash white when hit.
- Enemies at `0` HP die and leave a dimmed corpse on the ground.
- Enemy corpses are non-colliding and do not block player or enemy passage.
- Enemy corpses keep an overlap/interact radius so later loot/body-search interaction can reuse the normal interaction flow.
- Player death at `0` HP leaves a dimmed player corpse.
- Player death shows the game-over UI.
- Reset input must still work from game over.

## Runtime Shape

Player state:

```javascript
player.health = 100;
player.maxHealth = 100;
player.alive = true;
```

Enemy state:

```javascript
enemy.health = 100;
enemy.maxHealth = 100;
enemy.alive = true;
enemy.hitFlashTimer = 0;
enemy.meleeCooldownTimer = 0;
```

Corpse state:

```javascript
{
  type: 'enemy' | 'player',
  x,
  y,
  angle,
  archetype,
  radius,
  interactRadius,
  interactable: true,
  looted: false,
}
```

Corpse overlap should be distance-based only. Corpses must not be added to movement blockers.

## Ownership

- `player.js` owns player max HP, current HP, alive state, player projectile damage, and `damagePlayer(amount, options)`.
- `enemy.js` owns enemy max HP, current HP, hit feedback, enemy projectile damage, melee damage, melee cooldown, and `damageEnemy(enemy, amount)`.
- `game.js` owns corpse storage, corpse drawing, corpse creation on death, `gameover` phase, game-over UI, and reset-from-game-over behavior.

## Deferred Armor Plan

Armor should not be implemented as part of this Feature 11 pass. It should become its own later feature doc, likely **Feature 12 - Armor and Damage Mitigation**, or part of a broader equipment/loadout feature if armor is selected before mission entry.

Planned armor model:

```javascript
player.armor = {
  maxIntegrity: 20,
  integrity: 20,
  projectileDefense: 0.4,
  projectileIntegrityDamageScale: 0.1,
  blocksMelee: false,
};
```

Projectile damage routing:

```javascript
if (damageType === 'projectile' && player.armor.integrity > 0) {
  player.armor.integrity -= incomingDamage * 0.1;
  player.health -= incomingDamage * (1 - player.armor.projectileDefense);
} else {
  player.health -= incomingDamage;
}
```

Example: an enemy projectile deals `50`; armor integrity is `20`; armor defense is `0.4`. The armor takes `5` integrity damage and the player takes `30` HP damage.

Armor at `0` integrity is destroyed and no longer reduces projectile damage. Melee damage ignores armor and applies full damage directly to player HP.

Important note for the later feature: armor should be displayed as its own integrity bar, not added into the player HP bar. `100` player HP plus `20` armor integrity is not `120` HP.

## Future Extensions

- Healing, armor, stagger, bleed, revives, critical hits, corpse loot, body hiding, and campaign consequences.
- Weapon-specific damage tuning beyond the current single player projectile and current enemy attacks.
- Integration with the future aim/lock-on/fire system.
- Moving hardcoded damage and HP values into the gameplay tuner.
