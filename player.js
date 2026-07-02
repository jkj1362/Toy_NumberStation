const PLAYER_DESIGN_WIDTH = 1100;
const PLAYER_DESIGN_HEIGHT = 750;
const PLAYER_GAME_WIDTH = 3200;
const PLAYER_GAME_HEIGHT = 1800;
const PLAYER_SCALE_X = PLAYER_GAME_WIDTH / PLAYER_DESIGN_WIDTH;
const PLAYER_SCALE_Y = PLAYER_GAME_HEIGHT / PLAYER_DESIGN_HEIGHT;
const PLAYER_SCALE_UNIT = (PLAYER_SCALE_X + PLAYER_SCALE_Y) / 2;

function scalePlayerX(x) { return x * PLAYER_SCALE_X; }
function scalePlayerY(y) { return y * PLAYER_SCALE_Y; }
function scalePlayerUnit(v) { return v * PLAYER_SCALE_UNIT; }
function scalePlayerPoint(p) {
  return { ...p, x: scalePlayerX(p.x), y: scalePlayerY(p.y) };
}

const PLAYER_START = scalePlayerPoint({ x: 500, y: 680 });

// Player movement tuning. These design-space values are intentionally centralized
// so sneak/walk/sprint feel and noise can be adjusted without touching input logic.
const PLAYER_SNEAK_SPEED = scalePlayerUnit(0.8);
const PLAYER_WALK_SPEED = scalePlayerUnit(2.25);
const PLAYER_SPRINT_SPEED = scalePlayerUnit(4);
const PLAYER_SNEAK_NOISE_SCALE = 0.45;
const PLAYER_WALK_NOISE_SCALE = 1;
const PLAYER_SPRINT_NOISE_SCALE = 1.6;
const WALK_MODE_STICK_THRESHOLD = 0.85;
const PLAYER_MAX_HEALTH = 100;
const PLAYER_PROJECTILE_DAMAGE = 100;

const PLAYER_RADIUS = scalePlayerUnit(28); // outermost extent of the character shape
const VISION_ANGLE = Math.PI * 2 / 3; // 120 deg total field of view (tune between PI/2 and 5PI/6 for 90-150 deg)
const HARD_AIM_VISION_MULTIPLIER = 0.5;
const NORMAL_AIM_TURN_EASE = 0.18;
const HARD_AIM_TURN_EASE = 0.10;
const HARD_AIM_MAGNET_ENABLED = true;
const HARD_AIM_MAGNET_ANGLE = Math.PI / 14; // about 13 degrees
const HARD_AIM_MAGNET_RANGE = scalePlayerUnit(520);
const HARD_AIM_MAGNET_STRENGTH = 0.25;
const HARD_AIM_MAGNET_RELEASE_FRAMES = 10;
const PLAYER_GLOW_RADIUS = scalePlayerUnit(80);
const PLAYER_PROXIMITY_RADIUS = scalePlayerUnit(35);

function playerTunedUnit(key, fallback) {
  return scalePlayerUnit(typeof getTuningNumber === 'function' ? getTuningNumber(key, fallback) : fallback);
}

function playerSneakSpeed() { return playerTunedUnit('playerSneakSpeed', 0.8); }
function playerWalkSpeed() { return playerTunedUnit('playerWalkSpeed', 2.25); }
function playerSprintSpeed() { return playerTunedUnit('playerSprintSpeed', 4); }
function playerSneakNoiseScale() { return typeof getTuningNumber === 'function' ? getTuningNumber('playerSneakNoiseScale', PLAYER_SNEAK_NOISE_SCALE) : PLAYER_SNEAK_NOISE_SCALE; }
function playerWalkNoiseScale() { return typeof getTuningNumber === 'function' ? getTuningNumber('playerWalkNoiseScale', PLAYER_WALK_NOISE_SCALE) : PLAYER_WALK_NOISE_SCALE; }
function playerSprintNoiseScale() { return typeof getTuningNumber === 'function' ? getTuningNumber('playerSprintNoiseScale', PLAYER_SPRINT_NOISE_SCALE) : PLAYER_SPRINT_NOISE_SCALE; }
function walkModeStickThreshold() { return typeof getTuningNumber === 'function' ? getTuningNumber('walkModeStickThreshold', WALK_MODE_STICK_THRESHOLD) : WALK_MODE_STICK_THRESHOLD; }
function playerMaxHealth() { return typeof getTuningNumber === 'function' ? getTuningNumber('playerMaxHealth', PLAYER_MAX_HEALTH) : PLAYER_MAX_HEALTH; }
function playerProjectileDamage() { return typeof getTuningNumber === 'function' ? getTuningNumber('playerProjectileDamage', PLAYER_PROJECTILE_DAMAGE) : PLAYER_PROJECTILE_DAMAGE; }
function playerRadius() { return playerTunedUnit('playerRadius', 28); }
function playerVisionAngle() { return typeof getTuningRadians === 'function' ? getTuningRadians('playerVisionAngleDegrees', 120) : VISION_ANGLE; }
function hardAimVisionMultiplier() { return typeof getTuningNumber === 'function' ? getTuningNumber('hardAimVisionMultiplier', HARD_AIM_VISION_MULTIPLIER) : HARD_AIM_VISION_MULTIPLIER; }
function hardAimMagnetEnabled() { return typeof getTuningBoolean === 'function' ? getTuningBoolean('hardAimMagnetEnabled', HARD_AIM_MAGNET_ENABLED) : HARD_AIM_MAGNET_ENABLED; }
function hardAimMagnetAngle() { return typeof getTuningRadians === 'function' ? getTuningRadians('hardAimMagnetAngleDegrees', 13) : HARD_AIM_MAGNET_ANGLE; }
function hardAimMagnetRange() { return playerTunedUnit('hardAimMagnetRange', 520); }
function hardAimMagnetStrength() { return typeof getTuningNumber === 'function' ? getTuningNumber('hardAimMagnetStrength', HARD_AIM_MAGNET_STRENGTH) : HARD_AIM_MAGNET_STRENGTH; }
function hardAimMagnetReleaseFrames() { return typeof getTuningNumber === 'function' ? getTuningNumber('hardAimMagnetReleaseFrames', HARD_AIM_MAGNET_RELEASE_FRAMES) : HARD_AIM_MAGNET_RELEASE_FRAMES; }
function playerGlowRadius() { return playerTunedUnit('playerGlowRadius', 80); }
function playerProximityRadius() { return playerTunedUnit('playerProximityRadius', 35); }

