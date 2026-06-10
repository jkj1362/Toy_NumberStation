const canvas = document.getElementById('game');
const screenCtx = canvas.getContext('2d');

const DESIGN_WIDTH = 1100;
const DESIGN_HEIGHT = 750;
const GAME_WIDTH = 3200;
const GAME_HEIGHT = 1800;
const GAME_SCALE_X = GAME_WIDTH / DESIGN_WIDTH;
const GAME_SCALE_Y = GAME_HEIGHT / DESIGN_HEIGHT;
const GAME_SCALE_UNIT = (GAME_SCALE_X + GAME_SCALE_Y) / 2;
const VIEWPORT_WIDTH = canvas.width;
const VIEWPORT_HEIGHT = canvas.height;
const GAME_SCALE = Math.min(canvas.width / VIEWPORT_WIDTH, canvas.height / VIEWPORT_HEIGHT);
const GAME_OFFSET_X = (canvas.width - VIEWPORT_WIDTH * GAME_SCALE) / 2;
const GAME_OFFSET_Y = (canvas.height - VIEWPORT_HEIGHT * GAME_SCALE) / 2;

const gameCanvas = document.createElement('canvas');
gameCanvas.width = VIEWPORT_WIDTH;
gameCanvas.height = VIEWPORT_HEIGHT;
const ctx = gameCanvas.getContext('2d');

function scaleGameX(x) { return x * GAME_SCALE_X; }
function scaleGameY(y) { return y * GAME_SCALE_Y; }
function scaleGameUnit(v) { return v * GAME_SCALE_UNIT; }
function scaleGameRect(r) {
  return { x: scaleGameX(r.x), y: scaleGameY(r.y), w: scaleGameX(r.w), h: scaleGameY(r.h) };
}
function scaleGamePoint(p) {
  return { ...p, x: scaleGameX(p.x), y: scaleGameY(p.y) };
}

const WALLS = [
  // Outer perimeter — entry gap x:430–570 at bottom
  { x:    0, y:   0, w: 1100, h:  18 },
  { x:    0, y: 732, w:  430, h:  18 },
  { x:  570, y: 732, w:  530, h:  18 },
  { x:    0, y:   0, w:   18, h: 160 }, // left perimeter — gap y:160–220 (duct, Room A)
  { x:    0, y: 220, w:   18, h: 530 },
  { x: 1082, y:   0, w:   18, h: 160 }, // right perimeter — gap y:160–220 (duct, Room B/C)
  { x: 1082, y: 220, w:   18, h: 530 },
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
].map(scaleGameRect);

const projectiles = [];

const CAM_DEADZONE_W = VIEWPORT_WIDTH * 0.35;
const CAM_DEADZONE_H = VIEWPORT_HEIGHT * 0.35;
const CAM_HARDAIM_DIST = Math.max(VIEWPORT_WIDTH, VIEWPORT_HEIGHT);
const CAM_CORNER_PADDING = scaleGameUnit(48);
const CAM_EASE = 0.18;
const CAM_HARDAIM_EASE = 0.16;
const CAMERA_MAX_X = Math.max(0, GAME_WIDTH - VIEWPORT_WIDTH);
const CAMERA_MAX_Y = Math.max(0, GAME_HEIGHT - VIEWPORT_HEIGHT);

const camera = {
  x: 0,
  y: 0,
  lookAheadX: 0,
  lookAheadY: 0,
};


const LAMP_HIT_RADIUS = scaleGameUnit(10);
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
].map(lamp => ({ ...scaleGamePoint(lamp), radius: scaleGameUnit(lamp.radius) }));

// Wall duct/window exits — manually activated bonus exfil points
const WALL_GAP_EXITS = [
  { x:    9, y: 190, roomId: 'room_a',  activated: false }, // left perimeter duct, Room A
  { x: 1091, y: 190, roomId: 'room_bc', activated: false }, // right perimeter duct, Room B/C
].map(scaleGamePoint);
let gapExits = WALL_GAP_EXITS.map(g => ({ ...g }));

