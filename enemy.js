const ENEMY_DESIGN_WIDTH = 1100;
const ENEMY_DESIGN_HEIGHT = 750;
const ENEMY_GAME_WIDTH = 1920;
const ENEMY_GAME_HEIGHT = 1080;
const ENEMY_SCALE_X = ENEMY_GAME_WIDTH / ENEMY_DESIGN_WIDTH;
const ENEMY_SCALE_Y = ENEMY_GAME_HEIGHT / ENEMY_DESIGN_HEIGHT;
const ENEMY_SCALE_UNIT = (ENEMY_SCALE_X + ENEMY_SCALE_Y) / 2;

function scaleEnemyX(x) { return x * ENEMY_SCALE_X; }
function scaleEnemyY(y) { return y * ENEMY_SCALE_Y; }
function scaleEnemyUnit(v) { return v * ENEMY_SCALE_UNIT; }
function scaleEnemyPoint(p) { return { ...p, x: scaleEnemyX(p.x), y: scaleEnemyY(p.y) }; }
function scaleEnemyConfig(e) {
  return {
    ...e,
    x: scaleEnemyX(e.x),
    y: scaleEnemyY(e.y),
    archetype: e.archetype ?? 'melee',
    sightRange: e.sightRange === Infinity ? Infinity : scaleEnemyUnit(e.sightRange),
    proximityRadius: scaleEnemyUnit(e.proximityRadius),
    patrolSpeed: scaleEnemyUnit(e.patrolSpeed),
    shootingRange: scaleEnemyUnit(e.shootingRange ?? 0),
    shootingRangeTolerance: scaleEnemyUnit(e.shootingRangeTolerance ?? 0),
    shotSpeed: scaleEnemyUnit(e.shotSpeed ?? 0),
    shotCooldownFrames: e.shotCooldownFrames ?? 0,
    aimSpreadRadians: e.aimSpreadRadians ?? 0,
    patrolRoute: e.patrolRoute.map(scaleEnemyPoint),
  };
}

const ENEMY_HIT_RADIUS  = scaleEnemyUnit(20);
const ALERT_FRAMES      = 180;   // 3 s at 60 fps
const SUSPICION_TIMEOUT = 300;   //  5 s at 60 fps ??no-input timeout for level-1 suspicion
const REACTION_DELAY    = 45;    // 0.75 s ??window of opportunity before enemy reacts
const SUSPICION_CONFIRM_DELAY = 75; // 1.25 s ??suspicious stimulus must settle before alert
const GUNSHOT_RADIUS    = scaleEnemyUnit(350);
const FOOTSTEP_RADIUS   = scaleEnemyUnit(120);   // max footstep reach at walk speed
const WALK_SPEED        = scaleEnemyUnit(4);     // player.speed at normal walk; used for footstep scaling
const SOUND_LIFETIME    = 30;    // frames for visual ring to fade
const ARRIVAL_RADIUS    = scaleEnemyUnit(8);     // px ??enemy considered "at" a waypoint within this distance
const ENEMY_RADIUS      = scaleEnemyUnit(16);    // px ??collision radius for pushOutOfWalls during patrol
const ENEMY_PROJECTILE_HIT_RADIUS = scaleEnemyUnit(18);
const ENEMY_PROJECTILE_SPAWN_OFFSET = scaleEnemyUnit(20);
const PLAYER_HIT_FLASH_FRAMES = 18;

const STANDARD_VISION = Math.PI * 2 / 3; // 120째 ??matches VISION_ANGLE in game.js

const SEARCH_SWEEP_RATE = 0.016; // 270째 over ~5 s at 60 fps
const CAUTIOUS_FRAMES   = 1800;  // 30 s ??lingering vigilance after returning to patrol

