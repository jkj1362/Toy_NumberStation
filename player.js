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

const keys = {};
let rtWasPressed = false;
let sprintWasPressed = false;

window.addEventListener('keydown', e => keys[e.key] = true);
window.addEventListener('keyup', e => keys[e.key] = false);

const DEADZONE = 0.15;

function lerpAngle(current, target, t) {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * t;
}

function readStick(gp, axisX, axisY) {
  if (!gp) return { x: 0, y: 0 };
  const x = Math.abs(gp.axes[axisX]) > DEADZONE ? gp.axes[axisX] : 0;
  const y = Math.abs(gp.axes[axisY]) > DEADZONE ? gp.axes[axisY] : 0;
  return { x, y };
}

function readMoveStick(gp) {
  if (!gp) return { x: 0, y: 0, amount: 0 };
  const rawX = gp.axes[0] ?? 0;
  const rawY = gp.axes[1] ?? 0;
  const magnitude = Math.min(1, Math.hypot(rawX, rawY));
  if (magnitude <= DEADZONE) return { x: 0, y: 0, amount: 0 };
  return {
    x: rawX / magnitude,
    y: rawY / magnitude,
    amount: (magnitude - DEADZONE) / (1 - DEADZONE),
  };
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

function updatePlayer(gp, activeProjectiles, options = {}) {
  const prevX = player.x, prevY = player.y;
  const hardAim = options.hardAim === true;
  player.hardAim = hardAim;

  // Face button A toggles sprint. Sprint is intentionally gamepad-only for this pass.
  const sprintPressed = gp?.buttons[0]?.pressed ?? false;
  if (!hardAim && sprintPressed && !sprintWasPressed) player.sprintActive = !player.sprintActive;
  sprintWasPressed = sprintPressed;
  if (hardAim) player.sprintActive = false;

  player.speed = hardAim ? PLAYER_SNEAK_SPEED : PLAYER_WALK_SPEED;
  player.noiseScale = hardAim ? PLAYER_SNEAK_NOISE_SCALE : PLAYER_WALK_NOISE_SCALE;
  player.movementMode = hardAim ? 'sneak' : 'walk';

  // WASD remains a simple walking fallback.
  let keyboardX = 0, keyboardY = 0;
  if (keys['a']) keyboardX -= 1;
  if (keys['d']) keyboardX += 1;
  if (keys['w']) keyboardY -= 1;
  if (keys['s']) keyboardY += 1;
  const keyboardMagnitude = Math.hypot(keyboardX, keyboardY);
  if (keyboardMagnitude > 0) {
    const keyboardSpeed = hardAim ? PLAYER_SNEAK_SPEED : PLAYER_WALK_SPEED;
    player.x += (keyboardX / keyboardMagnitude) * keyboardSpeed;
    player.y += (keyboardY / keyboardMagnitude) * keyboardSpeed;
  }

  // L-stick controls sneak-to-walk analog movement. Stick tilt alone cannot sprint.
  const left = readMoveStick(gp);
  if (left.amount > 0) {
    if (hardAim) {
      player.speed = PLAYER_SNEAK_SPEED;
      player.noiseScale = PLAYER_SNEAK_NOISE_SCALE;
      player.movementMode = 'sneak';
    } else if (player.sprintActive) {
      player.speed = PLAYER_SPRINT_SPEED;
      player.noiseScale = PLAYER_SPRINT_NOISE_SCALE;
      player.movementMode = 'sprint';
    } else {
      player.speed = lerp(PLAYER_SNEAK_SPEED, PLAYER_WALK_SPEED, left.amount);
      player.noiseScale = lerp(PLAYER_SNEAK_NOISE_SCALE, PLAYER_WALK_NOISE_SCALE, left.amount);
      player.movementMode = left.amount >= WALK_MODE_STICK_THRESHOLD ? 'walk' : 'sneak';
    }

    player.x += left.x * player.speed;
    player.y += left.y * player.speed;
  } else if (player.sprintActive) {
    player.sprintActive = false;
  }

  // Wall collision (run twice to resolve corner cases)
  pushOutOfWalls(player, PLAYER_RADIUS);
  pushOutOfWalls(player, PLAYER_RADIUS);
  // Canvas bounds fallback
  player.x = Math.max(PLAYER_RADIUS, Math.min(GAME_WIDTH  - PLAYER_RADIUS, player.x));
  player.y = Math.max(PLAYER_RADIUS, Math.min(GAME_HEIGHT - PLAYER_RADIUS, player.y));

  if (player.x !== prevX || player.y !== prevY) notifyPlayerMoved();

  // R-stick rotation (axes 2, 3) updates target, angle lerps toward it.
  const right = readStick(gp, 2, 3);
  if (right.x !== 0 || right.y !== 0) {
    player.targetAngle = Math.atan2(right.x, -right.y);
  }
  player.angle = lerpAngle(player.angle, player.targetAngle, 0.18);

  // RT (button 7) fires projectile on press, not hold.
  const rtPressed = gp?.buttons[7]?.pressed ?? false;
  if (rtPressed && !rtWasPressed) {
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
  rtWasPressed = rtPressed;
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
