const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const WALLS = [
  // Outer perimeter — entry gap x:430–570 at bottom
  { x:    0, y:   0, w: 1100, h:  18 },
  { x:    0, y: 732, w:  430, h:  18 },
  { x:  570, y: 732, w:  530, h:  18 },
  { x:    0, y:   0, w:   18, h: 750 },
  { x: 1082, y:   0, w:   18, h: 750 },
  // Corridor wall at y=440 — left gap x:220–320, right gap x:778–860
  // Center extends to x=778 (not x=760) to close corner with Room B/C divider
  { x:   18, y: 440, w:  202, h:  18 },
  { x:  320, y: 440, w:  458, h:  18 },
  { x:  860, y: 440, w:  222, h:  18 },
  // Room A (objective) east wall at x=400 — gap y:250–340
  { x:  400, y:  18, w:  18, h: 232 },
  { x:  400, y: 340, w:  18, h: 100 },
  // Room B/C divider at x=760 — gap y:160–260
  { x:  760, y:  18, w:  18, h: 142 },
  { x:  760, y: 260, w:  18, h: 180 },
  // Room F (guard) west wall at x=900 — gap y:540–640
  // x=900 is within corridor right (x=860–1082) so top connects cleanly
  { x:  900, y: 440, w:  18, h: 100 },
  { x:  900, y: 640, w:  18, h:  92 },
];

const PLAYER_START = { x: 500, y: 680 };

// x, y = center of character; angle = 0 means facing up
const player = { x: PLAYER_START.x, y: PLAYER_START.y, speed: 4, angle: 0, targetAngle: 0 };
const keys = {};
const projectiles = [];
let rtWasPressed = false;

const INITIAL_ENEMIES = [
  { x: 600, y: 600, angle: 0 },   // Lobby
  { x: 580, y: 220, angle: 0 },   // Room B (top-center)
  { x: 940, y: 590, angle: 0 },   // Room F (bottom-right)
];
let enemies = INITIAL_ENEMIES.map(e => ({ ...e }));
const ENEMY_HIT_RADIUS = 20;

const LAMP_HIT_RADIUS = 10;
// Rules: (1) at least one lamp per room, (2) same-wall lamp spacing >= radius
// Radius = 200. Same-wall gaps: top/corridor-S x-gaps are 380 & 340; lobby N gap is 300. All >= 200.
const LAMPS = [
  // Top wall — one per room section, spacing 380 / 340
  { x: 200, y:  18, wallSide: 'N', radius: 200, color: '#ffdc96', active: true },
  { x: 580, y:  18, wallSide: 'N', radius: 200, color: '#ffdc96', active: true },
  { x: 920, y:  18, wallSide: 'N', radius: 200, color: '#ffdc96', active: true },
  // Corridor wall south face — mirrors top wall, lights lower half of each room
  { x: 200, y: 440, wallSide: 'S', radius: 200, color: '#ffdc96', active: true },
  { x: 580, y: 440, wallSide: 'S', radius: 200, color: '#ffdc96', active: true },
  { x: 920, y: 440, wallSide: 'S', radius: 200, color: '#ffdc96', active: true },
  // Corridor wall south face (lobby side, y=458 = bottom edge of wall) — lights lobby from above
  { x: 350, y: 458, wallSide: 'N', radius: 200, color: '#ffdc96', active: true },
  { x: 700, y: 458, wallSide: 'N', radius: 200, color: '#ffdc96', active: true },
  // Bottom wall — lights lobby from below, flanking the entry gap (x:430–570), spacing 350
  { x: 350, y: 732, wallSide: 'S', radius: 200, color: '#ffdc96', active: true },
  { x: 700, y: 732, wallSide: 'S', radius: 200, color: '#ffdc96', active: true },
  // Entry area — left perimeter wall
  { x:  18, y: 630, wallSide: 'W', radius: 200, color: '#ffdc96', active: true },
  // Room F — right perimeter wall
  { x:1082, y: 590, wallSide: 'E', radius: 200, color: '#ffdc96', active: true },
];

