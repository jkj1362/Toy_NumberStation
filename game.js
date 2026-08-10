const canvas = document.getElementById('game');
const screenCtx = canvas.getContext('2d');

const DESIGN_WIDTH = ACTIVE_MISSION.world.designWidth;
const DESIGN_HEIGHT = ACTIVE_MISSION.world.designHeight;
const GAME_WIDTH = ACTIVE_MISSION.world.width;
const GAME_HEIGHT = ACTIVE_MISSION.world.height;
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

const WALLS = ACTIVE_MISSION.geometry.walls.map(wall => ({
  ...scaleGameRect(wall),
  geometryId: wall.id,
  geometryType: 'wall',
  destructible: false,
  projectileBehavior: 'block',
}));

const DOOR_SPECS = ACTIVE_MISSION.doors.map(door => {
  const connector = ACTIVE_MISSION.connectors.find(item => item.id === door.connectorId);
  return { ...door, apertureIds: [...connector.apertureIds] };
});

const DOORS = DOOR_SPECS.map((door) => ({
  ...scaleGameRect(door),
  id: door.id,
  connectorId: door.connectorId,
  orientation: door.orientation,
  material: door.material,
  geometryId: door.id,
  geometryType: 'door',
  state: 'closed',
  defaultState: door.defaultState,
  openedBy: null,
  closingActor: null,
  closingSide: 0,
  destructible: door.material !== 'metal',
  projectileBehavior: door.material === 'metal' ? 'block' : 'penetrate',
  penetrationResistance: door.material === 'metal' ? Infinity : doorProjectileResistance(),
  bulletHoles: [],
  swingProgress: 0,
  swingDirection: 1,
  hp: door.material === 'metal' ? null : doorMaxHp(),
  maxHp: door.material === 'metal' ? null : doorMaxHp(),
  soundTransmission: doorSoundTransmission(),
  apertureIds: [...door.apertureIds],
}));

const WINDOW_SPECS = ACTIVE_MISSION.windows.map(windowSpec => {
  const connector = ACTIVE_MISSION.connectors.find(item => item.id === windowSpec.connectorId);
  return { ...windowSpec, apertureIds: [...connector.apertureIds] };
});

const WINDOWS = WINDOW_SPECS.map((windowSpec) => ({
  ...scaleGameRect(windowSpec),
  id: windowSpec.id,
  connectorId: windowSpec.connectorId,
  orientation: windowSpec.orientation,
  apertureIds: [...windowSpec.apertureIds],
  material: windowSpec.material,
  geometryId: windowSpec.id,
  geometryType: 'window',
  state: 'intact',
  defaultState: windowSpec.defaultState,
  destructible: true,
  projectileBehavior: 'penetrate',
  penetrationResistance: windowProjectileResistance(),
  bulletHoles: [],
  hp: windowMaxHp(),
  maxHp: windowMaxHp(),
}));

const projectiles = [];
const projectileImpactEvents = [];
let nextProjectileShotId = 1;

const CAM_SOFT_LOOKAHEAD_DIST = Math.min(VIEWPORT_WIDTH, VIEWPORT_HEIGHT) * 0.10;
const CAM_HARDAIM_DIST = Math.max(VIEWPORT_WIDTH, VIEWPORT_HEIGHT);
const CAM_CORNER_PADDING = scaleGameUnit(48);
const CAM_HARDAIM_OCCLUSION_PADDING = scaleGameUnit(48);
const CAM_EASE = 0.18;
const CAM_LOOKAHEAD_EASE = 0.16;
const CAMERA_MAX_X = Math.max(0, GAME_WIDTH - VIEWPORT_WIDTH);
const CAMERA_MAX_Y = Math.max(0, GAME_HEIGHT - VIEWPORT_HEIGHT);
const SIM_STEP_MS = 1000 / 60;
const MAX_SIM_STEPS_PER_FRAME = 5;
const FOG_RENDER_SCALE = 2;
const SHOW_PERF_OVERLAY = true;
const PERF_SMOOTHING = 0.08;

const camera = {
  x: 0,
  y: 0,
  lookAheadX: 0,
  lookAheadY: 0,
};

const perf = {
  fps: 0,
  updateMs: 0,
  drawMs: 0,
  enemiesMs: 0,
  lightingMs: 0,
  fogMs: 0,
  staticLightMs: 0,
  simSteps: 0,
};

function recordPerf(key, value) {
  perf[key] = perf[key] === 0 ? value : perf[key] * (1 - PERF_SMOOTHING) + value * PERF_SMOOTHING;
}

function measurePerf(key, fn) {
  const start = performance.now();
  const result = fn();
  recordPerf(key, performance.now() - start);
  return result;
}

// Lamp placement gives each room at least one fixture. Range/falloff, not spacing alone,
// now controls whether intact rooms are broadly lit or leave exploitable dark gaps.

// Wall duct/window exits - manually activated bonus exfil points
const WALL_GAP_EXITS = ACTIVE_MISSION.geometry.wallGapExits.map(exit => {
  const connector = ACTIVE_MISSION.connectors.find(item => item.id === exit.connectorId);
  return scaleGamePoint({
    ...exit,
    x: connector.position.x,
    y: connector.position.y,
    roomId: connector.rooms.find(roomId => roomId !== 'exterior'),
    windowId: connector.windowId,
  });
});
let gapExits = WALL_GAP_EXITS.map(g => ({ ...g }));

const INTERACT_RADIUS = scaleGameUnit(30);
const EXFIL_RADIUS    = scaleGameUnit(40);
const DOOR_INTERACT_RADIUS = scaleGameUnit(45);
const CORPSE_INTERACT_RADIUS = scaleGameUnit(34);
const DOOR_DAMAGE = 20;
const DOOR_OPEN_ANGLE = Math.PI * 5 / 12; // 75 degrees

function gameTunedUnit(key, fallback) {
  return scaleGameUnit(typeof getTuningNumber === 'function' ? getTuningNumber(key, fallback) : fallback);
}

function doorMaxHp() { return typeof getTuningNumber === 'function' ? getTuningNumber('doorMaxHp', 2000) : 2000; }
function doorSoundTransmission() { return typeof getTuningNumber === 'function' ? getTuningNumber('soundClosedDoorTransmission', 0.8) : 0.8; }
function doorDamage() { return typeof getTuningNumber === 'function' ? getTuningNumber('doorDamage', DOOR_DAMAGE) : DOOR_DAMAGE; }
function doorProjectileResistance() { return typeof getTuningNumber === 'function' ? getTuningNumber('doorProjectileResistance', 0.5) : 0.5; }
function windowMaxHp() { return typeof getTuningNumber === 'function' ? getTuningNumber('windowMaxHp', 60) : 60; }
function windowDamage() { return typeof getTuningNumber === 'function' ? getTuningNumber('windowDamage', 20) : 20; }
function windowProjectileResistance() { return typeof getTuningNumber === 'function' ? getTuningNumber('windowProjectileResistance', 0.15) : 0.15; }
function doorSwingFrames() { return typeof getTuningNumber === 'function' ? getTuningNumber('doorSwingFrames', 12) : 12; }
function metalDoorSwingFrames() { return typeof getTuningNumber === 'function' ? getTuningNumber('metalDoorSwingFrames', 24) : 24; }
function doorSwingFramesFor(door) { return door.material === 'metal' ? metalDoorSwingFrames() : doorSwingFrames(); }
function unarmoredBodyPenetrationResistance() { return typeof getTuningNumber === 'function' ? getTuningNumber('unarmoredBodyPenetrationResistance', 1) : 1; }
function doorInteractRadius() { return gameTunedUnit('doorInteractRadius', 45); }
function doorOpenAngle() { return typeof getTuningRadians === 'function' ? getTuningRadians('doorOpenAngleDegrees', 75) : DOOR_OPEN_ANGLE; }
function interactRadius() { return gameTunedUnit('interactRadius', 30); }
function exfilRadius() { return gameTunedUnit('exfilRadius', 40); }
function corpseInteractRadius() { return gameTunedUnit('corpseInteractRadius', 34); }
function cameraSoftLookaheadDistance() { return typeof getTuningNumber === 'function' ? getTuningNumber('cameraSoftLookaheadDistance', CAM_SOFT_LOOKAHEAD_DIST) : CAM_SOFT_LOOKAHEAD_DIST; }
function cameraHardAimDistance() { return typeof getTuningNumber === 'function' ? getTuningNumber('cameraHardAimDistance', CAM_HARDAIM_DIST) : CAM_HARDAIM_DIST; }
function cameraCornerPadding() { return gameTunedUnit('cameraCornerPadding', 48); }
function cameraHardAimOcclusionPadding() { return gameTunedUnit('cameraHardAimOcclusionPadding', 48); }
function cameraEase() { return typeof getTuningNumber === 'function' ? getTuningNumber('cameraEase', CAM_EASE) : CAM_EASE; }
function cameraLookaheadEase() { return typeof getTuningNumber === 'function' ? getTuningNumber('cameraLookaheadEase', CAM_LOOKAHEAD_EASE) : CAM_LOOKAHEAD_EASE; }
function fogRenderScale() { return typeof getTuningNumber === 'function' ? getTuningNumber('fogRenderScale', FOG_RENDER_SCALE) : FOG_RENDER_SCALE; }
function showPerfOverlay() { return typeof isDebugOverlayEnabled === 'function' ? isDebugOverlayEnabled('debugPerfOverlay') : SHOW_PERF_OVERLAY; }
function showMapOverlay() { return typeof isDebugOverlayEnabled === 'function' ? isDebugOverlayEnabled('debugMapOverlay') : hasMapKnowledge; }
function showDoorHpBars() { return typeof isDebugOverlayEnabled === 'function' ? isDebugOverlayEnabled('debugDoorHpBars') : true; }
function showSecondaryExfilDebug() { return typeof isDebugOverlayEnabled === 'function' ? isDebugOverlayEnabled('debugSecondaryExfil') : true; }

