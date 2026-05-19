const ENEMY_HIT_RADIUS  = 20;
const ALERT_FRAMES      = 180;   // 3 s at 60 fps
const SUSPICION_TIMEOUT = 3600;  // 60 s at 60 fps
const REACTION_DELAY    = 45;    // 0.75 s — window of opportunity before enemy reacts
const GUNSHOT_RADIUS    = 350;
const FOOTSTEP_RADIUS   = 120;   // max footstep reach at walk speed
const WALK_SPEED        = 4;     // player.speed at normal walk; used for footstep scaling
const SOUND_LIFETIME    = 30;    // frames for visual ring to fade

const STANDARD_VISION = Math.PI * 2 / 3; // 120° — matches VISION_ANGLE in game.js

// Per-enemy detection parameters:
//   visionAngle:     cone width in radians
//   sightRange:      max detection distance in lit conditions (Infinity = unlimited)
//   proximityRadius: awareness bubble — detects player regardless of facing, with delay
const INITIAL_ENEMIES = [
  { x: 600, y: 600, angle: 0, targetAngle: 0, visionAngle: STANDARD_VISION, sightRange: Infinity, proximityRadius: 50 }, // Lobby
  { x: 580, y: 220, angle: 0, targetAngle: 0, visionAngle: STANDARD_VISION, sightRange: Infinity, proximityRadius: 50 }, // Room B
  { x: 940, y: 590, angle: 0, targetAngle: 0, visionAngle: STANDARD_VISION, sightRange: Infinity, proximityRadius: 50 }, // Room F
];

let enemies      = [];
let soundEvents  = [];
let footstepTimer = 0;

function resetEnemies() {
  enemies = INITIAL_ENEMIES.map(e => ({
    ...e,
    state:           'patrol',
    alertTimer:      0,
    suspicionTimer:  0,
    reactionTimer:   0,   // counts down; state change held until 0
    pendingReaction: null, // { state, targetAngle } applied when reactionTimer hits 0
  }));
  soundEvents.length = 0;
  footstepTimer = 0;
}

// Queue a delayed state change. Does nothing if already reacting (existing pending wins).
function scheduleReaction(e, toState, targetAngle) {
  if (e.reactionTimer > 0) return;
  e.reactionTimer   = REACTION_DELAY;
  e.pendingReaction = { state: toState, targetAngle };
}

// Apply sound-triggered state transitions for one enemy.
// Used by both emitSound (gunshots/footsteps) and notifyPlayerMoved.
function applySoundReaction(e, sourceX, sourceY) {
  const angle = Math.atan2(sourceX - e.x, -(sourceY - e.y));
  if (e.state === 'patrol') {
    scheduleReaction(e, 'suspicious', angle);
  } else if (e.state === 'suspicious') {
    // Second sound while suspicious → confirmed alert (immediate, no delay)
    e.reactionTimer   = 0;
    e.pendingReaction = null;
    e.state      = 'alert';
    e.alertTimer = ALERT_FRAMES;
    e.targetAngle = angle;
  } else if (e.state === 'cautious') {
    // Cautious skips suspicious — already on edge
    e.reactionTimer   = 0;
    e.pendingReaction = null;
    e.state      = 'alert';
    e.alertTimer = ALERT_FRAMES;
    e.targetAngle = angle;
  } else if (e.state === 'alert') {
    e.alertTimer = ALERT_FRAMES; // refresh
  }
}

// Footstep sound — per-enemy radius based on player speed.
// Called by game.js each frame the player actually moved.
function notifyPlayerMoved() {
  footstepTimer++;
  if (footstepTimer < 30) return;
  footstepTimer = 0;

  // Visual ring uses the standard walk radius
  soundEvents.push({ x: player.x, y: player.y, radius: FOOTSTEP_RADIUS, life: SOUND_LIFETIME });

  for (const e of enemies) {
    // Per-enemy footstep radius: collapses to proximityRadius at speed 0, scales up with speed
    const footRadius = e.proximityRadius + (player.speed / WALK_SPEED) * (FOOTSTEP_RADIUS - e.proximityRadius);
    const dx = e.x - player.x, dy = e.y - player.y;
    if (dx * dx + dy * dy > footRadius * footRadius) continue;
    applySoundReaction(e, player.x, player.y);
  }
}

// Emit a gunshot sound at (x, y).
// Enemies within GUNSHOT_RADIUS react. If an enemy directly observes the muzzle flash
// (shot position in their vision cone + LOS), they alert immediately — no delay, no
// suspicion phase. Otherwise they hear the shot and go through the two-phase system.
// Muzzle flash is self-illuminating: isLitByLamps is NOT checked for direct observation.
function emitSound(x, y, radius, isGunshot = false) {
  soundEvents.push({ x, y, radius, life: SOUND_LIFETIME });

  for (const e of enemies) {
    const dx = e.x - x, dy = e.y - y;
    if (dx * dx + dy * dy > radius * radius) continue;

    if (isGunshot && pawnInCone(e.x, e.y, e.angle, e.visionAngle, x, y) && hasLOS(e.x, e.y, x, y)) {
      // Direct observation of muzzle flash — immediate alert
      e.reactionTimer   = 0;
      e.pendingReaction = null;
      e.state      = 'alert';
      e.alertTimer = ALERT_FRAMES;
      e.targetAngle = Math.atan2(x - e.x, -(y - e.y));
      continue;
    }

    applySoundReaction(e, x, y);
  }
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
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const hit = castVisRay(x1, y1, angle);
  if (!hit) return true;
  const distToTarget = (x2 - x1) ** 2 + (y2 - y1) ** 2;
  const distToWall   = (hit.x - x1) ** 2 + (hit.y - y1) ** 2;
  return distToWall >= distToTarget;
}

