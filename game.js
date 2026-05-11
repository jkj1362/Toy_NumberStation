const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// x, y = center of character; angle = 0 means facing up
const player = { x: 400, y: 300, speed: 4, angle: 0, targetAngle: 0 };
const keys = {};
const projectiles = [];
let rtWasPressed = false;

const INITIAL_ENEMIES = [
  { x: 200, y: 150, angle: 0 },
  { x: 620, y: 200, angle: 0 },
  { x: 400, y: 460, angle: 0 },
];
let enemies = INITIAL_ENEMIES.map(e => ({ ...e }));
const ENEMY_HIT_RADIUS = 20;

const PLAYER_RADIUS = 28; // outermost extent of the character shape
const CORNERS = () => [
  { x: PLAYER_RADIUS, y: PLAYER_RADIUS },
  { x: canvas.width - PLAYER_RADIUS, y: PLAYER_RADIUS },
  { x: PLAYER_RADIUS, y: canvas.height - PLAYER_RADIUS },
  { x: canvas.width - PLAYER_RADIUS, y: canvas.height - PLAYER_RADIUS },
];

function reset() {
  const corners = CORNERS();
  const corner = corners[Math.floor(Math.random() * corners.length)];
  player.x = corner.x;
  player.y = corner.y;
  player.angle = 0;
  player.targetAngle = 0;
  projectiles.length = 0;
  enemies = INITIAL_ENEMIES.map(e => ({ ...e }));
}

let bWasPressed = false;

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

function update() {
  const gp = navigator.getGamepads?.()[0] ?? null;

  // WASD
  if (keys['a']) player.x -= player.speed;
  if (keys['d']) player.x += player.speed;
  if (keys['w']) player.y -= player.speed;
  if (keys['s']) player.y += player.speed;

  // L-stick movement (axes 0, 1)
  const left = readStick(gp, 0, 1);
  player.x += left.x * player.speed;
  player.y += left.y * player.speed;

  // Clamp player inside canvas
  player.x = Math.max(PLAYER_RADIUS, Math.min(canvas.width  - PLAYER_RADIUS, player.x));
  player.y = Math.max(PLAYER_RADIUS, Math.min(canvas.height - PLAYER_RADIUS, player.y));

  // R-stick rotation (axes 2, 3) — updates target, angle lerps toward it
  const right = readStick(gp, 2, 3);
  if (right.x !== 0 || right.y !== 0) {
    player.targetAngle = Math.atan2(right.x, -right.y);
  }
  player.angle = lerpAngle(player.angle, player.targetAngle, 0.18);

  // RT (button 7) — fire projectile on press (not hold)
  const rtPressed = gp?.buttons[7]?.pressed ?? false;
  if (rtPressed && !rtWasPressed) {
    const dx = Math.sin(player.angle);
    const dy = -Math.cos(player.angle);
    projectiles.push({
      x: player.x + dx * 20,
      y: player.y + dy * 20,
      vx: dx * 25,
      vy: dy * 25,
      angle: player.angle,
    });
  }
  rtWasPressed = rtPressed;

  // B button (button 1) — reset
  const bPressed = gp?.buttons[1]?.pressed ?? false;
  if (bPressed && !bWasPressed) reset();
  bWasPressed = bPressed;

  // Move, collide, and cull projectiles
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.x += p.vx;
    p.y += p.vy;

    let hit = false;
    for (let j = enemies.length - 1; j >= 0; j--) {
      const e = enemies[j];
      const dx = p.x - e.x;
      const dy = p.y - e.y;
      if (dx * dx + dy * dy <= ENEMY_HIT_RADIUS * ENEMY_HIT_RADIUS) {
        enemies.splice(j, 1);
        hit = true;
        break;
      }
    }

    if (hit || p.x < 0 || p.x > canvas.width || p.y < 0 || p.y > canvas.height) {
      projectiles.splice(i, 1);
    }
  }
}

function drawPlayer() {
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.angle);

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

function drawEnemy(e) {
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.rotate(e.angle);

  ctx.fillStyle = '#d43a3a';
  ctx.beginPath();
  ctx.arc(-18, 0, 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(18, 0, 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f55a5a';
  ctx.beginPath();
  ctx.arc(0, 0, 16, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(0, -28);
  ctx.lineTo(-7, -18);
  ctx.lineTo(7, -18);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawProjectiles() {
  ctx.strokeStyle = '#ffe066';
  ctx.lineWidth = 2;
  for (const p of projectiles) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(0, 8);
    ctx.stroke();
    ctx.restore();
  }
}

const fogCanvas = document.createElement('canvas');
const fogCtx = fogCanvas.getContext('2d');

function drawFog() {
  const PROXIMITY_RADIUS = 50;
  // Diagonal covers the entire canvas from any player position
  const VISION_RADIUS = Math.hypot(canvas.width, canvas.height);

  if (fogCanvas.width !== canvas.width || fogCanvas.height !== canvas.height) {
    fogCanvas.width = canvas.width;
    fogCanvas.height = canvas.height;
  }

  // Fill fog layer solid dark
  fogCtx.clearRect(0, 0, fogCanvas.width, fogCanvas.height);
  fogCtx.fillStyle = 'rgba(0, 0, 0, 0.82)';
  fogCtx.fillRect(0, 0, fogCanvas.width, fogCanvas.height);

  // Cut out visible areas by erasing from the fog layer
  fogCtx.globalCompositeOperation = 'destination-out';

  // Front semicircle (full canvas reach)
  fogCtx.beginPath();
  fogCtx.moveTo(player.x, player.y);
  fogCtx.arc(player.x, player.y, VISION_RADIUS, player.angle - Math.PI, player.angle);
  fogCtx.closePath();
  fogCtx.fill();

  // Proximity circle — always visible regardless of facing direction
  fogCtx.beginPath();
  fogCtx.arc(player.x, player.y, PROXIMITY_RADIUS, 0, Math.PI * 2);
  fogCtx.fill();

  fogCtx.globalCompositeOperation = 'source-over';

  ctx.drawImage(fogCanvas, 0, 0);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const e of enemies) drawEnemy(e);
  drawProjectiles();
  drawPlayer();
  drawFog();
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();