function applyDoorTuning(preserveHealthRatio = true) {
  const maxHp = doorMaxHp();
  for (const door of DOORS) {
    if (!door.destructible) {
      door.hp = null;
      door.maxHp = null;
      door.penetrationResistance = Infinity;
      door.soundTransmission = doorSoundTransmission();
      continue;
    }
    const ratio = door.maxHp > 0 ? door.hp / door.maxHp : 1;
    door.maxHp = maxHp;
    door.penetrationResistance = doorProjectileResistance();
    door.soundTransmission = doorSoundTransmission();
    door.hp = preserveHealthRatio ? Math.max(0, Math.min(maxHp, ratio * maxHp)) : maxHp;
  }
}

function applyWindowTuning(preserveHealthRatio = true) {
  const maxHp = windowMaxHp();
  for (const windowGeometry of WINDOWS) {
    const ratio = windowGeometry.maxHp > 0 ? windowGeometry.hp / windowGeometry.maxHp : 1;
    windowGeometry.maxHp = maxHp;
    windowGeometry.penetrationResistance = windowProjectileResistance();
    windowGeometry.hp = preserveHealthRatio ? Math.max(0, Math.min(maxHp, ratio * maxHp)) : maxHp;
  }
}

function getClosedDoorRects() {
  return DOORS.filter(door => door.state === 'closed');
}

function getIntactWindowRects() {
  return WINDOWS.filter(windowGeometry => windowGeometry.state === 'intact');
}

function getMovementBlockers() {
  return WALLS.concat(getClosedDoorRects(), getIntactWindowRects());
}

function getMovementBlockerPolygons() {
  return DOORS
    .filter(door => door.state !== 'closed' && door.state !== 'destroyed')
    .map(getDoorPanelCorners);
}

function getRayBlockerRects() {
  return WALLS.concat(getClosedDoorRects());
}

function rotateDoorPoint(x, y, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: x * cos - y * sin,
    y: x * sin + y * cos,
  };
}

function getDoorHinge(door) {
  if (door.orientation === 'horizontal') {
    return { x: door.x, y: door.y + door.h / 2, rectX: 0, rectY: -door.h / 2 };
  }

  return { x: door.x + door.w / 2, y: door.y, rectX: -door.w / 2, rectY: 0 };
}

function getDoorSwingAngle(door) {
  return (door.swingDirection ?? 1) * doorOpenAngle() * (door.swingProgress ?? 0);
}

function getDoorPanelCorners(door) {
  const hinge = getDoorHinge(door);
  const angle = getDoorSwingAngle(door);
  return [
    { x: hinge.rectX, y: hinge.rectY },
    { x: hinge.rectX + door.w, y: hinge.rectY },
    { x: hinge.rectX + door.w, y: hinge.rectY + door.h },
    { x: hinge.rectX, y: hinge.rectY + door.h },
  ].map((p) => {
    const rotated = rotateDoorPoint(p.x, p.y, angle);
    return { x: hinge.x + rotated.x, y: hinge.y + rotated.y };
  });
}

function getDoorLocalPoint(door, x, y) {
  const hinge = getDoorHinge(door);
  return rotateDoorPoint(x - hinge.x, y - hinge.y, -getDoorSwingAngle(door));
}

function pointHitsDoorPanel(door, x, y, radius = 0) {
  if (door.state === 'closed' || door.state === 'destroyed') return false;
  const hinge = getDoorHinge(door);
  const local = getDoorLocalPoint(door, x, y);
  return local.x > hinge.rectX - radius &&
    local.x < hinge.rectX + door.w + radius &&
    local.y > hinge.rectY - radius &&
    local.y < hinge.rectY + door.h + radius;
}

function getDoorOpeningDirection(door, opener) {
  if (!opener) return door.swingDirection;

  return door.orientation === 'horizontal'
    ? (opener.y >= door.y + door.h / 2 ? -1 : 1)
    : (opener.x >= door.x + door.w / 2 ? 1 : -1);
}

function getDoorEntitySide(door, entity) {
  if (!entity) return 0;
  return door.orientation === 'horizontal'
    ? (entity.y >= door.y + door.h / 2 ? 1 : -1)
    : (entity.x >= door.x + door.w / 2 ? 1 : -1);
}

function keepClosingActorOnOriginalSide(door) {
  const entity = door.closingActor;
  const side = door.closingSide;
  if (!entity || !side || entity.alive === false) return;
  const radius = entity === player
    ? (typeof playerRadius === 'function' ? playerRadius() : PLAYER_RADIUS)
    : (typeof enemyRadius === 'function' ? enemyRadius() : scaleGameUnit(16));
  const normalRange = doorInteractRadius();
  if (door.orientation === 'horizontal') {
    if (entity.x < door.x - radius || entity.x > door.x + door.w + radius ||
        Math.abs(entity.y - (door.y + door.h / 2)) > normalRange) return;
    entity.y = side > 0 ? door.y + door.h + radius : door.y - radius;
  } else {
    if (entity.y < door.y - radius || entity.y > door.y + door.h + radius ||
        Math.abs(entity.x - (door.x + door.w / 2)) > normalRange) return;
    entity.x = side > 0 ? door.x + door.w + radius : door.x - radius;
  }
}

function getRayBlockerPolygons() {
  return getMovementBlockerPolygons();
}

// Precomputed wall segments and corners for visibility raycasting (static — walls never move)
let WALL_SEGMENTS = (() => {
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

let WALL_CORNERS = (() => {
  const seen = new Set(), pts = [];
  const add = (x, y) => { const k = `${x},${y}`; if (!seen.has(k)) { seen.add(k); pts.push({ x, y }); } };
  add(0, 0); add(GAME_WIDTH, 0); add(GAME_WIDTH, GAME_HEIGHT); add(0, GAME_HEIGHT);
  for (const w of WALLS) {
    add(w.x, w.y); add(w.x + w.w, w.y); add(w.x + w.w, w.y + w.h); add(w.x, w.y + w.h);
  }
  return pts;
})();

let rayGeometryDirty = true;

function markGeometryDirty() {
  rayGeometryDirty = true;
}

function markDoorLightingDirty() {
  if (typeof markStaticLightingDirty === 'function') markStaticLightingDirty();
}

function rebuildRayGeometryIfNeeded() {
  if (!rayGeometryDirty) return;

  const segments = [
    { x1: 0,          y1: 0,           x2: GAME_WIDTH, y2: 0           },
    { x1: GAME_WIDTH, y1: 0,           x2: GAME_WIDTH, y2: GAME_HEIGHT },
    { x1: GAME_WIDTH, y1: GAME_HEIGHT, x2: 0,          y2: GAME_HEIGHT },
    { x1: 0,          y1: GAME_HEIGHT, x2: 0,          y2: 0           },
  ];
  const seen = new Set();
  const corners = [];
  const addCorner = (x, y) => {
    const key = `${x},${y}`;
    if (seen.has(key)) return;
    seen.add(key);
    corners.push({ x, y });
  };

  addCorner(0, 0);
  addCorner(GAME_WIDTH, 0);
  addCorner(GAME_WIDTH, GAME_HEIGHT);
  addCorner(0, GAME_HEIGHT);

  for (const r of getRayBlockerRects()) {
    segments.push({ x1: r.x,       y1: r.y,       x2: r.x + r.w, y2: r.y       });
    segments.push({ x1: r.x + r.w, y1: r.y,       x2: r.x + r.w, y2: r.y + r.h });
    segments.push({ x1: r.x + r.w, y1: r.y + r.h, x2: r.x,       y2: r.y + r.h });
    segments.push({ x1: r.x,       y1: r.y + r.h, x2: r.x,       y2: r.y       });
    addCorner(r.x, r.y);
    addCorner(r.x + r.w, r.y);
    addCorner(r.x + r.w, r.y + r.h);
    addCorner(r.x, r.y + r.h);
  }

  for (const poly of getRayBlockerPolygons()) {
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i];
      const b = poly[(i + 1) % poly.length];
      segments.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
      addCorner(a.x, a.y);
    }
  }

  WALL_SEGMENTS = segments;
  WALL_CORNERS = corners;
  rayGeometryDirty = false;
}