const INTERACT_RADIUS = scaleGameUnit(30);
const EXFIL_RADIUS    = scaleGameUnit(40);
const LAMP_OFFSETS = {
  N: [0, scaleGameY(8)],
  S: [0, -scaleGameY(8)],
  E: [-scaleGameX(8), 0],
  W: [scaleGameX(8), 0],
};

// Precomputed wall segments and corners for visibility raycasting (static — walls never move)
const WALL_SEGMENTS = (() => {
  const s = [
    { x1: 0,          y1: 0,           x2: GAME_WIDTH, y2: 0           },
    { x1: GAME_WIDTH, y1: 0,           x2: GAME_WIDTH, y2: GAME_HEIGHT },
    { x1: GAME_WIDTH, y1: GAME_HEIGHT, x2: 0,          y2: GAME_HEIGHT },
    { x1: 0,          y1: GAME_HEIGHT, x2: 0,          y2: 0           },
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
  add(0, 0); add(GAME_WIDTH, 0); add(GAME_WIDTH, GAME_HEIGHT); add(0, GAME_HEIGHT);
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
].map(room => ({ ...room, cx: scaleGameX(room.cx), cy: scaleGameY(room.cy) }));

// Mission state
let pickup          = { x: 0, y: 0, roomId: '', collected: false, visibleToPlayer: false };
let exfilPoints     = [];
let gamePhase       = 'infiltrate'; // 'infiltrate' | 'exfil' | 'complete'
let hasMapKnowledge = true;         // true = player acquired facility map during day phase

function inVisionCone(wx, wy) {
  const dx = wx - player.x, dy = wy - player.y;
  if (dx === 0 && dy === 0) return true;
  const bearing = Math.atan2(dx, -dy);
  let diff = bearing - player.angle;
  while (diff >  Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return Math.abs(diff) <= VISION_ANGLE / 2;
}

function isLit(wx, wy) {
  // Player's own ambient glow
  const pdx = wx - player.x, pdy = wy - player.y;
  if (pdx * pdx + pdy * pdy <= PLAYER_GLOW_RADIUS * PLAYER_GLOW_RADIUS) return true;
  // Active lamp coverage
  for (const lamp of LAMPS) {
    if (!lamp.active) continue;
    const [odx, ody] = LAMP_OFFSETS[lamp.wallSide];
    const dx = wx - (lamp.x + odx), dy = wy - (lamp.y + ody);
    if (dx * dx + dy * dy <= lamp.radius * lamp.radius) return true;
  }
  return false;
}

// Lamp-only variant — excludes the player's self-glow. Used by enemy detection so
// the player's ambient light doesn't make them permanently visible to guards.
function isLitByLamps(wx, wy) {
  for (const lamp of LAMPS) {
    if (!lamp.active) continue;
    // Half-plane clip — mirrors the rect clip in drawLighting so detection matches visuals
    if (lamp.wallSide === 'N' && wy < lamp.y - scaleGameY(18)) continue; // N lamp lights downward only
    if (lamp.wallSide === 'S' && wy > lamp.y + scaleGameY(18)) continue; // S lamp lights upward only
    if (lamp.wallSide === 'E' && wx > lamp.x + scaleGameX(18)) continue; // E lamp lights leftward only
    if (lamp.wallSide === 'W' && wx < lamp.x - scaleGameX(18)) continue; // W lamp lights rightward only
    const [odx, ody] = LAMP_OFFSETS[lamp.wallSide];
    const dx = wx - (lamp.x + odx), dy = wy - (lamp.y + ody);
    if (dx * dx + dy * dy <= lamp.radius * lamp.radius) return true;
  }
  return false;
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

function initExfil() {
  exfilPoints.length = 0;
  exfilPoints.push(scaleGamePoint({ x: 500, y: 741, type: 'primary', active: false, discovered: true }));
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

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function isHardAimHeld(gp) {
  const leftTrigger = gp?.buttons[6];
  const triggerValue = leftTrigger?.value ?? (leftTrigger?.pressed ? 1 : 0);
  return triggerValue > 0.5 || (keys['Shift'] ?? false);
}

function getHardAimLookAhead() {
  const dx = Math.sin(player.angle);
  const dy = -Math.cos(player.angle);
  const maxX = Math.abs(dx) > 0.001 ? (VIEWPORT_WIDTH / 2 - CAM_CORNER_PADDING) / Math.abs(dx) : Infinity;
  const maxY = Math.abs(dy) > 0.001 ? (VIEWPORT_HEIGHT / 2 - CAM_CORNER_PADDING) / Math.abs(dy) : Infinity;
  const dist = Math.max(0, Math.min(CAM_HARDAIM_DIST, maxX, maxY));
  return { x: dx * dist, y: dy * dist };
}

function resetCamera() {
  camera.x = clamp(player.x - VIEWPORT_WIDTH / 2, 0, CAMERA_MAX_X);
  camera.y = clamp(player.y - VIEWPORT_HEIGHT / 2, 0, CAMERA_MAX_Y);
  camera.lookAheadX = 0;
  camera.lookAheadY = 0;
}

function updateCamera(hardAimHeld) {
  const hardAimTarget = hardAimHeld ? getHardAimLookAhead() : { x: 0, y: 0 };
  camera.lookAheadX = lerp(camera.lookAheadX, hardAimTarget.x, CAM_HARDAIM_EASE);
  camera.lookAheadY = lerp(camera.lookAheadY, hardAimTarget.y, CAM_HARDAIM_EASE);

  const usingLookAhead = hardAimHeld || Math.hypot(camera.lookAheadX, camera.lookAheadY) > 0.5;
  let targetX;
  let targetY;

  if (usingLookAhead) {
    targetX = player.x + camera.lookAheadX - VIEWPORT_WIDTH / 2;
    targetY = player.y + camera.lookAheadY - VIEWPORT_HEIGHT / 2;
  } else {
    targetX = camera.x;
    targetY = camera.y;

    const deadLeft = (VIEWPORT_WIDTH - CAM_DEADZONE_W) / 2;
    const deadRight = deadLeft + CAM_DEADZONE_W;
    const deadTop = (VIEWPORT_HEIGHT - CAM_DEADZONE_H) / 2;
    const deadBottom = deadTop + CAM_DEADZONE_H;
    const screenX = player.x - camera.x;
    const screenY = player.y - camera.y;

    if (screenX < deadLeft) targetX = player.x - deadLeft;
    else if (screenX > deadRight) targetX = player.x - deadRight;

    if (screenY < deadTop) targetY = player.y - deadTop;
    else if (screenY > deadBottom) targetY = player.y - deadBottom;
  }

  targetX = clamp(targetX, 0, CAMERA_MAX_X);
  targetY = clamp(targetY, 0, CAMERA_MAX_Y);
  camera.x = lerp(camera.x, targetX, CAM_EASE);
  camera.y = lerp(camera.y, targetY, CAM_EASE);
}

function reset() {
  resetPlayer();
  resetCamera();
  projectiles.length = 0;
  resetEnemies();
  for (const lamp of LAMPS) lamp.active = true;
  gamePhase = 'infiltrate';
  gapExits = WALL_GAP_EXITS.map(g => ({ ...g }));
  initPickup();
  initExfil();
}

let bWasPressed = false;
let eWasPressed = false;

function update() {
  const gp = navigator.getGamepads?.()[0] ?? null;
  const hardAimHeld = isHardAimHeld(gp);
  updatePlayer(gp, projectiles, { hardAim: hardAimHeld });
  updateCamera(hardAimHeld);

  // B button (button 1) — reset
  const bPressed = gp?.buttons[1]?.pressed ?? false;
  if (bPressed && !bWasPressed) reset();
  bWasPressed = bPressed;

  // E key / button 2 (X face button) — interact
  const ePressed = (keys['e'] ?? false) || (gp?.buttons[2]?.pressed ?? false); // button 2 = X (face left)

  if (gamePhase === 'infiltrate' && !pickup.collected) {
    pickup.visibleToPlayer = inVisionCone(pickup.x, pickup.y) && isLit(pickup.x, pickup.y);
    for (const ef of exfilPoints) {
      if (!ef.discovered && inVisionCone(ef.x, ef.y) && isLit(ef.x, ef.y)) ef.discovered = true;
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

  // Gap exit activation — any phase, must be visible and in range
  for (const gap of gapExits) {
    if (gap.activated) continue;
    if (!inVisionCone(gap.x, gap.y) || !isLit(gap.x, gap.y)) continue;
    const gdx = player.x - gap.x, gdy = player.y - gap.y;
    if (ePressed && !eWasPressed && gdx * gdx + gdy * gdy <= INTERACT_RADIUS * INTERACT_RADIUS) {
      gap.activated = true;
      exfilPoints.push({ x: gap.x, y: gap.y, type: 'gap', active: gamePhase === 'exfil', discovered: true });
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

  updateEnemies();

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

    if (hit || hitsWall(p.x, p.y) || p.x < 0 || p.x > GAME_WIDTH || p.y < 0 || p.y > GAME_HEIGHT) {
      projectiles.splice(i, 1);
    }
  }
}

function drawFloor() {
  ctx.fillStyle = '#1e1e1e';
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
}

function drawWalls() {
  ctx.fillStyle = '#4a4a4a';
  for (const wall of WALLS) {
    ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
  }
}

function drawMapGeometry() {
  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = '#6a7080'; // cool grey-blue schematic overlay — distinct from lit walls (#4a4a4a)
  for (const wall of WALLS) {
    ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
  }
  ctx.restore();
}

function drawProjectiles() {
  ctx.strokeStyle = '#ffe066';
  ctx.lineWidth = scaleGameUnit(2);
  for (const p of projectiles) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.beginPath();
    ctx.moveTo(0, -scaleGameUnit(8));
    ctx.lineTo(0, scaleGameUnit(8));
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
function computeVisibilityPolygon(px, py, playerAngle, visionAngle = VISION_ANGLE) {
  const forward = playerAngle - Math.PI / 2;
  const half    = visionAngle / 2;
  const eps     = 0.0001;

  // Cone boundary rays + one ray per visible wall corner (±ε for clean edges)
  const angles = [forward - half, forward + half];
  for (const c of WALL_CORNERS) {
    const a = Math.atan2(c.y - py, c.x - px);
    let diff = a - forward;
    while (diff >  Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    if (Math.abs(diff) <= half + eps) {
      const na = forward + diff; // unwrap to same range as boundary angles — fixes sort near ±π
      angles.push(na - eps, na, na + eps);
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
  const PROXIMITY_RADIUS = PLAYER_PROXIMITY_RADIUS;

  if (fogCanvas.width !== GAME_WIDTH || fogCanvas.height !== GAME_HEIGHT) {
    fogCanvas.width = GAME_WIDTH;
    fogCanvas.height = GAME_HEIGHT;
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
    ctx.arc(lamp.x, lamp.y, scaleGameUnit(8), 0, Math.PI * 2);
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
    ctx.scale(scaleGameUnit(1), scaleGameUnit(1));
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
    ctx.font = `bold ${scaleGameUnit(20)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('!', pickup.x, pickup.y - scaleGameUnit(22));
    ctx.restore();
  }
}

function drawGapExits() {
  for (const gap of gapExits) {
    if (!inVisionCone(gap.x, gap.y) || !isLit(gap.x, gap.y)) continue;
    if (gap.activated) continue; // activated gaps are rendered by drawExfilPoints()
    ctx.strokeStyle = '#ffe066';
    ctx.lineWidth = scaleGameUnit(2);
    ctx.beginPath();
    ctx.arc(gap.x, gap.y, scaleGameUnit(10), 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#ffe066';
    ctx.beginPath();
    ctx.moveTo(gap.x, gap.y - scaleGameUnit(5));
    ctx.lineTo(gap.x, gap.y + scaleGameUnit(5));
    ctx.stroke();
  }
}

function drawExfilPoints() {
  for (const ef of exfilPoints) {
    const color = ef.active ? '#44ff88' : '#888888';

    // Testing: always show secondary location as a dim circle even when undiscovered
    if (ef.type === 'secondary' && !ef.discovered) {
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = scaleGameUnit(2);
      ctx.beginPath();
      ctx.arc(ef.x, ef.y, scaleGameUnit(20), 0, Math.PI * 2);
      ctx.stroke();
      continue;
    }

    // Ground ring
    ctx.strokeStyle = color;
    ctx.lineWidth = scaleGameUnit(2);
    ctx.beginPath();
    ctx.arc(ef.x, ef.y, scaleGameUnit(20), 0, Math.PI * 2);
    ctx.stroke();

    // Down-pointing chevron
    ctx.strokeStyle = color;
    ctx.lineWidth = scaleGameUnit(3);
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(ef.x - scaleGameUnit(10), ef.y - scaleGameUnit(6));
    ctx.lineTo(ef.x,                     ef.y + scaleGameUnit(8));
    ctx.lineTo(ef.x + scaleGameUnit(10), ef.y - scaleGameUnit(6));
    ctx.stroke();
  }
}

function drawLighting() {
  if (lightCanvas.width !== GAME_WIDTH || lightCanvas.height !== GAME_HEIGHT) {
    lightCanvas.width = GAME_WIDTH;
    lightCanvas.height = GAME_HEIGHT;
  }

  lightCtx.clearRect(0, 0, lightCanvas.width, lightCanvas.height);
  lightCtx.fillStyle = 'rgba(0, 0, 0, 1)';
  lightCtx.fillRect(0, 0, lightCanvas.width, lightCanvas.height);

  const W = lightCanvas.width, H = lightCanvas.height;
  lightCtx.globalCompositeOperation = 'destination-out';
  for (const lamp of LAMPS) {
    if (!lamp.active) continue;
    const [odx, ody] = LAMP_OFFSETS[lamp.wallSide];
    const cx = lamp.x + odx;
    const cy = lamp.y + ody;

    // Clip to the half-plane the lamp faces so light can't cross the wall it's on
    lightCtx.save();
    lightCtx.beginPath();
    if      (lamp.wallSide === 'N') lightCtx.rect(0, lamp.y - scaleGameY(18), W, H);
    else if (lamp.wallSide === 'S') lightCtx.rect(0, 0,                         W, lamp.y + scaleGameY(18));
    else if (lamp.wallSide === 'E') lightCtx.rect(0, 0,                         lamp.x + scaleGameX(18), H);
    else                            lightCtx.rect(lamp.x - scaleGameX(18), 0,   W, H);
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
  const pg = lightCtx.createRadialGradient(player.x, player.y, 0, player.x, player.y, PLAYER_GLOW_RADIUS);
  pg.addColorStop(0,   'rgba(255,255,255,1)');
  pg.addColorStop(0.4, 'rgba(255,255,255,1)');
  pg.addColorStop(1,   'rgba(255,255,255,0)');
  lightCtx.fillStyle = pg;
  lightCtx.beginPath();
  lightCtx.arc(player.x, player.y, PLAYER_GLOW_RADIUS, 0, Math.PI * 2);
  lightCtx.fill();

  lightCtx.globalCompositeOperation = 'source-over';

  ctx.drawImage(lightCanvas, 0, 0);
}

function draw() {
  ctx.clearRect(0, 0, VIEWPORT_WIDTH, VIEWPORT_HEIGHT);

  ctx.save();
  ctx.translate(-camera.x, -camera.y);
  drawFloor();
  drawWalls();
  drawLamps();
  drawEnemies();
  drawProjectiles();
  drawPlayer();
  drawLighting();
  drawFog();
  drawSoundEvents();
  drawEnemyLabels();
  drawExfilPoints();
  drawGapExits();
  drawPickup();
  if (hasMapKnowledge) drawMapGeometry();
  ctx.restore();

  drawPlayerHitFlash();

  screenCtx.fillStyle = '#000';
  screenCtx.fillRect(0, 0, canvas.width, canvas.height);
  screenCtx.drawImage(
    gameCanvas,
    GAME_OFFSET_X,
    GAME_OFFSET_Y,
    VIEWPORT_WIDTH * GAME_SCALE,
    VIEWPORT_HEIGHT * GAME_SCALE
  );
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

resetCamera();
initPickup();
initExfil();
loop();
