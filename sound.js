const GUNSHOT_RADIUS    = scaleEnemyUnit(350);
const FOOTSTEP_RADIUS   = scaleEnemyUnit(120);   // max footstep reach at walk speed
const WALK_SPEED        = scaleEnemyUnit(4);     // player.speed at normal walk; used for footstep scaling
const SOUND_LIFETIME    = 30;    // frames for visual ring to fade
const SOUND_WALL_TRANSMISSION = 0.12;
const SOUND_DEFAULT_CLOSED_DOOR_TRANSMISSION = 0.8;
const SOUND_VAGUE_SOURCE_DISTANCE = scaleEnemyUnit(75);
const SHOW_PLAYER_SOUND_CUES = true;
const SHOW_SOUND_SOURCE_DEBUG = false;
const SHOW_SOUND_ATTENUATION_DEBUG = false;
const SHOW_SOUND_ALL_PATH_DEBUG = false;
const SOUND_ATTENUATION_DEBUG_LIFETIME = 42;
const SOUND_GUNSHOT_CUE_LIFETIME = 72;
const SOUND_FOOTSTEP_CUE_LIFETIME = 48;
const SOUND_DEFAULT_CUE_LIFETIME = 42;
const SOUND_DOOR_CONE_SPREAD = Math.PI / 3;
const ENEMY_FOOTSTEP_CUE_RADIUS = scaleEnemyUnit(600);
const ENEMY_FOOTSTEP_CUE_INTERVAL = 18;

const SOUND_ROOM_SPECS = [
  { id: 'lobby',    x: 460, y: 590 },
  { id: 'room_a',   x: 200, y: 229 },
  { id: 'corridor', x: 589, y: 229 },
  { id: 'room_bc',  x: 930, y: 229 },
  { id: 'room_f',   x: 991, y: 590 },
].map(room => ({ ...room, x: scaleEnemyX(room.x), y: scaleEnemyY(room.y) }));

const SOUND_PORTAL_SPECS = [
  { a: 'lobby',    b: 'corridor', doorId: 'corridor_left_door',    x: 270, y: 449 },
  { a: 'lobby',    b: 'corridor', doorId: 'corridor_right_door',   x: 819, y: 449 },
  { a: 'room_a',   b: 'corridor', doorId: 'room_a_east_door',      x: 409, y: 295 },
  { a: 'corridor', b: 'room_bc',  doorId: 'room_bc_divider_door',  x: 769, y: 210 },
  { a: 'lobby',    b: 'room_f',   doorId: 'room_f_west_door',      x: 909, y: 590 },
].map(portal => ({ ...portal, x: scaleEnemyX(portal.x), y: scaleEnemyY(portal.y) }));

let soundEvents = [];
let soundAttenuationEvents = [];
let playerSoundCueEvents = [];
let footstepTimer = 0;

function resetSoundSystem() {
  soundEvents.length = 0;
  soundAttenuationEvents.length = 0;
  playerSoundCueEvents.length = 0;
  footstepTimer = 0;
}

function updateSoundEvents() {
  for (let i = soundEvents.length - 1; i >= 0; i--) {
    soundEvents[i].life--;
    if (soundEvents[i].life <= 0) soundEvents.splice(i, 1);
  }
  for (let i = soundAttenuationEvents.length - 1; i >= 0; i--) {
    soundAttenuationEvents[i].life--;
    if (soundAttenuationEvents[i].life <= 0) soundAttenuationEvents.splice(i, 1);
  }
  for (let i = playerSoundCueEvents.length - 1; i >= 0; i--) {
    playerSoundCueEvents[i].life--;
    if (playerSoundCueEvents[i].life <= 0) playerSoundCueEvents.splice(i, 1);
  }
}

function clampSound01(v) {
  return Math.max(0, Math.min(1, v));
}