// Room centers used for random pickup / exfil placement
const ROOMS = ACTIVE_MISSION.rooms.map(room => ({
  id: room.id,
  cx: scaleGameX(room.center.x),
  cy: scaleGameY(room.center.y),
  startingSpace: room.startingSpace,
}));

// Mission state
let pickup          = { x: 0, y: 0, roomId: '', collected: false, visibleToPlayer: false };
let exfilPoints     = [];
let corpses         = [];
let gamePhase       = 'infiltrate'; // 'infiltrate' | 'exfil' | 'complete' | 'gameover'
let hasMapKnowledge = true;         // true = player acquired facility map during day phase

function setDoorApertures(door) {
  const open = door.state === 'open' || door.state === 'closing' || door.state === 'destroyed';
  if (typeof setLightingAperturesOpen === 'function') {
    setLightingAperturesOpen(door.apertureIds, open);
  }
}

function setDoorState(door, state, openedBy = null) {
  if (!door || door.state === 'destroyed' || door.state === state ||
      (state === 'closed' && door.state === 'closing')) return;
  if (state === 'open') {
    door.swingDirection = getDoorOpeningDirection(door, openedBy);
    door.state = 'open';
    door.openedBy = openedBy;
    door.closingActor = null;
    door.closingSide = 0;
  } else if (state === 'closed') {
    const closingActor = openedBy ?? door.openedBy ?? null;
    door.state = 'closing';
    door.closingActor = closingActor;
    door.closingSide = getDoorEntitySide(door, closingActor);
  } else if (state === 'destroyed') {
    door.state = 'destroyed';
    door.openedBy = null;
    door.closingActor = null;
    door.closingSide = 0;
    door.swingProgress = 0;
  }
  setDoorApertures(door);
  markGeometryDirty();
  markDoorLightingDirty();
}

function resetDoors() {
  applyDoorTuning(false);
  for (const door of DOORS) {
    door.state = door.defaultState;
    door.openedBy = null;
    door.closingActor = null;
    door.closingSide = 0;
    door.hp = door.maxHp;
    door.bulletHoles.length = 0;
    door.swingProgress = 0;
    door.swingDirection = 1;
    setDoorApertures(door);
  }
  markGeometryDirty();
  markDoorLightingDirty();
}

function resetWindows() {
  applyWindowTuning(false);
  for (const windowGeometry of WINDOWS) {
    windowGeometry.state = windowGeometry.defaultState;
    windowGeometry.hp = windowGeometry.maxHp;
    windowGeometry.bulletHoles.length = 0;
  }
  markGeometryDirty();
}

function activateWindowExit(windowGeometry) {
  const gap = gapExits.find(candidate => candidate.windowId === windowGeometry.id);
  if (!gap || gap.activated) return false;
  gap.activated = true;
  exfilPoints.push({
    x: gap.x,
    y: gap.y,
    type: 'gap',
    windowId: windowGeometry.id,
    active: gamePhase === 'exfil',
    discovered: true,
  });
  return true;
}

function openNearbyWindow(entity = player, radius = interactRadius()) {
  let nearest = null;
  let nearestDistance = radius * radius;
  for (const windowGeometry of WINDOWS) {
    if (windowGeometry.state !== 'intact') continue;
    const distance = distanceSqToRect(windowGeometry, entity.x, entity.y);
    if (distance > nearestDistance) continue;
    nearest = windowGeometry;
    nearestDistance = distance;
  }
  if (!nearest) return false;
  nearest.state = 'open';
  markGeometryDirty();
  activateWindowExit(nearest);
  return true;
}

function closestPointOnRect(rect, x, y) {
  return {
    x: clamp(x, rect.x, rect.x + rect.w),
    y: clamp(y, rect.y, rect.y + rect.h),
  };
}

function distanceSqToRect(rect, x, y) {
  const p = closestPointOnRect(rect, x, y);
  return (x - p.x) ** 2 + (y - p.y) ** 2;
}

function closestPointOnSegment(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const len2 = abx * abx + aby * aby;
  if (len2 === 0) return { x: ax, y: ay };
  const t = clamp(((px - ax) * abx + (py - ay) * aby) / len2, 0, 1);
  return { x: ax + abx * t, y: ay + aby * t };
}

function distanceSqToSegment(px, py, ax, ay, bx, by) {
  const closest = closestPointOnSegment(px, py, ax, ay, bx, by);
  return (px - closest.x) ** 2 + (py - closest.y) ** 2;
}

function pointInDoorPolygon(poly, x, y) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (((a.y > y) !== (b.y > y)) &&
        x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

function distanceSqToPolygon(poly, x, y) {
  if (pointInDoorPolygon(poly, x, y)) return 0;
  let best = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    best = Math.min(best, distanceSqToSegment(x, y, a.x, a.y, b.x, b.y));
  }
  return best;
}

function updateDoorAnimations() {
  let changed = false;
  for (const door of DOORS) {
    const target = door.state === 'open' ? 1 : 0;
    const frames = doorSwingFramesFor(door);
    let next = Math.abs(door.swingProgress - target) <= 1 / frames
      ? target
      : door.swingProgress + Math.sign(target - door.swingProgress) / frames;
    if (Math.abs(next - target) < 0.000001) next = target;
    if (next === door.swingProgress) continue;
    door.swingProgress = next;
    if (door.state === 'closing' && next === 0) {
      keepClosingActorOnOriginalSide(door);
      door.state = 'closed';
      door.openedBy = null;
      door.closingActor = null;
      door.closingSide = 0;
      setDoorApertures(door);
    }
    changed = true;
  }
  if (changed) {
    markGeometryDirty();
    markDoorLightingDirty();
  }
}

function playerHasClearView(wx, wy) {
  if (!inVisionCone(wx, wy)) return false;
  const angle = Math.atan2(wy - player.y, wx - player.x);
  const hit = castVisRay(player.x, player.y, angle);
  if (!hit) return true;
  const distToTarget = (wx - player.x) ** 2 + (wy - player.y) ** 2;
  const distToBlocker = (hit.x - player.x) ** 2 + (hit.y - player.y) ** 2;
  const tolerance = scaleGameUnit(2) ** 2;
  return distToBlocker + tolerance >= distToTarget;
}

function isDoorVisibleToPlayer(door) {
  const panel = getDoorPanelCorners(door);
  const center = panel.reduce((sum, point) => ({
    x: sum.x + point.x / panel.length,
    y: sum.y + point.y / panel.length,
  }), { x: 0, y: 0 });
  let closest = null;
  let closestDistance = Infinity;
  for (let i = 0; i < panel.length; i++) {
    const a = panel[i];
    const b = panel[(i + 1) % panel.length];
    const point = closestPointOnSegment(player.x, player.y, a.x, a.y, b.x, b.y);
    const distance = (player.x - point.x) ** 2 + (player.y - point.y) ** 2;
    if (distance < closestDistance) {
      closest = point;
      closestDistance = distance;
    }
  }
  const samples = [closest, center, ...panel];
  return samples.some(p => playerHasClearView(p.x, p.y));
}

function isDoorBlockedByEnemy(door, ignoredEnemy = null) {
  if (typeof enemies === 'undefined') return false;
  const panel = getDoorPanelCorners(door);
  const radius = typeof enemyRadius === 'function' ? enemyRadius() : scaleGameUnit(16);
  const radiusSq = radius * radius;
  for (const enemy of enemies) {
    if (enemy === ignoredEnemy) continue;
    if (distanceSqToRect(door, enemy.x, enemy.y) <= radiusSq) return true;
    if (distanceSqToPolygon(panel, enemy.x, enemy.y) <= radiusSq) return true;
  }
  return false;
}

function isDoorBlockedByPlayer(door) {
  if (typeof player === 'undefined' || !player || player.alive === false) return false;
  const panel = getDoorPanelCorners(door);
  const radius = typeof playerRadius === 'function' ? playerRadius() : PLAYER_RADIUS;
  const radiusSq = radius * radius;
  return distanceSqToRect(door, player.x, player.y) <= radiusSq ||
    distanceSqToPolygon(panel, player.x, player.y) <= radiusSq;
}

function getNearbyDoor(entity, radius = doorInteractRadius()) {
  let best = null;
  let bestD2 = radius * radius;
  for (const door of DOORS) {
    if (door.state === 'destroyed') continue;
    const d2 = distanceSqToRect(door, entity.x, entity.y);
    if (d2 <= bestD2) {
      best = door;
      bestD2 = d2;
    }
  }
  return best;
}

