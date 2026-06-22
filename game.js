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
  // Outer perimeter - entry gap x:430-570 at bottom
  { x:    0, y:   0, w: 1100, h:  18 },
  { x:    0, y: 732, w:  430, h:  18 },
  { x:  570, y: 732, w:  530, h:  18 },
  { x:    0, y:   0, w:   18, h: 160 }, // left perimeter - gap y:160-220 (duct, Room A)
  { x:    0, y: 220, w:   18, h: 530 },
  { x: 1082, y:   0, w:   18, h: 160 }, // right perimeter - gap y:160-220 (duct, Room B/C)
  { x: 1082, y: 220, w:   18, h: 530 },
  // Corridor wall at y=440 - left gap x:220-320, right gap x:778-860
  // Center extends to x=778 (not x=760) to close corner with Room B/C divider
  { x:   18, y: 440, w:  202, h:  18 },
  { x:  320, y: 440, w:  458, h:  18 },
  { x:  860, y: 440, w:  222, h:  18 },
  // Room A (objective) east wall at x=400 - gap y:250-340
  { x:  400, y:  18, w:  18, h: 232 },
  { x:  400, y: 340, w:  18, h: 100 },
  // Room B/C divider at x=760 - gap y:160-260
  { x:  760, y:  18, w:  18, h: 142 },
  { x:  760, y: 260, w:  18, h: 180 },
  // Room F (guard) west wall at x=900 - gap y:540-640
  // x=900 is within corridor right (x=860-1082) so top connects cleanly
  { x:  900, y: 440, w:  18, h: 100 },
  { x:  900, y: 640, w:  18, h:  92 },
].map(scaleGameRect);

const DOOR_SPECS = [
  {
    id: 'corridor_left_door',
    x: 220, y: 440, w: 100, h: 18,
    orientation: 'horizontal',
    apertureIds: ['corridor_left_door_n', 'corridor_left_door_s'],
  },
  {
    id: 'corridor_right_door',
    x: 778, y: 440, w: 82, h: 18,
    orientation: 'horizontal',
    apertureIds: ['corridor_right_door_n', 'corridor_right_door_s'],
  },
  {
    id: 'room_a_east_door',
    x: 400, y: 250, w: 18, h: 90,
    orientation: 'vertical',
    apertureIds: ['room_a_east_door_e', 'room_a_east_door_w'],
  },
  {
    id: 'room_bc_divider_door',
    x: 760, y: 160, w: 18, h: 100,
    orientation: 'vertical',
    apertureIds: ['room_bc_divider_door_e', 'room_bc_divider_door_w'],
  },
  {
    id: 'room_f_west_door',
    x: 900, y: 540, w: 18, h: 100,
    orientation: 'vertical',
    apertureIds: ['room_f_west_door_e', 'room_f_west_door_w'],
  },
];

const DOORS = DOOR_SPECS.map((door) => ({
  ...scaleGameRect(door),
  id: door.id,
  orientation: door.orientation,
  state: 'closed',
  defaultState: 'closed',
  hp: 60,
  maxHp: 60,
  soundTransmission: 0.75,
  apertureIds: door.apertureIds,
}));

const projectiles = [];

const CAM_SOFT_LOOKAHEAD_DIST = Math.min(VIEWPORT_WIDTH, VIEWPORT_HEIGHT) * 0.10;
const CAM_HARDAIM_DIST = Math.max(VIEWPORT_WIDTH, VIEWPORT_HEIGHT);
const CAM_CORNER_PADDING = scaleGameUnit(48);
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


