const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function createGradient() {
  return { addColorStop() {} };
}

function createContext2d(canvas) {
  const methods = {
    canvas,
    createImageData(width, height) {
      return { width, height, data: new Uint8ClampedArray(width * height * 4) };
    },
    getImageData(x, y, width, height) {
      return { width, height, data: new Uint8ClampedArray(width * height * 4) };
    },
    createLinearGradient: createGradient,
    createRadialGradient: createGradient,
    measureText() { return { width: 0 }; },
  };
  return new Proxy(methods, {
    get(target, key) {
      if (!(key in target)) target[key] = () => {};
      return target[key];
    },
    set(target, key, value) {
      target[key] = value;
      return true;
    },
  });
}

function createCanvas(width = 1920, height = 1080) {
  const canvas = {
    width,
    height,
    clientWidth: width,
    clientHeight: height,
    getBoundingClientRect() {
      return { left: 0, top: 0, width: this.clientWidth, height: this.clientHeight };
    },
  };
  canvas.getContext = () => {
    if (!canvas.context) canvas.context = createContext2d(canvas);
    return canvas.context;
  };
  return canvas;
}

function loadRuntime(useReference) {
  const displayedCanvas = createCanvas();
  const documentStub = {
    readyState: 'loading',
    getElementById(id) { return id === 'game' ? displayedCanvas : null; },
    createElement(tag) { return tag === 'canvas' ? createCanvas() : {}; },
    addEventListener() {},
    head: { appendChild() {} },
    body: {
      append() {},
      classList: { contains() { return false; }, toggle() {} },
      clientWidth: 1920,
      clientHeight: 1080,
    },
  };
  const windowStub = {
    addEventListener() {},
    dispatchEvent() {},
  };
  let runtimeContext;
  runtimeContext = vm.createContext({
    console,
    document: documentStub,
    window: windowStub,
    navigator: { getGamepads() { return []; } },
    performance: { now() { return 0; } },
    requestAnimationFrame(callback) { runtimeContext.nextFrame = callback; return 1; },
    cancelAnimationFrame() {},
    CustomEvent: class CustomEvent {
      constructor(type, options = {}) {
        this.type = type;
        this.detail = options.detail;
      }
    },
    Uint8ClampedArray,
    Map,
    Set,
    Math,
    MISSION_USE_REFERENCE: useReference,
  });

  for (const file of [
    'tuning.js',
    'mission.js',
    'mission-generator.js',
    'run.js',
    'input.js',
    'player.js',
    'lighting.js',
    'enemy.js',
    'sound.js',
    'game.js',
  ]) {
    vm.runInContext(fs.readFileSync(file, 'utf8'), runtimeContext, { filename: file });
  }
  return runtimeContext;
}

const context = loadRuntime(true);
const initial = JSON.parse(vm.runInContext(`JSON.stringify({
  walls: WALLS.length,
  wallIds: WALLS.map(wall => wall.geometryId),
  doors: DOORS.map(door => ({
    id: door.id,
    connectorId: door.connectorId,
    state: door.state,
    material: door.material,
    hp: door.hp,
    apertureIds: [...door.apertureIds],
  })),
  windows: WINDOWS.map(windowSpec => ({
    id: windowSpec.id,
    connectorId: windowSpec.connectorId,
    state: windowSpec.state,
    apertureIds: [...windowSpec.apertureIds],
  })),
  rooms: ROOMS.map(room => ({ id: room.id, cx: room.cx, cy: room.cy })),
  gapExits: gapExits.map(exit => ({ ...exit })),
  exfilPoints: exfilPoints.map(exfil => ({ ...exfil })),
  lamps: lightingLamps.map(lamp => ({ id: lamp.id, projectileTargetId: lamp.projectileTargetId, active: lamp.active })),
  apertures: lightingApertures.map(aperture => aperture.id),
  enemies: enemies.map(enemy => ({
    id: enemy.id,
    projectileTargetId: enemy.projectileTargetId,
    x: enemy.x,
    y: enemy.y,
    patrolNodes: enemy.patrolRoute.length,
  })),
  navNodes: Object.keys(NAV_NODES),
  navEdges: NAV_EDGES.length,
  soundRooms: SOUND_ROOM_SPECS.map(room => room.id),
  soundPortals: SOUND_PORTAL_SPECS.map(portal => portal.connectorId),
  soundBoundaryRooms: [
    findSoundRoomAt(scaleEnemyX(408.999), scaleEnemyY(100))?.id,
    findSoundRoomAt(scaleEnemyX(409), scaleEnemyY(100))?.id,
    findSoundRoomAt(scaleEnemyX(769), scaleEnemyY(100))?.id,
    findSoundRoomAt(scaleEnemyX(769.001), scaleEnemyY(100))?.id,
    findSoundRoomAt(scaleEnemyX(909), scaleEnemyY(590))?.id,
    findSoundRoomAt(scaleEnemyX(909.001), scaleEnemyY(590))?.id,
  ],
  definitionFrozen: Object.isFrozen(REFERENCE_MISSION) && Object.isFrozen(REFERENCE_MISSION.doors[0]),
  distinctRuntime:
    DOORS[0] !== REFERENCE_MISSION.doors[0] &&
    WINDOWS[0] !== REFERENCE_MISSION.windows[0] &&
    lightingLamps[0] !== REFERENCE_MISSION.lighting.lamps[0] &&
    enemies[0] !== REFERENCE_MISSION.enemies.spawns[0],
})`, context));