const PLAYER_RADIUS = 28; // outermost extent of the character shape
const VISION_ANGLE = Math.PI * 2 / 3; // 120° total field of view (tune between PI/2 and 5PI/6 for 90°–150°)

const INTERACT_RADIUS = 30;
const EXFIL_RADIUS    = 40;

// Precomputed wall segments and corners for visibility raycasting (static — walls never move)
const WALL_SEGMENTS = (() => {
  const s = [
    { x1: 0,            y1: 0,             x2: canvas.width,  y2: 0             },
    { x1: canvas.width, y1: 0,             x2: canvas.width,  y2: canvas.height },
    { x1: canvas.width, y1: canvas.height, x2: 0,             y2: canvas.height },
    { x1: 0,            y1: canvas.height, x2: 0,             y2: 0             },
  ];
  for (const w of WALLS) {
    s.push({ x1: w.x,       y1: w.y,       x2: w.x + w.w, y2: w.y       });
    s.push({ x1: w.x + w.w, y1: w.y,       x2: w.x + w.w, y2: w.y + w.h });
    s.push({ x1: w.x + w.w, y1: w.y + w.h, x2: w.x,       y2: w.y + w.h });
    s.push({ x1: w.x,       y1: w.y + w.h, x2: w.x,       y2: w.y       });
  }
  return s;
})();

const WALL_CORNERS = (() => {
  const seen = new Set(), pts = [];
  const add = (x, y) => { const k = `${x},${y}`; if (!seen.has(k)) { seen.add(k); pts.push({ x, y }); } };
  add(0, 0); add(canvas.width, 0); add(canvas.width, canvas.height); add(0, canvas.height);
  for (const w of WALLS) {
    add(w.x, w.y); add(w.x + w.w, w.y); add(w.x + w.w, w.y + w.h); add(w.x, w.y + w.h);
  }
  return pts;
})();

// Room centers used for random pickup / exfil placement
const ROOMS = [
  { id: 'lobby',    cx: 460, cy: 590, startingSpace: true  },
  { id: 'room_a',   cx: 200, cy: 229, startingSpace: false },
  { id: 'corridor', cx: 589, cy: 229, startingSpace: false },
  { id: 'room_bc',  cx: 930, cy: 229, startingSpace: false },
  { id: 'room_f',   cx: 991, cy: 590, startingSpace: false },
];

// Mission state
let pickup       = { x: 0, y: 0, roomId: '', collected: false, visibleToPlayer: false };
let exfilPoints  = [];
let gamePhase    = 'infiltrate'; // 'infiltrate' | 'exfil' | 'complete'