function toggleNearbyDoor(entity = player) {
  const door = getNearbyDoor(entity);
  if (!door) return false;
  if (door.state === 'closing') return true;
  if (isDoorBlockedByEnemy(door)) return true;
  const nextState = door.state === 'closed' ? 'open' : 'closed';
  setDoorState(door, nextState, entity);
  if (typeof emitSound === 'function') {
    emitSound({
      x: entity.x,
      y: entity.y,
      radius: scaleGameUnit(120),
      sourceType: 'door',
      sourceActor: entity,
    });
  }
  return true;
}

function openDoorNearEntity(entity, radius = doorInteractRadius(), excludedDoorId = null) {
  let door = null;
  let bestD2 = radius * radius;
  for (const candidate of DOORS) {
    if (candidate.id === excludedDoorId || candidate.state !== 'closed') continue;
    const d2 = distanceSqToRect(candidate, entity.x, entity.y);
    if (d2 <= bestD2) {
      door = candidate;
      bestD2 = d2;
    }
  }
  if (!door) return false;
  setDoorState(door, 'open', entity);
  return true;
}

function hitDoorAt(x, y) {
  for (const door of DOORS) {
    if (door.state !== 'closed') continue;
    if (x >= door.x && x <= door.x + door.w &&
        y >= door.y && y <= door.y + door.h) return door;
  }
  return null;
}

function damageDoor(door, amount = doorDamage(), impact = null) {
  if (amount && typeof amount === 'object') {
    impact = amount;
    amount = doorDamage();
  }
  if (!door || !door.destructible || door.state === 'destroyed') return false;
  if (impact && typeof impact.x === 'number' && typeof impact.y === 'number') {
    door.bulletHoles.push(getDoorLocalPoint(door, impact.x, impact.y));
    if (door.bulletHoles.length > 24) door.bulletHoles.shift();
  }
  door.hp -= amount;
  if (door.hp <= 0) {
    door.hp = 0;
    setDoorState(door, 'destroyed');
    if (typeof emitSound === 'function' && (impact?.shotId === null || impact?.shotId === undefined)) {
      emitSound({
        x: door.x + door.w / 2,
        y: door.y + door.h / 2,
        radius: typeof soundGeometryDestructionRadius === 'function' ? soundGeometryDestructionRadius() : scaleGameUnit(560),
        sourceType: 'door',
        sourceActor: door,
        shotId: impact?.shotId,
        impactKind: 'destruction',
        geometryId: door.id,
        geometryType: 'door',
        destroyed: true,
      });
    }
  } else {
    markDoorLightingDirty();
  }
  if (impact && typeof notifyDoorDamaged === 'function') {
    notifyDoorDamaged(
      door,
      typeof impact.x === 'number' ? impact.x : door.x + door.w / 2,
      typeof impact.y === 'number' ? impact.y : door.y + door.h / 2,
      impact.sourceActor ?? null,
      impact.shotId ?? null,
      impact.sourceType ?? 'unknown'
    );
  }
  return true;
}

function damageWindow(windowGeometry, amount = windowDamage(), impact = null) {
  if (!windowGeometry || windowGeometry.state === 'destroyed') return false;
  if (impact && typeof impact.x === 'number' && typeof impact.y === 'number') {
    windowGeometry.bulletHoles.push({
      x: impact.x - windowGeometry.x,
      y: impact.y - windowGeometry.y,
    });
    if (windowGeometry.bulletHoles.length > 12) windowGeometry.bulletHoles.shift();
  }
  windowGeometry.hp -= amount;
  if (windowGeometry.hp <= 0) {
    windowGeometry.hp = 0;
    windowGeometry.state = 'destroyed';
    markGeometryDirty();
    activateWindowExit(windowGeometry);
    if (typeof emitSound === 'function' && (impact?.shotId === null || impact?.shotId === undefined)) {
      emitSound({
        x: windowGeometry.x + windowGeometry.w / 2,
        y: windowGeometry.y + windowGeometry.h / 2,
        radius: typeof soundGeometryDestructionRadius === 'function' ? soundGeometryDestructionRadius() : scaleGameUnit(560),
        sourceType: 'window',
        sourceActor: windowGeometry,
        shotId: impact?.shotId,
        impactKind: 'destruction',
        geometryId: windowGeometry.id,
        geometryType: 'window',
        destroyed: true,
      });
    }
  }
  return true;
}

function inVisionCone(wx, wy) {
  const dx = wx - player.x, dy = wy - player.y;
  if (dx === 0 && dy === 0) return true;
  const bearing = Math.atan2(dx, -dy);
  let diff = bearing - player.angle;
  while (diff >  Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const visionAngle = typeof getPlayerVisionAngle === 'function' ? getPlayerVisionAngle() : VISION_ANGLE;
  return Math.abs(diff) <= visionAngle / 2;
}

function isLit(wx, wy) {
  const threshold = typeof playerVisibleLightThreshold === 'function'
    ? playerVisibleLightThreshold()
    : PLAYER_VISIBLE_LIGHT_THRESHOLD;
  return getLightLevel(wx, wy, { includePlayerGlow: true }) >= threshold;
}

// Lamp-only variant — excludes the player's self-glow. Used by enemy detection so
// the player's ambient light doesn't make them permanently visible to guards.
function isLitByLamps(wx, wy) {
  const threshold = typeof enemyBrightLightThreshold === 'function'
    ? enemyBrightLightThreshold()
    : ENEMY_BRIGHT_LIGHT_THRESHOLD;
  return getLightLevel(wx, wy, { includePlayerGlow: false }) >= threshold;
    // Half-plane clip — mirrors the rect clip in drawLighting so detection matches visuals
}

function initPickup() {
  const pickupRule = ACTIVE_MISSION.objective.pickupRule;
  const eligible = ROOMS.filter(room => !pickupRule.excludeStartingSpaces || !room.startingSpace);
  const room = ROOMS.find(item => item.id === pickupRule.pickupRoomId) ??
    eligible[Math.floor(Math.random() * eligible.length)];
  pickup.x = room.cx;
  pickup.y = room.cy;
  pickup.roomId = room.id;
  pickup.collected = false;
  pickup.visibleToPlayer = false;
  return room.id;
}

function initExfil() {
  exfilPoints.length = 0;
  for (const exfil of ACTIVE_MISSION.objective.exfilPoints) {
    const connector = ACTIVE_MISSION.connectors.find(item => item.id === exfil.connectorId);
    exfilPoints.push(scaleGamePoint({
      ...exfil,
      x: connector.position.x,
      y: connector.position.y,
    }));
  }
}

function pushOutOfWalls(entity, radius) {
  for (const wall of getMovementBlockers()) {
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

  for (const door of DOORS) {
    if (!pointHitsDoorPanel(door, entity.x, entity.y, radius)) continue;
    const hinge = getDoorHinge(door);
    const local = getDoorLocalPoint(door, entity.x, entity.y);
    const left = hinge.rectX - radius;
    const right = hinge.rectX + door.w + radius;
    const top = hinge.rectY - radius;
    const bottom = hinge.rectY + door.h + radius;
    const dLeft = local.x - left;
    const dRight = right - local.x;
    const dTop = local.y - top;
    const dBottom = bottom - local.y;
    const minX = Math.min(dLeft, dRight);
    const minY = Math.min(dTop, dBottom);
    const separationEpsilon = 0.01;
    if (minX < minY) {
      local.x = dLeft < dRight ? left - separationEpsilon : right + separationEpsilon;
    } else {
      local.y = dTop < dBottom ? top - separationEpsilon : bottom + separationEpsilon;
    }

    const rotated = rotateDoorPoint(local.x, local.y, getDoorSwingAngle(door));
    entity.x = hinge.x + rotated.x;
    entity.y = hinge.y + rotated.y;
  }
}

function hitsWall(x, y) {
  for (const wall of getRayBlockerRects()) {
    if (x >= wall.x && x <= wall.x + wall.w &&
        y >= wall.y && y <= wall.y + wall.h) return true;
  }
  return false;
}

function createProjectile(data) {
  return {
    ...data,
    shotId: nextProjectileShotId++,
    hitTargetIds: new Set(),
  };
}

function segmentCircleIntersection(x1, y1, x2, y2, cx, cy, radius) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const fx = x1 - cx;
  const fy = y1 - cy;
  const a = dx * dx + dy * dy;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - radius * radius;
  const discriminant = b * b - 4 * a * c;
  if (a === 0 || discriminant < 0) return null;

  const root = Math.sqrt(discriminant);
  const entry = (-b - root) / (2 * a);
  const exit = (-b + root) / (2 * a);
  if (exit < 0 || entry > 1) return null;
  return { t: Math.max(0, entry), exitT: Math.min(1, exit) };
}

function segmentRectIntersection(x1, y1, x2, y2, rect) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let entry = 0;
  let exit = 1;

  for (const [start, delta, min, max] of [[x1, dx, rect.x, rect.x + rect.w], [y1, dy, rect.y, rect.y + rect.h]]) {
    if (delta === 0) {
      if (start < min || start > max) return null;
      continue;
    }
    const t1 = (min - start) / delta;
    const t2 = (max - start) / delta;
    entry = Math.max(entry, Math.min(t1, t2));
    exit = Math.min(exit, Math.max(t1, t2));
    if (entry > exit) return null;
  }

  return { t: entry, exitT: exit };
}

