const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const context = vm.createContext({ Map, Set, Math });
for (const file of ['mission.js', 'mission-generator.js']) {
  vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
}
vm.runInContext(`
  globalThis.__generateMission = generateSeededMission;
  globalThis.__referenceMission = REFERENCE_MISSION;
  globalThis.__facilityProfiles = FACILITY_PROFILES;
  globalThis.__generateLocalOfficeTopology = generateLocalGovernmentOfficeTopology;
`, context);

const generateMission = context.__generateMission;
const facilityProfiles = context.__facilityProfiles;
const generateLocalOfficeTopology = context.__generateLocalOfficeTopology;

function assertDeepFrozen(value, path = 'mission') {
  if (!value || typeof value !== 'object') return;
  assert.equal(Object.isFrozen(value), true, `${path} must be frozen`);
  for (const [key, child] of Object.entries(value)) {
    assertDeepFrozen(child, `${path}.${key}`);
  }
}

function assertUniqueIds(items, label, seed) {
  const ids = items.map(item => item.id);
  assert.equal(new Set(ids).size, ids.length, `${seed}: ${label} IDs must be unique`);
  assert.ok(ids.every(Boolean), `${seed}: ${label} must all have IDs`);
}

function assertGeneratedLampPlacement(mission, seed) {
  const roomsById = new Map(mission.rooms.map(room => [room.id, room]));
  const breakableGeometry = [...mission.doors, ...mission.windows];
  const clearance = 12;
  for (const lamp of mission.lighting.lamps) {
    const room = roomsById.get(lamp.roomId);
    assert.ok(room, `${seed}: ${lamp.id} room must exist`);
    const boundary = {
      N: room.interior.y,
      S: room.interior.y + room.interior.h,
      W: room.interior.x,
      E: room.interior.x + room.interior.w,
    }[lamp.wallSide];
    assert.ok(Number.isFinite(boundary), `${seed}: ${lamp.id} must declare a wall side`);

    const mountedOnSolidWall = mission.geometry.walls.some(wall => {
      if (lamp.wallSide === 'N' || lamp.wallSide === 'S') {
        if (wall.w <= wall.h) return false;
        const touchesBoundary = Math.abs(wall.y - boundary) < 0.001 ||
          Math.abs(wall.y + wall.h - boundary) < 0.001;
        return touchesBoundary && lamp.x >= wall.x + clearance && lamp.x <= wall.x + wall.w - clearance;
      }
      if (wall.h <= wall.w) return false;
      const touchesBoundary = Math.abs(wall.x - boundary) < 0.001 ||
        Math.abs(wall.x + wall.w - boundary) < 0.001;
      return touchesBoundary && lamp.y >= wall.y + clearance && lamp.y <= wall.y + wall.h - clearance;
    });
    assert.equal(mountedOnSolidWall, true, `${seed}: ${lamp.id} must be mounted on a solid wall segment`);

    for (const geometry of breakableGeometry) {
      const overlaps = lamp.x >= geometry.x - clearance && lamp.x <= geometry.x + geometry.w + clearance &&
        lamp.y >= geometry.y - clearance && lamp.y <= geometry.y + geometry.h + clearance;
      assert.equal(overlaps, false, `${seed}: ${lamp.id} cannot overlap ${geometry.id}`);
    }
  }
}