const MISSION_LIGHTING = {
  globalAmbient: 0.0,
  zones: [
    { id: 'lobby_lamp_spill', x: 320, y: 458, w: 380, h: 170, ambient: 0.10 },
    { id: 'entry_dim_spill', x: 430, y: 640, w: 140, h: 92, ambient: 0.08 },
    { id: 'corridor_left_threshold_spill', x: 220, y: 430, w: 100, h: 44, ambient: 0.06 },
    { id: 'corridor_right_threshold_spill', x: 778, y: 430, w: 82, h: 44, ambient: 0.06 },
  ],
  lamps: [
    { x: 200, y:  18, wallSide: 'N', radius: 360, intensity: 1.0, falloffPower: 0.85, color: '#ffdc96', active: true },
    { x: 580, y:  18, wallSide: 'N', radius: 360, intensity: 1.0, falloffPower: 0.85, color: '#ffdc96', active: true },
    { x: 920, y:  18, wallSide: 'N', radius: 360, intensity: 1.0, falloffPower: 0.85, color: '#ffdc96', active: true },
    { x: 200, y: 440, wallSide: 'S', radius: 360, intensity: 1.0, falloffPower: 0.85, color: '#ffdc96', active: true },
    { x: 580, y: 440, wallSide: 'S', radius: 360, intensity: 1.0, falloffPower: 0.85, color: '#ffdc96', active: true },
    { x: 920, y: 440, wallSide: 'S', radius: 360, intensity: 1.0, falloffPower: 0.85, color: '#ffdc96', active: true },
    { x: 350, y: 458, wallSide: 'N', radius: 360, intensity: 1.0, falloffPower: 0.85, color: '#ffdc96', active: true },
    { x: 700, y: 458, wallSide: 'N', radius: 360, intensity: 1.0, falloffPower: 0.85, color: '#ffdc96', active: true },
    { x: 350, y: 732, wallSide: 'S', radius: 360, intensity: 1.0, falloffPower: 0.85, color: '#ffdc96', active: true },
    { x: 700, y: 732, wallSide: 'S', radius: 360, intensity: 1.0, falloffPower: 0.85, color: '#ffdc96', active: true },
    { x:  18, y: 630, wallSide: 'W', radius: 360, intensity: 1.0, falloffPower: 0.85, color: '#ffdc96', active: true },
    { x:1082, y: 590, wallSide: 'E', radius: 360, intensity: 1.0, falloffPower: 0.85, color: '#ffdc96', active: true },
  ],
  apertures: [
    { id: 'room_a_west_window_moonlight', kind: 'window', x: 18, y: 190, direction: 'E', width: 70, range: 360, intensity: 0.24, falloffPower: 1.05, spreadRadians: 0.95, open: true },
    { id: 'room_bc_east_window_moonlight', kind: 'window', x: 1082, y: 190, direction: 'W', width: 70, range: 360, intensity: 0.24, falloffPower: 1.05, spreadRadians: 0.95, open: true },
    { id: 'corridor_left_door_n', kind: 'door', x: 270, y: 440, direction: 'N', width: 100, range: 160, intensity: 0.10, falloffPower: 1.2, spreadRadians: 0.85, open: false },
    { id: 'corridor_left_door_s', kind: 'door', x: 270, y: 458, direction: 'S', width: 100, range: 160, intensity: 0.10, falloffPower: 1.2, spreadRadians: 0.85, open: false },
    { id: 'corridor_right_door_n', kind: 'door', x: 819, y: 440, direction: 'N', width: 82, range: 160, intensity: 0.10, falloffPower: 1.2, spreadRadians: 0.85, open: false },
    { id: 'corridor_right_door_s', kind: 'door', x: 819, y: 458, direction: 'S', width: 82, range: 160, intensity: 0.10, falloffPower: 1.2, spreadRadians: 0.85, open: false },
    { id: 'room_a_east_door_e', kind: 'door', x: 418, y: 295, direction: 'E', width: 90, range: 160, intensity: 0.10, falloffPower: 1.2, spreadRadians: 0.85, open: false },
    { id: 'room_a_east_door_w', kind: 'door', x: 400, y: 295, direction: 'W', width: 90, range: 160, intensity: 0.10, falloffPower: 1.2, spreadRadians: 0.85, open: false },
    { id: 'room_bc_divider_door_e', kind: 'door', x: 778, y: 210, direction: 'E', width: 100, range: 160, intensity: 0.10, falloffPower: 1.2, spreadRadians: 0.85, open: false },
    { id: 'room_bc_divider_door_w', kind: 'door', x: 760, y: 210, direction: 'W', width: 100, range: 160, intensity: 0.10, falloffPower: 1.2, spreadRadians: 0.85, open: false },
    { id: 'room_f_west_door_e', kind: 'door', x: 918, y: 590, direction: 'E', width: 100, range: 160, intensity: 0.10, falloffPower: 1.2, spreadRadians: 0.85, open: false },
    { id: 'room_f_west_door_w', kind: 'door', x: 900, y: 590, direction: 'W', width: 100, range: 160, intensity: 0.10, falloffPower: 1.2, spreadRadians: 0.85, open: false },
  ],
};

// Lamp placement gives each room at least one fixture. Range/falloff, not spacing alone,
// now controls whether intact rooms are broadly lit or leave exploitable dark gaps.