function segmentPolygonIntersection(x1, y1, x2, y2, polygon) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const hits = [];
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    const ex = b.x - a.x;
    const ey = b.y - a.y;
    const denominator = dx * ey - dy * ex;
    if (Math.abs(denominator) < 0.000001) continue;
    const ax = a.x - x1;
    const ay = a.y - y1;
    const t = (ax * ey - ay * ex) / denominator;
    const u = (ax * dy - ay * dx) / denominator;
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) hits.push(t);
  }
  if (!hits.length) return null;
  hits.sort((a, b) => a - b);
  const startsInside = pointInDoorPolygon(polygon, x1, y1);
  return {
    t: startsInside ? 0 : hits[0],
    exitT: startsInside ? hits[0] : (hits[1] ?? hits[0]),
  };
}

function getProjectileCollision(projectile, x1, y1, x2, y2, actorTargets) {
  const candidates = [];
  for (const target of actorTargets) {
    if (projectile.hitTargetIds.has(target.id)) continue;
    const hit = segmentCircleIntersection(x1, y1, x2, y2, target.actor.x, target.actor.y, target.radius);
    if (hit) candidates.push({ ...hit, kind: 'actor', target });
  }

  const lampTargets = typeof getProjectileLampTargets === 'function' ? getProjectileLampTargets() : [];
  for (const target of lampTargets) {
    if (projectile.hitTargetIds.has(target.id)) continue;
    const hit = segmentCircleIntersection(x1, y1, x2, y2, target.x, target.y, target.radius);
    if (hit) candidates.push({ ...hit, kind: 'lamp', target });
  }

  for (const wall of WALLS) {
    const hit = segmentRectIntersection(x1, y1, x2, y2, wall);
    if (hit) candidates.push({ ...hit, kind: 'geometry', target: wall });
  }
  for (const door of DOORS) {
    if (door.state === 'destroyed' || projectile.hitTargetIds.has(door.id)) continue;
    const hit = segmentPolygonIntersection(x1, y1, x2, y2, getDoorPanelCorners(door));
    if (hit) candidates.push({ ...hit, kind: 'geometry', target: door });
  }
  for (const windowGeometry of WINDOWS) {
    if (windowGeometry.state !== 'intact' || projectile.hitTargetIds.has(windowGeometry.id)) continue;
    const hit = segmentRectIntersection(x1, y1, x2, y2, windowGeometry);
    if (hit) candidates.push({ ...hit, kind: 'geometry', target: windowGeometry });
  }

  const collisionPriority = { actor: 0, lamp: 1, geometry: 2 };
  candidates.sort((a, b) => {
    if (a.t !== b.t) return a.t - b.t;
    return collisionPriority[a.kind] - collisionPriority[b.kind];
  });
  return candidates[0] ?? null;
}

function emitProjectileImpact(projectile, target, x, y) {
  const speed = Math.hypot(projectile.vx, projectile.vy) || 1;
  const event = {
    shotId: projectile.shotId,
    x,
    y,
    incomingX: projectile.vx / speed,
    incomingY: projectile.vy / speed,
    sourceActor: projectile.sourceActor,
    sourceType: projectile.sourceType,
    geometryId: target.id ?? target.geometryId,
    geometryType: target.geometryType,
    material: target.material,
    destructible: target.destructible === true,
    projectileBehavior: target.projectileBehavior,
    destroyed: target.state === 'destroyed',
    impactKind: target.state === 'destroyed' ? 'destruction' : 'impact',
    geometryX: target.x,
    geometryY: target.y,
    geometryW: target.w,
    geometryH: target.h,
  };
  projectileImpactEvents.push(event);
  if (projectileImpactEvents.length > 128) projectileImpactEvents.shift();
  if (typeof notifyProjectileImpactWitnesses === 'function') {
    notifyProjectileImpactWitnesses(event);
  }

  if (typeof emitSound === 'function') {
    const radius = event.destroyed && (target.geometryType === 'door' || target.geometryType === 'window')
      ? (typeof soundGeometryDestructionRadius === 'function' ? soundGeometryDestructionRadius() : scaleGameUnit(560))
      : (target.geometryType === 'window'
      ? (typeof soundWindowImpactRadius === 'function' ? soundWindowImpactRadius() : scaleGameUnit(500))
      : (target.geometryType === 'door' && target.material === 'metal'
        ? (typeof soundMetalDoorImpactRadius === 'function' ? soundMetalDoorImpactRadius() : scaleGameUnit(480))
        : (typeof soundProjectileImpactRadius === 'function' ? soundProjectileImpactRadius() : scaleGameUnit(420))));
    emitSound({
      x,
      y,
      radius,
      sourceType: projectile.sourceType,
      sourceActor: projectile.sourceActor,
      shotId: projectile.shotId,
      isProjectileImpact: true,
      impactKind: event.impactKind,
      geometryId: event.geometryId,
      geometryType: event.geometryType,
      material: event.material,
      destroyed: event.destroyed,
    });
  }
}