assert.equal(initial.walls, 16);
assert.deepEqual(initial.wallIds, Array.from({ length: 16 }, (_, index) => `wall_${index}`));
assert.equal(initial.doors.length, 5);
assert.equal(initial.doors.filter(door => door.material === 'wood').length, 4);
assert.equal(initial.doors.find(door => door.material === 'metal').hp, null);
assert.ok(initial.doors.every(door => door.state === 'closed' && door.id === door.connectorId));
assert.equal(initial.windows.length, 2);
assert.ok(initial.windows.every(windowSpec => windowSpec.state === 'intact' && windowSpec.id === windowSpec.connectorId));
assert.deepEqual(initial.rooms.map(room => room.id), ['lobby', 'room_a', 'corridor', 'room_bc', 'room_f']);
assert.equal(initial.gapExits.length, 2);
assert.deepEqual(initial.gapExits.map(exit => exit.windowId), ['room_a_west_window', 'room_bc_east_window']);
assert.equal(initial.exfilPoints.length, 1);
assert.equal(initial.exfilPoints[0].id, 'primary_entry_exfil');
assert.equal(initial.lamps.length, 12);
assert.ok(initial.lamps.every(lamp => lamp.id === lamp.projectileTargetId && lamp.active));
assert.equal(initial.apertures.length, 12);
assert.deepEqual(initial.enemies, [
  { id: 'enemy_1', projectileTargetId: 'enemy_1', x: 1687.2727272727273, y: 240, patrolNodes: 0 },
  { id: 'enemy_2', projectileTargetId: 'enemy_2', x: 1454.5454545454545, y: 1416, patrolNodes: 2 },
  { id: 'enemy_3', projectileTargetId: 'enemy_3', x: 581.8181818181819, y: 549.6, patrolNodes: 8 },
]);
assert.equal(initial.navNodes.length, 10);
assert.equal(initial.navEdges, 9);
assert.deepEqual(initial.soundRooms, ['lobby', 'room_a', 'corridor', 'room_bc', 'room_f']);
assert.deepEqual(initial.soundPortals, [
  'corridor_left_door',
  'corridor_right_door',
  'room_a_east_door',
  'room_bc_divider_door',
  'room_f_west_door',
]);
assert.deepEqual(initial.soundBoundaryRooms, [
  'room_a',
  'corridor',
  'corridor',
  'room_bc',
  'lobby',
  'room_f',
]);
assert.equal(initial.definitionFrozen, true);
assert.equal(initial.distinctRuntime, true);

const definitionBeforeReset = vm.runInContext('JSON.stringify(REFERENCE_MISSION)', context);
vm.runInContext(`
  DOORS[0].state = 'destroyed';
  DOORS[0].bulletHoles.push({ x: 1, y: 1 });
  WINDOWS[0].state = 'broken';
  WINDOWS[0].bulletHoles.push({ x: 1, y: 1 });
  lightingLamps[0].active = false;
  gapExits[0].activated = true;
  reset();
`, context);
const resetState = vm.runInContext(`({
  door: { state: DOORS[0].state, holes: DOORS[0].bulletHoles.length, hp: DOORS[0].hp },
  windowSpec: { state: WINDOWS[0].state, holes: WINDOWS[0].bulletHoles.length, hp: WINDOWS[0].hp },
  lampActive: lightingLamps[0].active,
  gapExitActive: gapExits[0].activated,
  enemyCount: enemies.length,
  definition: JSON.stringify(REFERENCE_MISSION),
})`, context);