// Wall duct/window exits - manually activated bonus exfil points
const WALL_GAP_EXITS = [
  { x:    9, y: 190, roomId: 'room_a',  activated: false }, // left perimeter duct, Room A
  { x: 1091, y: 190, roomId: 'room_bc', activated: false }, // right perimeter duct, Room B/C
].map(scaleGamePoint);
let gapExits = WALL_GAP_EXITS.map(g => ({ ...g }));

const INTERACT_RADIUS = scaleGameUnit(30);
const EXFIL_RADIUS    = scaleGameUnit(40);
const DOOR_INTERACT_RADIUS = scaleGameUnit(45);
const DOOR_DAMAGE = 20;
const DOOR_OPEN_ANGLE = Math.PI * 5 / 12; // 75 degrees

function getClosedDoorRects() {
  return DOORS.filter(door => door.state === 'closed');
}

function getMovementBlockers() {
  return WALLS.concat(getClosedDoorRects());
}

function getRayBlockerRects() {
  return getMovementBlockers();
}

function rotateDoorPoint(x, y, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: x * cos - y * sin,
    y: x * sin + y * cos,
  };
}

function getOpenDoorPanelCorners(door) {
  if (door.orientation === 'horizontal') {
    const hingeX = door.x;
    const hingeY = door.y + door.h / 2;
    return [
      { x: 0, y: -door.h / 2 },
      { x: door.w, y: -door.h / 2 },
      { x: door.w, y: door.h / 2 },
      { x: 0, y: door.h / 2 },
    ].map((p) => {
      const rotated = rotateDoorPoint(p.x, p.y, -DOOR_OPEN_ANGLE);
      return { x: hingeX + rotated.x, y: hingeY + rotated.y };
    });
  }

  const hingeX = door.x + door.w / 2;
  const hingeY = door.y;
  return [
    { x: -door.w / 2, y: 0 },
    { x: door.w / 2, y: 0 },
    { x: door.w / 2, y: door.h },
    { x: -door.w / 2, y: door.h },
  ].map((p) => {
    const rotated = rotateDoorPoint(p.x, p.y, DOOR_OPEN_ANGLE);
    return { x: hingeX + rotated.x, y: hingeY + rotated.y };
  });
}