function resolveProjectileTravel(projectile, getActorTargets, onActorHit) {
  let startX = projectile.x;
  let startY = projectile.y;
  const endX = startX + projectile.vx;
  const endY = startY + projectile.vy;

  for (let remainingHits = 12; remainingHits > 0; remainingHits--) {
    const hit = getProjectileCollision(projectile, startX, startY, endX, endY, getActorTargets());
    if (!hit) {
      projectile.x = endX;
      projectile.y = endY;
      return true;
    }

    const hitX = startX + (endX - startX) * hit.t;
    const hitY = startY + (endY - startY) * hit.t;
    if (hit.kind === 'actor') {
      projectile.hitTargetIds.add(hit.target.id);
      onActorHit(hit.target.actor);
      projectile.penetrationPower -= hit.target.penetrationResistance;
    } else if (hit.kind === 'lamp') {
      projectile.hitTargetIds.add(hit.target.id);
      const destroyed = typeof destroyLamp === 'function' && destroyLamp(hit.target.lamp);
      if (destroyed && typeof notifyLampDestroyed === 'function') {
        notifyLampDestroyed(
          hit.target.lamp,
          hitX,
          hitY,
          projectile.sourceActor,
          projectile.shotId,
          projectile.sourceType
        );
      }
      emitProjectileImpact(projectile, hit.target, hitX, hitY);
      projectile.x = hitX;
      projectile.y = hitY;
      return false;
    } else {
      const target = hit.target;
      projectile.hitTargetIds.add(target.id ?? target.geometryId);
      let destroyed = false;
      if (target.destructible) {
        const impact = {
          x: hitX,
          y: hitY,
          sourceActor: projectile.sourceActor,
          sourceType: projectile.sourceType,
          shotId: projectile.shotId,
        };
        if (target.geometryType === 'door' && typeof damageDoor === 'function') {
          damageDoor(target, doorDamage(), impact);
        } else if (target.geometryType === 'window' && typeof damageWindow === 'function') {
          damageWindow(target, windowDamage(), impact);
        }
        destroyed = target.state === 'destroyed';
      }
      emitProjectileImpact(projectile, target, hitX, hitY);
      projectileImpactEvents[projectileImpactEvents.length - 1].destroyed = destroyed;
      if (target.projectileBehavior === 'block') {
        projectile.x = hitX;
        projectile.y = hitY;
        return false;
      }
      projectile.penetrationPower -= target.penetrationResistance;
    }

    if (projectile.penetrationPower <= 0) {
      projectile.x = hitX;
      projectile.y = hitY;
      return false;
    }

    const nextT = Math.min(1, hit.exitT + 0.0001);
    startX += (endX - startX) * nextT;
    startY += (endY - startY) * nextT;
  }

  projectile.x = endX;
  projectile.y = endY;
  return true;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function getCameraLookAhead(distance, respectForwardBlocker = false) {
  const dx = Math.sin(player.angle);
  const dy = -Math.cos(player.angle);
  const cornerPadding = cameraCornerPadding();
  const maxX = Math.abs(dx) > 0.001 ? (VIEWPORT_WIDTH / 2 - cornerPadding) / Math.abs(dx) : Infinity;
  const maxY = Math.abs(dy) > 0.001 ? (VIEWPORT_HEIGHT / 2 - cornerPadding) / Math.abs(dy) : Infinity;
  let dist = Math.max(0, Math.min(distance, maxX, maxY));

  if (respectForwardBlocker) {
    const hit = castVisRay(player.x, player.y, player.angle - Math.PI / 2);
    if (hit) {
      const hitDist = Math.hypot(hit.x - player.x, hit.y - player.y);
      dist = Math.min(dist, Math.max(0, hitDist - cameraHardAimOcclusionPadding()));
    }
  }

  return { x: dx * dist, y: dy * dist };
}

function resetCamera() {
  camera.x = clamp(player.x - VIEWPORT_WIDTH / 2, 0, CAMERA_MAX_X);
  camera.y = clamp(player.y - VIEWPORT_HEIGHT / 2, 0, CAMERA_MAX_Y);
  camera.lookAheadX = 0;
  camera.lookAheadY = 0;
}

function updateCamera(hardAimHeld) {
  const lookAheadDistance = hardAimHeld ? cameraHardAimDistance() : cameraSoftLookaheadDistance();
  const lookAheadTarget = getCameraLookAhead(lookAheadDistance, hardAimHeld);
  camera.lookAheadX = lerp(camera.lookAheadX, lookAheadTarget.x, cameraLookaheadEase());
  camera.lookAheadY = lerp(camera.lookAheadY, lookAheadTarget.y, cameraLookaheadEase());

  let targetX = player.x + camera.lookAheadX - VIEWPORT_WIDTH / 2;
  let targetY = player.y + camera.lookAheadY - VIEWPORT_HEIGHT / 2;

  targetX = clamp(targetX, 0, CAMERA_MAX_X);
  targetY = clamp(targetY, 0, CAMERA_MAX_Y);
  camera.x = lerp(camera.x, targetX, cameraEase());
  camera.y = lerp(camera.y, targetY, cameraEase());
}

function reset() {
  resetPlayer();
  resetCamera();
  projectiles.length = 0;
  corpses.length = 0;
  resetEnemies();
  resetLighting();
  resetDoors();
  resetWindows();
  gamePhase = 'infiltrate';
  gapExits = WALL_GAP_EXITS.map(g => ({ ...g }));
  initPickup();
  initExfil();
}

function addCorpse(corpse) {
  corpses.push({
    interactable: true,
    looted: false,
    interactRadius: corpseInteractRadius(),
    ...corpse,
  });
}

function addEnemyCorpse(enemy) {
  const radius = typeof enemyRadius === 'function' ? enemyRadius() : scaleGameUnit(16);
  addCorpse({
    type: 'enemy',
    archetype: enemy.archetype,
    x: enemy.x,
    y: enemy.y,
    angle: enemy.angle,
    radius,
  });
}

function addPlayerCorpse() {
  if (corpses.some(c => c.type === 'player')) return;
  addCorpse({
    type: 'player',
    archetype: 'player',
    x: player.x,
    y: player.y,
    angle: player.angle,
    radius: typeof playerRadius === 'function' ? playerRadius() : PLAYER_RADIUS,
  });
}

function getNearbyCorpse(entity = player, radius = corpseInteractRadius()) {
  let best = null;
  let bestD2 = radius * radius;
  for (const corpse of corpses) {
    if (!corpse.interactable || corpse.looted) continue;
    const d2 = (entity.x - corpse.x) ** 2 + (entity.y - corpse.y) ** 2;
    if (d2 <= bestD2) {
      best = corpse;
      bestD2 = d2;
    }
  }
  return best;
}

function setGameOver() {
  if (gamePhase === 'complete') return;
  addPlayerCorpse();
  gamePhase = 'gameover';
}

function update() {
  updateInput({
    canvas,
    cameraX: camera.x,
    cameraY: camera.y,
    playerX: player.x,
    playerY: player.y,
    viewportWidth: VIEWPORT_WIDTH,
    viewportHeight: VIEWPORT_HEIGHT,
  });

  const hardAimHeld = input.hardAimHeld;

  if (input.resetPressed) {
    if (gamePhase === 'gameover' && CURRENT_RUN.generated && restartWithNewRun()) return;
    reset();
    return;
  }

  if (typeof updateMuzzleFlashes === 'function') updateMuzzleFlashes();
  if (gamePhase === 'gameover') return;

  updateDoorAnimations();
  updatePlayer(input, projectiles);
  updateCamera(hardAimHeld);

  const interactPressed = input.interactPressed;
  const doorInteractionHandled = interactPressed && toggleNearbyDoor(player);
  const windowInteractionHandled = interactPressed && !doorInteractionHandled && openNearbyWindow(player);

  if (gamePhase === 'infiltrate' && !pickup.collected) {
    pickup.visibleToPlayer = inVisionCone(pickup.x, pickup.y) && isLit(pickup.x, pickup.y);
    for (const ef of exfilPoints) {
      if (!ef.discovered && inVisionCone(ef.x, ef.y) && isLit(ef.x, ef.y)) ef.discovered = true;
    }
    if (interactPressed && !doorInteractionHandled && !windowInteractionHandled) {
      const dx = player.x - pickup.x, dy = player.y - pickup.y;
      if (dx * dx + dy * dy <= interactRadius() * interactRadius()) {
        pickup.collected = true;
        gamePhase = 'exfil';
        for (const ef of exfilPoints) { ef.active = true; ef.discovered = true; }
      }
    }
  }

  // Gap exit activation — any phase, must be visible and in range
  for (const gap of gapExits) {
    if (gap.activated) continue;
    const linkedWindow = gap.windowId ? WINDOWS.find(windowGeometry => windowGeometry.id === gap.windowId) : null;
    if (linkedWindow && linkedWindow.state !== 'destroyed') continue;
    if (!inVisionCone(gap.x, gap.y) || !isLit(gap.x, gap.y)) continue;
    const gdx = player.x - gap.x, gdy = player.y - gap.y;
    if (interactPressed && !doorInteractionHandled && !windowInteractionHandled &&
        gdx * gdx + gdy * gdy <= interactRadius() * interactRadius()) {
      gap.activated = true;
      exfilPoints.push({ x: gap.x, y: gap.y, type: 'gap', active: gamePhase === 'exfil', discovered: true });
    }
  }

  if (gamePhase === 'exfil') {
    for (const ef of exfilPoints) {
      if (!ef.active) continue;
      const dx = player.x - ef.x, dy = player.y - ef.y;
      if (dx * dx + dy * dy <= exfilRadius() * exfilRadius()) {
        gamePhase = 'complete';
        setTimeout(reset, 1500);
        break;
      }
    }
  }

  updateEnemies();

  // Move, collide, and cull projectiles
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    const survives = resolveProjectileTravel(p, () => enemies.map((e, index) => ({
      id: e.projectileTargetId ?? `enemy_${index}`,
      actor: e,
      radius: typeof enemyHitRadius === 'function' ? enemyHitRadius() : ENEMY_HIT_RADIUS,
      penetrationResistance: unarmoredBodyPenetrationResistance(),
    })), (enemy) => {
      if (typeof damageEnemy === 'function' && damageEnemy(enemy, p.damage)) {
        addEnemyCorpse(enemy);
        const index = enemies.indexOf(enemy);
        if (index >= 0) enemies.splice(index, 1);
      }
    });

    if (!survives || p.x < 0 || p.x > GAME_WIDTH || p.y < 0 || p.y > GAME_HEIGHT) {
      projectiles.splice(i, 1);
    }
  }
}

function drawFloor() {
  ctx.fillStyle = '#1e1e1e';
  ctx.fillRect(camera.x, camera.y, VIEWPORT_WIDTH, VIEWPORT_HEIGHT);
}

function drawWalls() {
  ctx.fillStyle = '#4a4a4a';
  for (const wall of WALLS) {
    ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
  }
}

function drawWindows() {
  for (const windowGeometry of WINDOWS) {
    if (windowGeometry.state === 'open') continue;
    if (windowGeometry.state === 'destroyed') {
      ctx.fillStyle = 'rgba(155,220,235,0.62)';
      const shardSize = scaleGameUnit(3);
      for (let i = 0; i < 6; i++) {
        const t = (i + 0.5) / 6;
        const x = windowGeometry.x + windowGeometry.w / 2 + (i % 2 ? shardSize : -shardSize);
        const y = windowGeometry.y + windowGeometry.h * t;
        ctx.fillRect(x - shardSize / 2, y - shardSize / 2, shardSize, shardSize);
      }
      continue;
    }

    ctx.fillStyle = 'rgba(126,205,225,0.42)';
    ctx.fillRect(windowGeometry.x, windowGeometry.y, windowGeometry.w, windowGeometry.h);
    ctx.strokeStyle = 'rgba(185,235,245,0.9)';
    ctx.lineWidth = scaleGameUnit(1);
    ctx.strokeRect(windowGeometry.x, windowGeometry.y, windowGeometry.w, windowGeometry.h);
    ctx.strokeStyle = 'rgba(30,55,62,0.95)';
    for (const hole of windowGeometry.bulletHoles) {
      const x = windowGeometry.x + hole.x;
      const y = windowGeometry.y + hole.y;
      const crack = scaleGameUnit(4);
      ctx.beginPath();
      ctx.moveTo(x - crack, y);
      ctx.lineTo(x + crack, y);
      ctx.moveTo(x, y - crack);
      ctx.lineTo(x, y + crack);
      ctx.stroke();
    }
  }
}