function validateGeneratedMission(mission, seed) {
  assert.equal(mission.generation.seed, String(seed));
  assert.equal(mission.generation.kind, 'seeded_grid');
  assert.equal(mission.generation.profileId, 'tutorial_grid');
  assert.equal(mission.rooms.length, 9);
  assert.equal(mission.connectors.length, 13);
  assert.equal(mission.doors.length, 10);
  assert.equal(mission.windows.length, 2);
  assert.equal(mission.geometry.walls.length, 29);
  assert.equal(mission.geometry.wallGapExits.length, 2);
  assert.equal(mission.lighting.lamps.length, 9);
  assert.equal(mission.lighting.apertures.length, 22);
  assert.equal(mission.enemies.spawns.length, 6);
  assert.equal(mission.enemies.navigation.nodes.length, 19);
  assert.equal(mission.enemies.navigation.edges.length, 20);
  assert.equal(mission.sound.rooms.length, 9);
  assert.equal(mission.sound.portals.length, 10);
  assertDeepFrozen(mission, `mission(${seed})`);
  assertGeneratedLampPlacement(mission, seed);

  assertUniqueIds(mission.rooms, 'rooms', seed);
  assertUniqueIds(mission.connectors, 'connectors', seed);
  assertUniqueIds(mission.doors, 'doors', seed);
  assertUniqueIds(mission.windows, 'windows', seed);
  assertUniqueIds(mission.geometry.walls, 'walls', seed);
  assertUniqueIds(mission.geometry.wallGapExits, 'wall-gap exits', seed);
  assertUniqueIds(mission.lighting.lamps, 'lamps', seed);
  assertUniqueIds(mission.lighting.apertures, 'apertures', seed);
  assertUniqueIds(mission.enemies.spawns, 'enemy spawns', seed);
  assertUniqueIds(mission.enemies.navigation.nodes, 'navigation nodes', seed);

  const roomsById = new Map(mission.rooms.map(room => [room.id, room]));
  const connectorsById = new Map(mission.connectors.map(connector => [connector.id, connector]));
  const doorsById = new Map(mission.doors.map(door => [door.id, door]));
  const windowsById = new Map(mission.windows.map(windowSpec => [windowSpec.id, windowSpec]));
  const aperturesById = new Map(mission.lighting.apertures.map(aperture => [aperture.id, aperture]));

  const startingRooms = mission.rooms.filter(room => room.startingSpace);
  assert.equal(startingRooms.length, 1, `${seed}: exactly one starting room`);
  const startingRoom = startingRooms[0];
  assert.notEqual(mission.objective.pickupRule.pickupRoomId, startingRoom.id);
  assert.ok(roomsById.has(mission.objective.pickupRule.pickupRoomId));
  assert.ok(
    mission.player.start.x >= startingRoom.interior.x &&
    mission.player.start.x <= startingRoom.interior.x + startingRoom.interior.w &&
    mission.player.start.y >= startingRoom.interior.y &&
    mission.player.start.y <= startingRoom.interior.y + startingRoom.interior.h,
    `${seed}: player start must be inside the starting room`,
  );

  for (const wall of mission.geometry.walls) {
    assert.ok(wall.w > 0 && wall.h > 0, `${seed}: ${wall.id} must have positive dimensions`);
    assert.ok(wall.x >= 0 && wall.y >= 0, `${seed}: ${wall.id} must begin inside design space`);
    assert.ok(
      wall.x + wall.w <= mission.world.designWidth &&
      wall.y + wall.h <= mission.world.designHeight,
      `${seed}: ${wall.id} must remain inside design space`,
    );
  }
  function rectanglesOverlap(a, b) {
    return a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y;
  }
  function pointInsideWall(point) {
    return mission.geometry.walls.some(wall =>
      point.x > wall.x &&
      point.x < wall.x + wall.w &&
      point.y > wall.y &&
      point.y < wall.y + wall.h);
  }
  for (const door of mission.doors) {
    assert.ok(
      mission.geometry.walls.every(wall => !rectanglesOverlap(door, wall)),
      `${seed}: ${door.id} must occupy a wall opening`,
    );
    const connector = connectorsById.get(door.connectorId);
    assert.equal(door.x + door.w / 2, connector.position.x);
    assert.equal(door.y + door.h / 2, connector.position.y);
  }
  for (const windowSpec of mission.windows) {
    assert.ok(
      mission.geometry.walls.every(wall => !rectanglesOverlap(windowSpec, wall)),
      `${seed}: ${windowSpec.id} must occupy an exterior wall opening`,
    );
    const connector = connectorsById.get(windowSpec.connectorId);
    assert.equal(windowSpec.x + windowSpec.w / 2, connector.position.x);
    assert.equal(windowSpec.y + windowSpec.h / 2, connector.position.y);
  }
  assert.equal(pointInsideWall(mission.player.start), false, `${seed}: player cannot start in a wall`);
  for (const room of mission.rooms) {
    assert.equal(room.spaceType, 'room');
    assert.equal(room.roomSize, 'medium');
    assert.equal(pointInsideWall(room.center), false, `${seed}: ${room.id} center cannot be in a wall`);
  }

  for (const connector of mission.connectors) {
    for (const roomId of connector.rooms) {
      assert.ok(roomId === 'exterior' || roomsById.has(roomId), `${seed}: ${connector.id} room ${roomId}`);
    }
    if (connector.kind === 'door') {
      assert.equal(doorsById.get(connector.doorId)?.connectorId, connector.id);
      assert.equal(connector.rooms.length, 2);
    }
    if (connector.kind === 'window') {
      assert.equal(windowsById.get(connector.windowId)?.connectorId, connector.id);
      assert.ok(connector.rooms.includes('exterior'));
    }
    for (const apertureId of connector.apertureIds ?? []) {
      assert.equal(aperturesById.get(apertureId)?.connectorId, connector.id);
    }
  }

  for (const exit of mission.geometry.wallGapExits) {
    assert.equal(connectorsById.get(exit.connectorId)?.kind, 'window');
  }
  for (const roomId of mission.sound.rooms) assert.ok(roomsById.has(roomId));
  for (const connectorId of mission.sound.portals) {
    assert.equal(connectorsById.get(connectorId)?.kind, 'door');
  }

  const navNodeIds = new Set(mission.enemies.navigation.nodes.map(node => node.id));
  for (const node of mission.enemies.navigation.nodes) {
    if (node.roomId) assert.ok(roomsById.has(node.roomId));
    if (node.connectorId) assert.equal(connectorsById.get(node.connectorId)?.kind, 'door');
  }
  for (const [from, to] of mission.enemies.navigation.edges) {
    assert.ok(navNodeIds.has(from), `${seed}: navigation edge references ${from}`);
    assert.ok(navNodeIds.has(to), `${seed}: navigation edge references ${to}`);
  }

  const roomAdjacency = new Map(mission.rooms.map(room => [room.id, []]));
  for (const connector of mission.connectors.filter(item => item.kind === 'door')) {
    roomAdjacency.get(connector.rooms[0]).push(connector.rooms[1]);
    roomAdjacency.get(connector.rooms[1]).push(connector.rooms[0]);
  }
  const reached = new Set([startingRoom.id]);
  const queue = [startingRoom.id];
  while (queue.length > 0) {
    const roomId = queue.shift();
    for (const neighborId of roomAdjacency.get(roomId)) {
      if (reached.has(neighborId)) continue;
      reached.add(neighborId);
      queue.push(neighborId);
    }
  }
  assert.equal(reached.size, mission.rooms.length, `${seed}: all rooms must be reachable`);

  for (const enemy of mission.enemies.spawns) {
    const room = roomsById.get(enemy.roomId);
    assert.ok(room, `${seed}: ${enemy.id} room must exist`);
    assert.ok(
      enemy.x >= room.interior.x &&
      enemy.x <= room.interior.x + room.interior.w &&
      enemy.y >= room.interior.y &&
      enemy.y <= room.interior.y + room.interior.h,
      `${seed}: ${enemy.id} must spawn inside its room`,
    );
    assert.ok(enemy.patrolRoute.length >= 2);
    assert.equal(pointInsideWall(enemy), false, `${seed}: ${enemy.id} cannot spawn in a wall`);
    for (const waypoint of enemy.patrolRoute) {
      assert.equal(pointInsideWall(waypoint), false, `${seed}: ${enemy.id} patrol waypoint cannot be in a wall`);
    }
  }
}