// x, y = center of character; angle = 0 means facing up
const player = {
  x: PLAYER_START.x,
  y: PLAYER_START.y,
  speed: playerWalkSpeed(),
  noiseScale: playerWalkNoiseScale(),
  movementMode: 'walk',
  maxHealth: playerMaxHealth(),
  health: playerMaxHealth(),
  alive: true,
  sprintActive: false,
  hardAim: false,
  aimAssistTarget: null,
  aimAssistReleaseTimer: 0,
  aimAssistBlend: 0,
  angle: 0,
  targetAngle: 0,
};

function lerpAngle(current, target, t) {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * t;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function angleDiff(a, b) {
  let diff = a - b;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

function resetPlayer() {
  player.x = PLAYER_START.x;
  player.y = PLAYER_START.y;
  player.speed = playerWalkSpeed();
  player.noiseScale = playerWalkNoiseScale();
  player.movementMode = 'walk';
  player.maxHealth = playerMaxHealth();
  player.health = playerMaxHealth();
  player.alive = true;
  player.sprintActive = false;
  player.hardAim = false;
  player.aimAssistTarget = null;
  player.aimAssistReleaseTimer = 0;
  player.aimAssistBlend = 0;
  player.angle = 0;
  player.targetAngle = 0;
}

function damagePlayer(amount, options = {}) {
  if (player.health <= 0 || player.alive === false) return true;
  void options;
  player.health = Math.max(0, player.health - amount);
  if (player.health <= 0) player.alive = false;
  return player.health <= 0;
}

function getPlayerVisionAngle() {
  const visionAngle = playerVisionAngle();
  return player.hardAim ? visionAngle * hardAimVisionMultiplier() : visionAngle;
}

function getHardAimAssist(aimAngle) {
  if (!hardAimMagnetEnabled() || typeof enemies === 'undefined') return { angle: null, enemy: null };

  let bestAngle = null;
  let bestEnemy = null;
  let bestScore = Infinity;

  for (const enemy of enemies) {
    if (enemy.alive === false || enemy.health <= 0) continue;

    const dx = enemy.x - player.x;
    const dy = enemy.y - player.y;
    const dist = Math.hypot(dx, dy);
    const magnetRange = hardAimMagnetRange();
    if (dist <= 0 || dist > magnetRange) continue;

    const targetAngle = Math.atan2(dx, -dy);
    const diff = Math.abs(angleDiff(targetAngle, aimAngle));
    if (diff > hardAimMagnetAngle()) continue;

    if (typeof hasLOS === 'function' && !hasLOS(player.x, player.y, enemy.x, enemy.y)) continue;
    if (typeof isLit === 'function' && !isLit(enemy.x, enemy.y)) continue;

    const score = diff + (dist / magnetRange) * 0.08;
    if (score < bestScore) {
      bestAngle = targetAngle;
      bestEnemy = enemy;
      bestScore = score;
    }
  }

  return { angle: bestAngle, enemy: bestEnemy };
}

function updatePlayer(playerInput, activeProjectiles) {
  if (player.alive === false) return;

  const prevX = player.x, prevY = player.y;
  const hardAim = playerInput.hardAimHeld === true;
  const forcedSneak = hardAim || playerInput.sneakActive === true;
  player.hardAim = hardAim;

  // Controller A toggles sprint; keyboard Shift is a hold sprint from input.js.
  if (!forcedSneak && playerInput.sprintPressed) player.sprintActive = !player.sprintActive;
  if (forcedSneak) player.sprintActive = false;

  player.maxHealth = playerMaxHealth();
  player.health = Math.min(player.health, player.maxHealth);
  player.speed = forcedSneak ? playerSneakSpeed() : playerWalkSpeed();
  player.noiseScale = forcedSneak ? playerSneakNoiseScale() : playerWalkNoiseScale();
  player.movementMode = forcedSneak ? 'sneak' : 'walk';

  if (playerInput.moveAmount > 0) {
    const sprinting = !forcedSneak && (playerInput.sprintHeld || player.sprintActive);

    if (forcedSneak) {
      player.speed = playerSneakSpeed();
      player.noiseScale = playerSneakNoiseScale();
      player.movementMode = 'sneak';
    } else if (sprinting) {
      player.speed = playerSprintSpeed();
      player.noiseScale = playerSprintNoiseScale();
      player.movementMode = 'sprint';
    } else if (playerInput.moveIsAnalog) {
      player.speed = lerp(playerSneakSpeed(), playerWalkSpeed(), playerInput.moveAmount);
      player.noiseScale = lerp(playerSneakNoiseScale(), playerWalkNoiseScale(), playerInput.moveAmount);
      player.movementMode = playerInput.moveAmount >= walkModeStickThreshold() ? 'walk' : 'sneak';
    } else {
      player.speed = playerWalkSpeed();
      player.noiseScale = playerWalkNoiseScale();
      player.movementMode = 'walk';
    }

    player.x += playerInput.moveX * player.speed;
    player.y += playerInput.moveY * player.speed;
  } else {
    player.sprintActive = false;
  }

  // Wall collision (run twice to resolve corner cases)
  const radius = playerRadius();
  pushOutOfWalls(player, radius);
  pushOutOfWalls(player, radius);
  // Canvas bounds fallback
  player.x = Math.max(radius, Math.min(GAME_WIDTH  - radius, player.x));
  player.y = Math.max(radius, Math.min(GAME_HEIGHT - radius, player.y));

  if (player.x !== prevX || player.y !== prevY) notifyPlayerMoved();

  if (playerInput.aimActive) player.targetAngle = playerInput.aimAngle;
  if (hardAim) {
    const assist = getHardAimAssist(player.targetAngle);
    player.aimAssistTarget = assist.enemy;

    let assistBlend = 0;
    if (assist.angle !== null) {
      if (playerInput.aimAdjusting) {
        player.aimAssistReleaseTimer = hardAimMagnetReleaseFrames();
        assistBlend = 1;
      } else if (player.aimAssistReleaseTimer > 0) {
        assistBlend = player.aimAssistReleaseTimer / Math.max(1, hardAimMagnetReleaseFrames());
        player.aimAssistReleaseTimer--;
      }
    } else {
      player.aimAssistReleaseTimer = 0;
    }

    player.aimAssistBlend = assistBlend;
    if (assist.angle !== null && assistBlend > 0) {
      player.targetAngle = lerpAngle(player.targetAngle, assist.angle, hardAimMagnetStrength() * assistBlend);
    }
  } else {
    player.aimAssistTarget = null;
    player.aimAssistReleaseTimer = 0;
    player.aimAssistBlend = 0;
  }
  player.angle = lerpAngle(player.angle, player.targetAngle, hardAim ? HARD_AIM_TURN_EASE : NORMAL_AIM_TURN_EASE);

  if (playerInput.shootPressed) {
    const dx = Math.sin(player.angle);
    const dy = -Math.cos(player.angle);
    activeProjectiles.push({
      x: player.x + dx * scalePlayerUnit(20),
      y: player.y + dy * scalePlayerUnit(20),
      vx: dx * scalePlayerUnit(25),
      vy: dy * scalePlayerUnit(25),
      angle: player.angle,
    });
    emitSound({
      x: player.x,
      y: player.y,
      radius: typeof soundGunshotRadius === 'function' ? soundGunshotRadius() : GUNSHOT_RADIUS,
      isGunshot: true,
      sourceType: 'player',
      sourceActor: player,
    });
  }
}

function drawPlayer() {
  if (player.alive === false) return;

  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.angle);
  ctx.scale(scalePlayerUnit(1), scalePlayerUnit(1));

  // Shoulders (slightly behind center in local space, +y = back)
  ctx.fillStyle = '#3a8fd4';
  ctx.beginPath();
  ctx.arc(-18, 0, 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(18, 0, 10, 0, Math.PI * 2);
  ctx.fill();

  // Head (big circle)
  ctx.fillStyle = '#5ab0f5';
  ctx.beginPath();
  ctx.arc(0, 0, 16, 0, Math.PI * 2);
  ctx.fill();

  // Front direction arrow (triangle, pointing up = forward in local space)
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(0, -28);   // tip
  ctx.lineTo(-7, -18);  // base left
  ctx.lineTo(7, -18);   // base right
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}
