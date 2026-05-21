const ENEMY_HIT_RADIUS  = 20;
const ALERT_FRAMES      = 180;   // 3 s at 60 fps
const SUSPICION_TIMEOUT = 300;   //  5 s at 60 fps — no-input timeout for level-1 suspicion
const REACTION_DELAY    = 45;    // 0.75 s — window of opportunity before enemy reacts
const GUNSHOT_RADIUS    = 350;
const FOOTSTEP_RADIUS   = 120;   // max footstep reach at walk speed
const WALK_SPEED        = 4;     // player.speed at normal walk; used for footstep scaling
const SOUND_LIFETIME    = 30;    // frames for visual ring to fade
const ARRIVAL_RADIUS    = 8;     // px — enemy considered "at" a waypoint within this distance
const ENEMY_RADIUS      = 16;    // px — collision radius for pushOutOfWalls during patrol

const STANDARD_VISION = Math.PI * 2 / 3; // 120° — matches VISION_ANGLE in game.js

// Patrol node: { x, y, pauseFrames, sweep (radians), sweepSpeed (rad/frame, +CW/-CCW) }
// Per-enemy detection parameters:
//   visionAngle:     cone width in radians
//   sightRange:      max detection distance in lit conditions (Infinity = unlimited)
//   proximityRadius: awareness bubble — detects player regardless of facing, with delay
//   patrolRoute:     array of patrol nodes; [] = static
//   patrolSpeed:     px/frame during translation
// TEST LAYOUT — all three enemies in the lobby, facing north (away from player entry).
// Player spawns at (500,680). Walk up behind any enemy to test suspicion/proximity.
// Restore original patrol routes after suspicion testing is done.
const INITIAL_ENEMIES = [
  // Enemy 1 — lobby left, static, facing north
  {
    x: 250, y: 520, angle: 0, targetAngle: 0,
    visionAngle: STANDARD_VISION, sightRange: Infinity, proximityRadius: 50,
    patrolSpeed: 1.5,
    patrolRoute: [],
  },
  // Enemy 2 — lobby center, short left-right patrol so turnaround speed is observable
  {
    x: 500, y: 520, angle: 0, targetAngle: 0,
    visionAngle: STANDARD_VISION, sightRange: Infinity, proximityRadius: 50,
    patrolSpeed: 1.5,
    patrolRoute: [
      { x: 420, y: 520, pauseFrames: 240, sweep: 0, sweepSpeed: 0 },
      { x: 580, y: 520, pauseFrames: 240, sweep: 0, sweepSpeed: 0 },
    ],
  },
  // Enemy 3 — cross-room patrol Room A ↔ Corridor ↔ Room BC, 180° sweep at each end
  {
    x: 200, y: 229, angle: 0, targetAngle: 0,
    visionAngle: STANDARD_VISION, sightRange: Infinity, proximityRadius: 50,
    patrolSpeed: 1.5,
    patrolRoute: [
      { x: 200, y: 229, pauseFrames: 60, sweep: Math.PI, sweepSpeed: 0.008 }, // Room A — sweep then head east
      { x: 409, y: 295, pauseFrames: 0,  sweep: 0,       sweepSpeed: 0     }, // Room A gap
      { x: 589, y: 229, pauseFrames: 0,  sweep: 0,       sweepSpeed: 0     }, // Corridor center
      { x: 769, y: 210, pauseFrames: 0,  sweep: 0,       sweepSpeed: 0     }, // Room BC gap
      { x: 930, y: 229, pauseFrames: 60, sweep: Math.PI, sweepSpeed: 0.008 }, // Room BC — sweep then head west
      { x: 769, y: 210, pauseFrames: 0,  sweep: 0,       sweepSpeed: 0     }, // Room BC gap (return)
      { x: 589, y: 229, pauseFrames: 0,  sweep: 0,       sweepSpeed: 0     }, // Corridor center (return)
      { x: 409, y: 295, pauseFrames: 0,  sweep: 0,       sweepSpeed: 0     }, // Room A gap (return)
    ],
  },
];

let enemies      = [];
let soundEvents  = [];
let footstepTimer = 0;