// Reactive navigation graph ??used by SEARCHING state to path to lastKnownX/Y.
// Patrol routes use hand-placed waypoints; this graph is only for buildPath().
const NAV_NODES = Object.fromEntries(Object.entries({
  lobby:          { x: 460, y: 590 },
  gap_corr_left:  { x: 270, y: 449 },
  gap_corr_right: { x: 819, y: 449 },
  corridor:       { x: 589, y: 229 },
  gap_room_a:     { x: 409, y: 295 },
  room_a:         { x: 200, y: 229 },
  gap_room_bc:    { x: 769, y: 210 },
  room_bc:        { x: 930, y: 229 },
  gap_room_f:     { x: 909, y: 590 },
  room_f:         { x: 991, y: 590 },
}).map(([id, point]) => [id, scaleEnemyPoint(point)]));

const NAV_EDGES = [
  ['lobby',          'gap_corr_left'],
  ['gap_corr_left',  'corridor'],
  ['lobby',          'gap_corr_right'],
  ['gap_corr_right', 'gap_room_f'],
  ['gap_room_f',     'room_f'],
  ['corridor',       'gap_room_a'],
  ['gap_room_a',     'room_a'],
  ['corridor',       'gap_room_bc'],
  ['gap_room_bc',    'room_bc'],
];

function _pointHitsExpandedWall(x, y, radius = ENEMY_RADIUS) {
  for (const wall of WALLS) {
    if (x > wall.x - radius && x < wall.x + wall.w + radius &&
        y > wall.y - radius && y < wall.y + wall.h + radius) {
      return true;
    }
  }
  return false;
}

function _pathSegmentClear(x1, y1, x2, y2, radius = ENEMY_RADIUS) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const steps = Math.max(1, Math.ceil(dist / Math.max(1, radius * 0.5)));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    if (_pointHitsExpandedWall(x1 + dx * t, y1 + dy * t, radius)) return false;
  }
  return true;
}

// Ordered [{x,y}] waypoints through the nav graph. Start and goal are connected
// only to nodes they can actually reach without crossing expanded wall collision.
function buildPath(fromX, fromY, toX, toY) {
  const nodes = {
    start: { x: fromX, y: fromY },
    goal:  { x: toX, y: toY },
    ...NAV_NODES,
  };
  const adj = {};
  for (const id in nodes) adj[id] = [];
  for (const [u, v] of NAV_EDGES) {
    adj[u].push(v);
    adj[v].push(u);
  }

  const connectDynamic = (a, b) => {
    if (_pathSegmentClear(nodes[a].x, nodes[a].y, nodes[b].x, nodes[b].y)) {
      adj[a].push(b);
      adj[b].push(a);
    }
  };

  connectDynamic('start', 'goal');
  for (const id in NAV_NODES) {
    connectDynamic('start', id);
    connectDynamic('goal', id);
  }

  const prev = { start: null };
  const q = ['start'];
  let found = false;
  while (q.length) {
    const cur = q.shift();
    if (cur === 'goal') { found = true; break; }
    for (const nb of adj[cur]) {
      if (nb in prev) continue;
      prev[nb] = cur;
      q.push(nb);
    }
  }
  if (!found) {
    let best = null;
    let bestD2 = Infinity;
    for (const id in prev) {
      if (id === 'start') continue;
      const d2 = (nodes[id].x - toX) ** 2 + (nodes[id].y - toY) ** 2;
      if (d2 < bestD2) {
        bestD2 = d2;
        best = id;
      }
    }
    if (best === null) return [{ x: toX, y: toY }];
    const fallbackIds = [];
    for (let c = best; c !== 'start'; c = prev[c]) fallbackIds.unshift(c);
    return fallbackIds.map(id => ({ x: nodes[id].x, y: nodes[id].y }));
  }

  const ids = [];
  for (let c = 'goal'; c !== 'start'; c = prev[c]) ids.unshift(c);
  return ids.map(id => ({ x: nodes[id].x, y: nodes[id].y }));
}