assert.equal(resetState.door.state, 'closed');
assert.equal(resetState.door.holes, 0);
assert.ok(resetState.door.hp > 0);
assert.equal(resetState.windowSpec.state, 'intact');
assert.equal(resetState.windowSpec.holes, 0);
assert.ok(resetState.windowSpec.hp > 0);
assert.equal(resetState.lampActive, true);
assert.equal(resetState.gapExitActive, false);
assert.equal(resetState.enemyCount, 3);
assert.equal(resetState.definition, definitionBeforeReset);

vm.runInContext('loop(0); loop(16.6667); loop(33.3334);', context);

const generatedContext = loadRuntime(false);
const generatedInitial = JSON.parse(vm.runInContext(`JSON.stringify({
  seed: CURRENT_RUN.seed,
  generated: CURRENT_RUN.generated,
  missionId: ACTIVE_MISSION.id,
  roomCount: ROOMS.length,
  wallCount: WALLS.length,
  doorCount: DOORS.length,
  windowCount: WINDOWS.length,
  lampCount: lightingLamps.length,
  enemyCount: enemies.length,
  navNodeCount: Object.keys(NAV_NODES).length,
  navEdgeCount: NAV_EDGES.length,
  soundRoomCount: SOUND_ROOM_SPECS.length,
  soundPortalCount: SOUND_PORTAL_SPECS.length,
  soundCentersResolve: SOUND_ROOM_SPECS.every(room => findSoundRoomAt(room.x, room.y)?.id === room.id),
  pickupRoomId: pickup.roomId,
  authoredPickupRoomId: ACTIVE_MISSION.objective.pickupRule.pickupRoomId,
  playerStart: { x: player.x, y: player.y },
  authoredPlayerStart: {
    x: scaleGameX(ACTIVE_MISSION.player.start.x),
    y: scaleGameY(ACTIVE_MISSION.player.start.y),
  },
  definitionFrozen: Object.isFrozen(ACTIVE_MISSION) && Object.isFrozen(ACTIVE_MISSION.rooms[0]),
})`, generatedContext));

assert.equal(generatedInitial.seed, 'prototype-2');
assert.equal(generatedInitial.generated, true);
assert.equal(generatedInitial.roomCount, 9);
assert.equal(generatedInitial.wallCount, 29);
assert.equal(generatedInitial.doorCount, 10);
assert.equal(generatedInitial.windowCount, 2);
assert.equal(generatedInitial.lampCount, 9);
assert.equal(generatedInitial.enemyCount, 6);
assert.equal(generatedInitial.navNodeCount, 19);
assert.equal(generatedInitial.navEdgeCount, 20);
assert.equal(generatedInitial.soundRoomCount, 9);
assert.equal(generatedInitial.soundPortalCount, 10);
assert.equal(generatedInitial.soundCentersResolve, true);
assert.equal(generatedInitial.pickupRoomId, generatedInitial.authoredPickupRoomId);
assert.deepEqual(generatedInitial.playerStart, generatedInitial.authoredPlayerStart);
assert.equal(generatedInitial.definitionFrozen, true);

const generatedDefinitionBeforeReset = vm.runInContext('JSON.stringify(ACTIVE_MISSION)', generatedContext);
vm.runInContext(`
  DOORS[0].state = 'destroyed';
  WINDOWS[0].state = 'destroyed';
  lightingLamps[0].active = false;
  gapExits[0].activated = true;
  reset();
`, generatedContext);
const generatedReset = JSON.parse(vm.runInContext(`JSON.stringify({
  doorState: DOORS[0].state,
  windowState: WINDOWS[0].state,
  lampActive: lightingLamps[0].active,
  gapExitActive: gapExits[0].activated,
  pickupRoomId: pickup.roomId,
  definition: JSON.stringify(ACTIVE_MISSION),
})`, generatedContext));
assert.equal(generatedReset.doorState, 'closed');
assert.equal(generatedReset.windowState, 'intact');
assert.equal(generatedReset.lampActive, true);
assert.equal(generatedReset.gapExitActive, false);
assert.equal(generatedReset.pickupRoomId, generatedInitial.authoredPickupRoomId);
assert.equal(generatedReset.definition, generatedDefinitionBeforeReset);

vm.runInContext('loop(0); loop(16.6667); loop(33.3334);', generatedContext);

console.log('Reference and generated runtime smoke checks passed.');

module.exports = { loadRuntime };