function inVisionCone(wx, wy) {
  const dx = wx - player.x, dy = wy - player.y;
  if (dx === 0 && dy === 0) return true;
  const bearing = Math.atan2(dx, -dy);
  let diff = bearing - player.angle;
  while (diff >  Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return Math.abs(diff) <= VISION_ANGLE / 2;
}

function initPickup() {
  const eligible = ROOMS.filter(r => !r.startingSpace);
  const room = eligible[Math.floor(Math.random() * eligible.length)];
  pickup.x = room.cx;
  pickup.y = room.cy;
  pickup.roomId = room.id;
  pickup.collected = false;
  pickup.visibleToPlayer = false;
  return room.id;
}

function initExfil(pickupRoomId) {
  const eligible = ROOMS.filter(r => !r.startingSpace && r.id !== pickupRoomId);
  const room = eligible[Math.floor(Math.random() * eligible.length)];
  exfilPoints[0] = { x: 500, y: 741, type: 'primary',   active: false, discovered: true  };
  exfilPoints[1] = { x: room.cx, y: room.cy, type: 'secondary', active: false, discovered: false };
}

function pushOutOfWalls(entity, radius) {
  for (const wall of WALLS) {
    const left   = wall.x - radius;
    const right  = wall.x + wall.w + radius;
    const top    = wall.y - radius;
    const bottom = wall.y + wall.h + radius;
    if (entity.x > left && entity.x < right && entity.y > top && entity.y < bottom) {
      const dLeft = entity.x - left,  dRight  = right  - entity.x;
      const dTop  = entity.y - top,   dBottom = bottom - entity.y;
      const minX = Math.min(dLeft, dRight);
      const minY = Math.min(dTop,  dBottom);
      if (minX < minY) {
        entity.x += dLeft < dRight ? -dLeft : dRight;
      } else {
        entity.y += dTop  < dBottom ? -dTop  : dBottom;
      }
    }
  }
}

function hitsWall(x, y) {
  for (const wall of WALLS) {
    if (x >= wall.x && x <= wall.x + wall.w &&
        y >= wall.y && y <= wall.y + wall.h) return true;
  }
  return false;
}

function reset() {
  player.x = PLAYER_START.x;
  player.y = PLAYER_START.y;
  player.angle = 0;
  player.targetAngle = 0;
  projectiles.length = 0;
  enemies = INITIAL_ENEMIES.map(e => ({ ...e }));
  for (const lamp of LAMPS) lamp.active = true;
  gamePhase = 'infiltrate';
  initExfil(initPickup());
}

let bWasPressed = false;
let eWasPressed = false;

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

  // Wall collision (run twice to resolve corner cases)
  pushOutOfWalls(player, PLAYER_RADIUS);
  pushOutOfWalls(player, PLAYER_RADIUS);
  // Canvas bounds fallback
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

  // E key / button 0 — interact
  const ePressed = (keys['e'] ?? false) || (gp?.buttons[0]?.pressed ?? false);

  if (gamePhase === 'infiltrate' && !pickup.collected) {
    pickup.visibleToPlayer = inVisionCone(pickup.x, pickup.y);
    for (const ef of exfilPoints) {
      if (!ef.discovered && inVisionCone(ef.x, ef.y)) ef.discovered = true;
    }
    if (ePressed && !eWasPressed) {
      const dx = player.x - pickup.x, dy = player.y - pickup.y;
      if (dx * dx + dy * dy <= INTERACT_RADIUS * INTERACT_RADIUS) {
        pickup.collected = true;
        gamePhase = 'exfil';
        for (const ef of exfilPoints) { ef.active = true; ef.discovered = true; }
      }
    }
  }

  if (gamePhase === 'exfil') {
    for (const ef of exfilPoints) {
      if (!ef.active) continue;
      const dx = player.x - ef.x, dy = player.y - ef.y;
      if (dx * dx + dy * dy <= EXFIL_RADIUS * EXFIL_RADIUS) {
        gamePhase = 'complete';
        setTimeout(reset, 1500);
        break;
      }
    }
  }

  eWasPressed = ePressed;

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

    if (!hit) {
      for (const lamp of LAMPS) {
        if (!lamp.active) continue;
        const ldx = p.x - lamp.x;
        const ldy = p.y - lamp.y;
        if (ldx * ldx + ldy * ldy <= LAMP_HIT_RADIUS * LAMP_HIT_RADIUS) {
          lamp.active = false;
          hit = true;
          break;
        }
      }
    }

    if (hit || hitsWall(p.x, p.y) || p.x < 0 || p.x > canvas.width || p.y < 0 || p.y > canvas.height) {
      projectiles.splice(i, 1);
    }
  }
}