function resetEnemies() {
  enemies = INITIAL_ENEMIES.map((e, i) => ({
    ...e,
    index:              i + 1, // 1-based debug label
    state:              'patrol',
    alertTimer:         0,
    suspicionTimer:     0,
    reactionTimer:      0,    // counts down; state change held until 0
    pendingReaction:    null, // { state, targetAngle, sourceX, sourceY }
    suspicionLevel:     0,    // how many times enemy has entered suspicious from patrol
    suspicionPhase:     'turning', // 'turning'|'moving'|'searching'|'returning'
    suspicionSourceX:   0,    // world position of the suspicious stimulus
    suspicionSourceY:   0,
    suspicionReturnX:   0,    // position to return to after investigation
    suspicionReturnY:   0,
    suspicionSearchAccum:  0,  // accumulated search rotation at source
    suspicionOriginalAngle: 0, // targetAngle saved on suspicion entry; restored on return to patrol
    patrolIndex:        0,    // current target waypoint index
    patrolPauseTimer:   0,    // counts up; node done when it reaches node.pauseFrames
    patrolSweepAccum:   0,    // accumulated |rotation| at current node
    enemyFootstepTimer: 0,    // counts up; emits footstep every 30 frames while moving
  }));
  soundEvents.length = 0;
  footstepTimer = 0;
}

// Queue a delayed state change. Does nothing if already reacting (existing pending wins).
function scheduleReaction(e, toState, targetAngle, sourceX = e.x, sourceY = e.y) {
  if (e.reactionTimer > 0) return;
  e.reactionTimer   = REACTION_DELAY;
  e.pendingReaction = { state: toState, targetAngle, sourceX, sourceY };
}