// Patrol node: { x, y, pauseFrames, sweep (radians), sweepSpeed (rad/frame, +CW/-CCW) }
// Per-enemy detection parameters:
//   visionAngle:     cone width in radians
//   sightRange:      max detection distance in lit conditions (Infinity = unlimited)
//   proximityRadius: awareness bubble ??detects player regardless of facing, with delay
//   patrolRoute:     array of patrol nodes; [] = static
//   patrolSpeed:     px/frame during translation
const INITIAL_ENEMIES = [
  // Enemy 1 ??static upper-room sentry, offset from Enemy 3's cross-room patrol
  {
    x: 580, y: 100, angle: Math.PI, targetAngle: Math.PI,
    archetype: 'melee',
    visionAngle: STANDARD_VISION, sightRange: Infinity, proximityRadius: 50,
    patrolSpeed: 1.5,
    patrolRoute: [],
  },
  // Enemy 2 ??short center patrol nested inside Enemy 1's range
  {
    x: 500, y: 590, angle: 0, targetAngle: 0,
    archetype: 'melee',
    visionAngle: STANDARD_VISION, sightRange: Infinity, proximityRadius: 50,
    patrolSpeed: 1.5,
    patrolRoute: [
      { x: 420, y: 590, pauseFrames: 240, sweep: 0, sweepSpeed: 0 },
      { x: 580, y: 590, pauseFrames: 240, sweep: 0, sweepSpeed: 0 },
    ],
  },
  // Enemy 3 ??cross-room patrol Room A ??Corridor ??Room BC, 180째 sweep at each end
  {
    x: 200, y: 229, angle: 0, targetAngle: 0,
    archetype: 'shooter',
    visionAngle: STANDARD_VISION, sightRange: Infinity, proximityRadius: 50,
    patrolSpeed: 1.5,
    shootingRange: 360,
    shootingRangeTolerance: 40,
    shotCooldownFrames: 75,
    shotSpeed: 25,
    aimSpreadRadians: 0.16,
    patrolRoute: [
      { x: 200, y: 229, pauseFrames: 60, sweep: Math.PI, sweepSpeed: 0.008 }, // Room A ??sweep then head east
      { x: 409, y: 295, pauseFrames: 0,  sweep: 0,       sweepSpeed: 0     }, // Room A gap
      { x: 589, y: 229, pauseFrames: 0,  sweep: 0,       sweepSpeed: 0     }, // Corridor center
      { x: 769, y: 210, pauseFrames: 0,  sweep: 0,       sweepSpeed: 0     }, // Room BC gap
      { x: 930, y: 229, pauseFrames: 60, sweep: Math.PI, sweepSpeed: 0.008 }, // Room BC ??sweep then head west
      { x: 769, y: 210, pauseFrames: 0,  sweep: 0,       sweepSpeed: 0     }, // Room BC gap (return)
      { x: 589, y: 229, pauseFrames: 0,  sweep: 0,       sweepSpeed: 0     }, // Corridor center (return)
      { x: 409, y: 295, pauseFrames: 0,  sweep: 0,       sweepSpeed: 0     }, // Room A gap (return)
    ],
  },
].map(scaleEnemyConfig);

let enemies      = [];
let soundEvents  = [];
let enemyProjectiles = [];
let footstepTimer = 0;
let playerHitFlashTimer = 0;

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
    lastKnownX:         null, // player position at last confirmed sighting (null = never seen)
    lastKnownY:         null,
    searchPath:         [],   // nav waypoints to lastKnown position
    searchPathIndex:    0,
    searchSweepAccum:   0,    // accumulated rotation during search sweep
    returnTargetX:      e.x,  // patrol/home position selected after reactive search
    returnTargetY:      e.y,
    returnTargetAngle:  e.targetAngle,
    returnPatrolIndex:  0,
    cautiousTimer:      0,    // >0 = lingering vigilance after a reactive incident
    shotTimer:          e.shotCooldownFrames,
  }));
  soundEvents.length = 0;
  enemyProjectiles.length = 0;
  footstepTimer = 0;
  playerHitFlashTimer = 0;
}