const first = generateMission('deterministic-seed');
const repeat = generateMission('deterministic-seed');
const different = generateMission('different-seed');
assert.equal(JSON.stringify(first), JSON.stringify(repeat), 'same seed must reproduce the same mission');
assert.notEqual(JSON.stringify(first), JSON.stringify(different), 'different seeds must produce a different mission');

for (let index = 0; index < 100; index++) {
  validateGeneratedMission(generateMission(`validation-${index}`), `validation-${index}`);
}

const largerConfig = { rows: 4, columns: 5, enemyCount: 18, extraConnections: 5 };
const larger = generateMission('larger-facility', largerConfig);
assert.equal(larger.rooms.length, 20);
assert.equal(larger.enemies.spawns.length, 18);
assert.equal(larger.lighting.lamps.length, 20);
assert.equal(larger.generation.rows, 4);
assert.equal(larger.generation.columns, 5);
assert.equal(larger.generation.enemyCount, 18);
assert.ok(larger.world.designWidth > first.world.designWidth);
assert.ok(larger.world.designHeight > first.world.designHeight);
assert.equal(
  JSON.stringify(larger),
  JSON.stringify(generateMission('larger-facility', largerConfig)),
  'same seed and facility configuration must reproduce the same larger mission'
);
assertGeneratedLampPlacement(larger, 'larger-facility');