// Apply sound-triggered state transitions for one enemy.
// Used by both emitSound (gunshots/footsteps) and notifyPlayerMoved.
function applySoundReaction(e, sourceX, sourceY) {
  const angle = Math.atan2(sourceX - e.x, -(sourceY - e.y));
  if (e.state === 'patrol') {
    scheduleReaction(e, 'suspicious', angle, sourceX, sourceY);
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
        const savedAngle = e.targetAngle; // capture BEFORE overwrite
        e.state       = e.pendingReaction.state;
        e.targetAngle = e.pendingReaction.targetAngle;
        if (e.state === 'suspicious') {
          e.suspicionOriginalAngle = savedAngle; // original facing, not the source direction
          e.suspicionTimer  = 0;
          e.suspicionLevel++;
          e.suspicionSourceX = e.pendingReaction.sourceX;
          e.suspicionSourceY = e.pendingReaction.sourceY;
          if (e.suspicionLevel >= 2) {
            // Second+ suspicion: move to source and investigate
            e.suspicionPhase      = 'moving';
            e.suspicionReturnX    = e.x;
            e.suspicionReturnY    = e.y;
            e.suspicionSearchAccum = 0;
          } else {
            // First suspicion: turn toward source and wait
            e.suspicionPhase = 'turning';
          }
        }
        if (e.state === 'alert') e.alertTimer = ALERT_FRAMES;
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

    // 4. Suspicious state — two-level behavior
    if (e.state === 'suspicious') {
      e.suspicionTimer++;

      if (e.suspicionPhase === 'turning') {
        // Level 1: turn toward source in place, timeout → patrol
        if (e.suspicionTimer >= SUSPICION_TIMEOUT) {
          e.state = 'patrol';
          e.targetAngle = e.suspicionOriginalAngle; // restore original facing
          e.reactionTimer = 0;
          e.pendingReaction = null;
        }

      } else if (e.suspicionPhase === 'moving') {
        // Level 2+: walk to source of suspicion
        const sdx = e.suspicionSourceX - e.x, sdy = e.suspicionSourceY - e.y;
        const sdist2 = sdx * sdx + sdy * sdy;
        if (sdist2 > ARRIVAL_RADIUS * ARRIVAL_RADIUS) {
          const sdist = Math.sqrt(sdist2);
          e.x += (sdx / sdist) * e.patrolSpeed;
          e.y += (sdy / sdist) * e.patrolSpeed;
          e.targetAngle = Math.atan2(sdx, -sdy);
          pushOutOfWalls(e, ENEMY_RADIUS);
          pushOutOfWalls(e, ENEMY_RADIUS);
        } else {
          e.suspicionPhase     = 'searching';
          e.suspicionSearchAccum = 0;
        }
        // Failsafe: if stuck moving too long, skip to return
        if (e.suspicionTimer >= SUSPICION_TIMEOUT * 3) e.suspicionPhase = 'returning';

      } else if (e.suspicionPhase === 'searching') {
        // Small rotation at source — looks around for the threat
        e.targetAngle          += 0.01;
        e.suspicionSearchAccum += 0.01;
        if (e.suspicionSearchAccum >= Math.PI) {
          e.suspicionPhase = 'returning';
        }

      } else if (e.suspicionPhase === 'returning') {
        // Walk back to the position where suspicion first triggered
        const rdx = e.suspicionReturnX - e.x, rdy = e.suspicionReturnY - e.y;
        const rdist2 = rdx * rdx + rdy * rdy;
        if (rdist2 > ARRIVAL_RADIUS * ARRIVAL_RADIUS) {
          const rdist = Math.sqrt(rdist2);
          e.x += (rdx / rdist) * e.patrolSpeed;
          e.y += (rdy / rdist) * e.patrolSpeed;
          e.targetAngle = Math.atan2(rdx, -rdy);
          pushOutOfWalls(e, ENEMY_RADIUS);
          pushOutOfWalls(e, ENEMY_RADIUS);
        } else {
          // Back at patrol position — resume patrol with original facing
          e.state = 'patrol';
          e.targetAngle = e.suspicionOriginalAngle;
          e.reactionTimer = 0;
          e.pendingReaction = null;
        }
      }
      // Path B (sight while suspicious) handled by step 2: as enemy turns/moves, if player
      // enters the lit cone → immediate alert regardless of suspicion phase.
    }

    // 5. Alert countdown
    if (e.state === 'alert') {
      e.alertTimer--;
      if (e.alertTimer <= 0) e.state = 'cautious';
    }

    // 6. Patrol movement — only when in patrol state with a defined route
    if (e.state === 'patrol' && e.patrolRoute.length > 0) {
      const node = e.patrolRoute[e.patrolIndex];
      const dx = node.x - e.x, dy = node.y - e.y;
      const dist2 = dx * dx + dy * dy;

      if (dist2 > ARRIVAL_RADIUS * ARRIVAL_RADIUS) {
        // Moving toward node
        const dist = Math.sqrt(dist2);
        const prevX = e.x, prevY = e.y;
        e.x += (dx / dist) * e.patrolSpeed;
        e.y += (dy / dist) * e.patrolSpeed;
        e.targetAngle = Math.atan2(dx, -dy);
        pushOutOfWalls(e, ENEMY_RADIUS);
        pushOutOfWalls(e, ENEMY_RADIUS);
        // Enemy footstep ring (visual only — does not alert other enemies)
        if (e.x !== prevX || e.y !== prevY) {
          e.enemyFootstepTimer++;
          if (e.enemyFootstepTimer >= 30) {
            e.enemyFootstepTimer = 0;
            const fRadius = e.proximityRadius + (e.patrolSpeed / WALK_SPEED) * (FOOTSTEP_RADIUS - e.proximityRadius);
            soundEvents.push({ x: e.x, y: e.y, radius: fRadius, life: SOUND_LIFETIME });
          }
        }
      } else {
        // At node — sweep then pause then advance
        if (Math.abs(node.sweep) > 0 && e.patrolSweepAccum < Math.abs(node.sweep)) {
          e.targetAngle      += node.sweepSpeed;
          e.patrolSweepAccum += Math.abs(node.sweepSpeed);
        } else if (e.patrolPauseTimer < node.pauseFrames) {
          e.patrolPauseTimer++;
        } else {
          // Advance to next node
          e.patrolIndex      = (e.patrolIndex + 1) % e.patrolRoute.length;
          e.patrolSweepAccum = 0;
          e.patrolPauseTimer = 0;
          const next = e.patrolRoute[e.patrolIndex];
          if (next.sweep === 0) {
            // Pre-orient toward next destination
            e.targetAngle = Math.atan2(next.x - e.x, -(next.y - e.y));
          }
        }
      }
    }

    const turnRate = (e.state === 'patrol') ? 0.04 : 0.10;
    e.angle = lerpAngle(e.angle, e.targetAngle, turnRate);
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

// Always-visible debug number labels — drawn after fog in game.js so they show through darkness
function drawEnemyLabels() {
  for (const e of enemies) {
    ctx.save();
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Dark backing pill for readability
    const label = String(e.index);
    const lx = e.x, ly = e.y - 56;
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.beginPath();
    ctx.arc(lx, ly, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#00e5ff';
    ctx.fillText(label, lx, ly);
    ctx.restore();
  }
}

resetEnemies();
