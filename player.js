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

const PLAYER_RADIUS = scalePlayerUnit(28); // outermost extent of the character shape
const VISION_ANGLE = Math.PI * 2 / 3; // 120 deg total field of view (tune between PI/2 and 5PI/6 for 90-150 deg)
const PLAYER_GLOW_RADIUS = scalePlayerUnit(80);
const PLAYER_PROXIMITY_RADIUS = scalePlayerUnit(50);

// x, y = center of character; angle = 0 means facing up
const player = {
  x: PLAYER_START.x,
  y: PLAYER_START.y,
  speed: PLAYER_WALK_SPEED,
  noiseScale: PLAYER_WALK_NOISE_SCALE,
  movementMode: 'walk',
  sprintActive: false,
  hardAim: false,
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

function resetPlayer() {
  player.x = PLAYER_START.x;
  player.y = PLAYER_START.y;
  player.speed = PLAYER_WALK_SPEED;
  player.noiseScale = PLAYER_WALK_NOISE_SCALE;
  player.movementMode = 'walk';
  player.sprintActive = false;
  player.hardAim = false;
  player.angle = 0;
  player.targetAngle = 0;
}

function updatePlayer(playerInput, activeProjectiles) {
  const prevX = player.x, prevY = player.y;
  const hardAim = playerInput.hardAimHeld === true;
  const forcedSneak = hardAim || playerInput.sneakActive === true;
  player.hardAim = hardAim;

  // Controller A toggles sprint; keyboard Shift is a hold sprint from input.js.
  if (!forcedSneak && playerInput.sprintPressed) player.sprintActive = !player.sprintActive;
  if (forcedSneak) player.sprintActive = false;

  player.speed = forcedSneak ? PLAYER_SNEAK_SPEED : PLAYER_WALK_SPEED;
  player.noiseScale = forcedSneak ? PLAYER_SNEAK_NOISE_SCALE : PLAYER_WALK_NOISE_SCALE;
  player.movementMode = forcedSneak ? 'sneak' : 'walk';

  if (playerInput.moveAmount > 0) {
    const sprinting = !forcedSneak && (playerInput.sprintHeld || player.sprintActive);

    if (forcedSneak) {
      player.speed = PLAYER_SNEAK_SPEED;
      player.noiseScale = PLAYER_SNEAK_NOISE_SCALE;
      player.movementMode = 'sneak';
    } else if (sprinting) {
      player.speed = PLAYER_SPRINT_SPEED;
      player.noiseScale = PLAYER_SPRINT_NOISE_SCALE;
      player.movementMode = 'sprint';
    } else if (playerInput.moveIsAnalog) {
      player.speed = lerp(PLAYER_SNEAK_SPEED, PLAYER_WALK_SPEED, playerInput.moveAmount);
      player.noiseScale = lerp(PLAYER_SNEAK_NOISE_SCALE, PLAYER_WALK_NOISE_SCALE, playerInput.moveAmount);
      player.movementMode = playerInput.moveAmount >= WALK_MODE_STICK_THRESHOLD ? 'walk' : 'sneak';
    } else {
      player.speed = PLAYER_WALK_SPEED;
      player.noiseScale = PLAYER_WALK_NOISE_SCALE;
      player.movementMode = 'walk';
    }

    player.x += playerInput.moveX * player.speed;
    player.y += playerInput.moveY * player.speed;
  } else {
    player.sprintActive = false;
  }

  // Wall collision (run twice to resolve corner cases)
  pushOutOfWalls(player, PLAYER_RADIUS);
  pushOutOfWalls(player, PLAYER_RADIUS);
  // Canvas bounds fallback
  player.x = Math.max(PLAYER_RADIUS, Math.min(GAME_WIDTH  - PLAYER_RADIUS, player.x));
  player.y = Math.max(PLAYER_RADIUS, Math.min(GAME_HEIGHT - PLAYER_RADIUS, player.y));

  if (player.x !== prevX || player.y !== prevY) notifyPlayerMoved();

  if (playerInput.aimActive) player.targetAngle = playerInput.aimAngle;
  player.angle = lerpAngle(player.angle, player.targetAngle, 0.18);

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
    emitSound(player.x, player.y, GUNSHOT_RADIUS, true);
  }
}

function drawPlayer() {
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