const dense = generateMission('dense-facility', { rows: 2, columns: 2, enemyCount: 8 });
const denseRooms = new Map(dense.rooms.map(room => [room.id, room]));
for (let i = 0; i < dense.enemies.spawns.length; i++) {
  const a = dense.enemies.spawns[i];
  for (let j = i + 1; j < dense.enemies.spawns.length; j++) {
    const b = dense.enemies.spawns[j];
    if (a.roomId !== b.roomId) continue;
    assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= 75, 'same-room enemy spawns need personal space');
  }
  const sameRoomEnemies = dense.enemies.spawns.filter(enemy => enemy.roomId === a.roomId);
  if (sameRoomEnemies.length > 1) {
    const room = denseRooms.get(a.roomId);
    const forwardX = Math.sin(a.angle);
    const forwardY = -Math.cos(a.angle);
    const outwardX = a.x - room.center.x;
    const outwardY = a.y - room.center.y;
    assert.ok(forwardX * outwardX + forwardY * outwardY > 0, 'same-room enemies should initially face outward');
  }
}

assert.equal(facilityProfiles.tutorial_grid.progressionGroup, 'tutorial');
assert.equal(facilityProfiles.local_government_office.progressionGroup, 'early');
assert.equal(facilityProfiles.prison.progressionGroup, 'special');
assert.equal(Object.keys(facilityProfiles).length, 11);

function validateLocalOfficeTopology(topology, seed) {
  assert.equal(topology.profileId, 'local_government_office');
  assert.equal(topology.seed, String(seed));
  assert.ok(topology.roomCount >= 10 && topology.roomCount <= 16);
  assert.equal(topology.nodes.filter(node => node.spaceType === 'room').length, topology.roomCount);
  assert.ok(topology.nodes.some(node => node.spaceType === 'corridor'));
  assert.ok(topology.nodes.some(node => node.spaceType === 'junction'));
  assert.ok(topology.nodes.every(node => !('grid' in node) && !('row' in node) && !('column' in node)));

  const nodeIds = new Set(topology.nodes.map(node => node.id));
  assert.equal(nodeIds.size, topology.nodes.length);
  for (const requiredId of [
    'reception',
    'public_service_office',
    'administration_office',
    'records_office',
    'meeting_room',
    'security_checkpoint',
    'secure_records',
    'staff_break_room',
    'storage_room',
    'main_hall',
    'service_corridor',
    'secure_corridor',
  ]) {
    assert.ok(nodeIds.has(requiredId), `${seed}: topology must include ${requiredId}`);
  }

  const adjacency = new Map(topology.nodes.map(node => [node.id, []]));
  for (const edge of topology.edges) {
    assert.ok(nodeIds.has(edge.a) && nodeIds.has(edge.b), `${seed}: edge endpoints must exist`);
    adjacency.get(edge.a).push(edge.b);
    adjacency.get(edge.b).push(edge.a);
  }
  const reached = new Set(['reception']);
  const queue = ['reception'];
  while (queue.length > 0) {
    const current = queue.shift();
    for (const neighbor of adjacency.get(current)) {
      if (reached.has(neighbor)) continue;
      reached.add(neighbor);
      queue.push(neighbor);
    }
  }
  assert.equal(reached.size, topology.nodes.length, `${seed}: office topology must be connected`);
  assert.equal(topology.edges.length - topology.nodes.length + 1, topology.loopCount);
  assert.ok(topology.loopCount >= 1 && topology.loopCount <= 3);
  assert.ok(topology.nodes.filter(node => adjacency.get(node.id).length === 1).length >= 1);
}

const officeTopology = generateLocalOfficeTopology('office-deterministic');
assert.equal(
  JSON.stringify(officeTopology),
  JSON.stringify(generateLocalOfficeTopology('office-deterministic')),
  'same seed must reproduce the same local-office topology'
);
assert.notEqual(
  JSON.stringify(officeTopology),
  JSON.stringify(generateLocalOfficeTopology('office-different')),
  'different seeds should vary the local-office topology request'
);
for (let index = 0; index < 100; index++) {
  validateLocalOfficeTopology(generateLocalOfficeTopology(`office-validation-${index}`), `office-validation-${index}`);
}

console.log('Seeded mission generation checks passed for 100 seeds and configurable facility scales.');