// Vision cone detection only — no proximity bubble.
// Proximity is handled separately with a reaction delay.
function enemyCanSeeCone(e) {
  const dx = player.x - e.x, dy = player.y - e.y;
  const dist2 = dx * dx + dy * dy;
  if (!isLitByLamps(player.x, player.y)) return false;
  if (!pawnInCone(e.x, e.y, e.angle, e.visionAngle, player.x, player.y)) return false;
  if (dist2 > e.sightRange * e.sightRange) return false;
  return hasLOS(e.x, e.y, player.x, player.y);
}

function updateEnemies() {
  // Tick sound event lifetimes
  for (let i = soundEvents.length - 1; i >= 0; i--) {
    soundEvents[i].life--;
    if (soundEvents[i].life <= 0) soundEvents.splice(i, 1);
  }

  for (const e of enemies) {

    // 1. Tick reaction delay — apply pending state change when it expires
    if (e.reactionTimer > 0) {
      e.reactionTimer--;
      if (e.reactionTimer === 0 && e.pendingReaction) {
        e.state       = e.pendingReaction.state;
        e.targetAngle = e.pendingReaction.targetAngle;
        if (e.state === 'suspicious') e.suspicionTimer = 0;
        if (e.state === 'alert')      e.alertTimer     = ALERT_FRAMES;
        e.pendingReaction = null;
      }
    }

    // 2. Immediate: vision cone detection — always overrides any pending reaction
    if (enemyCanSeeCone(e)) {
      e.reactionTimer   = 0;
      e.pendingReaction = null;
      e.state      = 'alert';
      e.alertTimer = ALERT_FRAMES;
      e.targetAngle = Math.atan2(player.x - e.x, -(player.y - e.y));
    }
    // 3. Delayed: proximity detection — only when not already reacting or alert
    else if (e.reactionTimer === 0 && e.state !== 'alert') {
      const dx = player.x - e.x, dy = player.y - e.y;
      if (dx * dx + dy * dy <= e.proximityRadius * e.proximityRadius) {
        const angle = Math.atan2(player.x - e.x, -(player.y - e.y));
        scheduleReaction(e, 'alert', angle);
      }
    }

    // 4. Suspicious state: tick suspicion timer, check for Path B sight escalation
    if (e.state === 'suspicious') {
      e.suspicionTimer++;
      if (e.suspicionTimer >= SUSPICION_TIMEOUT) {
        e.state          = 'patrol';
        e.reactionTimer  = 0;
        e.pendingReaction = null;
      }
      // Path B (sight while suspicious) is handled by step 2 above automatically:
      // as the enemy lerps toward the sound source, if the player enters the cone → alert
    }

    // 5. Alert countdown
    if (e.state === 'alert') {
      e.alertTimer--;
      if (e.alertTimer <= 0) e.state = 'cautious';
    }

    e.angle = lerpAngle(e.angle, e.targetAngle, 0.12);
  }
}

function drawSoundEvents() {
  for (const s of soundEvents) {
    const progress  = 1 - s.life / SOUND_LIFETIME;
    const r         = s.radius * (0.2 + progress * 0.8);
    const alpha     = (s.life / SOUND_LIFETIME) * 0.6;
    const isGunshot = s.radius >= GUNSHOT_RADIUS;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = isGunshot ? '#ffe066' : '#888888';
    ctx.lineWidth   = isGunshot ? 2 : 1;
    ctx.beginPath();
    ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawEnemySightCone(e) {
  const isAlert = e.state === 'alert';
  const color   = isAlert ? '#ff8800' : '#ff4444';
  const alpha   = isAlert ? 0.25 : 0.12;

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
    const isAlert     = e.state === 'alert';
    const isSuspicious = e.state === 'suspicious';
    const isCautious  = e.state === 'cautious';
    const isReacting  = e.reactionTimer > 0;

    // Reaction delay ring — contracting white circle shows the opportunity window
    if (isReacting) {
      const progress = e.reactionTimer / REACTION_DELAY; // 1 → 0 as timer counts down
      const ringR    = e.proximityRadius * progress;
      ctx.save();
      ctx.globalAlpha = 0.7 * progress;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth   = 2;
      ctx.beginPath();
      ctx.arc(e.x, e.y, ringR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(e.angle);

    // Shoulders
    ctx.fillStyle = isAlert      ? '#e06a10'
                  : isSuspicious ? '#b06020'
                  : isCautious   ? '#b05020'
                  : '#d43a3a';
    ctx.beginPath();
    ctx.arc(-18, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(18, 0, 10, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = isAlert      ? '#ff8c1a'
                  : isSuspicious ? '#d47a20'
                  : isCautious   ? '#cc6633'
                  : '#f55a5a';
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

    // Overhead indicator — only when enemy is visible to player
    const showIndicator = (isAlert || isSuspicious || isCautious)
                        && inVisionCone(e.x, e.y) && isLit(e.x, e.y);
    if (showIndicator) {
      ctx.save();
      ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = isAlert ? '#ffe066' : (isSuspicious ? '#ffcc44' : '#aaaaaa');
      ctx.fillText(isAlert ? '!' : '?', e.x, e.y - 38);
      ctx.restore();
    }
  }
}

resetEnemies();
