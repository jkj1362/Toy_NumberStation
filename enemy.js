const ENEMY_DESIGN_WIDTH = ACTIVE_MISSION.world.designWidth;
const ENEMY_DESIGN_HEIGHT = ACTIVE_MISSION.world.designHeight;
const ENEMY_GAME_WIDTH = ACTIVE_MISSION.world.width;
const ENEMY_GAME_HEIGHT = ACTIVE_MISSION.world.height;
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
    proximityRadius: enemyProximityRadius(),
    patrolSpeed: enemyPatrolSpeed(),
    shootingRange: e.archetype === 'shooter' ? enemyShootingRange() : scaleEnemyUnit(e.shootingRange ?? 0),
    shootingRangeTolerance: e.archetype === 'shooter' ? enemyShootingRangeTolerance() : scaleEnemyUnit(e.shootingRangeTolerance ?? 0),
    shotSpeed: e.archetype === 'shooter' ? enemyShotSpeed() : scaleEnemyUnit(e.shotSpeed ?? 0),
    shotCooldownFrames: e.archetype === 'shooter' ? enemyShotCooldownFrames() : (e.shotCooldownFrames ?? 0),
    aimSpreadRadians: e.archetype === 'shooter' ? enemyAimSpreadRadians() : (e.aimSpreadRadians ?? 0),
    patrolRoute: e.patrolRoute.map(scaleEnemyPoint),
  };
}

const ENEMY_HIT_RADIUS  = scaleEnemyUnit(20);
const ALERT_FRAMES      = 180;   // 3 s at 60 fps
const SUSPICION_TIMEOUT = 300;   //  5 s at 60 fps ??no-input timeout for level-1 suspicion
const REACTION_DELAY    = 45;    // 0.75 s ??window of opportunity before enemy reacts
const SUSPICION_CONFIRM_DELAY = 10; // brief confirmation when an already-suspicious guard detects another stimulus
const ARRIVAL_RADIUS    = scaleEnemyUnit(8);     // px ??enemy considered "at" a waypoint within this distance
const ENEMY_RADIUS      = scaleEnemyUnit(16);    // px ??collision radius for pushOutOfWalls during patrol
const ENEMY_PROJECTILE_HIT_RADIUS = scaleEnemyUnit(18);
const ENEMY_PROJECTILE_SPAWN_OFFSET = scaleEnemyUnit(20);
const ENEMY_MAX_HEALTH = 100;
const ENEMY_PROJECTILE_DAMAGE = 50;
const ENEMY_MELEE_DAMAGE = 25;
const ENEMY_MELEE_RANGE = scaleEnemyUnit(18);
const ENEMY_MELEE_COOLDOWN_FRAMES = 60;
const PLAYER_HIT_FLASH_FRAMES = 18;
const ENEMY_HIT_FLASH_FRAMES = 10;
const ENEMY_PLAYER_VISIBILITY_SAMPLE_RADIUS = scaleEnemyUnit(18);
const ENEMY_DOORWAY_ARRIVAL_RADIUS = scaleEnemyUnit(36);
const ENEMY_DOORWAY_OPEN_RADIUS = ENEMY_RADIUS + ENEMY_DOORWAY_ARRIVAL_RADIUS;
const ENEMY_EVENT_MEMORY_FRAMES = 900;
const ENEMY_SHOT_MEMORY_FRAMES = 300;
const ENEMY_IMPACT_CONFIRMATION_FRAMES = 180;
const ENEMY_SUSPICION_TEAM_SIZE = 4;
const ENEMY_COMPANION_ASSIGNMENT_PRIORITY = 350;

const SHOT_REACTION_RANK = Object.freeze({
  heardImpact: 100,
  witnessedImpact: 200,
  heardGunshot: 300,
  muzzleFlash: 400,
});

const STANDARD_VISION = Math.PI * 2 / 3; // 120 deg, matches VISION_ANGLE in player.js

const SEARCH_SWEEP_RATE = 0.016; // 270째 over ~5 s at 60 fps
const CAUTIOUS_FRAMES   = 1800;  // 30 s ??lingering vigilance after returning to patrol

function enemyTunedUnit(key, fallback) {
  return scaleEnemyUnit(typeof getTuningNumber === 'function' ? getTuningNumber(key, fallback) : fallback);
}

function enemyAlertFrames() { return typeof getTuningNumber === 'function' ? getTuningNumber('enemyAlertFrames', ALERT_FRAMES) : ALERT_FRAMES; }
function enemySuspicionTimeout() { return typeof getTuningNumber === 'function' ? getTuningNumber('enemySuspicionTimeout', SUSPICION_TIMEOUT) : SUSPICION_TIMEOUT; }
function enemyReactionDelay() { return typeof getTuningNumber === 'function' ? getTuningNumber('enemyReactionDelay', REACTION_DELAY) : REACTION_DELAY; }
function enemySuspicionConfirmDelay() { return typeof getTuningNumber === 'function' ? getTuningNumber('enemySuspicionConfirmDelay', SUSPICION_CONFIRM_DELAY) : SUSPICION_CONFIRM_DELAY; }
function enemyDamagedDoorConfirmDelay() { return typeof getTuningNumber === 'function' ? getTuningNumber('enemyDamagedDoorConfirmDelay', 90) : 90; }
function enemyArrivalRadius() { return enemyTunedUnit('enemyArrivalRadius', 8); }
function enemyRadius() { return enemyTunedUnit('enemyRadius', 16); }
function enemyHitRadius() { return enemyTunedUnit('enemyHitRadius', 20); }
function enemyProjectileHitRadius() { return enemyTunedUnit('enemyProjectileHitRadius', 18); }
function enemyProjectileSpawnOffset() { return scaleEnemyUnit(20); }
function enemyMaxHealth() { return typeof getTuningNumber === 'function' ? getTuningNumber('enemyMaxHealth', ENEMY_MAX_HEALTH) : ENEMY_MAX_HEALTH; }
function enemyProjectileDamage() { return typeof getTuningNumber === 'function' ? getTuningNumber('enemyProjectileDamage', ENEMY_PROJECTILE_DAMAGE) : ENEMY_PROJECTILE_DAMAGE; }
function enemyProjectilePenetrationPower() { return typeof getTuningNumber === 'function' ? getTuningNumber('enemyProjectilePenetrationPower', 1) : 1; }
function enemyMeleeDamage() { return typeof getTuningNumber === 'function' ? getTuningNumber('enemyMeleeDamage', ENEMY_MELEE_DAMAGE) : ENEMY_MELEE_DAMAGE; }
function enemyMeleeRange() { return enemyTunedUnit('enemyMeleeRange', 18); }
function enemyMeleeCooldownFrames() { return typeof getTuningNumber === 'function' ? getTuningNumber('enemyMeleeCooldownFrames', ENEMY_MELEE_COOLDOWN_FRAMES) : ENEMY_MELEE_COOLDOWN_FRAMES; }
function playerHitFlashFrames() { return typeof getTuningNumber === 'function' ? getTuningNumber('playerHitFlashFrames', PLAYER_HIT_FLASH_FRAMES) : PLAYER_HIT_FLASH_FRAMES; }
function enemyHitFlashFrames() { return typeof getTuningNumber === 'function' ? getTuningNumber('enemyHitFlashFrames', ENEMY_HIT_FLASH_FRAMES) : ENEMY_HIT_FLASH_FRAMES; }
function enemyPlayerVisibilitySampleRadius() { return enemyTunedUnit('enemyPlayerVisibilitySampleRadius', 18); }
function enemyDoorwayArrivalRadius() { return enemyTunedUnit('enemyDoorwayArrivalRadius', 36); }
function enemyDoorwayOpenRadius() { return enemyRadius() + enemyDoorwayArrivalRadius(); }
function enemyVisionAngle() { return typeof getTuningRadians === 'function' ? getTuningRadians('enemyVisionAngleDegrees', 120) : STANDARD_VISION; }
function enemyProximityRadius() { return enemyTunedUnit('enemyProximityRadius', 50); }
function enemyPatrolSpeed() { return enemyTunedUnit('enemyPatrolSpeed', 1.5); }
function enemySuspiciousSpeed() { return enemyTunedUnit('enemySuspiciousSpeed', 1.2); }
function enemyAlertMoveSpeed() { return enemyTunedUnit('enemyAlertSpeed', 2.5); }
function enemyShootingRange() { return enemyTunedUnit('enemyShootingRange', 360); }
function enemyShootingRangeTolerance() { return enemyTunedUnit('enemyShootingRangeTolerance', 40); }
function enemyShotCooldownFrames() { return typeof getTuningNumber === 'function' ? getTuningNumber('enemyShotCooldownFrames', 75) : 75; }
function enemyShotSpeed() { return enemyTunedUnit('enemyShotSpeed', 25); }
function enemyAimSpreadRadians() { return typeof getTuningRadians === 'function' ? getTuningRadians('enemyAimSpreadDegrees', 9) : 0.16; }
function enemySearchSweepRate() { return typeof getTuningNumber === 'function' ? getTuningNumber('enemySearchSweepRate', SEARCH_SWEEP_RATE) : SEARCH_SWEEP_RATE; }
function enemyCautiousFrames() { return typeof getTuningNumber === 'function' ? getTuningNumber('enemyCautiousFrames', CAUTIOUS_FRAMES) : CAUTIOUS_FRAMES; }
function enemyEventMemoryFrames() { return typeof getTuningNumber === 'function' ? getTuningNumber('enemyEventMemoryFrames', ENEMY_EVENT_MEMORY_FRAMES) : ENEMY_EVENT_MEMORY_FRAMES; }
function enemyShotMemoryFrames() { return typeof getTuningNumber === 'function' ? getTuningNumber('enemyShotMemoryFrames', ENEMY_SHOT_MEMORY_FRAMES) : ENEMY_SHOT_MEMORY_FRAMES; }
function enemyImpactConfirmationFrames() { return typeof getTuningNumber === 'function' ? getTuningNumber('enemyImpactConfirmationFrames', ENEMY_IMPACT_CONFIRMATION_FRAMES) : ENEMY_IMPACT_CONFIRMATION_FRAMES; }
function enemySuspicionTeamSize() { return typeof getTuningNumber === 'function' ? getTuningNumber('enemySuspicionTeamSize', ENEMY_SUSPICION_TEAM_SIZE) : ENEMY_SUSPICION_TEAM_SIZE; }
function showEnemySightDebug() { return typeof isDebugOverlayEnabled === 'function' ? isDebugOverlayEnabled('debugEnemySight') : true; }
function showEnemyLabelsDebug() { return typeof isDebugOverlayEnabled === 'function' ? isDebugOverlayEnabled('debugEnemyLabels') : true; }
function showHiddenEnemiesDebug() { return typeof isDebugOverlayEnabled === 'function' ? isDebugOverlayEnabled('debugHiddenEnemies') : false; }

// Reactive navigation graph ??used by SEARCHING state to path to lastKnownX/Y.
// Patrol routes use hand-placed waypoints; this graph is only for buildPath().
function getMissionNavigationPoint(node) {
  if (node.roomId) {
    const room = ACTIVE_MISSION.rooms.find(item => item.id === node.roomId);
    return room?.center ?? null;
  }
  if (node.connectorId) {
    const connector = ACTIVE_MISSION.connectors.find(item => item.id === node.connectorId);
    return connector?.position ?? null;
  }
  return null;
}

const NAV_NODES = Object.fromEntries(ACTIVE_MISSION.enemies.navigation.nodes.map(node => {
  const point = getMissionNavigationPoint(node);
  if (!point) throw new Error(`Mission navigation node "${node.id}" has no valid position source.`);
  return [node.id, scaleEnemyPoint(point)];
}));

const NAV_EDGES = ACTIVE_MISSION.enemies.navigation.edges.map(edge => [...edge]);

function _pointHitsExpandedWall(x, y, radius = enemyRadius()) {
  const blockers = typeof getMovementBlockers === 'function' ? getMovementBlockers() : WALLS;
  for (const wall of blockers) {
    if (x > wall.x - radius && x < wall.x + wall.w + radius &&
        y > wall.y - radius && y < wall.y + wall.h + radius) {
      return true;
    }
  }
  if (typeof pointHitsDoorPanel === 'function' && typeof DOORS !== 'undefined') {
    for (const door of DOORS) {
      if (pointHitsDoorPanel(door, x, y, radius)) return true;
    }
  }
  return false;
}

function _pathSegmentClear(x1, y1, x2, y2, radius = enemyRadius()) {
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

function _pathSegmentHitsOpenDoorPanel(x1, y1, x2, y2, radius = enemyRadius()) {
  if (typeof pointHitsDoorPanel !== 'function' || typeof DOORS === 'undefined') return false;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const steps = Math.max(1, Math.ceil(dist / Math.max(1, radius * 0.5)));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    for (const door of DOORS) {
      if (pointHitsDoorPanel(door, x1 + dx * t, y1 + dy * t, radius)) return true;
    }
  }
  return false;
}