function getRayBlockerPolygons() {
  return DOORS
    .filter(door => door.state === 'open')
    .map(getOpenDoorPanelCorners);
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

function setDoorApertures(door) {
  const open = door.state === 'open' || door.state === 'destroyed';
  if (typeof setLightingAperturesOpen === 'function') {
    setLightingAperturesOpen(door.apertureIds, open);
  }
}

function setDoorState(door, state) {
  if (door.state === state) return;
  door.state = state;
  setDoorApertures(door);
  markGeometryDirty();
  markDoorLightingDirty();
}

function resetDoors() {
  for (const door of DOORS) {
    door.state = door.defaultState;
    door.hp = door.maxHp;
    setDoorApertures(door);
  }
  markGeometryDirty();
  markDoorLightingDirty();
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

function distanceSqToSegment(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const len2 = abx * abx + aby * aby;
  if (len2 === 0) return (px - ax) ** 2 + (py - ay) ** 2;
  const t = clamp(((px - ax) * abx + (py - ay) * aby) / len2, 0, 1);
  const cx = ax + abx * t;
  const cy = ay + aby * t;
  return (px - cx) ** 2 + (py - cy) ** 2;
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

function isDoorBlockedByEnemy(door) {
  if (typeof enemies === 'undefined') return false;
  const panel = getOpenDoorPanelCorners(door);
  const radius = typeof ENEMY_RADIUS === 'number' ? ENEMY_RADIUS : scaleGameUnit(16);
  const radiusSq = radius * radius;
  for (const enemy of enemies) {
    if (distanceSqToRect(door, enemy.x, enemy.y) <= radiusSq) return true;
    if (distanceSqToPolygon(panel, enemy.x, enemy.y) <= radiusSq) return true;
  }
  return false;
}

function getNearbyDoor(entity, radius = DOOR_INTERACT_RADIUS) {
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
  if (isDoorBlockedByEnemy(door)) return true;
  setDoorState(door, door.state === 'closed' ? 'open' : 'closed');
  if (typeof emitSound === 'function') emitSound(entity.x, entity.y, scaleGameUnit(120), false);
  return true;
}

function openDoorNearEntity(entity, radius = DOOR_INTERACT_RADIUS) {
  const door = getNearbyDoor(entity, radius);
  if (!door || door.state !== 'closed') return false;
  setDoorState(door, 'open');
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

function damageDoor(door, amount = DOOR_DAMAGE) {
  if (!door || door.state !== 'closed') return false;
  door.hp -= amount;
  if (door.hp <= 0) {
    door.hp = 0;
    setDoorState(door, 'destroyed');
    if (typeof emitSound === 'function') {
      emitSound(door.x + door.w / 2, door.y + door.h / 2, scaleGameUnit(240), false);
    }
  } else {
    markDoorLightingDirty();
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
  return Math.abs(diff) <= VISION_ANGLE / 2;
}

function isLit(wx, wy) {
  return getLightLevel(wx, wy, { includePlayerGlow: true }) >= PLAYER_VISIBLE_LIGHT_THRESHOLD;
}

// Lamp-only variant — excludes the player's self-glow. Used by enemy detection so
// the player's ambient light doesn't make them permanently visible to guards.
function isLitByLamps(wx, wy) {
  return getLightLevel(wx, wy, { includePlayerGlow: false }) >= ENEMY_BRIGHT_LIGHT_THRESHOLD;
    // Half-plane clip — mirrors the rect clip in drawLighting so detection matches visuals
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
}

function hitsWall(x, y) {
  for (const wall of getRayBlockerRects()) {
    if (x >= wall.x && x <= wall.x + wall.w &&
        y >= wall.y && y <= wall.y + wall.h) return true;
  }
  return false;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function getCameraLookAhead(distance) {
  const dx = Math.sin(player.angle);
  const dy = -Math.cos(player.angle);
  const maxX = Math.abs(dx) > 0.001 ? (VIEWPORT_WIDTH / 2 - CAM_CORNER_PADDING) / Math.abs(dx) : Infinity;
  const maxY = Math.abs(dy) > 0.001 ? (VIEWPORT_HEIGHT / 2 - CAM_CORNER_PADDING) / Math.abs(dy) : Infinity;
  const dist = Math.max(0, Math.min(distance, maxX, maxY));
  return { x: dx * dist, y: dy * dist };
}

function resetCamera() {
  camera.x = clamp(player.x - VIEWPORT_WIDTH / 2, 0, CAMERA_MAX_X);
  camera.y = clamp(player.y - VIEWPORT_HEIGHT / 2, 0, CAMERA_MAX_Y);
  camera.lookAheadX = 0;
  camera.lookAheadY = 0;
}

function updateCamera(hardAimHeld) {
  const lookAheadDistance = hardAimHeld ? CAM_HARDAIM_DIST : CAM_SOFT_LOOKAHEAD_DIST;
  const lookAheadTarget = getCameraLookAhead(lookAheadDistance);
  camera.lookAheadX = lerp(camera.lookAheadX, lookAheadTarget.x, CAM_LOOKAHEAD_EASE);
  camera.lookAheadY = lerp(camera.lookAheadY, lookAheadTarget.y, CAM_LOOKAHEAD_EASE);

  let targetX = player.x + camera.lookAheadX - VIEWPORT_WIDTH / 2;
  let targetY = player.y + camera.lookAheadY - VIEWPORT_HEIGHT / 2;

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
  resetLighting();
  resetDoors();
  gamePhase = 'infiltrate';
  gapExits = WALL_GAP_EXITS.map(g => ({ ...g }));
  initPickup();
  initExfil();
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
  updatePlayer(input, projectiles);
  updateCamera(hardAimHeld);

  if (input.resetPressed) reset();

  const interactPressed = input.interactPressed;
  const doorInteractionHandled = interactPressed && toggleNearbyDoor(player);

  if (gamePhase === 'infiltrate' && !pickup.collected) {
    pickup.visibleToPlayer = inVisionCone(pickup.x, pickup.y) && isLit(pickup.x, pickup.y);
    for (const ef of exfilPoints) {
      if (!ef.discovered && inVisionCone(ef.x, ef.y) && isLit(ef.x, ef.y)) ef.discovered = true;
    }
    if (interactPressed && !doorInteractionHandled) {
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
    if (interactPressed && !doorInteractionHandled && gdx * gdx + gdy * gdy <= INTERACT_RADIUS * INTERACT_RADIUS) {
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

    if (!hit && hitLampAt(p.x, p.y)) hit = true;
    if (!hit) {
      const door = hitDoorAt(p.x, p.y);
      if (door) hit = damageDoor(door);
    }

    if (hit || hitsWall(p.x, p.y) || p.x < 0 || p.x > GAME_WIDTH || p.y < 0 || p.y > GAME_HEIGHT) {
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

function drawDoors() {
  for (const door of DOORS) {
    ctx.save();
    if (door.state === 'closed') {
      ctx.fillStyle = '#2b2220';
      ctx.fillRect(door.x, door.y, door.w, door.h);
      ctx.strokeStyle = '#8a6a42';
      ctx.lineWidth = scaleGameUnit(2);
      ctx.strokeRect(door.x, door.y, door.w, door.h);

      const hpRatio = door.hp / door.maxHp;
      if (hpRatio < 1) {
        ctx.fillStyle = 'rgba(255,224,102,0.75)';
        if (door.orientation === 'horizontal') {
          ctx.fillRect(door.x, door.y - scaleGameUnit(5), door.w * hpRatio, scaleGameUnit(3));
        } else {
          ctx.fillRect(door.x - scaleGameUnit(5), door.y + door.h * (1 - hpRatio), scaleGameUnit(3), door.h * hpRatio);
        }
      }
    } else if (door.state === 'open') {
      ctx.fillStyle = '#2b2220';
      ctx.strokeStyle = '#8a6a42';
      ctx.lineWidth = scaleGameUnit(2);
      if (door.orientation === 'horizontal') {
        const hingeX = door.x;
        const hingeY = door.y + door.h / 2;
        ctx.translate(hingeX, hingeY);
        ctx.rotate(-DOOR_OPEN_ANGLE);
        ctx.fillRect(0, -door.h / 2, door.w, door.h);
        ctx.strokeRect(0, -door.h / 2, door.w, door.h);
      } else {
        const hingeX = door.x + door.w / 2;
        const hingeY = door.y;
        ctx.translate(hingeX, hingeY);
        ctx.rotate(DOOR_OPEN_ANGLE);
        ctx.fillRect(-door.w / 2, 0, door.w, door.h);
        ctx.strokeRect(-door.w / 2, 0, door.w, door.h);
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
  const PROXIMITY_RADIUS = PLAYER_PROXIMITY_RADIUS;

  const fogWidth = Math.ceil(VIEWPORT_WIDTH / FOG_RENDER_SCALE);
  const fogHeight = Math.ceil(VIEWPORT_HEIGHT / FOG_RENDER_SCALE);
  if (fogCanvas.width !== fogWidth || fogCanvas.height !== fogHeight) {
    fogCanvas.width = fogWidth;
    fogCanvas.height = fogHeight;
  }

  fogCtx.clearRect(0, 0, fogCanvas.width, fogCanvas.height);
  fogCtx.fillStyle = 'rgba(0, 0, 0, 1)';
  fogCtx.fillRect(0, 0, fogCanvas.width, fogCanvas.height);

  fogCtx.globalCompositeOperation = 'destination-out';

  // Wall-occluded visibility polygon; rays stop at wall surfaces.
  const visPts = computeVisibilityPolygon(player.x, player.y, player.angle);
  if (visPts.length >= 2) {
    fogCtx.beginPath();
    fogCtx.moveTo((player.x - camera.x) / FOG_RENDER_SCALE, (player.y - camera.y) / FOG_RENDER_SCALE);
    for (const p of visPts) {
      fogCtx.lineTo((p.x - camera.x) / FOG_RENDER_SCALE, (p.y - camera.y) / FOG_RENDER_SCALE);
    }
    fogCtx.closePath();
    fogCtx.fill();
  }

  // Proximity circle is always visible regardless of facing direction.
  fogCtx.beginPath();
  fogCtx.arc(
    (player.x - camera.x) / FOG_RENDER_SCALE,
    (player.y - camera.y) / FOG_RENDER_SCALE,
    PROXIMITY_RADIUS / FOG_RENDER_SCALE,
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

function drawPerfOverlay() {
  if (!SHOW_PERF_OVERLAY) return;

  const lines = [
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
  screenCtx.fillRect(10, 10, 230, 132);
  screenCtx.fillStyle = '#d8f6ff';
  for (let i = 0; i < lines.length; i++) {
    screenCtx.fillText(lines[i], 20, 18 + i * 18);
  }
  screenCtx.restore();
}

function draw() {
  const drawStart = performance.now();
  ctx.clearRect(0, 0, VIEWPORT_WIDTH, VIEWPORT_HEIGHT);

  ctx.save();
  ctx.translate(-camera.x, -camera.y);
  drawFloor();
  drawWalls();
  drawDoors();
  drawLamps();
  measurePerf('enemiesMs', drawEnemies);
  drawProjectiles();
  drawPlayer();
  measurePerf('lightingMs', drawLighting);
  measurePerf('fogMs', drawFog);
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

initLighting(MISSION_LIGHTING);
resetDoors();
resetCamera();
initPickup();
initExfil();
requestAnimationFrame(loop);