function segmentIntersectsRect(x1, y1, x2, y2, rect) {
  const minX = rect.x;
  const maxX = rect.x + rect.w;
  const minY = rect.y;
  const maxY = rect.y + rect.h;
  const dx = x2 - x1;
  const dy = y2 - y1;
  let t0 = 0;
  let t1 = 1;

  const clip = (p, q) => {
    if (Math.abs(p) < 1e-10) return q >= 0;
    const r = q / p;
    if (p < 0) {
      if (r > t1) return false;
      if (r > t0) t0 = r;
    } else {
      if (r < t0) return false;
      if (r < t1) t1 = r;
    }
    return true;
  };

  return clip(-dx, x1 - minX) &&
    clip(dx, maxX - x1) &&
    clip(-dy, y1 - minY) &&
    clip(dy, maxY - y1) &&
    t1 >= 0 &&
    t0 <= 1;
}

function getClosedSoundDoors() {
  if (typeof DOORS === 'undefined' || !Array.isArray(DOORS)) return [];
  return DOORS.filter(door => door.state === 'closed');
}

function distanceBetween(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function distanceBetweenPoints(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

function getSoundRoom(id) {
  return SOUND_ROOM_SPECS.find(room => room.id === id) ?? null;
}

function getDoorById(id) {
  if (typeof DOORS === 'undefined' || !Array.isArray(DOORS)) return null;
  return DOORS.find(door => door.id === id) ?? null;
}

function getDoorSoundTransmission(doorId) {
  const door = getDoorById(doorId);
  if (!door || door.state === 'open' || door.state === 'destroyed') return 1;
  return typeof door.soundTransmission === 'number'
    ? door.soundTransmission
    : SOUND_DEFAULT_CLOSED_DOOR_TRANSMISSION;
}

function findNearestSoundRoom(x, y) {
  let best = SOUND_ROOM_SPECS[0];
  let bestD2 = Infinity;
  for (const room of SOUND_ROOM_SPECS) {
    const dx = room.x - x;
    const dy = room.y - y;
    const d2 = dx * dx + dy * dy;
    if (d2 < bestD2) {
      bestD2 = d2;
      best = room;
    }
  }
  return best;
}

function getPortalNeighbors(roomId) {
  const neighbors = [];
  for (const portal of SOUND_PORTAL_SPECS) {
    if (portal.a !== roomId && portal.b !== roomId) continue;
    const otherId = portal.a === roomId ? portal.b : portal.a;
    const room = getSoundRoom(roomId);
    const other = getSoundRoom(otherId);
    if (!room || !other) continue;
    const transmission = getDoorSoundTransmission(portal.doorId);
    const edgeDistance = distanceBetween(room, portal) + distanceBetween(portal, other);
    neighbors.push({
      id: otherId,
      cost: edgeDistance / Math.max(0.01, transmission),
      distance: edgeDistance,
      transmission,
      portal,
    });
  }
  return neighbors;
}

function buildPortalRoomPath(startRoomId, goalRoomId) {
  if (startRoomId === goalRoomId) return [];

  const costs = Object.fromEntries(SOUND_ROOM_SPECS.map(room => [room.id, Infinity]));
  const previous = {};
  const visited = new Set();
  costs[startRoomId] = 0;

  while (visited.size < SOUND_ROOM_SPECS.length) {
    let current = null;
    let currentCost = Infinity;
    for (const room of SOUND_ROOM_SPECS) {
      if (visited.has(room.id)) continue;
      if (costs[room.id] < currentCost) {
        current = room.id;
        currentCost = costs[room.id];
      }
    }

    if (current === null || current === goalRoomId) break;
    visited.add(current);

    for (const edge of getPortalNeighbors(current)) {
      const nextCost = currentCost + edge.cost;
      if (nextCost >= costs[edge.id]) continue;
      costs[edge.id] = nextCost;
      previous[edge.id] = { roomId: current, edge };
    }
  }

  if (!(goalRoomId in previous)) return null;

  const edges = [];
  for (let id = goalRoomId; id !== startRoomId;) {
    const step = previous[id];
    if (!step) return null;
    edges.unshift(step.edge);
    id = step.roomId;
  }
  return edges;
}

function evaluateDirectSoundPath(sourceX, sourceY, listenerX, listenerY, baseRadius) {
  let multiplier = 1;
  let localization = 'clear';
  let crossedWall = false;
  let crossedDoor = false;
  let crossedDoorProxy = null;

  const walls = (typeof WALLS !== 'undefined' && Array.isArray(WALLS)) ? WALLS : [];
  for (const wall of walls) {
    if (!segmentIntersectsRect(sourceX, sourceY, listenerX, listenerY, wall)) continue;
    multiplier *= SOUND_WALL_TRANSMISSION;
    crossedWall = true;
  }

  for (const door of getClosedSoundDoors()) {
    if (!segmentIntersectsRect(sourceX, sourceY, listenerX, listenerY, door)) continue;
    const transmission = typeof door.soundTransmission === 'number'
      ? door.soundTransmission
      : SOUND_DEFAULT_CLOSED_DOOR_TRANSMISSION;
    multiplier *= transmission;
    crossedDoor = true;
    if (!crossedDoorProxy) {
      crossedDoorProxy = {
        x: door.x + door.w / 2,
        y: door.y + door.h / 2,
        doorId: door.id,
      };
    }
  }

  if (crossedWall) localization = 'vague';
  else if (crossedDoor) localization = 'muffled';

  let perceivedX = sourceX;
  let perceivedY = sourceY;
  if (localization === 'vague') {
    const dx = sourceX - listenerX;
    const dy = sourceY - listenerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 1e-6) {
      const perceivedDistance = Math.min(dist * 0.35, SOUND_VAGUE_SOURCE_DISTANCE, baseRadius * 0.25);
      perceivedX = listenerX + (dx / dist) * perceivedDistance;
      perceivedY = listenerY + (dy / dist) * perceivedDistance;
    }
  }

  return {
    multiplier,
    effectiveRadius: baseRadius * multiplier,
    localization,
    perceivedX,
    perceivedY,
    pathKind: 'direct',
    proxyX: crossedDoorProxy ? crossedDoorProxy.x : perceivedX,
    proxyY: crossedDoorProxy ? crossedDoorProxy.y : perceivedY,
    proxyDoorId: crossedDoorProxy ? crossedDoorProxy.doorId : null,
    pathPoints: [
      { x: sourceX, y: sourceY },
      { x: listenerX, y: listenerY },
    ],
  };
}

function evaluatePortalSoundPath(sourceX, sourceY, listenerX, listenerY, baseRadius) {
  const startRoom = findNearestSoundRoom(sourceX, sourceY);
  const goalRoom = findNearestSoundRoom(listenerX, listenerY);
  if (!startRoom || !goalRoom || startRoom.id === goalRoom.id) return null;

  const edges = buildPortalRoomPath(startRoom.id, goalRoom.id);
  if (!edges || edges.length === 0) return null;

  let multiplier = 1;
  let localization = 'clear';
  const pathPoints = [{ x: sourceX, y: sourceY }];
  const portals = [];

  for (const edge of edges) {
    multiplier *= edge.transmission;
    if (edge.transmission < 1) localization = 'muffled';
    pathPoints.push({ x: edge.portal.x, y: edge.portal.y });
    portals.push(edge.portal);
  }
  pathPoints.push({ x: listenerX, y: listenerY });

  let pathDistance = 0;
  for (let i = 1; i < pathPoints.length; i++) {
    pathDistance += distanceBetween(pathPoints[i - 1], pathPoints[i]);
  }

  return {
    multiplier,
    effectiveRadius: baseRadius * multiplier,
    localization,
    perceivedX: sourceX,
    perceivedY: sourceY,
    pathKind: 'portal',
    portals,
    proxyX: portals.length ? portals[portals.length - 1].x : sourceX,
    proxyY: portals.length ? portals[portals.length - 1].y : sourceY,
    proxyDoorId: portals.length ? portals[portals.length - 1].doorId : null,
    pathPoints,
    pathDistance,
  };
}

function pathAudibilityRatio(path, fallbackDistance) {
  const distance = path.pathDistance ?? fallbackDistance;
  return distance / Math.max(1, path.effectiveRadius);
}

function evaluateSoundPath(sourceX, sourceY, listenerX, listenerY, baseRadius) {
  const direct = evaluateDirectSoundPath(sourceX, sourceY, listenerX, listenerY, baseRadius);
  const portal = evaluatePortalSoundPath(sourceX, sourceY, listenerX, listenerY, baseRadius);
  if (!portal) return direct;

  const directDistance = distanceBetweenPoints(sourceX, sourceY, listenerX, listenerY);
  const directRatio = pathAudibilityRatio(direct, directDistance);
  const portalRatio = pathAudibilityRatio(portal, portal.pathDistance);
  return portalRatio < directRatio ? portal : direct;
}

function evaluateEnemySound(e, sound) {
  const path = evaluateSoundPath(sound.x, sound.y, e.x, e.y, sound.radius);
  const dx = e.x - sound.x;
  const dy = e.y - sound.y;
  const directDistance = Math.sqrt(dx * dx + dy * dy);
  path.distance = path.pathDistance ?? directDistance;
  path.heard = path.distance <= path.effectiveRadius;
  return path;
}

function evaluatePlayerSound(sound) {
  if (typeof player === 'undefined' || !player) return null;
  const path = evaluateSoundPath(sound.x, sound.y, player.x, player.y, sound.radius);
  const dx = player.x - sound.x;
  const dy = player.y - sound.y;
  const directDistance = Math.sqrt(dx * dx + dy * dy);
  path.distance = path.pathDistance ?? directDistance;
  path.heard = path.distance <= path.effectiveRadius;
  return path;
}

function enemyCanHearSound(e, sound) {
  const path = evaluateEnemySound(e, sound);
  return path.heard ? path : null;
}

function getSoundCueLifetime(sound) {
  if (sound.isGunshot) return SOUND_GUNSHOT_CUE_LIFETIME;
  if (sound.sourceType === 'player' || sound.sourceType === 'enemy') return SOUND_FOOTSTEP_CUE_LIFETIME;
  return SOUND_DEFAULT_CUE_LIFETIME;
}

function getSoundCueMagnitude(sound, path) {
  const strength = clampSound01(1 - path.distance / Math.max(1, path.effectiveRadius));
  const rawMagnitude = sound.radius * path.multiplier * strength;
  let minMagnitude = scaleEnemyUnit(40);
  if (path.localization === 'muffled') minMagnitude = scaleEnemyUnit(70);
  if (path.localization === 'vague') minMagnitude = scaleEnemyUnit(48);
  if (sound.isGunshot) minMagnitude = scaleEnemyUnit(70);
  const maxMagnitude = sound.isGunshot
    ? scaleEnemyUnit(360)
    : scaleEnemyUnit(240);
  return Math.max(minMagnitude, Math.min(maxMagnitude, rawMagnitude));
}

function getPlayerDoorCueProxy(path) {
  if (path.portals && path.portals.length) return path.portals[path.portals.length - 1];
  if (typeof path.proxyX === 'number' && typeof path.proxyY === 'number') {
    return { x: path.proxyX, y: path.proxyY, doorId: path.proxyDoorId ?? null };
  }
  return null;
}

function pushPlayerSoundCue(sound, path) {
  if (!SHOW_PLAYER_SOUND_CUES || !path || !path.heard) return;

  const life = getSoundCueLifetime(sound);
  const magnitude = getSoundCueMagnitude(sound, path);
  const baseCue = {
    sourceType: sound.sourceType ?? 'unknown',
    isGunshot: !!sound.isGunshot,
    sourceX: sound.x,
    sourceY: sound.y,
    multiplier: path.multiplier,
    distance: path.distance,
    effectiveRadius: path.effectiveRadius,
    magnitude,
    life,
    maxLife: life,
  };

  if (path.localization === 'vague') {
    playerSoundCueEvents.push({
      ...baseCue,
      cueType: 'wall-pulse',
      proxyX: path.perceivedX,
      proxyY: path.perceivedY,
    });
    return;
  }

  if (path.localization === 'muffled') {
    const proxy = getPlayerDoorCueProxy(path);
    if (proxy) {
      playerSoundCueEvents.push({
        ...baseCue,
        cueType: 'door-cone',
        proxyX: proxy.x,
        proxyY: proxy.y,
        doorId: proxy.doorId,
        angle: Math.atan2(player.y - proxy.y, player.x - proxy.x),
      });
      return;
    }
  }

  playerSoundCueEvents.push({
    ...baseCue,
    cueType: 'clear-ring',
    proxyX: sound.x,
    proxyY: sound.y,
  });
}

function evaluateAndPushPlayerSoundCue(sound) {
  const path = evaluatePlayerSound(sound);
  pushPlayerSoundCue(sound, path);
}

function pushSoundAttenuationDebug(e, sound, path, heard = true) {
  if (!SHOW_SOUND_ATTENUATION_DEBUG) return;
  if (!heard && !SHOW_SOUND_ALL_PATH_DEBUG) return;
  soundAttenuationEvents.push({
    sourceX: sound.x,
    sourceY: sound.y,
    listenerX: e.x,
    listenerY: e.y,
    perceivedX: path.perceivedX,
    perceivedY: path.perceivedY,
    multiplier: path.multiplier,
    effectiveRadius: path.effectiveRadius,
    distance: path.distance,
    localization: path.localization,
    pathKind: path.pathKind,
    pathPoints: path.pathPoints,
    heard,
    life: SOUND_ATTENUATION_DEBUG_LIFETIME,
  });
}

function emitSoundEvent(sound) {
  const event = {
    x: sound.x,
    y: sound.y,
    radius: sound.radius,
    life: SOUND_LIFETIME,
    sourceType: sound.sourceType ?? 'unknown',
  };
  soundEvents.push(event);
  evaluateAndPushPlayerSoundCue(sound);

  if (sound.canAlertEnemies === false) return;

  for (const e of enemies) {
    if (sound.sourceActor === e) continue;
    const path = evaluateEnemySound(e, sound);
    pushSoundAttenuationDebug(e, sound, path, path.heard);
    if (!path.heard) continue;

    if (sound.isGunshot && pawnInCone(e.x, e.y, e.angle, e.visionAngle, sound.x, sound.y) && hasLOS(e.x, e.y, sound.x, sound.y)) {
      // Direct observation of muzzle flash: immediate alert.
      e.reactionTimer   = 0;
      e.pendingReaction = null;
      e.state      = 'alert';
      e.alertTimer = ALERT_FRAMES;
      e.targetAngle = Math.atan2(sound.x - e.x, -(sound.y - e.y));
      continue;
    }

    applySoundReaction(e, path.perceivedX, path.perceivedY);
  }
}

// Footstep sound: per-enemy radius based on the player's current noise scale.
// Called by player.js each frame the player actually moved.
function notifyPlayerMoved() {
  footstepTimer++;
  if (footstepTimer < 30) return;
  footstepTimer = 0;

  const noiseScale = typeof player.noiseScale === 'number'
    ? player.noiseScale
    : player.speed / WALK_SPEED;

  // Visual ring uses the same effective scale as hearing so the tradeoff is readable.
  emitSoundEvent({
    x: player.x,
    y: player.y,
    radius: FOOTSTEP_RADIUS * noiseScale,
    sourceType: 'player',
    sourceActor: player,
    canAlertEnemies: false,
  });

  for (const e of enemies) {
    // Per-enemy footstep radius: walk reaches FOOTSTEP_RADIUS, sneak is quieter, sprint is louder.
    const footRadius = e.proximityRadius + noiseScale * (FOOTSTEP_RADIUS - e.proximityRadius);
    const sound = { x: player.x, y: player.y, radius: footRadius, sourceType: 'player', sourceActor: player };
    const path = evaluateEnemySound(e, sound);
    pushSoundAttenuationDebug(e, sound, path, path.heard);
    if (!path.heard) continue;
    applySoundReaction(e, path.perceivedX, path.perceivedY);
  }
}

// Emit a sound at (x, y). Supports the old positional signature and the newer object shape.
function emitSound(x, y, radius, isGunshot = false) {
  if (typeof x === 'object' && x !== null) {
    emitSoundEvent(x);
    return;
  }

  emitSoundEvent({
    x,
    y,
    radius,
    isGunshot,
    sourceType: isGunshot ? 'gunshot' : 'world',
  });
}

function getPlayerSoundCueColor(cue) {
  if (cue.isGunshot) return '#ffe066';
  if (cue.cueType === 'door-cone') return '#ffbf45';
  if (cue.cueType === 'wall-pulse') return '#9bb8d6';
  if (cue.sourceType === 'enemy') return '#88d6ff';
  if (cue.sourceType === 'player') return '#c7ccd4';
  return '#d7dbe2';
}

function drawPlayerClearRingCue(cue, fade, progress) {
  const color = getPlayerSoundCueColor(cue);
  const radius = cue.magnitude * (0.2 + progress * 0.85);

  ctx.save();
  ctx.globalAlpha = fade * (cue.isGunshot ? 0.85 : 0.5);
  ctx.strokeStyle = color;
  ctx.lineWidth = scaleEnemyUnit(cue.isGunshot ? 2.4 : 1.4);
  ctx.beginPath();
  ctx.arc(cue.sourceX, cue.sourceY, radius, 0, Math.PI * 2);
  ctx.stroke();

  if (cue.isGunshot) {
    ctx.globalAlpha = fade * 0.22;
    ctx.lineWidth = scaleEnemyUnit(1);
    ctx.beginPath();
    ctx.arc(cue.sourceX, cue.sourceY, radius * 1.35, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPlayerDoorConeCue(cue, fade, progress) {
  const reach = cue.magnitude * (0.45 + progress * 0.75);
  const spread = SOUND_DOOR_CONE_SPREAD * (cue.isGunshot ? 1.2 : 1);
  const start = cue.angle - spread / 2;
  const end = cue.angle + spread / 2;
  const arcs = cue.isGunshot ? 5 : 3;

  ctx.save();
  ctx.globalAlpha = fade * 0.14;
  ctx.fillStyle = '#ffbf45';
  ctx.beginPath();
  ctx.moveTo(cue.proxyX, cue.proxyY);
  ctx.arc(cue.proxyX, cue.proxyY, reach, start, end);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#ffcf6a';
  ctx.lineWidth = scaleEnemyUnit(cue.isGunshot ? 2.4 : 1.7);
  ctx.setLineDash([scaleEnemyUnit(10), scaleEnemyUnit(7)]);
  for (let i = 1; i <= arcs; i++) {
    const t = (i - 0.55 + progress * 0.9) / arcs;
    const r = reach * Math.min(1, t);
    if (r <= scaleEnemyUnit(4) || r >= reach) continue;
    ctx.globalAlpha = fade * (0.5 + 0.3 * i / arcs);
    ctx.beginPath();
    ctx.arc(cue.proxyX, cue.proxyY, r, start, end);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  ctx.globalAlpha = fade * 0.75;
  ctx.fillStyle = '#ffcf6a';
  ctx.beginPath();
  ctx.arc(cue.proxyX, cue.proxyY, scaleEnemyUnit(cue.isGunshot ? 5 : 3.5), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPlayerWallPulseCue(cue, fade, progress) {
  const radius = cue.magnitude * (0.25 + progress * 0.75);

  ctx.save();
  ctx.strokeStyle = '#9bb8d6';
  ctx.fillStyle = '#9bb8d6';
  ctx.lineWidth = scaleEnemyUnit(1.2);
  ctx.globalAlpha = fade * 0.55;
  ctx.beginPath();
  ctx.arc(cue.proxyX, cue.proxyY, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.globalAlpha = fade * 0.24;
  ctx.beginPath();
  ctx.arc(cue.proxyX, cue.proxyY, radius * 0.55, 0, Math.PI * 2);
  ctx.stroke();

  ctx.globalAlpha = fade * 0.45;
  ctx.beginPath();
  ctx.arc(cue.proxyX, cue.proxyY, scaleEnemyUnit(3), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPlayerSoundCueEvents() {
  for (const cue of playerSoundCueEvents) {
    const fade = cue.life / cue.maxLife;
    const progress = 1 - fade;
    if (cue.cueType === 'door-cone') {
      drawPlayerDoorConeCue(cue, fade, progress);
    } else if (cue.cueType === 'wall-pulse') {
      drawPlayerWallPulseCue(cue, fade, progress);
    } else {
      drawPlayerClearRingCue(cue, fade, progress);
    }
  }
}

function drawSoundEvents() {
  drawPlayerSoundCueEvents();

  for (const a of soundAttenuationEvents) {
    const fade = a.life / SOUND_ATTENUATION_DEBUG_LIFETIME;
    const strength = Math.max(0.08, Math.min(1, a.multiplier));
    let stroke = '#71e8ff';
    let fill = '#71e8ff';
    let dash = [];

    if (!a.heard) {
      stroke = '#b06464';
      fill = '#d08484';
      dash = [scaleEnemyUnit(2), scaleEnemyUnit(12)];
    } else if (a.localization === 'muffled') {
      stroke = '#ffb23f';
      fill = '#ffcf6a';
      dash = [scaleEnemyUnit(12), scaleEnemyUnit(8)];
    } else if (a.localization === 'vague') {
      stroke = '#6f8aa8';
      fill = '#9bb8d6';
      dash = [scaleEnemyUnit(4), scaleEnemyUnit(10)];
    } else if (a.pathKind === 'portal') {
      stroke = '#80ff9f';
      fill = '#a8ffbf';
    }

    ctx.save();
    ctx.globalAlpha = fade * (a.heard ? (a.localization === 'clear' ? 0.55 : 0.75) : 0.35);
    ctx.strokeStyle = stroke;
    ctx.fillStyle = fill;
    ctx.lineWidth = scaleEnemyUnit(a.heard ? 1 + strength * 2 : 1);
    ctx.setLineDash(dash);
    ctx.beginPath();
    const pathPoints = a.pathPoints && a.pathPoints.length >= 2
      ? a.pathPoints
      : [{ x: a.sourceX, y: a.sourceY }, { x: a.listenerX, y: a.listenerY }];
    ctx.moveTo(pathPoints[0].x, pathPoints[0].y);
    for (let i = 1; i < pathPoints.length; i++) {
      ctx.lineTo(pathPoints[i].x, pathPoints[i].y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    const perceivedRing = scaleEnemyUnit(12 + 22 * strength);
    ctx.globalAlpha = fade * (a.heard ? 0.7 : 0.28);
    ctx.lineWidth = scaleEnemyUnit(1.5);
    ctx.beginPath();
    ctx.arc(a.perceivedX, a.perceivedY, perceivedRing, 0, Math.PI * 2);
    ctx.stroke();

    if (a.heard) {
      ctx.globalAlpha = fade * 0.9;
      ctx.beginPath();
      ctx.arc(a.perceivedX, a.perceivedY, scaleEnemyUnit(4 + 4 * strength), 0, Math.PI * 2);
      ctx.fill();
    }

    const listenerRing = scaleEnemyUnit(8 + 16 * strength);
    ctx.globalAlpha = fade * (a.heard ? 0.45 : 0.25);
    ctx.beginPath();
    ctx.arc(a.listenerX, a.listenerY, listenerRing, 0, Math.PI * 2);
    ctx.stroke();

    const labelX = (a.sourceX + a.listenerX) / 2;
    const labelY = (a.sourceY + a.listenerY) / 2;
    ctx.globalAlpha = fade * 0.75;
    ctx.font = `${Math.max(10, scaleEnemyUnit(8))}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = a.heard ? fill : '#d08484';
    ctx.fillText(`${a.heard ? 'heard' : 'lost'} ${a.pathKind}-${a.localization} x${a.multiplier.toFixed(2)}`, labelX, labelY);
    ctx.restore();
  }

  if (!SHOW_SOUND_SOURCE_DEBUG) return;

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
}
