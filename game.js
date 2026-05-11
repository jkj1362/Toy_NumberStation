const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// x, y = center of character; angle = 0 means facing up
const player = { x: 400, y: 300, speed: 4, angle: 0 };
const keys = {};
const projectiles = [];
let rtWasPressed = false;

window.addEventListener('keydown', e => keys[e.key] = true);
window.addEventListener('keyup', e => keys[e.key] = false);

const DEADZONE = 0.15;

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

  // R-stick rotation (axes 2, 3) — directly sets facing direction
  const right = readStick(gp, 2, 3);
  if (right.x !== 0 || right.y !== 0) {
    // atan2(x, -y) so that stick-up → angle 0 (facing up on screen)
    player.angle = Math.atan2(right.x, -right.y);
  }

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

  // Move and cull projectiles
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.x += p.vx;
    p.y += p.vy;
    if (p.x < 0 || p.x > canvas.width || p.y < 0 || p.y > canvas.height) {
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