// Queue a delayed state change. Does nothing if already reacting (existing pending wins).
function scheduleReaction(e, toState, targetAngle, sourceX = e.x, sourceY = e.y, delayFrames = REACTION_DELAY) {
  if (e.reactionTimer > 0) return;
  e.reactionTimer   = delayFrames;
  e.pendingReaction = { state: toState, targetAngle, sourceX, sourceY };
}

// Apply sound-triggered state transitions for one enemy.
// Used by both emitSound (gunshots/footsteps) and notifyPlayerMoved.
function applySoundReaction(e, sourceX, sourceY) {
  const angle = Math.atan2(sourceX - e.x, -(sourceY - e.y));
  if (e.state === 'patrol') {
    scheduleReaction(e, 'suspicious', angle, sourceX, sourceY);
  } else if (e.state === 'suspicious') {
    // Second sound while suspicious ??confirmed alert after a short lock-on delay.
    e.targetAngle = angle;
    scheduleReaction(e, 'alert', angle, sourceX, sourceY, SUSPICION_CONFIRM_DELAY);
  } else if (e.state === 'searching' || e.state === 'returning' || (e.state === 'patrol' && e.cautiousTimer > 0)) {
    // Already on edge ??any sound snaps straight to alert, skipping suspicion delay
    e.reactionTimer   = 0;
    e.pendingReaction = null;
    e.state      = 'alert';
    e.alertTimer = ALERT_FRAMES;
    e.targetAngle = angle;
  } else if (e.state === 'alert') {
    e.alertTimer = ALERT_FRAMES; // refresh
  }
}