function _getOpenDoorDetourNodes(radius = enemyRadius()) {
  if (typeof DOORS === 'undefined' || typeof getDoorHinge !== 'function' ||
      typeof rotateDoorPoint !== 'function' || typeof getDoorSwingAngle !== 'function') return {};
  const nodes = {};
  const clearance = radius + scaleEnemyUnit(4);
  for (const door of DOORS) {
    if (door.state === 'closed' || door.state === 'destroyed') continue;
    const hinge = getDoorHinge(door);
    const angle = getDoorSwingAngle(door);
    const localCorners = [
      { x: hinge.rectX - clearance, y: hinge.rectY - clearance },
      { x: hinge.rectX + door.w + clearance, y: hinge.rectY - clearance },
      { x: hinge.rectX + door.w + clearance, y: hinge.rectY + door.h + clearance },
      { x: hinge.rectX - clearance, y: hinge.rectY + door.h + clearance },
    ];
    localCorners.forEach((point, index) => {
      const rotated = rotateDoorPoint(point.x, point.y, angle);
      nodes[`door_${door.id}_${index}`] = { x: hinge.x + rotated.x, y: hinge.y + rotated.y };
    });
  }
  return nodes;
}

function _pointNearNavGap(x, y) {
  const gapRadiusSq = enemyDoorwayArrivalRadius() ** 2;
  for (const id in NAV_NODES) {
    if (!id.startsWith('gap_')) continue;
    const gap = NAV_NODES[id];
    const dx = x - gap.x;
    const dy = y - gap.y;
    if (dx * dx + dy * dy <= gapRadiusSq) return true;
  }
  return false;
}

function _pointNearDoorway(x, y) {
  if (_pointNearNavGap(x, y)) return true;
  if (typeof DOORS === 'undefined' || !Array.isArray(DOORS)) return false;

  const doorwayRadiusSq = enemyDoorwayArrivalRadius() ** 2;
  for (const door of DOORS) {
    if (typeof distanceSqToRect === 'function' && distanceSqToRect(door, x, y) <= doorwayRadiusSq) {
      return true;
    }

    const cx = door.x + door.w / 2;
    const cy = door.y + door.h / 2;
    const dx = x - cx;
    const dy = y - cy;
    if (dx * dx + dy * dy <= doorwayRadiusSq) return true;
  }
  return false;
}

function _findDoorwayTransitDoor(x, y) {
  if (typeof DOORS === 'undefined' || !Array.isArray(DOORS)) return null;
  let bestDoor = null;
  let bestD2 = Infinity;
  const pad = enemyRadius() * 0.75;

  for (const door of DOORS) {
    if (door.state !== 'open' && door.state !== 'closing' && door.state !== 'destroyed') continue;
    const left = door.x - pad;
    const right = door.x + door.w + pad;
    const top = door.y - pad;
    const bottom = door.y + door.h + pad;
    if (x < left || x > right || y < top || y > bottom) continue;

    const cx = door.x + door.w / 2;
    const cy = door.y + door.h / 2;
    const d2 = (x - cx) ** 2 + (y - cy) ** 2;
    if (d2 < bestD2) {
      bestD2 = d2;
      bestDoor = door;
    }
  }

  return bestDoor;
}

function _doorwayTransitTarget(door, targetX, targetY) {
  const cx = door.x + door.w / 2;
  const cy = door.y + door.h / 2;
  const laneInset = enemyRadius() * 1.4;

  if (door.orientation === 'horizontal') {
    const exitY = targetY >= cy ? door.y + door.h + enemyRadius() : door.y - enemyRadius();
    const laneX = door.state === 'destroyed' ? cx : Math.max(cx, door.x + door.w - laneInset);
    return { x: laneX, y: exitY };
  }

  const exitX = targetX >= cx ? door.x + door.w + enemyRadius() : door.x - enemyRadius();
  const laneY = door.state === 'destroyed' ? cy : Math.max(cy, door.y + door.h - laneInset);
  return { x: exitX, y: laneY };
}

function _waypointArrivalRadius(wp) {
  if (typeof wp.arrivalRadius === 'number') return wp.arrivalRadius;
  return _pointNearDoorway(wp.x, wp.y) ? enemyDoorwayArrivalRadius() : enemyArrivalRadius();
}

function _getEnemyFootstepSoundRadius(e) {
  if (typeof enemyFootstepCueRadius === 'function') return enemyFootstepCueRadius();
  if (typeof WALK_SPEED === 'number' && typeof FOOTSTEP_RADIUS === 'number') {
    return e.proximityRadius + (e.patrolSpeed / WALK_SPEED) * (FOOTSTEP_RADIUS - e.proximityRadius);
  }
  return e.proximityRadius;
}

function _emitEnemyMovementSound(e, moved) {
  if (!moved || typeof emitSoundEvent !== 'function') return;
  const interval = typeof enemyFootstepCueInterval === 'function' ? enemyFootstepCueInterval() : 30;
  e.enemyFootstepTimer++;
  if (e.enemyFootstepTimer < interval) return;
  e.enemyFootstepTimer = 0;

  emitSoundEvent({
    x: e.x,
    y: e.y,
    radius: _getEnemyFootstepSoundRadius(e),
    sourceType: 'enemy',
    sourceActor: e,
    canAlertEnemies: false,
  });
}

function _stepEnemyToward(e, targetX, targetY) {
  const excludedDoorId = e.damagedDoorInvestigation?.doorId ?? e.alertDoorTransit?.doorId ?? null;
  if (typeof openDoorNearEntity === 'function') {
    openDoorNearEntity(e, enemyDoorwayOpenRadius(), excludedDoorId);
  }
  const transitDoor = _findDoorwayTransitDoor(e.x, e.y);
  if (transitDoor) {
    const transitTarget = _doorwayTransitTarget(transitDoor, targetX, targetY);
    targetX = transitTarget.x;
    targetY = transitTarget.y;
  }

  const dx = targetX - e.x;
  const dy = targetY - e.y;
  const d2 = dx * dx + dy * dy;
  if (d2 <= 0) return { moved: false, stalled: true, closer: false };

  const d = Math.sqrt(d2);
  const prevX = e.x;
  const prevY = e.y;
  const returningFromSuspicion = e.state === 'suspicious' && (
    e.suspicionPhase === 'returning' ||
    e.suspicionPhase === 'door_exiting' ||
    e.suspicionPhase === 'door_closing' ||
    e.suspicionPhase === 'door_returning'
  );
  const movementSpeed = e.state === 'alert'
    ? enemyAlertMoveSpeed()
    : (e.state === 'suspicious' && !returningFromSuspicion ? enemySuspiciousSpeed() : e.patrolSpeed);
  e.x += (dx / d) * movementSpeed;
  e.y += (dy / d) * movementSpeed;
  e.targetAngle = Math.atan2(dx, -dy);
  pushOutOfWalls(e, enemyRadius());
  pushOutOfWalls(e, enemyRadius());

  const movedDist = Math.hypot(e.x - prevX, e.y - prevY);
  const newDx = targetX - e.x;
  const newDy = targetY - e.y;
  const newD2 = newDx * newDx + newDy * newDy;
  const minProgressSq = Math.max(0.01, (movementSpeed * 0.25) ** 2);
  const closer = newD2 < d2 - minProgressSq;
  const step = {
    moved: movedDist >= 0.1,
    stalled: movedDist < 0.1 || !closer,
    closer,
  };
  _emitEnemyMovementSound(e, step.moved);
  return step;
}

function _getDoorById(doorId) {
  if (typeof DOORS === 'undefined' || !Array.isArray(DOORS)) return null;
  return DOORS.find(door => door.id === doorId) ?? null;
}

function _getDoorInvestigationPoints(door, listenerX, listenerY) {
  const cx = door.x + door.w / 2;
  const cy = door.y + door.h / 2;
  const approachOffset = enemyRadius() * 1.6;
  const sweepDepth = Math.max(door.w, door.h) + enemyRadius() * 2;
  const laneInset = enemyRadius() * 1.4;

  if (door.orientation === 'horizontal') {
    const listenerSign = listenerY < cy ? -1 : 1;
    const laneX = Math.max(cx, door.x + door.w - laneInset);
    return {
      approachX: laneX,
      approachY: cy + listenerSign * (door.h / 2 + approachOffset),
      searchX: laneX,
      searchY: cy - listenerSign * (door.h / 2 + sweepDepth),
    };
  }

  const listenerSign = listenerX < cx ? -1 : 1;
  const laneY = Math.max(cy, door.y + door.h - laneInset);
  return {
    approachX: cx + listenerSign * (door.w / 2 + approachOffset),
    approachY: laneY,
    searchX: cx - listenerSign * (door.w / 2 + sweepDepth),
    searchY: laneY,
  };
}