function drawDoors() {
  for (const door of DOORS) {
    ctx.save();
    if (door.state !== 'destroyed') {
      const hinge = getDoorHinge(door);
      ctx.translate(hinge.x, hinge.y);
      ctx.rotate(getDoorSwingAngle(door));
      ctx.fillStyle = door.material === 'metal' ? '#343b42' : '#2b2220';
      ctx.fillRect(hinge.rectX, hinge.rectY, door.w, door.h);
      ctx.strokeStyle = door.material === 'metal' ? '#87939e' : '#8a6a42';
      ctx.lineWidth = scaleGameUnit(2);
      ctx.strokeRect(hinge.rectX, hinge.rectY, door.w, door.h);
      ctx.fillStyle = '#090706';
      for (const hole of door.bulletHoles) {
        ctx.beginPath();
        ctx.arc(hole.x, hole.y, scaleGameUnit(2), 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.fillStyle = 'rgba(138,106,66,0.75)';
      const pieces = door.orientation === 'horizontal' ? 4 : 5;
      for (let i = 0; i < pieces; i++) {
        const t = (i + 0.5) / pieces;
        const x = door.orientation === 'horizontal'
          ? door.x + door.w * t - scaleGameUnit(5)
          : door.x + door.w / 2 - scaleGameUnit(5);
        const y = door.orientation === 'horizontal'
          ? door.y + door.h / 2 - scaleGameUnit(4)
          : door.y + door.h * t - scaleGameUnit(4);
        ctx.fillRect(x, y, scaleGameUnit(10), scaleGameUnit(8));
      }
    }
    ctx.restore();
  }
}

function drawCorpses() {
  for (const corpse of corpses) {
    ctx.save();
    ctx.translate(corpse.x, corpse.y);
    ctx.rotate(corpse.angle);
    ctx.scale(scaleGameUnit(1), scaleGameUnit(1));
    ctx.globalAlpha = 0.42;

    const isPlayerCorpse = corpse.type === 'player';
    ctx.fillStyle = isPlayerCorpse ? '#244d70' : '#702828';
    ctx.beginPath();
    ctx.ellipse(0, 4, 20, 12, Math.PI / 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = isPlayerCorpse ? '#3a7ca8' : '#9a3a3a';
    ctx.beginPath();
    ctx.arc(0, -8, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

function drawDoorHealthBars() {
  if (!showDoorHpBars()) return;
  for (const door of DOORS) {
    if (!door.destructible || door.state === 'destroyed' || !isDoorVisibleToPlayer(door)) continue;
    const hpRatio = door.hp / door.maxHp;
    const barPad = scaleGameUnit(4);
    const barThickness = scaleGameUnit(4);
    const hinge = getDoorHinge(door);

    ctx.save();
    ctx.translate(hinge.x, hinge.y);
    ctx.rotate(getDoorSwingAngle(door));
    ctx.fillStyle = 'rgba(20,18,14,0.88)';
    if (door.orientation === 'horizontal') {
      const barY = hinge.rectY - barPad - barThickness;
      ctx.fillRect(hinge.rectX, barY, door.w, barThickness);
      ctx.fillStyle = 'rgba(255,224,102,0.95)';
      ctx.fillRect(hinge.rectX, barY, door.w * hpRatio, barThickness);
    } else {
      const barX = hinge.rectX - barPad - barThickness;
      ctx.fillRect(barX, hinge.rectY, barThickness, door.h);
      ctx.fillStyle = 'rgba(255,224,102,0.95)';
      ctx.fillRect(barX, hinge.rectY + door.h * (1 - hpRatio), barThickness, door.h * hpRatio);
    }
    ctx.restore();
  }
}

function drawWindowHealthBars() {
  if (!showDoorHpBars()) return;
  for (const windowGeometry of WINDOWS) {
    if (windowGeometry.state !== 'intact') continue;
    const samples = [
      { x: windowGeometry.x + windowGeometry.w / 2, y: windowGeometry.y + windowGeometry.h / 2 },
      { x: windowGeometry.x + windowGeometry.w / 2, y: windowGeometry.y },
      { x: windowGeometry.x + windowGeometry.w / 2, y: windowGeometry.y + windowGeometry.h },
    ];
    if (!samples.some(sample => playerHasClearView(sample.x, sample.y))) continue;
    const hpRatio = windowGeometry.hp / windowGeometry.maxHp;
    const barThickness = scaleGameUnit(4);
    const barPad = scaleGameUnit(4);
    ctx.fillStyle = 'rgba(14,24,28,0.88)';
    if (windowGeometry.orientation === 'vertical') {
      const barX = windowGeometry.x - barPad - barThickness;
      ctx.fillRect(barX, windowGeometry.y, barThickness, windowGeometry.h);
      ctx.fillStyle = 'rgba(126,220,235,0.95)';
      ctx.fillRect(barX, windowGeometry.y + windowGeometry.h * (1 - hpRatio), barThickness, windowGeometry.h * hpRatio);
    } else {
      const barY = windowGeometry.y - barPad - barThickness;
      ctx.fillRect(windowGeometry.x, barY, windowGeometry.w, barThickness);
      ctx.fillStyle = 'rgba(126,220,235,0.95)';
      ctx.fillRect(windowGeometry.x, barY, windowGeometry.w * hpRatio, barThickness);
    }
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

function drawFireGuide() {
  if (!player.hardAim || player.alive === false) return;

  const assistActive = !!player.aimAssistTarget;
  const assistBlend = player.aimAssistBlend ?? 0;
  const rayAngle = player.angle - Math.PI / 2;
  const hit = castVisRay(player.x, player.y, rayAngle);
  const dx = Math.sin(player.angle);
  const dy = -Math.cos(player.angle);
  const startX = player.x + dx * scaleGameUnit(24);
  const startY = player.y + dy * scaleGameUnit(24);
  const endX = hit ? hit.x : player.x + dx * scaleGameUnit(900);
  const endY = hit ? hit.y : player.y + dy * scaleGameUnit(900);

  ctx.save();
  ctx.globalAlpha = assistActive ? 0.72 + 0.18 * assistBlend : 0.72;
  ctx.strokeStyle = assistActive ? '#7df7ff' : '#d8f6ff';
  ctx.lineWidth = scaleGameUnit(assistActive ? 1 + 0.5 * assistBlend : 1);
  ctx.setLineDash([scaleGameUnit(8), scaleGameUnit(8)]);
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.stroke();
  ctx.restore();
}

function drawAimAssistReticle() {
  const target = player.aimAssistTarget;
  if (!player.hardAim || player.alive === false || !target) return;
  if (target.alive === false || target.health <= 0) return;
  if (!inVisionCone(target.x, target.y) || !isLit(target.x, target.y)) return;

  const r = scaleGameUnit(24);
  const tick = scaleGameUnit(8);
  const assistBlend = player.aimAssistBlend ?? 0;
  ctx.save();
  ctx.globalAlpha = 0.48 + 0.40 * assistBlend;
  ctx.strokeStyle = '#7df7ff';
  ctx.lineWidth = scaleGameUnit(1.5);
  ctx.beginPath();
  ctx.moveTo(target.x - r, target.y);
  ctx.lineTo(target.x - r + tick, target.y);
  ctx.moveTo(target.x + r - tick, target.y);
  ctx.lineTo(target.x + r, target.y);
  ctx.moveTo(target.x, target.y - r);
  ctx.lineTo(target.x, target.y - r + tick);
  ctx.moveTo(target.x, target.y + r - tick);
  ctx.lineTo(target.x, target.y + r);
  ctx.stroke();

  ctx.globalAlpha = 0.45;
  ctx.beginPath();
  ctx.arc(target.x, target.y, r * 0.72, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

// Cast a single ray from (px,py) at canvas angle `angle`, return nearest wall hit
function castVisRay(px, py, angle) {
  rebuildRayGeometryIfNeeded();
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
  rebuildRayGeometryIfNeeded();
  const forward = playerAngle - Math.PI / 2;
  const half    = visionAngle / 2;
  const eps     = 0.0001;

  // Cone boundary rays plus one ray per visible wall corner for clean edges.
  const angles = [forward - half, forward + half];
  for (const c of WALL_CORNERS) {
    const a = Math.atan2(c.y - py, c.x - px);
    let diff = a - forward;
    while (diff >  Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    if (Math.abs(diff) <= half + eps) {
      const na = forward + diff; // unwrap to the same range as boundary angles
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

function drawFog() {
  const PROXIMITY_RADIUS = typeof playerProximityRadius === 'function' ? playerProximityRadius() : PLAYER_PROXIMITY_RADIUS;
  const renderScale = Math.max(1, fogRenderScale());

  const fogWidth = Math.ceil(VIEWPORT_WIDTH / renderScale);
  const fogHeight = Math.ceil(VIEWPORT_HEIGHT / renderScale);
  if (fogCanvas.width !== fogWidth || fogCanvas.height !== fogHeight) {
    fogCanvas.width = fogWidth;
    fogCanvas.height = fogHeight;
  }

  fogCtx.clearRect(0, 0, fogCanvas.width, fogCanvas.height);
  fogCtx.fillStyle = 'rgba(0, 0, 0, 1)';
  fogCtx.fillRect(0, 0, fogCanvas.width, fogCanvas.height);

  fogCtx.globalCompositeOperation = 'destination-out';

  // Wall-occluded visibility polygon; rays stop at wall surfaces.
  const visionAngle = typeof getPlayerVisionAngle === 'function' ? getPlayerVisionAngle() : VISION_ANGLE;
  const visPts = computeVisibilityPolygon(player.x, player.y, player.angle, visionAngle);
  if (visPts.length >= 2) {
    fogCtx.beginPath();
    fogCtx.moveTo((player.x - camera.x) / renderScale, (player.y - camera.y) / renderScale);
    for (const p of visPts) {
      fogCtx.lineTo((p.x - camera.x) / renderScale, (p.y - camera.y) / renderScale);
    }
    fogCtx.closePath();
    fogCtx.fill();
  }

  // Proximity circle is always visible regardless of facing direction.
  fogCtx.beginPath();
  fogCtx.arc(
    (player.x - camera.x) / renderScale,
    (player.y - camera.y) / renderScale,
    PROXIMITY_RADIUS / renderScale,
    0,
    Math.PI * 2
  );
  fogCtx.fill();

  fogCtx.globalCompositeOperation = 'source-over';

  ctx.drawImage(fogCanvas, camera.x, camera.y, VIEWPORT_WIDTH, VIEWPORT_HEIGHT);
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
      if (showSecondaryExfilDebug()) {
        ctx.strokeStyle = 'rgba(255,255,255,0.18)';
        ctx.lineWidth = scaleGameUnit(2);
        ctx.beginPath();
        ctx.arc(ef.x, ef.y, scaleGameUnit(20), 0, Math.PI * 2);
        ctx.stroke();
      }
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

function drawPerfOverlay() {
  if (!showPerfOverlay()) return;

  const lines = [
    `seed ${CURRENT_RUN.seed ?? 'reference'}`,
    `FPS ${perf.fps.toFixed(1)} | steps ${perf.simSteps}`,
    `update ${perf.updateMs.toFixed(2)} ms`,
    `draw ${perf.drawMs.toFixed(2)} ms`,
    `enemies ${perf.enemiesMs.toFixed(2)} ms`,
    `lighting ${perf.lightingMs.toFixed(2)} ms`,
    `fog ${perf.fogMs.toFixed(2)} ms`,
    `static light ${perf.staticLightMs.toFixed(1)} ms`,
  ];

  screenCtx.save();
  screenCtx.font = '16px monospace';
  screenCtx.textBaseline = 'top';
  screenCtx.fillStyle = 'rgba(0,0,0,0.72)';
  screenCtx.fillRect(10, 10, 310, 24 + lines.length * 18);
  screenCtx.fillStyle = '#d8f6ff';
  for (let i = 0; i < lines.length; i++) {
    screenCtx.fillText(lines[i], 20, 18 + i * 18);
  }
  screenCtx.restore();
}

function drawPlayerStatus() {
  const maxHealth = typeof playerMaxHealth === 'function' ? playerMaxHealth() : (typeof PLAYER_MAX_HEALTH === 'number' ? PLAYER_MAX_HEALTH : 100);
  const health = Math.max(0, player.health ?? maxHealth);
  const barW = 220;
  const barH = 14;
  const x = canvas.width - barW - 20;
  const y = 20;

  screenCtx.save();
  screenCtx.font = '16px monospace';
  screenCtx.textAlign = 'left';
  screenCtx.textBaseline = 'top';
  screenCtx.fillStyle = 'rgba(0,0,0,0.72)';
  screenCtx.fillRect(x - 10, y - 8, barW + 20, 48);
  screenCtx.fillStyle = '#d8f6ff';
  screenCtx.fillText(`HP ${Math.ceil(health)}/${maxHealth}`, x, y);
  screenCtx.fillStyle = '#2a2a2a';
  screenCtx.fillRect(x, y + 24, barW, barH);
  screenCtx.fillStyle = health > maxHealth * 0.35 ? '#44ff88' : '#ff4a32';
  screenCtx.fillRect(x, y + 24, barW * (health / maxHealth), barH);
  screenCtx.strokeStyle = '#d8f6ff';
  screenCtx.strokeRect(x, y + 24, barW, barH);
  screenCtx.restore();
}

function drawGamePhaseOverlay() {
  if (gamePhase !== 'gameover') return;

  screenCtx.save();
  screenCtx.fillStyle = 'rgba(0,0,0,0.68)';
  screenCtx.fillRect(0, 0, canvas.width, canvas.height);
  screenCtx.textAlign = 'center';
  screenCtx.textBaseline = 'middle';
  screenCtx.fillStyle = '#ff4a32';
  screenCtx.font = 'bold 64px monospace';
  screenCtx.fillText('MISSION FAILED', canvas.width / 2, canvas.height / 2 - 34);
  screenCtx.fillStyle = '#d8f6ff';
  screenCtx.font = '24px monospace';
  screenCtx.fillText(
    CURRENT_RUN.generated
      ? 'Press ] or gamepad B to start a new seeded run'
      : 'Press ] or gamepad B to reset',
    canvas.width / 2,
    canvas.height / 2 + 34,
  );
  screenCtx.restore();
}

function draw() {
  const drawStart = performance.now();
  ctx.clearRect(0, 0, VIEWPORT_WIDTH, VIEWPORT_HEIGHT);

  ctx.save();
  ctx.translate(-camera.x, -camera.y);
  drawFloor();
  drawWalls();
  drawWindows();
  drawDoors();
  drawCorpses();
  drawLamps();
  measurePerf('enemiesMs', drawEnemies);
  drawProjectiles();
  drawPlayer();
  if (typeof drawMuzzleFlashSources === 'function') drawMuzzleFlashSources();
  measurePerf('lightingMs', drawLighting);
  measurePerf('fogMs', drawFog);
  drawHiddenEnemiesDebug();
  drawDoorHealthBars();
  drawWindowHealthBars();
  drawSoundEvents();
  drawFireGuide();
  drawAimAssistReticle();
  drawEnemyLabels();
  drawExfilPoints();
  drawGapExits();
  drawPickup();
  if (hasMapKnowledge && showMapOverlay()) drawMapGeometry();
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
  drawPlayerStatus();
  drawGamePhaseOverlay();
  drawPerfOverlay();
  recordPerf('drawMs', performance.now() - drawStart);
}

let lastFrameTime = null;
let simAccumulator = 0;

function loop(frameTime) {
  if (lastFrameTime === null) lastFrameTime = frameTime;

  const elapsed = Math.min(frameTime - lastFrameTime, 250);
  lastFrameTime = frameTime;
  simAccumulator += elapsed;
  if (elapsed > 0) recordPerf('fps', 1000 / elapsed);

  let simSteps = 0;
  let updateMs = 0;
  while (simAccumulator >= SIM_STEP_MS && simSteps < MAX_SIM_STEPS_PER_FRAME) {
    const updateStart = performance.now();
    update();
    updateMs += performance.now() - updateStart;
    simAccumulator -= SIM_STEP_MS;
    simSteps++;
  }

  if (simSteps === MAX_SIM_STEPS_PER_FRAME) simAccumulator = 0;
  perf.simSteps = simSteps;
  recordPerf('updateMs', updateMs);

  draw();
  requestAnimationFrame(loop);
}

window.addEventListener('tuningchange', (event) => {
  const key = event.detail?.key;
  if (!key) return;
  if (['doorMaxHp', 'doorProjectileResistance', 'soundClosedDoorTransmission'].includes(key)) {
    applyDoorTuning(true);
  }
  if (['windowMaxHp', 'windowProjectileResistance'].includes(key)) {
    applyWindowTuning(true);
  }
});

initLighting(ACTIVE_MISSION.lighting);
resetDoors();
resetWindows();
resetCamera();
initPickup();
initExfil();
requestAnimationFrame(loop);