function drawFloor() {
  ctx.fillStyle = '#1e1e1e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawWalls() {
  ctx.fillStyle = '#4a4a4a';
  for (const wall of WALLS) {
    ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
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

// Cast a single ray from (px,py) at canvas angle `angle`, return nearest wall hit
function castVisRay(px, py, angle) {
  const dx = Math.cos(angle), dy = Math.sin(angle);
  let minT = Infinity;
  for (const s of WALL_SEGMENTS) {
    const ex = s.x2 - s.x1, ey = s.y2 - s.y1;
    const denom = dx * ey - dy * ex;
    if (Math.abs(denom) < 1e-10) continue;
    const t = ((s.x1 - px) * ey - (s.y1 - py) * ex) / denom;
    const u = ((s.x1 - px) * dy - (s.y1 - py) * dx) / denom;
    if (t >= 0 && u >= 0 && u <= 1 && t < minT) minT = t;
  }
  return minT === Infinity ? null : { x: px + dx * minT, y: py + dy * minT };
}

// Build a wall-occluded visibility polygon for the player's vision cone
function computeVisibilityPolygon(px, py, playerAngle) {
  const forward = playerAngle - Math.PI / 2;
  const half    = VISION_ANGLE / 2;
  const eps     = 0.0001;

  // Cone boundary rays + one ray per visible wall corner (±ε for clean edges)
  const angles = [forward - half, forward + half];
  for (const c of WALL_CORNERS) {
    const a = Math.atan2(c.y - py, c.x - px);
    let diff = a - forward;
    while (diff >  Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    if (Math.abs(diff) <= half + eps) {
      angles.push(a - eps, a, a + eps);
    }
  }
  angles.sort((a, b) => a - b);

  const pts = [];
  for (const a of angles) {
    let diff = a - forward;
    while (diff >  Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    if (Math.abs(diff) > half + eps) continue;
    const hit = castVisRay(px, py, a);
    if (hit) pts.push(hit);
  }
  return pts;
}

const fogCanvas = document.createElement('canvas');
const fogCtx = fogCanvas.getContext('2d');

const lightCanvas = document.createElement('canvas');
const lightCtx = lightCanvas.getContext('2d');

function drawFog() {
  const PROXIMITY_RADIUS = 50;

  if (fogCanvas.width !== canvas.width || fogCanvas.height !== canvas.height) {
    fogCanvas.width = canvas.width;
    fogCanvas.height = canvas.height;
  }

  fogCtx.clearRect(0, 0, fogCanvas.width, fogCanvas.height);
  fogCtx.fillStyle = 'rgba(0, 0, 0, 1)';
  fogCtx.fillRect(0, 0, fogCanvas.width, fogCanvas.height);

  fogCtx.globalCompositeOperation = 'destination-out';

  // Wall-occluded visibility polygon — rays stop at wall surfaces
  const visPts = computeVisibilityPolygon(player.x, player.y, player.angle);
  if (visPts.length >= 2) {
    fogCtx.beginPath();
    fogCtx.moveTo(player.x, player.y);
    for (const p of visPts) fogCtx.lineTo(p.x, p.y);
    fogCtx.closePath();
    fogCtx.fill();
  }

  // Proximity circle — always visible regardless of facing direction
  fogCtx.beginPath();
  fogCtx.arc(player.x, player.y, PROXIMITY_RADIUS, 0, Math.PI * 2);
  fogCtx.fill();

  fogCtx.globalCompositeOperation = 'source-over';

  ctx.drawImage(fogCanvas, 0, 0);
}

function drawLamps() {
  for (const lamp of LAMPS) {
    ctx.fillStyle = lamp.active ? lamp.color : '#444';
    ctx.beginPath();
    ctx.arc(lamp.x, lamp.y, 8, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPickup() {
  if (pickup.collected) return;
  if (pickup.visibleToPlayer) {
    // Actual shape — glowing diamond (rotated square)
    ctx.save();
    ctx.translate(pickup.x, pickup.y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#ffe066';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.fillRect(-9, -9, 18, 18);
    ctx.strokeRect(-9, -9, 18, 18);
    ctx.restore();
  } else {
    // ! hint icon — always visible through fog
    ctx.save();
    ctx.fillStyle = '#ffe066';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('!', pickup.x, pickup.y - 22);
    ctx.restore();
  }
}

function drawExfilPoints() {
  for (const ef of exfilPoints) {
    const color = ef.active ? '#44ff88' : '#888888';

    // Testing: always show secondary location as a dim circle even when undiscovered
    if (ef.type === 'secondary' && !ef.discovered) {
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ef.x, ef.y, 20, 0, Math.PI * 2);
      ctx.stroke();
      continue;
    }

    // Ground ring
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ef.x, ef.y, 20, 0, Math.PI * 2);
    ctx.stroke();

    // Down-pointing chevron
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(ef.x - 10, ef.y - 6);
    ctx.lineTo(ef.x,      ef.y + 8);
    ctx.lineTo(ef.x + 10, ef.y - 6);
    ctx.stroke();
  }
}

function drawLighting() {
  const offsets = { N: [0, 8], S: [0, -8], E: [-8, 0], W: [8, 0] };

  if (lightCanvas.width !== canvas.width || lightCanvas.height !== canvas.height) {
    lightCanvas.width = canvas.width;
    lightCanvas.height = canvas.height;
  }

  lightCtx.clearRect(0, 0, lightCanvas.width, lightCanvas.height);
  lightCtx.fillStyle = 'rgba(0, 0, 0, 1)';
  lightCtx.fillRect(0, 0, lightCanvas.width, lightCanvas.height);

  const W = lightCanvas.width, H = lightCanvas.height;
  lightCtx.globalCompositeOperation = 'destination-out';
  for (const lamp of LAMPS) {
    if (!lamp.active) continue;
    const [odx, ody] = offsets[lamp.wallSide];
    const cx = lamp.x + odx;
    const cy = lamp.y + ody;

    // Clip to the half-plane the lamp faces so light can't cross the wall it's on
    lightCtx.save();
    lightCtx.beginPath();
    if      (lamp.wallSide === 'N') lightCtx.rect(0, lamp.y, W, H);
    else if (lamp.wallSide === 'S') lightCtx.rect(0, 0,      W, lamp.y);
    else if (lamp.wallSide === 'E') lightCtx.rect(0, 0,      lamp.x, H);
    else                            lightCtx.rect(lamp.x, 0, W - lamp.x, H);
    lightCtx.clip();

    const grad = lightCtx.createRadialGradient(cx, cy, 0, cx, cy, lamp.radius);
    grad.addColorStop(0,    'rgba(255,255,255,1)');
    grad.addColorStop(0.75, 'rgba(255,255,255,1)');
    grad.addColorStop(1,    'rgba(255,255,255,0)');
    lightCtx.fillStyle = grad;
    lightCtx.beginPath();
    lightCtx.arc(cx, cy, lamp.radius, 0, Math.PI * 2);
    lightCtx.fill();
    lightCtx.restore();
  }

  // Player emits a small ambient glow — always visible as a light source
  const pg = lightCtx.createRadialGradient(player.x, player.y, 0, player.x, player.y, 80);
  pg.addColorStop(0,   'rgba(255,255,255,1)');
  pg.addColorStop(0.4, 'rgba(255,255,255,1)');
  pg.addColorStop(1,   'rgba(255,255,255,0)');
  lightCtx.fillStyle = pg;
  lightCtx.beginPath();
  lightCtx.arc(player.x, player.y, 80, 0, Math.PI * 2);
  lightCtx.fill();

  lightCtx.globalCompositeOperation = 'source-over';

  ctx.drawImage(lightCanvas, 0, 0);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawFloor();
  drawWalls();
  drawLamps();
  for (const e of enemies) drawEnemy(e);
  drawProjectiles();
  drawPlayer();
  drawLighting();
  drawFog();
  drawExfilPoints();
  drawPickup();
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

initExfil(initPickup());
loop();
