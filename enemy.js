const ENEMY_HIT_RADIUS = 20;
const ALERT_FRAMES     = 180;

// Per-enemy detection parameters — set these to create different unit types:
//   visionAngle:    cone width in radians (player = VISION_ANGLE = 2π/3 = 120°)
//   sightRange:     max detection distance in lit conditions (Infinity = unlimited)
//   proximityRadius: radius of awareness bubble, ignores facing direction
const STANDARD_VISION = Math.PI * 2 / 3; // 120° — matches VISION_ANGLE in game.js

const INITIAL_ENEMIES = [
  { x: 600, y: 600, angle: 0, targetAngle: 0, visionAngle: STANDARD_VISION, sightRange: Infinity, proximityRadius: 50 }, // Lobby
  { x: 580, y: 220, angle: 0, targetAngle: 0, visionAngle: STANDARD_VISION, sightRange: Infinity, proximityRadius: 50 }, // Room B
  { x: 940, y: 590, angle: 0, targetAngle: 0, visionAngle: STANDARD_VISION, sightRange: Infinity, proximityRadius: 50 }, // Room F
];

let enemies = [];

function resetEnemies() {
  enemies = INITIAL_ENEMIES.map(e => ({
    ...e,
    state:      'patrol',
    alertTimer: 0,
  }));
}

// Parameterized cone angle check — not player-coupled
function pawnInCone(ex, ey, eAngle, visionAngle, tx, ty) {
  const dx = tx - ex, dy = ty - ey;
  if (dx === 0 && dy === 0) return true;
  const bearing = Math.atan2(dx, -dy);
  let diff = bearing - eAngle;
  while (diff >  Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return Math.abs(diff) <= visionAngle / 2;
}

// Single ray from (x1,y1) toward (x2,y2); true if no wall is closer than the target
function hasLOS(x1, y1, x2, y2) {
  const angle = Math.atan2(y2 - y1, x2 - x1); // canvas-math angle: 0 = right
  const hit = castVisRay(x1, y1, angle);
  if (!hit) return true;
  const distToTarget = (x2 - x1) ** 2 + (y2 - y1) ** 2;
  const distToWall   = (hit.x - x1) ** 2 + (hit.y - y1) ** 2;
  return distToWall >= distToTarget;
}

function enemyCanSeePlayer(e) {
  const dx = player.x - e.x, dy = player.y - e.y;
  const dist2 = dx * dx + dy * dy;

  // Proximity bubble — detects regardless of facing and light level
  if (dist2 <= e.proximityRadius * e.proximityRadius) return true;

  // Cone sight requires the player to be lit by a lamp (not their own glow)
  if (!isLitByLamps(player.x, player.y)) return false;

  // Must be inside vision cone
  if (!pawnInCone(e.x, e.y, e.angle, e.visionAngle, player.x, player.y)) return false;

  // Range cap
  if (dist2 > e.sightRange * e.sightRange) return false;

  // Line-of-sight ray check
  return hasLOS(e.x, e.y, player.x, player.y);
}

function updateEnemies() {
  for (const e of enemies) {
    const detected = enemyCanSeePlayer(e);

    if (detected) {
      e.state      = 'alert';
      e.alertTimer = ALERT_FRAMES;
      e.targetAngle = Math.atan2(player.x - e.x, -(player.y - e.y));
    } else if (e.state === 'alert') {
      e.alertTimer--;
      if (e.alertTimer <= 0) e.state = 'cautious';
    }

    e.angle = lerpAngle(e.angle, e.targetAngle, 0.12);
  }
}

function drawEnemySightCone(e) {
  const isAlert = e.state === 'alert';
  const color   = isAlert ? '#ff8800' : '#ff4444';
  const alpha   = isAlert ? 0.25 : 0.12;

  // Wall-occluded vision cone
  const visPts = computeVisibilityPolygon(e.x, e.y, e.angle, e.visionAngle);
  if (visPts.length >= 2) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(e.x, e.y);
    for (const p of visPts) ctx.lineTo(p.x, p.y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Proximity circle — same color and alpha as cone
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(e.x, e.y, e.proximityRadius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawEnemies() {
  for (const e of enemies) {
    drawEnemySightCone(e);
  }

  for (const e of enemies) {
    const isAlert    = e.state === 'alert';
    const isCautious = e.state === 'cautious';

    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(e.angle);

    // Shoulders
    ctx.fillStyle = isAlert ? '#e06a10' : (isCautious ? '#b05020' : '#d43a3a');
    ctx.beginPath();
    ctx.arc(-18, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(18, 0, 10, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = isAlert ? '#ff8c1a' : (isCautious ? '#cc6633' : '#f55a5a');
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fill();

    // Direction arrow
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(0, -28);
    ctx.lineTo(-7, -18);
    ctx.lineTo(7, -18);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    // Overhead indicator — only shown when enemy is in player's vision + lit
    if ((isAlert || isCautious) && inVisionCone(e.x, e.y) && isLit(e.x, e.y)) {
      ctx.save();
      ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = isAlert ? '#ffe066' : '#aaaaaa';
      ctx.fillText(isAlert ? '!' : '?', e.x, e.y - 38);
      ctx.restore();
    }
  }
}

resetEnemies();