// Ordered [{x,y}] waypoints through the nav graph. Start and goal are connected
// only to nodes they can actually reach without crossing expanded wall collision.
function buildPath(fromX, fromY, toX, toY) {
  const doorDetourNodes = _getOpenDoorDetourNodes();
  const nodes = {
    start: { x: fromX, y: fromY },
    goal:  { x: toX, y: toY },
    ...NAV_NODES,
    ...doorDetourNodes,
  };
  const adj = {};
  for (const id in nodes) adj[id] = [];
  for (const [u, v] of NAV_EDGES) {
    if (_pathSegmentHitsOpenDoorPanel(nodes[u].x, nodes[u].y, nodes[v].x, nodes[v].y)) continue;
    adj[u].push(v);
    adj[v].push(u);
  }

  const connectDynamic = (a, b) => {
    if (_pathSegmentClear(nodes[a].x, nodes[a].y, nodes[b].x, nodes[b].y)) {
      adj[a].push(b);
      adj[b].push(a);
    }
  };

  const dynamicIds = ['start', 'goal', ...Object.keys(doorDetourNodes)];
  for (const dynamicId of dynamicIds) {
    for (const id in nodes) {
      if (id === dynamicId || adj[dynamicId].includes(id)) continue;
      connectDynamic(dynamicId, id);
    }
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
const INITIAL_ENEMIES = ACTIVE_MISSION.enemies.spawns.map(scaleEnemyConfig);

let enemies      = [];
let enemyProjectiles = [];
let playerHitFlashTimer = 0;
let enemyIncidentFrame = 0;
let nextEnemyIncidentId = 1;
const suspicionCases = new Map();

function applyEnemyTuning(e) {
  if (!e) return;
  e.visionAngle = enemyVisionAngle();
  e.proximityRadius = enemyProximityRadius();
  e.patrolSpeed = enemyPatrolSpeed();
  e.maxHealth = enemyMaxHealth();
  e.health = Math.min(e.health, e.maxHealth);
  if (e.archetype === 'shooter' || e.archetype === 'precision') {
    e.shootingRange = enemyShootingRange();
    e.shootingRangeTolerance = enemyShootingRangeTolerance();
    e.shotCooldownFrames = enemyShotCooldownFrames();
    e.shotSpeed = enemyShotSpeed();
    e.aimSpreadRadians = enemyAimSpreadRadians();
    e.shotTimer = Math.min(e.shotTimer, e.shotCooldownFrames);
  }
}

function applyEnemyTuningToAll() {
  for (const enemy of enemies) applyEnemyTuning(enemy);
}

function resetEnemies() {
  enemies = INITIAL_ENEMIES.map((e, i) => ({
    ...e,
    index:              i + 1, // 1-based debug label
    projectileTargetId: e.id ?? `enemy_${i + 1}`,
    state:              'patrol',
    alertTimer:         0,
    suspicionTimer:     0,
    reactionTimer:      0,    // counts down; state change held until 0
    pendingReaction:    null, // { state, targetAngle, sourceX, sourceY }
    alertEpisode:       0,
    alertReason:        null,
    currentIncident:    null,
    alertTargetIncidentId: null,
    alertTargetSlot:    null,
    companionAssignment: null,
    playerVisibleThisFrame: false,
    observedCorpses:    new Set(),
    observedDoorEvidence: new Map(),
    observedBrokenLamps: new Set(),
    observedBrokenWindows: new Set(),
    observedAlertEpisodes: new Set(),
    observedIncidentIds: new Map(),
    shotReactions:      new Map(),
    recentBallisticImpacts: new Map(),
    suspicionLevel:     0,    // how many times enemy has entered suspicious from patrol
    suspicionPhase:     'turning', // 'turning'|'moving'|'searching'|'returning'
    suspicionSourceX:   0,    // world position of the suspicious stimulus
    suspicionSourceY:   0,
    suspicionReturnX:   0,    // position to return to after investigation
    suspicionReturnY:   0,
    suspicionSearchAccum:  0,  // accumulated search rotation at source
    suspicionOriginalAngle: 0, // targetAngle saved on suspicion entry; restored on return to patrol
    suspicionReason:    null,
    suspicionReturnPatrolIndex: 0,
    suspicionReturnPauseTimer: 0,
    suspicionReturnSweepAccum: 0,
    suspicionCaseId:    null,
    suspicionCaseSlot:  null,
    suspicionRole:      null,
    doorInvestigation: null,
    damagedDoorInvestigation: null,
    alertDoorTransit:  null,
    patrolIndex:        0,    // current target waypoint index
    patrolPauseTimer:   0,    // counts up; node done when it reaches node.pauseFrames
    patrolSweepAccum:   0,    // accumulated |rotation| at current node
    enemyFootstepTimer: 0,    // counts up; emits footstep every 30 frames while moving
    maxHealth:          enemyMaxHealth(),
    health:             enemyMaxHealth(),
    alive:              true,
    hitFlashTimer:      0,
    meleeCooldownTimer: 0,
    lastKnownX:         null, // active alert/search destination: direct sight or inferred approach point
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
  applyEnemyTuningToAll();
  if (typeof resetSoundSystem === 'function') resetSoundSystem();
  enemyProjectiles.length = 0;
  playerHitFlashTimer = 0;
  enemyIncidentFrame = 0;
  nextEnemyIncidentId = 1;
  suspicionCases.clear();
}

function damageEnemy(e, amount) {
  if (!e || e.health <= 0 || e.alive === false) return true;
  e.health = Math.max(0, e.health - amount);
  e.hitFlashTimer = enemyHitFlashFrames();
  if (e.health <= 0) {
    e.alive = false;
    if (typeof emitSound === 'function') {
      emitSound({
        x: e.x,
        y: e.y,
        radius: typeof soundBodyFallRadius === 'function' ? soundBodyFallRadius() : scaleEnemyUnit(140),
        sourceType: 'body-fall',
        sourceActor: e,
      });
    }
  }
  return e.health <= 0;
}

function enemyAlertReasonPriority(reason) {
  switch (reason) {
    case 'player':        return 500;
    case 'gunshot':       return 450;
    case 'corpse':        return 400;
    case 'alerted-enemy': return ENEMY_COMPANION_ASSIGNMENT_PRIORITY;
    case 'impact':
    case 'door-impact':
    case 'lamp-impact':   return 300;
    case 'door':
    case 'damaged-door':
    case 'broken-lamp':
    case 'broken-window': return 250;
    case 'impact-heard':  return 150;
    case 'sound':         return 100;
    default:              return 0;
  }
}

function createEnemyIncident(reason, x, y, options = {}) {
  const shotId = options.shotId ?? null;
  return {
    id: options.id ?? (shotId !== null ? `shot:${shotId}` : `incident:${nextEnemyIncidentId++}`),
    reason,
    priority: options.priority ?? enemyAlertReasonPriority(reason),
    x,
    y,
    frame: options.frame ?? enemyIncidentFrame,
    shotId,
    sourceType: options.sourceType ?? 'unknown',
    confirmedPlayer: options.confirmedPlayer === true,
    routeRank: options.routeRank ?? 0,
    informationQuality: options.informationQuality ?? 0,
    localization: options.localization ?? null,
    geometryId: options.geometryId ?? null,
    geometryType: options.geometryType ?? null,
    destroyed: options.destroyed === true,
    caseId: options.caseId ?? null,
  };
}

function createShotIncident(shotId, reason, x, y, options = {}) {
  return createEnemyIncident(reason, x, y, { ...options, shotId });
}

function pruneEnemyEventMemory(e) {
  const eventCutoff = enemyIncidentFrame - enemyEventMemoryFrames();
  for (const [eventId, memory] of e.observedIncidentIds) {
    const frame = typeof memory === 'number' ? memory : (memory.memoryFrame ?? memory.frame);
    if (frame < eventCutoff) e.observedIncidentIds.delete(eventId);
  }
  const shotCutoff = enemyIncidentFrame - enemyShotMemoryFrames();
  for (const [shotId, reaction] of e.shotReactions) {
    if (reaction.frame < shotCutoff) e.shotReactions.delete(shotId);
  }
  const impactCutoff = enemyIncidentFrame - enemyImpactConfirmationFrames();
  for (const [shotId, frame] of e.recentBallisticImpacts) {
    if (frame < impactCutoff) e.recentBallisticImpacts.delete(shotId);
  }
  while (e.observedIncidentIds.size > 64) {
    e.observedIncidentIds.delete(e.observedIncidentIds.keys().next().value);
  }
  while (e.shotReactions.size > 64) {
    e.shotReactions.delete(e.shotReactions.keys().next().value);
  }
  while (e.recentBallisticImpacts.size > 64) {
    e.recentBallisticImpacts.delete(e.recentBallisticImpacts.keys().next().value);
  }
}

function recordEnemyShotReaction(e, shotId, rank, kind, informationQuality = 0) {
  if (shotId === null || shotId === undefined) return 'new';
  pruneEnemyEventMemory(e);
  const previous = e.shotReactions.get(shotId);
  if (previous) {
    if (previous.rank > rank) return false;
    if (previous.rank === rank && (previous.informationQuality ?? 0) >= informationQuality) return false;
  }
  const result = previous && previous.rank === rank ? 'refinement' : (previous ? 'upgrade' : 'new');
  e.shotReactions.set(shotId, { rank, kind, informationQuality, frame: enemyIncidentFrame });
  return result;
}

function getEnemyCurrentIncidentPriority(e) {
  return e.currentIncident?.priority ?? enemyAlertReasonPriority(e.alertReason);
}

function compareIncidentInformation(incoming, known) {
  if (!incoming) return -1;
  if (!known) return 1;
  const incomingPriority = incoming.priority ?? enemyAlertReasonPriority(incoming.reason);
  const knownPriority = known.priority ?? enemyAlertReasonPriority(known.reason);
  if (incomingPriority !== knownPriority) return incomingPriority - knownPriority;
  const incomingRoute = incoming.routeRank ?? 0;
  const knownRoute = known.routeRank ?? 0;
  if (incomingRoute !== knownRoute) return incomingRoute - knownRoute;
  return (incoming.informationQuality ?? 0) - (known.informationQuality ?? 0);
}

function getRememberedEnemyIncident(e, incidentId) {
  const memory = e.observedIncidentIds.get(incidentId);
  if (!memory || typeof memory === 'number') return memory ? { frame: memory } : null;
  return memory;
}

function enemyAlreadyKnowsIncident(e, incident) {
  if (!incident?.id) return false;
  const known = getRememberedEnemyIncident(e, incident.id);
  return !!known && compareIncidentInformation(incident, known) <= 0;
}

function rememberEnemyIncident(e, incident) {
  if (!incident?.id) return false;
  const known = getRememberedEnemyIncident(e, incident.id);
  if (known && compareIncidentInformation(incident, known) <= 0) return false;
  e.observedIncidentIds.set(incident.id, {
    ...incident,
    memoryFrame: enemyIncidentFrame,
  });
  while (e.observedIncidentIds.size > 64) {
    e.observedIncidentIds.delete(e.observedIncidentIds.keys().next().value);
  }
  return true;
}

function getImpactProminence(details = {}) {
  if (details.destroyed === true || details.impactKind === 'destruction') return 4;
  if (details.geometryType === 'window') return 3;
  if (details.geometryType === 'door' && details.material === 'metal') return 2;
  if (details.geometryType === 'door') return 1.5;
  return 1;
}

function getPerceptionInformationQuality(localization, prominence = 1, distance = Infinity, audibility = 0) {
  const localizationRank = {
    muffled: 1,
    vague: 2,
    clear: 3,
    exact: 4,
  }[localization] ?? 0;
  const boundedAudibility = Math.max(0, Math.min(1, Number.isFinite(audibility) ? audibility : 0));
  const boundedDistance = Number.isFinite(distance) ? Math.min(9999, Math.max(0, distance)) : 9999;
  return localizationRank * 1_000_000 + prominence * 10_000 + boundedAudibility * 1_000 - boundedDistance * 0.01;
}

function getSoundInformationQuality(sound, path) {
  const audibility = path?.effectiveRadius > 0
    ? 1 - Math.min(1, path.distance / path.effectiveRadius)
    : 0;
  return getPerceptionInformationQuality(
    path?.localization ?? 'muffled',
    sound?.isProjectileImpact ? getImpactProminence(sound) : 1,
    path?.distance,
    audibility
  );
}

function getWitnessInformationQuality(e, details) {
  return getPerceptionInformationQuality(
    'exact',
    getImpactProminence(details),
    Math.hypot(details.x - e.x, details.y - e.y),
    1
  );
}

function recordBallisticImpactConfirmation(e, shotId) {
  if (shotId === null || shotId === undefined) return false;
  const cutoff = enemyIncidentFrame - enemyImpactConfirmationFrames();
  for (const [knownShotId, frame] of e.recentBallisticImpacts) {
    if (frame < cutoff) e.recentBallisticImpacts.delete(knownShotId);
  }
  if (e.recentBallisticImpacts.has(shotId)) return false;
  e.recentBallisticImpacts.set(shotId, enemyIncidentFrame);
  return e.recentBallisticImpacts.size >= 2;
}

function pruneSuspicionCases() {
  const cutoff = enemyIncidentFrame - enemyEventMemoryFrames();
  for (const [caseId, searchCase] of suspicionCases) {
    if (searchCase.lastFrame < cutoff) suspicionCases.delete(caseId);
  }
  while (suspicionCases.size > 64) {
    suspicionCases.delete(suspicionCases.keys().next().value);
  }
}

function reserveSuspicionCaseMember(e, incident, fromCompanion = false) {
  if (!incident?.id) return { accepted: !fromCompanion, caseId: null, slot: null, role: 'support' };
  pruneSuspicionCases();
  const caseId = incident.caseId ?? incident.id;
  incident.caseId = caseId;
  let searchCase = suspicionCases.get(caseId);
  if (!searchCase) {
    searchCase = {
      id: caseId,
      createdFrame: incident.frame ?? enemyIncidentFrame,
      lastFrame: enemyIncidentFrame,
      members: new Map(),
      escalated: false,
    };
    suspicionCases.set(caseId, searchCase);
  }
  searchCase.lastFrame = enemyIncidentFrame;

  if (searchCase.members.has(e.index)) {
    return {
      accepted: true,
      caseId,
      slot: searchCase.members.get(e.index),
      role: 'investigator',
    };
  }

  const teamSize = Math.max(1, Math.round(enemySuspicionTeamSize()));
  if (searchCase.members.size >= teamSize) {
    return {
      accepted: !fromCompanion,
      caseId,
      slot: null,
      role: 'support',
    };
  }

  const usedSlots = new Set(searchCase.members.values());
  let slot = 0;
  while (usedSlots.has(slot)) slot++;
  searchCase.members.set(e.index, slot);
  return { accepted: true, caseId, slot, role: 'investigator' };
}

function getSuspicionCaseSearchPoint(e, incident, slot) {
  if (!incident || slot === null || slot === undefined || slot <= 0) {
    return { x: incident?.x ?? e.x, y: incident?.y ?? e.y };
  }

  const radius = scaleEnemyUnit(slot === 3 ? 52 : 40);
  const baseAngle = (slot - 1) * (Math.PI * 2 / 3);
  const candidates = [];
  for (let offset = 0; offset < 6; offset++) {
    const angle = baseAngle + offset * (Math.PI / 3);
    candidates.push({
      x: incident.x + Math.cos(angle) * radius,
      y: incident.y + Math.sin(angle) * radius,
    });
  }
  return candidates.find(point => !_pointHitsExpandedWall(point.x, point.y, enemyRadius() * 0.75))
    ?? { x: incident.x, y: incident.y };
}

function getAlertTargetSlotPoint(sourceX, sourceY, slot) {
  if (slot <= 0) return { x: sourceX, y: sourceY };

  const positionsPerRing = 6;
  const ring = Math.ceil(slot / positionsPerRing);
  const position = (slot - 1) % positionsPerRing;
  const spacing = enemyRadius() * 2 + scaleEnemyUnit(8);
  const angle = position * (Math.PI * 2 / positionsPerRing) +
    (ring % 2 === 0 ? Math.PI / positionsPerRing : 0);
  return {
    x: sourceX + Math.cos(angle) * spacing * ring,
    y: sourceY + Math.sin(angle) * spacing * ring,
  };
}

function assignEnemyAlertTarget(e, incident, sourceX, sourceY, confirmedPlayer = false, reason = incident?.reason) {
  if (confirmedPlayer || reason === 'player' || !incident?.id) {
    e.alertTargetIncidentId = null;
    e.alertTargetSlot = null;
    return { x: sourceX, y: sourceY };
  }

  let slot = e.alertTargetIncidentId === incident.id ? e.alertTargetSlot : null;
  if (slot !== null && slot !== undefined) {
    const reservedPoint = getAlertTargetSlotPoint(sourceX, sourceY, slot);
    if (_pointHitsExpandedWall(reservedPoint.x, reservedPoint.y, enemyRadius() * 0.75)) slot = null;
  }
  if (slot === null || slot === undefined) {
    const usedSlots = new Set();
    for (const other of enemies) {
      if (other !== e && other.alive !== false && other.alertTargetIncidentId === incident.id &&
          other.alertTargetSlot !== null && other.alertTargetSlot !== undefined) {
        usedSlots.add(other.alertTargetSlot);
      }
    }

    const candidateCount = Math.max(24, enemies.length * 4);
    let bestSlot = null;
    let bestScore = Infinity;
    for (let candidateSlot = 0; candidateSlot < candidateCount; candidateSlot++) {
      if (usedSlots.has(candidateSlot)) continue;
      const point = getAlertTargetSlotPoint(sourceX, sourceY, candidateSlot);
      if (_pointHitsExpandedWall(point.x, point.y, enemyRadius() * 0.75)) continue;
      const sourceOffset = Math.hypot(point.x - sourceX, point.y - sourceY);
      const score = Math.hypot(point.x - e.x, point.y - e.y) + sourceOffset * 2;
      if (score < bestScore) {
        bestScore = score;
        bestSlot = candidateSlot;
      }
    }
    slot = bestSlot;
  }

  if (slot === null || slot === undefined) {
    e.alertTargetIncidentId = null;
    e.alertTargetSlot = null;
    return { x: sourceX, y: sourceY };
  }

  e.alertTargetIncidentId = incident.id;
  e.alertTargetSlot = slot;
  return getAlertTargetSlotPoint(sourceX, sourceY, slot);
}

function markSuspicionCaseEscalated(e) {
  const caseId = e.suspicionCaseId ?? e.currentIncident?.caseId;
  if (!caseId) return;
  const searchCase = suspicionCases.get(caseId);
  if (searchCase) {
    searchCase.escalated = true;
    searchCase.lastFrame = enemyIncidentFrame;
  }
}

function refineEnemyIncident(e, incident, reason = incident?.reason) {
  if (!incident?.id) return false;
  const current = e.currentIncident;
  const pendingIncident = e.pendingReaction?.incident;
  const known = current?.id === incident.id
    ? current
    : (pendingIncident?.id === incident.id ? pendingIncident : getRememberedEnemyIncident(e, incident.id));
  if (known && compareIncidentInformation(incident, known) <= 0) return false;

  rememberEnemyIncident(e, incident);
  if (e.reactionTimer > 0 && e.pendingReaction) {
    const pending = e.pendingReaction;
    pending.incident = { ...incident };
    pending.reason = reason;
    if (pending.state === 'suspicious') {
      const assignment = reserveSuspicionCaseMember(e, pending.incident, false);
      const target = getSuspicionCaseSearchPoint(e, pending.incident, assignment.slot);
      pending.sourceX = target.x;
      pending.sourceY = target.y;
      pending.targetAngle = Math.atan2(target.x - e.x, -(target.y - e.y));
      pending.suspicionCaseId = assignment.caseId;
      pending.suspicionCaseSlot = assignment.slot;
      pending.suspicionRole = assignment.role;
      pending.forceInvestigation = assignment.role === 'investigator';
    } else {
      pending.sourceX = incident.x;
      pending.sourceY = incident.y;
      pending.targetAngle = Math.atan2(incident.x - e.x, -(incident.y - e.y));
    }
    return true;
  }

  if (e.state === 'suspicious') {
    const assignment = reserveSuspicionCaseMember(e, incident, false);
    const target = getSuspicionCaseSearchPoint(e, incident, assignment.slot);
    e.currentIncident = { ...incident };
    e.suspicionReason = reason;
    e.suspicionCaseId = assignment.caseId;
    e.suspicionCaseSlot = assignment.slot;
    e.suspicionRole = assignment.role;
    e.suspicionSourceX = target.x;
    e.suspicionSourceY = target.y;
    e.targetAngle = Math.atan2(target.x - e.x, -(target.y - e.y));
    if (assignment.role === 'investigator') {
      e.suspicionPhase = 'moving';
      e.suspicionSearchAccum = 0;
      e.searchPath = buildPath(e.x, e.y, target.x, target.y);
      e.searchPathIndex = 0;
    }
    return true;
  }

  if (e.state === 'alert') {
    const previousPriority = getEnemyCurrentIncidentPriority(e);
    const incomingPriority = incident.priority ?? enemyAlertReasonPriority(reason);
    e.currentIncident = { ...incident };
    e.alertReason = reason;
    const target = assignEnemyAlertTarget(
      e,
      incident,
      incident.x,
      incident.y,
      incident.confirmedPlayer === true,
      reason
    );
    e.lastKnownX = target.x;
    e.lastKnownY = target.y;
    e.targetAngle = Math.atan2(target.x - e.x, -(target.y - e.y));
    if (incomingPriority > previousPriority) {
      e.doorInvestigation = null;
      e.damagedDoorInvestigation = null;
      e.alertDoorTransit = null;
      e.companionAssignment = null;
    }
    e.searchPath = buildPath(e.x, e.y, target.x, target.y);
    e.searchPathIndex = 0;
    return true;
  }

  return false;
}

// Queue a delayed state change. Does nothing if already reacting (existing pending wins).
function scheduleReaction(e, toState, targetAngle, sourceX = e.x, sourceY = e.y, delayFrames = enemyReactionDelay(), reason = 'sound', incident = null, options = {}) {
  const reactionIncident = incident ?? createEnemyIncident(reason, sourceX, sourceY);
  if (e.reactionTimer > 0) {
    const pendingPriority = e.pendingReaction?.incident?.priority ?? enemyAlertReasonPriority(e.pendingReaction?.reason);
    const isIndependentConfirmation = options.independentConfirmation === true &&
      reactionIncident.id !== e.pendingReaction?.incident?.id;
    if (reactionIncident.priority <= pendingPriority && !isIndependentConfirmation) return false;
    delayFrames = Math.min(e.reactionTimer, delayFrames);
  }

  let suspicionAssignment = null;
  if (toState === 'suspicious') {
    suspicionAssignment = reserveSuspicionCaseMember(e, reactionIncident, options.fromCompanionSuspicion === true);
    if (!suspicionAssignment.accepted) return false;
    const target = getSuspicionCaseSearchPoint(e, reactionIncident, suspicionAssignment.slot);
    sourceX = target.x;
    sourceY = target.y;
    targetAngle = Math.atan2(sourceX - e.x, -(sourceY - e.y));
  }

  e.reactionTimer   = delayFrames;
  e.pendingReaction = {
    state: toState,
    targetAngle,
    sourceX,
    sourceY,
    reason,
    incident: reactionIncident,
    suspicionCaseId: suspicionAssignment?.caseId ?? null,
    suspicionCaseSlot: suspicionAssignment?.slot ?? null,
    suspicionRole: suspicionAssignment?.role ?? null,
  };
  return true;
}

function enterEnemyAlert(e, targetX, targetY, confirmedPlayer = false, reason = 'sound', incident = null, options = {}) {
  const wasAlert = e.state === 'alert';
  let incomingIncident = incident;
  if (!incomingIncident && reason === 'player' && e.currentIncident?.reason === 'player') {
    incomingIncident = {
      ...e.currentIncident,
      x: targetX,
      y: targetY,
      confirmedPlayer: confirmedPlayer || e.currentIncident.confirmedPlayer,
    };
  }
  if (!incomingIncident) {
    incomingIncident = createEnemyIncident(reason, targetX, targetY, { confirmedPlayer });
  }
  const incomingPriority = incomingIncident.priority ?? enemyAlertReasonPriority(reason);
  const currentPriority = e.companionAssignment && incomingIncident.id !== e.companionAssignment.incidentId
    ? ENEMY_COMPANION_ASSIGNMENT_PRIORITY
    : getEnemyCurrentIncidentPriority(e);
  const replacesAlertSource = options.forceReplace === true || !wasAlert || incomingPriority >= currentPriority;
  markSuspicionCaseEscalated(e);
  e.state = 'alert';
  e.alertTimer = enemyAlertFrames();
  if (replacesAlertSource) {
    e.reactionTimer = 0;
    e.pendingReaction = null;
    e.doorInvestigation = null;
    e.damagedDoorInvestigation = null;
    e.alertDoorTransit = null;
    e.suspicionReason = null;
    e.alertReason = reason;
    e.currentIncident = { ...incomingIncident, x: targetX, y: targetY };
    const alertTarget = assignEnemyAlertTarget(
      e,
      e.currentIncident,
      targetX,
      targetY,
      confirmedPlayer,
      reason
    );
    e.lastKnownX = alertTarget.x;
    e.lastKnownY = alertTarget.y;
    rememberEnemyIncident(e, e.currentIncident);
    e.targetAngle = Math.atan2(alertTarget.x - e.x, -(alertTarget.y - e.y));
    e.playerVisibleThisFrame = confirmedPlayer;
    if (options.fromCompanion === true) {
      e.companionAssignment = {
        incidentId: incomingIncident.id,
        sourceEnemyIndex: options.sourceEnemyIndex ?? null,
        x: targetX,
        y: targetY,
      };
    } else {
      e.companionAssignment = null;
    }
  }
  if (!wasAlert) e.alertEpisode++;
  return replacesAlertSource;
}

function acceptCompanionIncident(e, sourceEnemy, incident) {
  if (!incident?.id) return false;
  const alreadyKnows = enemyAlreadyKnowsIncident(e, incident);
  if (e.state === 'alert' && alreadyKnows) return false;

  if (e.state === 'alert' && e.currentIncident?.id === incident.id) {
    if (incident.shotId !== null && incident.shotId !== undefined && incident.routeRank) {
      recordEnemyShotReaction(e, incident.shotId, incident.routeRank, 'companion-update', incident.informationQuality);
    }
    return refineEnemyIncident(e, incident, incident.reason);
  }

  const currentPriority = getEnemyCurrentIncidentPriority(e);
  if (e.state === 'alert' && e.currentIncident &&
      compareIncidentInformation(incident, e.currentIncident) <= 0) {
    rememberEnemyIncident(e, incident);
    return false;
  }
  if (e.currentIncident && currentPriority > incident.priority) {
    rememberEnemyIncident(e, incident);
    if (e.state !== 'alert') {
      enterEnemyAlert(
        e,
        e.currentIncident.x,
        e.currentIncident.y,
        e.currentIncident.confirmedPlayer === true,
        e.currentIncident.reason,
        e.currentIncident,
        { forceReplace: true }
      );
    }
    return false;
  }
  rememberEnemyIncident(e, incident);
  if (incident.shotId !== null && incident.shotId !== undefined && incident.routeRank) {
    recordEnemyShotReaction(e, incident.shotId, incident.routeRank, 'companion-alert', incident.informationQuality);
  }
  return enterEnemyAlert(
    e,
    incident.x,
    incident.y,
    false,
    incident.reason,
    { ...incident },
    { fromCompanion: true, sourceEnemyIndex: sourceEnemy?.index ?? null, forceReplace: true }
  );
}

function suspicionCaseCanRecruit(e, caseId) {
  const searchCase = suspicionCases.get(caseId);
  if (!searchCase || searchCase.escalated) return false;
  if (e.suspicionCaseId === caseId || searchCase.members.has(e.index)) return true;
  return searchCase.members.size < Math.max(1, Math.round(enemySuspicionTeamSize()));
}

function acceptSuspiciousCompanionIncident(e, sourceEnemy, incident) {
  if (!incident?.id || e.state === 'alert') return false;
  const caseId = incident.caseId ?? sourceEnemy?.suspicionCaseId ?? incident.id;
  const sharedIncident = { ...incident, caseId };
  const alreadyKnows = enemyAlreadyKnowsIncident(e, sharedIncident);

  if (e.state === 'suspicious' && e.suspicionCaseId === caseId) {
    if (alreadyKnows) return false;
    if (sharedIncident.shotId !== null && sharedIncident.shotId !== undefined && sharedIncident.routeRank) {
      recordEnemyShotReaction(
        e,
        sharedIncident.shotId,
        sharedIncident.routeRank,
        'companion-suspicion-update',
        sharedIncident.informationQuality
      );
    }
    return refineEnemyIncident(e, sharedIncident, sharedIncident.reason);
  }

  if (alreadyKnows || !suspicionCaseCanRecruit(e, caseId)) return false;
  const angle = Math.atan2(sharedIncident.x - e.x, -(sharedIncident.y - e.y));
  const scheduled = scheduleReaction(
    e,
    'suspicious',
    angle,
    sharedIncident.x,
    sharedIncident.y,
    enemyReactionDelay(),
    sharedIncident.reason,
    sharedIncident,
    { fromCompanionSuspicion: true }
  );
  if (!scheduled || !e.pendingReaction) return false;
  if (sharedIncident.shotId !== null && sharedIncident.shotId !== undefined && sharedIncident.routeRank) {
    recordEnemyShotReaction(
      e,
      sharedIncident.shotId,
      sharedIncident.routeRank,
      'companion-suspicion',
      sharedIncident.informationQuality
    );
  }
  e.pendingReaction.forceInvestigation = e.pendingReaction.suspicionRole === 'investigator';
  e.pendingReaction.fromCompanionSuspicion = true;
  return true;
}

function scheduleMuffledDoorInvestigation(e, doorId, sourceX, sourceY, reason = 'sound', incident = null) {
  if (e.state !== 'patrol' || e.reactionTimer > 0) return false;
  const door = _getDoorById(doorId);
  if (!door || door.state !== 'closed') return false;
  const doorX = door.x + door.w / 2;
  const doorY = door.y + door.h / 2;
  const angle = Math.atan2(doorX - e.x, -(doorY - e.y));
  scheduleReaction(e, 'suspicious', angle, doorX, doorY, enemyReactionDelay(), reason, incident);
  if (!e.pendingReaction) return false;
  e.pendingReaction.doorInvestigation = { doorId, sourceX, sourceY };
  return true;
}

function scheduleDamagedDoorInvestigation(e, doorId) {
  if (e.state === 'alert' || e.reactionTimer > 0) return false;
  const door = _getDoorById(doorId);
  if (!door || door.state === 'destroyed' || door.hp >= door.maxHp) return false;
  const doorX = door.x + door.w / 2;
  const doorY = door.y + door.h / 2;
  const angle = Math.atan2(doorX - e.x, -(doorY - e.y));
  const incident = createEnemyIncident('damaged-door', doorX, doorY, {
    id: `door-damaged:${door.id}:${Math.round(door.hp)}`,
    caseId: e.state === 'suspicious' ? e.suspicionCaseId : null,
    geometryId: door.id,
    geometryType: 'door',
  });
  scheduleReaction(e, 'suspicious', angle, doorX, doorY, enemyReactionDelay(), 'damaged-door', incident);
  if (!e.pendingReaction) return false;
  e.pendingReaction.damagedDoorInvestigation = { doorId };
  return true;
}

// Apply sound-triggered state transitions for one enemy.
// Used by both emitSound (gunshots/footsteps) and notifyPlayerMoved.
function applySoundReaction(e, sourceX, sourceY, reason = 'sound', incident = null) {
  const reactionIncident = incident ?? createEnemyIncident(reason, sourceX, sourceY);
  if (e.companionAssignment && enemyAlertReasonPriority(reason) <= ENEMY_COMPANION_ASSIGNMENT_PRIORITY) {
    if (e.state === 'alert') e.alertTimer = enemyAlertFrames();
    return false;
  }
  const angle = Math.atan2(sourceX - e.x, -(sourceY - e.y));
  if (reactionIncident.sameShotRefinement === true &&
      (e.currentIncident?.id === reactionIncident.id || e.pendingReaction?.incident?.id === reactionIncident.id)) {
    return refineEnemyIncident(e, reactionIncident, reason);
  }
  if (reason === 'gunshot' && e.reactionTimer > 0 &&
      e.pendingReaction?.state === 'suspicious' && e.pendingReaction?.reason === 'gunshot' &&
      e.pendingReaction?.incident?.id !== reactionIncident.id) {
    return scheduleReaction(
      e,
      'alert',
      angle,
      sourceX,
      sourceY,
      enemySuspicionConfirmDelay(),
      reason,
      reactionIncident,
      { independentConfirmation: true }
    );
  }
  if (e.state === 'patrol') {
    scheduleReaction(e, 'suspicious', angle, sourceX, sourceY, enemyReactionDelay(), reason, reactionIncident);
  } else if (e.state === 'suspicious') {
    // Second sound while suspicious ??confirmed alert after a short lock-on delay.
    e.targetAngle = angle;
    scheduleReaction(e, 'alert', angle, sourceX, sourceY, enemySuspicionConfirmDelay(), reason, reactionIncident);
  } else if (e.state === 'searching' || e.state === 'returning' || (e.state === 'patrol' && e.cautiousTimer > 0)) {
    // Already on edge ??any sound snaps straight to alert, skipping suspicion delay
    enterEnemyAlert(e, sourceX, sourceY, false, reason, reactionIncident);
  } else if (e.state === 'alert') {
    if (enemyAlertReasonPriority(reason) >= enemyAlertReasonPriority(e.alertReason)) {
      enterEnemyAlert(e, sourceX, sourceY, false, reason, reactionIncident);
    } else {
      e.alertTimer = enemyAlertFrames();
    }
  }
  return true;
}

function scheduleHeardImpactInvestigation(e, sourceX, sourceY, incident) {
  if (e.companionAssignment || e.state === 'alert' || e.doorInvestigation || e.damagedDoorInvestigation) {
    if (e.state === 'alert') e.alertTimer = enemyAlertFrames();
    return false;
  }

  if (e.state === 'suspicious' && e.suspicionCaseId && !incident.caseId) {
    incident.caseId = e.suspicionCaseId;
  }
  const angle = Math.atan2(sourceX - e.x, -(sourceY - e.y));
  if (e.reactionTimer > 0 && e.pendingReaction?.state === 'suspicious') {
    const pendingPriority = e.pendingReaction.incident?.priority ?? enemyAlertReasonPriority(e.pendingReaction.reason);
    if (incident.priority < pendingPriority) return false;
    e.pendingReaction = {
      ...e.pendingReaction,
      targetAngle: angle,
      sourceX,
      sourceY,
      reason: 'impact-heard',
      incident,
      forceInvestigation: true,
      doorInvestigation: null,
      damagedDoorInvestigation: null,
    };
    return true;
  }

  if (e.state !== 'suspicious') {
    scheduleReaction(e, 'suspicious', angle, sourceX, sourceY, enemyReactionDelay(), 'impact-heard', incident);
    if (!e.pendingReaction) return false;
    e.pendingReaction.forceInvestigation = true;
    return true;
  }

  e.reactionTimer = 0;
  e.pendingReaction = null;
  e.currentIncident = { ...incident };
  rememberEnemyIncident(e, incident);
  e.suspicionReason = 'impact-heard';
  e.suspicionTimer = 0;
  e.suspicionSourceX = sourceX;
  e.suspicionSourceY = sourceY;
  if (e.suspicionPhase === 'turning') {
    e.suspicionReturnX = e.x;
    e.suspicionReturnY = e.y;
  }
  e.suspicionPhase = 'moving';
  e.suspicionSearchAccum = 0;
  e.searchPath = buildPath(e.x, e.y, sourceX, sourceY);
  e.searchPathIndex = 0;
  return true;
}

function handleProjectileImpactReaction(e, sound, path) {
  if (!path?.heard) return false;
  const informationQuality = getSoundInformationQuality(sound, path);
  const shotDecision = recordEnemyShotReaction(
    e,
    sound.shotId,
    SHOT_REACTION_RANK.heardImpact,
    sound.destroyed ? 'heard-destruction' : 'heard-impact',
    informationQuality
  );
  if (!shotDecision) return false;
  const reactionPoint = typeof getEnemyImpactReactionPoint === 'function'
    ? getEnemyImpactReactionPoint(e, sound, path)
    : getEnemySoundReactionPoint(path);
  const incident = createShotIncident(sound.shotId, 'impact-heard', reactionPoint.x, reactionPoint.y, {
    sourceType: sound.sourceType,
    routeRank: SHOT_REACTION_RANK.heardImpact,
    informationQuality,
    localization: path.localization,
    geometryId: sound.geometryId,
    geometryType: sound.geometryType,
    destroyed: sound.destroyed === true,
  });
  incident.sameShotRefinement = shotDecision === 'refinement';
  if (recordBallisticImpactConfirmation(e, sound.shotId) && e.state !== 'alert') {
    const angle = Math.atan2(reactionPoint.x - e.x, -(reactionPoint.y - e.y));
    return scheduleReaction(
      e,
      'alert',
      angle,
      reactionPoint.x,
      reactionPoint.y,
      enemySuspicionConfirmDelay(),
      'impact-heard',
      incident,
      { independentConfirmation: true }
    );
  }
  return scheduleHeardImpactInvestigation(e, reactionPoint.x, reactionPoint.y, incident);
}

function processMuzzleFlashStimuli(e) {
  if (typeof getMuzzleFlashEvents !== 'function') return false;
  let handled = false;
  for (const flash of getMuzzleFlashEvents()) {
    if (flash.sourceActor === e || flash.life <= 0) continue;
    const dx = flash.x - e.x;
    const dy = flash.y - e.y;
    if (dx * dx + dy * dy > flash.radius * flash.radius) continue;
    if (!enemyCanSeeWorldPoint(e, flash.x, flash.y, false)) continue;
    const informationQuality = getPerceptionInformationQuality(
      'exact',
      1,
      Math.hypot(dx, dy),
      1
    );
    if (!recordEnemyShotReaction(
      e,
      flash.shotId,
      SHOT_REACTION_RANK.muzzleFlash,
      'muzzle-flash',
      informationQuality
    )) continue;

    if (flash.sourceType === 'player') {
      const incident = createShotIncident(flash.shotId, 'player', flash.x, flash.y, {
        sourceType: 'player',
        confirmedPlayer: true,
        routeRank: SHOT_REACTION_RANK.muzzleFlash,
        informationQuality,
        localization: 'exact',
      });
      enterEnemyAlert(e, flash.x, flash.y, true, 'player', incident, { forceReplace: true });
      handled = true;
      continue;
    }

    if (flash.sourceType === 'enemy' && flash.sourceActor?.currentIncident) {
      acceptCompanionIncident(e, flash.sourceActor, flash.sourceActor.currentIncident);
      handled = true;
    }
  }
  return handled;
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

function getPlayerVisibilitySamples() {
  const r = enemyPlayerVisibilitySampleRadius();
  return [
    { x: player.x,     y: player.y },
    { x: player.x + r, y: player.y },
    { x: player.x - r, y: player.y },
    { x: player.x,     y: player.y + r },
    { x: player.x,     y: player.y - r },
  ];
}

function enemyCanSeeWorldPoint(e, x, y, requireLight = true) {
  const dx = x - e.x;
  const dy = y - e.y;
  if (dx * dx + dy * dy > e.sightRange * e.sightRange) return false;
  if (requireLight && !isLitByLamps(x, y)) return false;
  if (!pawnInCone(e.x, e.y, e.angle, e.visionAngle, x, y)) return false;
  return hasLOS(e.x, e.y, x, y);
}

function enemyCanSeeDoor(e, door) {
  const closest = typeof closestPointOnRect === 'function'
    ? closestPointOnRect(door, e.x, e.y)
    : { x: door.x + door.w / 2, y: door.y + door.h / 2 };
  const samples = [
    closest,
    { x: door.x + door.w / 2, y: door.y + door.h / 2 },
    { x: door.x, y: door.y + door.h / 2 },
    { x: door.x + door.w, y: door.y + door.h / 2 },
    { x: door.x + door.w / 2, y: door.y },
    { x: door.x + door.w / 2, y: door.y + door.h },
  ];
  return samples.some(sample => enemyCanSeeWorldPoint(e, sample.x, sample.y));
}

function detectVisibleCorpseStimulus(e) {
  if (typeof corpses !== 'undefined' && Array.isArray(corpses)) {
    for (const corpse of corpses) {
      if (corpse.type !== 'enemy' || e.observedCorpses.has(corpse)) continue;
      if (!enemyCanSeeWorldPoint(e, corpse.x, corpse.y)) continue;
      e.observedCorpses.add(corpse);
      return { type: 'corpse', x: corpse.x, y: corpse.y };
    }
  }

  return null;
}

function applyVisibleCorpseOverride(e) {
  const corpseStimulus = detectVisibleCorpseStimulus(e);
  if (!corpseStimulus) return false;
  enterEnemyAlert(e, corpseStimulus.x, corpseStimulus.y, false, 'corpse');
  return true;
}

function detectVisibleCompanionIncident(e) {
  for (const other of enemies) {
    if (other === e || other.alive === false || other.state !== 'alert' || !other.currentIncident) continue;
    if (e.state === 'alert' && enemyAlreadyKnowsIncident(e, other.currentIncident)) continue;
    if (!enemyCanSeeWorldPoint(e, other.x, other.y)) continue;
    return { sourceEnemy: other, incident: { ...other.currentIncident } };
  }
  return null;
}

function detectVisibleSuspiciousCompanionIncident(e) {
  if (e.state === 'alert') return null;
  for (const other of enemies) {
    if (other === e || other.alive === false || other.state !== 'suspicious' || !other.currentIncident) continue;
    const caseId = other.suspicionCaseId ?? other.currentIncident.caseId ?? other.currentIncident.id;
    const searchCase = suspicionCases.get(caseId);
    if (!searchCase || searchCase.escalated) continue;
    const incident = { ...other.currentIncident, caseId };
    if (enemyAlreadyKnowsIncident(e, incident)) continue;
    if (!suspicionCaseCanRecruit(e, caseId)) continue;
    if (!enemyCanSeeWorldPoint(e, other.x, other.y)) continue;
    return { sourceEnemy: other, incident };
  }
  return null;
}

function getLampEvidenceId(lamp) {
  return lamp?.projectileTargetId ?? null;
}

function getLampInvestigationPoint(lamp) {
  const standOff = enemyRadius() + scaleEnemyUnit(8);
  if (lamp.wallSide === 'N') return { x: lamp.lightX, y: lamp.lightY + standOff };
  if (lamp.wallSide === 'S') return { x: lamp.lightX, y: lamp.lightY - standOff };
  if (lamp.wallSide === 'E') return { x: lamp.lightX - standOff, y: lamp.lightY };
  return { x: lamp.lightX + standOff, y: lamp.lightY };
}

function scheduleBrokenLampInvestigation(e, stimulus) {
  if (!stimulus || e.state === 'alert' || e.reactionTimer > 0) return false;
  const incident = createEnemyIncident('broken-lamp', stimulus.x, stimulus.y, {
    id: `lamp-broken:${stimulus.lampId}`,
    caseId: e.state === 'suspicious' ? e.suspicionCaseId : null,
    geometryId: stimulus.lampId,
    geometryType: 'lamp',
    destroyed: true,
  });
  if (e.state === 'suspicious') {
    return refineEnemyIncident(e, incident, 'broken-lamp');
  }
  const angle = Math.atan2(stimulus.x - e.x, -(stimulus.y - e.y));
  scheduleReaction(e, 'suspicious', angle, stimulus.x, stimulus.y, enemyReactionDelay(), 'broken-lamp', incident);
  if (!e.pendingReaction) return false;
  e.pendingReaction.forceInvestigation = true;
  return true;
}

function scheduleBrokenWindowInvestigation(e, stimulus) {
  if (!stimulus || e.state === 'alert' || e.reactionTimer > 0) return false;
  const incident = createEnemyIncident('broken-window', stimulus.x, stimulus.y, {
    id: `window-broken:${stimulus.windowId}`,
    caseId: e.state === 'suspicious' ? e.suspicionCaseId : null,
    geometryId: stimulus.windowId,
    geometryType: 'window',
    destroyed: true,
  });
  if (e.state === 'suspicious') {
    return refineEnemyIncident(e, incident, 'broken-window');
  }
  const angle = Math.atan2(stimulus.x - e.x, -(stimulus.y - e.y));
  scheduleReaction(e, 'suspicious', angle, stimulus.x, stimulus.y, enemyReactionDelay(), 'broken-window', incident);
  if (!e.pendingReaction) return false;
  e.pendingReaction.forceInvestigation = e.pendingReaction.suspicionRole === 'investigator';
  return true;
}

function notifyLampDestroyed(lamp, impactX, impactY, sourceActor = null, shotId = null, sourceType = 'unknown') {
  const lampId = getLampEvidenceId(lamp);
  if (!lamp || !lampId) return;
  const investigationPoint = getLampInvestigationPoint(lamp);
  for (const e of enemies) {
    if (e === sourceActor || e.alive === false) continue;
    if (!enemyCanSeeWorldPoint(e, impactX, impactY, false)) continue;
    e.observedBrokenLamps.add(lampId);
    const informationQuality = getWitnessInformationQuality(e, {
      x: impactX,
      y: impactY,
      geometryType: 'lamp',
      destroyed: true,
    });
    if (!recordEnemyShotReaction(
      e,
      shotId,
      SHOT_REACTION_RANK.witnessedImpact,
      'witnessed-lamp-impact',
      informationQuality
    )) continue;
    const incident = createShotIncident(shotId, 'lamp-impact', investigationPoint.x, investigationPoint.y, {
      sourceType,
      routeRank: SHOT_REACTION_RANK.witnessedImpact,
      informationQuality,
      localization: 'exact',
      geometryId: lampId,
      geometryType: 'lamp',
      destroyed: true,
    });
    enterEnemyAlert(e, investigationPoint.x, investigationPoint.y, false, 'lamp-impact', incident);
  }
}

function detectLocalVisualStimulus(e, skipCorpses = false) {
  if (!skipCorpses) {
    const corpseStimulus = detectVisibleCorpseStimulus(e);
    if (corpseStimulus) return corpseStimulus;
  }

  if (typeof DOORS !== 'undefined' && Array.isArray(DOORS)) {
    for (const door of DOORS) {
      const damaged = door.hp < door.maxHp;
      if (!damaged && door.state !== 'destroyed') continue;
      const evidenceState = `${door.state}:${Math.round(door.hp)}`;
      if (e.observedDoorEvidence.get(door.id) === evidenceState) continue;
      const x = door.x + door.w / 2;
      const y = door.y + door.h / 2;
      if (!enemyCanSeeDoor(e, door)) continue;
      e.observedDoorEvidence.set(door.id, evidenceState);
      return {
        type: 'door',
        doorId: door.id,
        damaged: door.state !== 'destroyed',
        x,
        y,
      };
    }
  }

  if (typeof lightingLamps !== 'undefined' && Array.isArray(lightingLamps)) {
    for (const lamp of lightingLamps) {
      const lampId = getLampEvidenceId(lamp);
      if (lamp.active || !lampId || e.observedBrokenLamps.has(lampId)) continue;
      if (!enemyCanSeeWorldPoint(e, lamp.lightX, lamp.lightY, false)) continue;
      e.observedBrokenLamps.add(lampId);
      const investigationPoint = getLampInvestigationPoint(lamp);
      return {
        type: 'broken-lamp',
        lampId,
        x: investigationPoint.x,
        y: investigationPoint.y,
      };
    }
  }

  if (typeof WINDOWS !== 'undefined' && Array.isArray(WINDOWS)) {
    for (const windowGeometry of WINDOWS) {
      if (windowGeometry.state !== 'destroyed' || e.observedBrokenWindows.has(windowGeometry.id)) continue;
      const centerX = windowGeometry.x + windowGeometry.w / 2;
      const centerY = windowGeometry.y + windowGeometry.h / 2;
      if (!enemyCanSeeWorldPoint(e, centerX, centerY)) continue;
      e.observedBrokenWindows.add(windowGeometry.id);
      const investigationPoint = getImpactInvestigationPoint(e, {
        x: centerX,
        y: centerY,
        geometryX: windowGeometry.x,
        geometryY: windowGeometry.y,
        geometryW: windowGeometry.w,
        geometryH: windowGeometry.h,
      });
      return {
        type: 'broken-window',
        windowId: windowGeometry.id,
        x: investigationPoint.x,
        y: investigationPoint.y,
      };
    }
  }

  return null;
}

function notifyDoorDamaged(door, impactX, impactY, sourceActor = null, shotId = null, sourceType = 'unknown') {
  if (!door) return;
  for (const e of enemies) {
    if (e === sourceActor || e.alive === false) continue;
    if (!enemyCanSeeWorldPoint(e, impactX, impactY)) continue;
    if (!enemyCanSeeDoor(e, door)) continue;

    const evidenceState = `${door.state}:${Math.round(door.hp)}`;
    e.observedDoorEvidence.set(door.id, evidenceState);
    const informationQuality = getWitnessInformationQuality(e, {
      x: impactX,
      y: impactY,
      geometryType: 'door',
      material: door.material,
      destroyed: door.state === 'destroyed',
    });
    const shotDecision = recordEnemyShotReaction(
      e,
      shotId,
      SHOT_REACTION_RANK.witnessedImpact,
      door.state === 'destroyed' ? 'witnessed-door-destruction' : 'witnessed-door-impact',
      informationQuality
    );
    if (!shotDecision) continue;
    if (e.alertDoorTransit?.doorId === door.id) {
      continue;
    }
    const points = _getDoorInvestigationPoints(door, e.x, e.y);
    const incident = createShotIncident(shotId, 'door-impact', points.searchX, points.searchY, {
      sourceType,
      routeRank: SHOT_REACTION_RANK.witnessedImpact,
      informationQuality,
      localization: 'exact',
      geometryId: door.id,
      geometryType: 'door',
      destroyed: door.state === 'destroyed',
    });
    const accepted = shotDecision === 'refinement' &&
      (e.currentIncident?.id === incident.id || e.pendingReaction?.incident?.id === incident.id)
      ? refineEnemyIncident(e, incident, 'door-impact')
      : enterEnemyAlert(e, points.searchX, points.searchY, false, 'door-impact', incident);
    if (!accepted) continue;
    e.alertDoorTransit = {
      doorId: door.id,
      ...points,
      phase: 'approaching',
    };
    e.searchPath = buildPath(e.x, e.y, points.approachX, points.approachY);
    e.searchPathIndex = 0;
  }
}

function getImpactInvestigationPoint(e, impact) {
  const standOff = enemyRadius() + scaleEnemyUnit(8);
  const hasBounds = [impact.geometryX, impact.geometryY, impact.geometryW, impact.geometryH]
    .every(Number.isFinite);
  if (!hasBounds) {
    const dx = e.x - impact.x;
    const dy = e.y - impact.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= 1e-6) return { x: e.x, y: e.y };
    return {
      x: impact.x + (dx / distance) * standOff,
      y: impact.y + (dy / distance) * standOff,
    };
  }

  const left = impact.geometryX;
  const right = impact.geometryX + impact.geometryW;
  const top = impact.geometryY;
  const bottom = impact.geometryY + impact.geometryH;
  const clampedX = Math.max(left, Math.min(right, impact.x));
  const clampedY = Math.max(top, Math.min(bottom, impact.y));
  const candidates = [
    { x: left - standOff, y: clampedY },
    { x: right + standOff, y: clampedY },
    { x: clampedX, y: top - standOff },
    { x: clampedX, y: bottom + standOff },
  ].sort((a, b) => (
    (a.x - e.x) ** 2 + (a.y - e.y) ** 2
  ) - (
    (b.x - e.x) ** 2 + (b.y - e.y) ** 2
  ));

  return candidates.find(candidate => !_pointHitsExpandedWall(
    candidate.x,
    candidate.y,
    enemyRadius() * 0.75
  )) ?? candidates[0];
}

function notifyProjectileImpactWitnesses(impact) {
  if (!impact || impact.geometryType === 'lamp') return;
  for (const e of enemies) {
    if (e === impact.sourceActor || e.alive === false) continue;
    if (!enemyCanSeeWorldPoint(e, impact.x, impact.y)) continue;
    const informationQuality = getWitnessInformationQuality(e, impact);
    const shotDecision = recordEnemyShotReaction(
      e,
      impact.shotId,
      SHOT_REACTION_RANK.witnessedImpact,
      impact.destroyed ? 'witnessed-destruction' : 'witnessed-impact',
      informationQuality
    );
    if (!shotDecision) continue;

    const investigationPoint = getImpactInvestigationPoint(e, impact);
    const incident = createShotIncident(
      impact.shotId,
      'impact',
      investigationPoint.x,
      investigationPoint.y,
      {
        sourceType: impact.sourceType,
        routeRank: SHOT_REACTION_RANK.witnessedImpact,
        informationQuality,
        localization: 'exact',
        geometryId: impact.geometryId,
        geometryType: impact.geometryType,
        destroyed: impact.destroyed === true,
      }
    );
    if (impact.geometryType === 'window' && impact.destroyed && impact.geometryId) {
      e.observedBrokenWindows.add(impact.geometryId);
    }
    const accepted = shotDecision === 'refinement' &&
      (e.currentIncident?.id === incident.id || e.pendingReaction?.incident?.id === incident.id)
      ? refineEnemyIncident(e, incident, 'impact')
      : enterEnemyAlert(
        e,
        investigationPoint.x,
        investigationPoint.y,
        false,
        'impact',
        incident
      );
    if (!accepted) continue;
    e.searchPath = buildPath(e.x, e.y, investigationPoint.x, investigationPoint.y);
    e.searchPathIndex = 0;
  }
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
    const arrivalRadius = _waypointArrivalRadius(wp);
    if (d2 <= arrivalRadius * arrivalRadius) {
      e.searchPathIndex++;
      continue;
    }
    const step = _stepEnemyToward(e, wp.x, wp.y);
    // Wall collision blocked or deflected the move; abandon this waypoint rather than oscillate against it.
    if (step.stalled) {
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
  e.currentIncident = null;
  e.companionAssignment = null;
  e.cautiousTimer = enemyCautiousFrames();
}

// Vision cone detection only ??no proximity bubble.
// Proximity is handled separately with a reaction delay.
function enemyCanSeeCone(e) {
  const sightRangeSq = e.sightRange * e.sightRange;
  for (const sample of getPlayerVisibilitySamples()) {
    const dx = sample.x - e.x;
    const dy = sample.y - e.y;
    const dist2 = dx * dx + dy * dy;
    if (dist2 > sightRangeSq) continue;
    if (!isLitByLamps(sample.x, sample.y)) continue;
    if (!pawnInCone(e.x, e.y, e.angle, e.visionAngle, sample.x, sample.y)) continue;
    if (!hasLOS(e.x, e.y, sample.x, sample.y)) continue;
    return true;
  }
  return false;
}

function moveTowardPosition(e, targetX, targetY) {
  const dx = targetX - e.x;
  const dy = targetY - e.y;
  const distanceSq = dx * dx + dy * dy;
  if (distanceSq <= enemyArrivalRadius() * enemyArrivalRadius()) return;

  if (_pathSegmentClear(e.x, e.y, targetX, targetY)) {
    const step = _stepEnemyToward(e, targetX, targetY);
    if (step.closer) return;
  }

  e.searchPath      = buildPath(e.x, e.y, targetX, targetY);
  e.searchPathIndex = 0;
  followNavPath(e);
}

function canShootPlayer(e) {
  if (!hasLOS(e.x, e.y, player.x, player.y)) return false;
  return _pathSegmentClear(e.x, e.y, player.x, player.y, enemyProjectileHitRadius());
}

function fireEnemyShot(e) {
  if (e.shotSpeed <= 0) return;

  const baseAngle = Math.atan2(player.x - e.x, -(player.y - e.y));
  const spread = (Math.random() * 2 - 1) * e.aimSpreadRadians;
  const shotAngle = baseAngle + spread;
  const dx = Math.sin(shotAngle);
  const dy = -Math.cos(shotAngle);

  const projectile = createProjectile({
    x: e.x + dx * enemyProjectileSpawnOffset(),
    y: e.y + dy * enemyProjectileSpawnOffset(),
    vx: dx * e.shotSpeed,
    vy: dy * e.shotSpeed,
    angle: shotAngle,
    damage: enemyProjectileDamage(),
    penetrationPower: enemyProjectilePenetrationPower(),
    sourceActor: e,
    sourceType: 'enemy',
  });
  enemyProjectiles.push(projectile);

  if (typeof emitMuzzleFlash === 'function') {
    emitMuzzleFlash({
      x: projectile.x,
      y: projectile.y,
      shotId: projectile.shotId,
      sourceType: 'enemy',
      sourceActor: e,
    });
  }

  if (typeof emitSound === 'function') {
    emitSound({
      x: e.x,
      y: e.y,
      radius: typeof soundGunshotRadius === 'function' ? soundGunshotRadius() : scaleEnemyUnit(600),
      isGunshot: true,
      shotId: projectile.shotId,
      sourceType: 'enemy',
      sourceActor: e,
    });
  }
}

function updateMeleeAlert(e) {
  if (e.lastKnownX !== null) moveTowardPosition(e, e.lastKnownX, e.lastKnownY);
  if (e.playerVisibleThisFrame) tryMeleeAttack(e);
}

function updateShooterAlert(e) {
  const targetX = e.lastKnownX ?? e.x;
  const targetY = e.lastKnownY ?? e.y;
  const pdx = player.x - e.x, pdy = player.y - e.y;
  const pd2 = pdx * pdx + pdy * pdy;
  const dist = Math.sqrt(pd2);
  const canShoot = e.playerVisibleThisFrame && canShootPlayer(e);

  e.targetAngle = Math.atan2(targetX - e.x, -(targetY - e.y));
  if (e.shotTimer > 0) e.shotTimer--;

  if (!canShoot) {
    moveTowardPosition(e, targetX, targetY);
    return;
  }

  if (dist > e.shootingRange) {
    moveTowardPosition(e, targetX, targetY);
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
    const survives = resolveProjectileTravel(p, () => [{
      id: 'player',
      actor: player,
      radius: typeof playerRadius === 'function' ? playerRadius() : PLAYER_RADIUS,
      penetrationResistance: unarmoredBodyPenetrationResistance(),
    }], () => {
      playerHitFlashTimer = playerHitFlashFrames();
      if (typeof damagePlayer === 'function' && damagePlayer(p.damage, { type: 'projectile' }) &&
          typeof setGameOver === 'function') setGameOver();
    });
    const outOfBounds = p.x < 0 || p.x > ENEMY_GAME_WIDTH || p.y < 0 || p.y > ENEMY_GAME_HEIGHT;

    if (!survives || outOfBounds) {
      enemyProjectiles.splice(i, 1);
    }
  }
}

function tryMeleeAttack(e) {
  if (e.meleeCooldownTimer > 0) return;
  const dx = player.x - e.x;
  const dy = player.y - e.y;
  const playerHitRadius = typeof playerRadius === 'function' ? playerRadius() : PLAYER_RADIUS;
  const hitRange = playerHitRadius + enemyRadius() + enemyMeleeRange();
  if (dx * dx + dy * dy > hitRange * hitRange) return;

  e.meleeCooldownTimer = enemyMeleeCooldownFrames();
  playerHitFlashTimer = playerHitFlashFrames();
  if (typeof damagePlayer === 'function' && damagePlayer(enemyMeleeDamage(), { type: 'melee' }) &&
      typeof setGameOver === 'function') {
    setGameOver();
  }
}

function beginDoorInvestigation(e, request, originalAngle) {
  const door = _getDoorById(request.doorId);
  if (!door || door.state === 'destroyed') {
    e.doorInvestigation = null;
    e.suspicionPhase = 'turning';
    return;
  }

  const points = _getDoorInvestigationPoints(door, e.x, e.y);
  e.suspicionReturnX = e.x;
  e.suspicionReturnY = e.y;
  e.suspicionOriginalAngle = originalAngle;
  e.suspicionReturnPatrolIndex = e.patrolIndex;
  e.suspicionReturnPauseTimer = e.patrolPauseTimer;
  e.suspicionReturnSweepAccum = e.patrolSweepAccum;
  e.suspicionSearchAccum = 0;
  e.suspicionPhase = 'door_approaching';
  e.doorInvestigation = {
    doorId: request.doorId,
    ...points,
    closeWaitTimer: 0,
  };
  e.searchPath = buildPath(e.x, e.y, points.approachX, points.approachY);
  e.searchPathIndex = 0;
}

function beginDoorInvestigationReturn(e) {
  const info = e.doorInvestigation;
  e.suspicionPhase = 'door_exiting';
  e.searchPath = [{ x: info.approachX, y: info.approachY, arrivalRadius: enemyArrivalRadius() }];
  e.searchPathIndex = 0;
}

function beginDoorInvestigationHomePath(e) {
  e.suspicionPhase = 'door_returning';
  e.searchPath = buildPath(e.x, e.y, e.suspicionReturnX, e.suspicionReturnY);
  e.searchPathIndex = 0;
}

function finishDoorInvestigation(e) {
  e.x = e.suspicionReturnX;
  e.y = e.suspicionReturnY;
  e.state = 'patrol';
  e.targetAngle = e.suspicionOriginalAngle;
  e.patrolIndex = e.suspicionReturnPatrolIndex;
  e.patrolPauseTimer = e.suspicionReturnPauseTimer;
  e.patrolSweepAccum = e.suspicionReturnSweepAccum;
  e.reactionTimer = 0;
  e.pendingReaction = null;
  e.currentIncident = null;
  e.companionAssignment = null;
  e.suspicionCaseId = null;
  e.suspicionCaseSlot = null;
  e.suspicionRole = null;
  e.doorInvestigation = null;
}

function updateDoorInvestigation(e) {
  const info = e.doorInvestigation;
  if (!info) return;
  const door = _getDoorById(info.doorId);

  if (e.suspicionPhase === 'door_approaching') {
    if (!door || door.state === 'destroyed') {
      beginDoorInvestigationHomePath(e);
      return;
    }
    if (followNavPath(e)) {
      if (door.state === 'closed' && typeof setDoorState === 'function') {
        setDoorState(door, 'open', e);
      }
      e.suspicionPhase = 'door_entering';
      e.searchPath = [{ x: info.searchX, y: info.searchY, arrivalRadius: enemyArrivalRadius() }];
      e.searchPathIndex = 0;
    }
    return;
  }

  if (e.suspicionPhase === 'door_entering') {
    if (followNavPath(e)) {
      e.suspicionPhase = 'door_searching';
      e.suspicionSearchAccum = 0;
    }
    return;
  }

  if (e.suspicionPhase === 'door_searching') {
    e.targetAngle += enemySearchSweepRate();
    e.suspicionSearchAccum += enemySearchSweepRate();
    if (e.suspicionSearchAccum >= Math.PI) beginDoorInvestigationReturn(e);
    return;
  }

  if (e.suspicionPhase === 'door_exiting') {
    if (followNavPath(e)) e.suspicionPhase = 'door_closing';
    return;
  }

  if (e.suspicionPhase === 'door_closing') {
    const ownsOpenDoor = door && door.state === 'open' && door.openedBy === e;
    const blockedByEnemy = ownsOpenDoor && typeof isDoorBlockedByEnemy === 'function' && isDoorBlockedByEnemy(door, e);
    const blockedByPlayer = ownsOpenDoor && typeof isDoorBlockedByPlayer === 'function' && isDoorBlockedByPlayer(door);
    const blocked = blockedByEnemy || blockedByPlayer;
    if (ownsOpenDoor && !blocked && typeof setDoorState === 'function') {
      setDoorState(door, 'closed');
    }
    if (!ownsOpenDoor || !blocked || ++info.closeWaitTimer >= enemySuspicionTimeout()) {
      beginDoorInvestigationHomePath(e);
    }
    return;
  }

  if (e.suspicionPhase === 'door_returning' && followNavPath(e)) {
    finishDoorInvestigation(e);
  }
}

function beginDamagedDoorInvestigation(e, request, originalAngle) {
  const door = _getDoorById(request.doorId);
  if (!door || door.state === 'destroyed' || door.hp >= door.maxHp) {
    e.damagedDoorInvestigation = null;
    e.suspicionPhase = 'turning';
    return;
  }

  const points = _getDoorInvestigationPoints(door, e.x, e.y);
  e.suspicionReturnX = e.x;
  e.suspicionReturnY = e.y;
  e.suspicionOriginalAngle = originalAngle;
  e.suspicionReturnPatrolIndex = e.patrolIndex;
  e.suspicionReturnPauseTimer = e.patrolPauseTimer;
  e.suspicionReturnSweepAccum = e.patrolSweepAccum;
  e.suspicionPhase = 'damaged_door_approaching';
  e.damagedDoorInvestigation = { doorId: request.doorId, ...points, confirmTimer: 0 };
  e.searchPath = buildPath(e.x, e.y, points.approachX, points.approachY);
  e.searchPathIndex = 0;
}

function finishDamagedDoorInvestigation(e) {
  e.x = e.suspicionReturnX;
  e.y = e.suspicionReturnY;
  e.state = 'patrol';
  e.targetAngle = e.suspicionOriginalAngle;
  e.patrolIndex = e.suspicionReturnPatrolIndex;
  e.patrolPauseTimer = e.suspicionReturnPauseTimer;
  e.patrolSweepAccum = e.suspicionReturnSweepAccum;
  e.reactionTimer = 0;
  e.pendingReaction = null;
  e.suspicionReason = null;
  e.currentIncident = null;
  e.companionAssignment = null;
  e.suspicionCaseId = null;
  e.suspicionCaseSlot = null;
  e.suspicionRole = null;
  e.damagedDoorInvestigation = null;
}

function updateDamagedDoorInvestigation(e) {
  const info = e.damagedDoorInvestigation;
  if (!info) return;
  const door = _getDoorById(info.doorId);
  if (!door) {
    finishDamagedDoorInvestigation(e);
    return;
  }

  if (door.state === 'destroyed') {
    enterEnemyAlert(e, info.searchX, info.searchY, false, 'door');
    return;
  }

  if (e.suspicionPhase === 'damaged_door_confirming') {
    const doorX = door.x + door.w / 2;
    const doorY = door.y + door.h / 2;
    e.targetAngle = Math.atan2(doorX - e.x, -(doorY - e.y));
    if (info.confirmTimer > 0) info.confirmTimer--;
    if (info.confirmTimer > 0) return;
    if (door.state === 'closed' && typeof setDoorState === 'function') {
      setDoorState(door, 'open', e);
    }
    enterEnemyAlert(e, info.searchX, info.searchY, false, 'door');
    return;
  }

  const inspectRadius = typeof doorInteractRadius === 'function'
    ? doorInteractRadius()
    : scaleEnemyUnit(45);
  const distanceSq = typeof distanceSqToRect === 'function'
    ? distanceSqToRect(door, e.x, e.y)
    : (e.x - info.approachX) ** 2 + (e.y - info.approachY) ** 2;

  if (distanceSq > inspectRadius * inspectRadius) {
    if (followNavPath(e)) _stepEnemyToward(e, info.approachX, info.approachY);
    return;
  }

  e.suspicionPhase = 'damaged_door_confirming';
  info.confirmTimer = enemyDamagedDoorConfirmDelay();
  if (info.confirmTimer <= 0) updateDamagedDoorInvestigation(e);
}

function updateAlertDoorTransit(e) {
  const info = e.alertDoorTransit;
  if (!info) return;
  const door = _getDoorById(info.doorId);
  if (!door) {
    e.alertDoorTransit = null;
    return;
  }

  if (info.phase === 'approaching') {
    const interactRadius = typeof doorInteractRadius === 'function'
      ? doorInteractRadius()
      : scaleEnemyUnit(45);
    const distanceSq = typeof distanceSqToRect === 'function'
      ? distanceSqToRect(door, e.x, e.y)
      : (e.x - info.approachX) ** 2 + (e.y - info.approachY) ** 2;

    if (distanceSq > interactRadius * interactRadius) {
      if (followNavPath(e)) _stepEnemyToward(e, info.approachX, info.approachY);
      return;
    }

    if (door.state === 'closed' && typeof setDoorState === 'function') {
      setDoorState(door, 'open', e);
    }
    info.phase = 'crossing';
    e.searchPath = [{ x: info.searchX, y: info.searchY }];
    e.searchPathIndex = 0;
  }

  if (info.phase === 'crossing') {
    const dx = info.searchX - e.x;
    const dy = info.searchY - e.y;
    if (dx * dx + dy * dy <= enemyArrivalRadius() ** 2) {
      e.alertDoorTransit = null;
    } else {
      _stepEnemyToward(e, info.searchX, info.searchY);
    }
  }
}

function resolveEnemySeparation() {
  const radius = enemyRadius();
  const minimumDistance = radius * 2 + scaleEnemyUnit(6);
  const minimumDistanceSq = minimumDistance * minimumDistance;

  for (let pass = 0; pass < 8; pass++) {
    let foundOverlap = false;
    for (let i = 0; i < enemies.length; i++) {
      const a = enemies[i];
      if (a.alive === false) continue;
      for (let j = i + 1; j < enemies.length; j++) {
        const b = enemies[j];
        if (b.alive === false) continue;
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let distanceSq = dx * dx + dy * dy;
        if (distanceSq >= minimumDistanceSq) continue;
        foundOverlap = true;

        let distance = Math.sqrt(distanceSq);
        if (distance < 0.0001) {
          const angle = ((i + 1) * 2.399963229728653 + (j + 1) * 0.7548776662466927) % (Math.PI * 2);
          dx = Math.cos(angle);
          dy = Math.sin(angle);
          distance = 1;
        } else {
          dx /= distance;
          dy /= distance;
        }

        const correction = (minimumDistance - distance) * 0.5 + 0.01;
        a.x -= dx * correction;
        a.y -= dy * correction;
        b.x += dx * correction;
        b.y += dy * correction;
        if (typeof pushOutOfWalls === 'function') {
          pushOutOfWalls(a, radius);
          pushOutOfWalls(b, radius);
        }
      }
    }
    if (!foundOverlap) break;
  }
}

function orientCrowdedEnemiesApart() {
  const personalDistance = enemyRadius() * 2 + scaleEnemyUnit(14);
  const personalDistanceSq = personalDistance * personalDistance;
  const avoidance = enemies.map(() => ({ x: 0, y: 0, count: 0 }));

  for (let i = 0; i < enemies.length; i++) {
    const a = enemies[i];
    if (a.alive === false) continue;
    for (let j = i + 1; j < enemies.length; j++) {
      const b = enemies[j];
      if (b.alive === false) continue;
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      const distanceSq = dx * dx + dy * dy;
      if (distanceSq >= personalDistanceSq) continue;
      const distance = Math.sqrt(distanceSq);
      if (distance < 0.0001) {
        const angle = ((i + 1) * 2.399963229728653 + (j + 1) * 0.7548776662466927) % (Math.PI * 2);
        dx = Math.cos(angle);
        dy = Math.sin(angle);
      } else {
        dx /= distance;
        dy /= distance;
      }
      avoidance[i].x -= dx;
      avoidance[i].y -= dy;
      avoidance[i].count++;
      avoidance[j].x += dx;
      avoidance[j].y += dy;
      avoidance[j].count++;
    }
  }

  for (let i = 0; i < enemies.length; i++) {
    const vector = avoidance[i];
    if (vector.count === 0 || vector.x * vector.x + vector.y * vector.y < 0.0001) continue;
    enemies[i].angle = Math.atan2(vector.x, -vector.y);
  }
}

function updateEnemies() {
  enemyIncidentFrame++;
  if (typeof updateSoundEvents === 'function') updateSoundEvents();
  updateEnemyProjectiles();
  if (playerHitFlashTimer > 0) playerHitFlashTimer--;

  for (const e of enemies) {
    e.playerVisibleThisFrame = false;
    pruneEnemyEventMemory(e);
    if (e.alive !== false && typeof pushOutOfWalls === 'function') {
      pushOutOfWalls(e, enemyRadius());
      pushOutOfWalls(e, enemyRadius());
    }

    // 1. Tick reaction delay ??apply pending state change when it expires
    if (e.reactionTimer > 0) {
      e.reactionTimer--;
      if (e.reactionTimer === 0 && e.pendingReaction) {
        const pending = e.pendingReaction;
        const previousState = e.state;
        const savedAngle = e.targetAngle; // capture BEFORE overwrite
        e.state       = pending.state;
        e.targetAngle = pending.targetAngle;
        if (e.state === 'suspicious') {
          e.suspicionOriginalAngle = savedAngle; // original facing, not the source direction
          e.suspicionReason = pending.reason;
          e.suspicionTimer  = 0;
          e.suspicionLevel++;
          e.suspicionSourceX = pending.sourceX;
          e.suspicionSourceY = pending.sourceY;
          e.suspicionCaseId = pending.suspicionCaseId;
          e.suspicionCaseSlot = pending.suspicionCaseSlot;
          e.suspicionRole = pending.suspicionRole;
          e.currentIncident = pending.incident ? { ...pending.incident } : createEnemyIncident(pending.reason, pending.sourceX, pending.sourceY);
          rememberEnemyIncident(e, e.currentIncident);
          if (pending.doorInvestigation) {
            beginDoorInvestigation(e, pending.doorInvestigation, savedAngle);
          } else if (pending.damagedDoorInvestigation) {
            beginDamagedDoorInvestigation(e, pending.damagedDoorInvestigation, savedAngle);
          } else if (e.suspicionRole !== 'support' && (pending.forceInvestigation || e.suspicionLevel >= 2)) {
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
        if (e.state === 'alert') {
          e.state = previousState;
          enterEnemyAlert(e, pending.sourceX, pending.sourceY, false, pending.reason, pending.incident);
        } else {
          e.pendingReaction = null;
        }
      }
    }

    processMuzzleFlashStimuli(e);

    // 2. Vision cone detection. Ordinary patrol has a readable reaction window;
    // suspicious guards confirm quickly, while already-heightened states react immediately.
    if (enemyCanSeeCone(e)) {
      const angle = Math.atan2(player.x - e.x, -(player.y - e.y));
      e.playerVisibleThisFrame = true;
      e.targetAngle = angle;
      e.lastKnownX = player.x;
      e.lastKnownY = player.y;

      if (e.state === 'suspicious') {
        scheduleReaction(e, 'alert', angle, player.x, player.y, enemySuspicionConfirmDelay(), 'player');
      } else if (e.state === 'patrol' && e.cautiousTimer <= 0) {
        scheduleReaction(e, 'alert', angle, player.x, player.y, enemyReactionDelay(), 'player');
      } else {
        enterEnemyAlert(e, player.x, player.y, true, 'player');
      }
    }
    // 3. Local visual evidence, then delayed proximity detection.
    else {
      const corpseHandled = applyVisibleCorpseOverride(e);
      let companionHandled = false;
      const alertCompanionStimulus = corpseHandled ? null : detectVisibleCompanionIncident(e);
      if (alertCompanionStimulus) {
        companionHandled = acceptCompanionIncident(
          e,
          alertCompanionStimulus.sourceEnemy,
          alertCompanionStimulus.incident
        );
      }
      const suspiciousCompanionStimulus = corpseHandled || alertCompanionStimulus
        ? null
        : detectVisibleSuspiciousCompanionIncident(e);
      if (suspiciousCompanionStimulus) {
        companionHandled = acceptSuspiciousCompanionIncident(
          e,
          suspiciousCompanionStimulus.sourceEnemy,
          suspiciousCompanionStimulus.incident
        ) || companionHandled;
      }
      if (!corpseHandled && !companionHandled && !e.companionAssignment && e.state !== 'alert' && e.reactionTimer === 0 &&
          !e.doorInvestigation && !e.damagedDoorInvestigation) {
        const stimulus = detectLocalVisualStimulus(e, true);
        if (stimulus?.type === 'door' && stimulus.damaged) {
          scheduleDamagedDoorInvestigation(e, stimulus.doorId);
        } else if (stimulus?.type === 'broken-lamp') {
          scheduleBrokenLampInvestigation(e, stimulus);
        } else if (stimulus?.type === 'broken-window') {
          scheduleBrokenWindowInvestigation(e, stimulus);
        } else if (stimulus) {
          enterEnemyAlert(e, stimulus.x, stimulus.y, false, stimulus.type);
        }
      }
    }

    if (!e.playerVisibleThisFrame && e.reactionTimer === 0 && e.state !== 'alert') {
      const dx = player.x - e.x, dy = player.y - e.y;
      if (dx * dx + dy * dy <= e.proximityRadius * e.proximityRadius) {
        const angle = Math.atan2(player.x - e.x, -(player.y - e.y));
        const delay = e.state === 'suspicious' ? enemySuspicionConfirmDelay() : enemyReactionDelay();
        scheduleReaction(e, 'alert', angle, player.x, player.y, delay, 'player');
      }
    }

    // 4. Suspicious state ??first suspicion turns in place; later suspicions move/search/return.
    if (e.state === 'suspicious') {
      e.suspicionTimer++;

      if (e.damagedDoorInvestigation) {
        updateDamagedDoorInvestigation(e);
      } else if (e.doorInvestigation) {
        updateDoorInvestigation(e);
      } else if (e.suspicionPhase === 'turning') {
        if (e.suspicionTimer >= enemySuspicionTimeout()) {
          e.state = 'patrol';
          e.targetAngle = e.suspicionOriginalAngle; // restore original facing
          e.reactionTimer = 0;
          e.pendingReaction = null;
          e.currentIncident = null;
          e.companionAssignment = null;
          e.suspicionCaseId = null;
          e.suspicionCaseSlot = null;
          e.suspicionRole = null;
          e.cautiousTimer = enemyCautiousFrames();
        }

      } else if (e.suspicionPhase === 'moving') {
        // Move through the nav graph to the source of suspicion.
        if (followNavPath(e)) {
          e.suspicionPhase     = 'searching';
          e.suspicionSearchAccum = 0;
        }
        // Failsafe: if stuck moving too long, skip to return
        if (e.suspicionTimer >= enemySuspicionTimeout() * 3) {
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
          e.currentIncident = null;
          e.companionAssignment = null;
          e.suspicionCaseId = null;
          e.suspicionCaseSlot = null;
          e.suspicionRole = null;
          e.cautiousTimer = enemyCautiousFrames();
        }
      }
      // Path B (sight while suspicious) handled by step 2: as enemy turns/moves, if player
      // enters the lit cone ??immediate alert regardless of suspicion phase.
    }

    // 5. Alert pursuit + countdown.
    // Step 2 has already pinned alertTimer to enemyAlertFrames() this frame if player is visible,
    // so the decrement below cannot expire while LOS holds.
    if (e.state === 'alert') {
      if (e.alertDoorTransit) {
        updateAlertDoorTransit(e);
        e.alertTimer = enemyAlertFrames();
      } else {
        updateAlertBehavior(e);
        e.alertTimer--;
      }
      if (!e.alertDoorTransit && e.alertTimer <= 0) {
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
        if (e.companionAssignment) e.companionAssignment = null;
        e.targetAngle      += enemySearchSweepRate();
        e.searchSweepAccum += enemySearchSweepRate();
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
      const arrivalRadius = _waypointArrivalRadius(node);

      if (dist2 > arrivalRadius * arrivalRadius) {
        // Moving toward node
        const step = _stepEnemyToward(e, node.x, node.y);
        if (step.stalled && _pointNearDoorway(node.x, node.y) &&
            Math.abs(node.sweep) === 0 && node.pauseFrames === 0) {
          e.patrolIndex      = (e.patrolIndex + 1) % e.patrolRoute.length;
          e.patrolSweepAccum = 0;
          e.patrolPauseTimer = 0;
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
    if (e.hitFlashTimer > 0) e.hitFlashTimer--;
    if (e.meleeCooldownTimer > 0) e.meleeCooldownTimer--;
  }

  resolveEnemySeparation();
  orientCrowdedEnemiesApart();
}

function drawPlayerHitFlash() {
  if (playerHitFlashTimer > 0) {
    ctx.save();
    ctx.globalAlpha = 0.22 * (playerHitFlashTimer / playerHitFlashFrames());
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
  if (showEnemySightDebug()) {
    for (const e of enemies) {
      drawEnemySightCone(e);
    }
  }

  for (const e of enemies) {
    const isAlert     = e.state === 'alert';
    const isSuspicious = e.state === 'suspicious';
    const isCautious  = e.state === 'searching' || e.state === 'returning' || (e.state === 'patrol' && e.cautiousTimer > 0);
    const isReacting  = e.reactionTimer > 0;

    // Reaction delay ring ??contracting white circle shows the opportunity window
    if (isReacting) {
      const reactionDelay = e.state === 'suspicious' && e.pendingReaction?.state === 'alert'
        ? enemySuspicionConfirmDelay()
        : enemyReactionDelay();
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
    ctx.fillStyle = e.hitFlashTimer > 0 ? '#ffffff'
                  : isAlert      ? '#ff8c1a'
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

    if (e.health < e.maxHealth) {
      const barW = scaleEnemyUnit(34);
      const barH = scaleEnemyUnit(4);
      const x = e.x - barW / 2;
      const y = e.y - scaleEnemyUnit(44);
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.72)';
      ctx.fillRect(x, y, barW, barH);
      ctx.fillStyle = '#ffdd66';
      ctx.fillRect(x, y, barW * Math.max(0, e.health / e.maxHealth), barH);
      ctx.restore();
    }

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

function enemyIsVisibleToPlayer(e) {
  if (!isLit(e.x, e.y)) return false;
  if (typeof playerHasClearView === 'function') return playerHasClearView(e.x, e.y);
  return inVisionCone(e.x, e.y);
}

function drawHiddenEnemySilhouette(e) {
  const isAlert = e.state === 'alert';
  const isSuspicious = e.state === 'suspicious';
  const isCautious = e.state === 'searching' || e.state === 'returning' ||
    (e.state === 'patrol' && e.cautiousTimer > 0);

  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.translate(e.x, e.y);
  ctx.rotate(e.angle);
  ctx.scale(scaleEnemyUnit(1), scaleEnemyUnit(1));

  ctx.fillStyle = isAlert ? '#b85a18'
                : isSuspicious ? '#8f5a24'
                : isCautious ? '#7d5140'
                : '#7f4141';
  ctx.beginPath();
  ctx.arc(-18, 0, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(18, 0, 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = isAlert ? '#d87828'
                : isSuspicious ? '#ad7130'
                : isCautious ? '#9b6551'
                : '#a85454';
  ctx.beginPath();
  ctx.arc(0, 0, 16, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#c8c8c8';
  ctx.beginPath();
  ctx.moveTo(0, -28);
  ctx.lineTo(-7, -18);
  ctx.lineTo(7, -18);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawHiddenEnemiesDebug() {
  if (!showHiddenEnemiesDebug()) return;
  for (const e of enemies) {
    if (!enemyIsVisibleToPlayer(e)) drawHiddenEnemySilhouette(e);
  }
}

// Always-visible debug number labels ??drawn after fog in game.js so they show through darkness
function drawEnemyLabels() {
  if (!showEnemyLabelsDebug()) return;
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
    const debugState = e.state === 'alert' ? 'ALERT'
      : (e.state === 'suspicious' ? 'SUSPICIOUS' : null);
    const debugReason = e.state === 'alert' ? e.alertReason
      : (e.state === 'suspicious' ? e.suspicionReason : null);
    if (debugState && debugReason) {
      ctx.font = `bold ${scaleEnemyUnit(8)}px monospace`;
      ctx.fillStyle = e.state === 'alert' ? '#ff8a65' : '#ffe066';
      ctx.fillText(`${debugState}: ${debugReason}`, lx, ly + scaleEnemyUnit(18));
    }
    ctx.restore();
  }
}

window.addEventListener('tuningchange', () => {
  applyEnemyTuningToAll();
});

resetEnemies();