// Footstep sound ??per-enemy radius based on player speed.
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
// (shot position in their vision cone + LOS), they alert immediately ??no delay, no
// suspicion phase. Otherwise they hear the shot and go through the two-phase system.
// Muzzle flash is self-illuminating: isLitByLamps is NOT checked for direct observation.
function emitSound(x, y, radius, isGunshot = false) {
  soundEvents.push({ x, y, radius, life: SOUND_LIFETIME });

  for (const e of enemies) {
    const dx = e.x - x, dy = e.y - y;
    if (dx * dx + dy * dy > radius * radius) continue;

    if (isGunshot && pawnInCone(e.x, e.y, e.angle, e.visionAngle, x, y) && hasLOS(e.x, e.y, x, y)) {
      // Direct observation of muzzle flash ??immediate alert
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

// Parameterized cone angle check ??not player-coupled
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

// Step one tick along e.searchPath. Advances index across any waypoints already
// reached (handles per-frame path rebuilds where the enemy starts at waypoint[0])
// AND skips waypoints where pushOutOfWalls fully reverted the move (wall-stuck).
// Returns true when the path is fully traversed.
function followNavPath(e) {
  let guard = e.searchPath.length + 1; // bound while-loop so a fully-blocked path can't infinite-loop
  while (e.searchPathIndex < e.searchPath.length && guard-- > 0) {
    const wp = e.searchPath[e.searchPathIndex];
    const dx = wp.x - e.x, dy = wp.y - e.y;
    const d2 = dx * dx + dy * dy;
    if (d2 <= ARRIVAL_RADIUS * ARRIVAL_RADIUS) {
      e.searchPathIndex++;
      continue;
    }
    const d = Math.sqrt(d2);
    const prevX = e.x, prevY = e.y;
    e.x += (dx / d) * e.patrolSpeed;
    e.y += (dy / d) * e.patrolSpeed;
    e.targetAngle = Math.atan2(dx, -dy);
    pushOutOfWalls(e, ENEMY_RADIUS);
    pushOutOfWalls(e, ENEMY_RADIUS);
    // Wall fully blocked the move ??abandon this waypoint rather than oscillate against it.
    if (Math.abs(e.x - prevX) + Math.abs(e.y - prevY) < 0.1) {
      e.searchPathIndex++;
      continue;
    }
    return false;
  }
  return e.searchPathIndex >= e.searchPath.length;
}

function beginReturnToPatrol(e) {
  let targetX = e.returnTargetX;
  let targetY = e.returnTargetY;
  let targetAngle = e.returnTargetAngle;
  let targetPatrolIndex = e.patrolIndex;

  if (e.patrolRoute.length > 0) {
    let bestIndex = 0;
    let bestD2 = Infinity;
    for (let i = 0; i < e.patrolRoute.length; i++) {
      const node = e.patrolRoute[i];
      const d2 = (node.x - e.x) ** 2 + (node.y - e.y) ** 2;
      if (d2 < bestD2) {
        bestD2 = d2;
        bestIndex = i;
      }
    }

    const node = e.patrolRoute[bestIndex];
    targetX = node.x;
    targetY = node.y;
    targetPatrolIndex = bestIndex;

    if (node.sweep === 0) {
      const next = e.patrolRoute[(bestIndex + 1) % e.patrolRoute.length];
      targetAngle = Math.atan2(next.x - node.x, -(next.y - node.y));
    }
  }

  e.returnTargetX = targetX;
  e.returnTargetY = targetY;
  e.returnTargetAngle = targetAngle;
  e.returnPatrolIndex = targetPatrolIndex;
  e.searchPath = buildPath(e.x, e.y, targetX, targetY);
  e.searchPathIndex = 0;
  e.state = 'returning';
}

function finishReturnToPatrol(e) {
  e.x = e.returnTargetX;
  e.y = e.returnTargetY;
  e.state = 'patrol';
  e.targetAngle = e.returnTargetAngle;
  e.patrolIndex = e.returnPatrolIndex;
  e.patrolPauseTimer = 0;
  e.patrolSweepAccum = 0;
  e.reactionTimer = 0;
  e.pendingReaction = null;
  e.cautiousTimer = CAUTIOUS_FRAMES;
}

// Vision cone detection only ??no proximity bubble.
// Proximity is handled separately with a reaction delay.
function enemyCanSeeCone(e) {
  const dx = player.x - e.x, dy = player.y - e.y;
  const dist2 = dx * dx + dy * dy;
  if (!isLitByLamps(player.x, player.y)) return false;
  if (!pawnInCone(e.x, e.y, e.angle, e.visionAngle, player.x, player.y)) return false;
  if (dist2 > e.sightRange * e.sightRange) return false;
  return hasLOS(e.x, e.y, player.x, player.y);
}

function moveTowardPlayer(e, pdx, pdy, pd2) {
  if (pd2 <= ARRIVAL_RADIUS * ARRIVAL_RADIUS) return;

  if (_pathSegmentClear(e.x, e.y, player.x, player.y)) {
    const pd = Math.sqrt(pd2);
    const prevX = e.x, prevY = e.y;
    e.x += (pdx / pd) * e.patrolSpeed;
    e.y += (pdy / pd) * e.patrolSpeed;
    e.targetAngle = Math.atan2(pdx, -pdy);
    pushOutOfWalls(e, ENEMY_RADIUS);
    pushOutOfWalls(e, ENEMY_RADIUS);
    if (Math.abs(e.x - prevX) + Math.abs(e.y - prevY) >= 0.1) return;
  }

  e.searchPath      = buildPath(e.x, e.y, player.x, player.y);
  e.searchPathIndex = 0;
  followNavPath(e);
}

function canShootPlayer(e) {
  if (!hasLOS(e.x, e.y, player.x, player.y)) return false;
  return _pathSegmentClear(e.x, e.y, player.x, player.y, ENEMY_PROJECTILE_HIT_RADIUS);
}

function fireEnemyShot(e) {
  if (e.shotSpeed <= 0) return;

  const baseAngle = Math.atan2(player.x - e.x, -(player.y - e.y));
  const spread = (Math.random() * 2 - 1) * e.aimSpreadRadians;
  const shotAngle = baseAngle + spread;
  const dx = Math.sin(shotAngle);
  const dy = -Math.cos(shotAngle);

  enemyProjectiles.push({
    x: e.x + dx * ENEMY_PROJECTILE_SPAWN_OFFSET,
    y: e.y + dy * ENEMY_PROJECTILE_SPAWN_OFFSET,
    vx: dx * e.shotSpeed,
    vy: dy * e.shotSpeed,
    angle: shotAngle,
  });
}

function updateMeleeAlert(e) {
  const pdx = player.x - e.x, pdy = player.y - e.y;
  moveTowardPlayer(e, pdx, pdy, pdx * pdx + pdy * pdy);
}

function updateShooterAlert(e) {
  const pdx = player.x - e.x, pdy = player.y - e.y;
  const pd2 = pdx * pdx + pdy * pdy;
  const dist = Math.sqrt(pd2);
  const canShoot = canShootPlayer(e);

  e.targetAngle = Math.atan2(pdx, -pdy);
  if (e.shotTimer > 0) e.shotTimer--;

  if (!canShoot) {
    moveTowardPlayer(e, pdx, pdy, pd2);
    return;
  }

  if (dist > e.shootingRange) {
    moveTowardPlayer(e, pdx, pdy, pd2);
    return;
  }

  if (e.shotTimer <= 0) {
    fireEnemyShot(e);
    e.shotTimer = e.shotCooldownFrames;
  }
}

function updatePrecisionAlert(e) {
  updateShooterAlert(e);
}

function updateAlertBehavior(e) {
  if (e.archetype === 'shooter') {
    updateShooterAlert(e);
  } else if (e.archetype === 'precision') {
    updatePrecisionAlert(e);
  } else {
    updateMeleeAlert(e);
  }
}

function updateEnemyProjectiles() {
  for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
    const p = enemyProjectiles[i];
    p.x += p.vx;
    p.y += p.vy;

    const dx = p.x - player.x;
    const dy = p.y - player.y;
    const hitPlayer = dx * dx + dy * dy <= (PLAYER_RADIUS + ENEMY_PROJECTILE_HIT_RADIUS) ** 2;
    const outOfBounds = p.x < 0 || p.x > ENEMY_GAME_WIDTH || p.y < 0 || p.y > ENEMY_GAME_HEIGHT;

    if (hitPlayer) {
      playerHitFlashTimer = PLAYER_HIT_FLASH_FRAMES;
    }

    if (hitPlayer || hitsWall(p.x, p.y) || outOfBounds) {
      enemyProjectiles.splice(i, 1);
    }
  }
}

function updateEnemies() {
  // Tick sound event lifetimes
  for (let i = soundEvents.length - 1; i >= 0; i--) {
    soundEvents[i].life--;
    if (soundEvents[i].life <= 0) soundEvents.splice(i, 1);
  }
  updateEnemyProjectiles();
  if (playerHitFlashTimer > 0) playerHitFlashTimer--;

  for (const e of enemies) {

    // 1. Tick reaction delay ??apply pending state change when it expires
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
            e.suspicionPhase      = 'moving';
            e.suspicionReturnX    = e.x;
            e.suspicionReturnY    = e.y;
            e.suspicionSearchAccum = 0;
            e.searchPath          = buildPath(e.x, e.y, e.suspicionSourceX, e.suspicionSourceY);
            e.searchPathIndex     = 0;
          } else {
            e.suspicionPhase = 'turning';
          }
        }
        if (e.state === 'alert') e.alertTimer = ALERT_FRAMES;
        e.pendingReaction = null;
      }
    }

    // 2. Vision cone detection.
    // Patrol/search detection is immediate; suspicious detection must confirm briefly.
    if (enemyCanSeeCone(e)) {
      const angle = Math.atan2(player.x - e.x, -(player.y - e.y));
      e.targetAngle = angle;
      e.lastKnownX = player.x;
      e.lastKnownY = player.y;

      if (e.state === 'suspicious') {
        scheduleReaction(e, 'alert', angle, player.x, player.y, SUSPICION_CONFIRM_DELAY);
      } else {
        e.reactionTimer   = 0;
        e.pendingReaction = null;
        e.state      = 'alert';
        e.alertTimer = ALERT_FRAMES;
      }
    }
    // 3. Delayed: proximity detection ??only when not already reacting or alert
    else if (e.reactionTimer === 0 && e.state !== 'alert') {
      const dx = player.x - e.x, dy = player.y - e.y;
      if (dx * dx + dy * dy <= e.proximityRadius * e.proximityRadius) {
        const angle = Math.atan2(player.x - e.x, -(player.y - e.y));
        scheduleReaction(e, 'alert', angle);
      }
    }

    // 4. Suspicious state ??first suspicion turns in place; later suspicions move/search/return.
    if (e.state === 'suspicious') {
      e.suspicionTimer++;

      if (e.suspicionPhase === 'turning') {
        if (e.suspicionTimer >= SUSPICION_TIMEOUT) {
          e.state = 'patrol';
          e.targetAngle = e.suspicionOriginalAngle; // restore original facing
          e.reactionTimer = 0;
          e.pendingReaction = null;
          e.cautiousTimer = CAUTIOUS_FRAMES;
        }

      } else if (e.suspicionPhase === 'moving') {
        // Move through the nav graph to the source of suspicion.
        if (followNavPath(e)) {
          e.suspicionPhase     = 'searching';
          e.suspicionSearchAccum = 0;
        }
        // Failsafe: if stuck moving too long, skip to return
        if (e.suspicionTimer >= SUSPICION_TIMEOUT * 3) {
          e.suspicionPhase  = 'returning';
          e.searchPath      = buildPath(e.x, e.y, e.suspicionReturnX, e.suspicionReturnY);
          e.searchPathIndex = 0;
        }

      } else if (e.suspicionPhase === 'searching') {
        // Small rotation at source ??looks around for the threat
        e.targetAngle          += 0.01;
        e.suspicionSearchAccum += 0.01;
        if (e.suspicionSearchAccum >= Math.PI) {
          e.suspicionPhase  = 'returning';
          e.searchPath      = buildPath(e.x, e.y, e.suspicionReturnX, e.suspicionReturnY);
          e.searchPathIndex = 0;
        }

      } else if (e.suspicionPhase === 'returning') {
        // Nav-path back to the position where suspicion first triggered
        if (followNavPath(e)) {
          e.state = 'patrol';
          e.targetAngle = e.suspicionOriginalAngle;
          e.reactionTimer = 0;
          e.pendingReaction = null;
          e.cautiousTimer = CAUTIOUS_FRAMES;
        }
      }
      // Path B (sight while suspicious) handled by step 2: as enemy turns/moves, if player
      // enters the lit cone ??immediate alert regardless of suspicion phase.
    }

    // 5. Alert pursuit + countdown.
    // Step 2 has already pinned alertTimer to ALERT_FRAMES this frame if player is visible,
    // so the decrement below cannot expire while LOS holds.
    if (e.state === 'alert') {
      updateAlertBehavior(e);
      e.alertTimer--;
      if (e.alertTimer <= 0) {
        if (e.lastKnownX !== null) {
          e.state            = 'searching';
          e.searchPath       = buildPath(e.x, e.y, e.lastKnownX, e.lastKnownY);
          e.searchPathIndex  = 0;
          e.searchSweepAccum = 0;
        } else {
          // Sound-only alert (never confirmed a sight) ??path home before resuming.
          beginReturnToPatrol(e);
        }
      }
    }

    // 5b. Searching ??navigate nav path to lastKnown, then sweep ~270째.
    // Sight re-acquisition during search is handled by step 2 (overrides to alert).
    if (e.state === 'searching') {
      if (followNavPath(e)) {
        e.targetAngle      += SEARCH_SWEEP_RATE;
        e.searchSweepAccum += SEARCH_SWEEP_RATE;
        // Sweep done with no re-acquisition ??path back to patrol/home before resuming.
        if (e.searchSweepAccum >= Math.PI * 1.5) {
          beginReturnToPatrol(e);
        }
      }
    }

    // 5c. Returning ??reactive searches use nav paths back to the normal patrol/home spot.
    if (e.state === 'returning') {
      if (followNavPath(e)) {
        finishReturnToPatrol(e);
      }
    }

    // 6. Patrol movement ??only when in patrol state with a defined route
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
        // Enemy footstep ring (visual only ??does not alert other enemies)
        if (e.x !== prevX || e.y !== prevY) {
          e.enemyFootstepTimer++;
          if (e.enemyFootstepTimer >= 30) {
            e.enemyFootstepTimer = 0;
            const fRadius = e.proximityRadius + (e.patrolSpeed / WALK_SPEED) * (FOOTSTEP_RADIUS - e.proximityRadius);
            soundEvents.push({ x: e.x, y: e.y, radius: fRadius, life: SOUND_LIFETIME });
          }
        }
      } else {
        // At node ??sweep then pause then advance
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

    if (e.cautiousTimer > 0) e.cautiousTimer--;
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
    ctx.lineWidth   = scaleEnemyUnit(isGunshot ? 2 : 1);
    ctx.beginPath();
    ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  if (playerHitFlashTimer > 0) {
    ctx.save();
    ctx.globalAlpha = 0.22 * (playerHitFlashTimer / PLAYER_HIT_FLASH_FRAMES);
    ctx.fillStyle = '#ff3333';
    ctx.fillRect(0, 0, ENEMY_GAME_WIDTH, ENEMY_GAME_HEIGHT);
    ctx.restore();
  }
}

function drawEnemyProjectiles() {
  ctx.strokeStyle = '#ff4a32';
  ctx.lineWidth = scaleEnemyUnit(2);
  for (const p of enemyProjectiles) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.beginPath();
    ctx.moveTo(0, -scaleEnemyUnit(8));
    ctx.lineTo(0, scaleEnemyUnit(8));
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
  ctx.lineWidth = scaleEnemyUnit(1.5);
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
    const isCautious  = e.state === 'searching' || e.state === 'returning' || (e.state === 'patrol' && e.cautiousTimer > 0);
    const isReacting  = e.reactionTimer > 0;

    // Reaction delay ring ??contracting white circle shows the opportunity window
    if (isReacting) {
      const reactionDelay = e.state === 'suspicious' && e.pendingReaction?.state === 'alert'
        ? SUSPICION_CONFIRM_DELAY
        : REACTION_DELAY;
      const progress = e.reactionTimer / reactionDelay; // 1 ??0 as timer counts down
      const ringR    = e.proximityRadius * progress;
      ctx.save();
      ctx.globalAlpha = 0.7 * progress;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth   = scaleEnemyUnit(2);
      ctx.beginPath();
      ctx.arc(e.x, e.y, ringR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(e.angle);
    ctx.scale(scaleEnemyUnit(1), scaleEnemyUnit(1));

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

    // Overhead indicator ??only when enemy is visible to player
    const showIndicator = (isAlert || isSuspicious || isCautious)
                        && inVisionCone(e.x, e.y) && isLit(e.x, e.y);
    if (showIndicator) {
      ctx.save();
      ctx.font = `bold ${scaleEnemyUnit(18)}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = isAlert ? '#ffe066' : (isSuspicious ? '#ffcc44' : '#aaaaaa');
      ctx.fillText(isAlert ? '!' : '?', e.x, e.y - scaleEnemyUnit(38));
      ctx.restore();
    }
  }

  drawEnemyProjectiles();
}

// Always-visible debug number labels ??drawn after fog in game.js so they show through darkness
function drawEnemyLabels() {
  for (const e of enemies) {
    ctx.save();
    ctx.font = `bold ${scaleEnemyUnit(13)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Dark backing pill for readability
    const label = String(e.index);
    const lx = e.x, ly = e.y - scaleEnemyUnit(56);
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.beginPath();
    ctx.arc(lx, ly, scaleEnemyUnit(10), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#00e5ff';
    ctx.fillText(label, lx, ly);
    ctx.restore();
  }
}

resetEnemies();
