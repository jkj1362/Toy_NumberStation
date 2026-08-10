const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const vm = require('node:vm');

const missionSource = fs.readFileSync('mission.js', 'utf8');
const context = vm.createContext({});
vm.runInContext(`${missionSource}\nglobalThis.__mission = REFERENCE_MISSION;`, context);
const mission = context.__mission;
const missionHash = crypto.createHash('sha256').update(JSON.stringify(mission)).digest('hex');

function assertDeepFrozen(value, path = 'REFERENCE_MISSION') {
  if (!value || typeof value !== 'object') return;
  assert.equal(Object.isFrozen(value), true, `${path} must be frozen`);
  for (const [key, child] of Object.entries(value)) {
    assertDeepFrozen(child, `${path}.${key}`);
  }
}

function assertUniqueIds(items, label) {
  const ids = items.map(item => item.id);
  assert.equal(new Set(ids).size, ids.length, `${label} IDs must be unique`);
  assert.ok(ids.every(Boolean), `${label} must all have IDs`);
}

assert.deepEqual(
  JSON.parse(JSON.stringify(mission.world)),
  { designWidth: 1100, designHeight: 750, width: 3200, height: 1800 },
);
assertDeepFrozen(mission);
assert.equal(missionHash, '4335676a9b6ed020666ea3ec6c3459962fba7a0b12f0b0ed66817aaed13e7c56');

assert.equal(mission.geometry.walls.length, 16);
assert.equal(mission.rooms.length, 5);
assert.equal(mission.connectors.length, 8);
assert.equal(mission.doors.length, 5);
assert.equal(mission.windows.length, 2);
assert.equal(mission.geometry.wallGapExits.length, 2);
assert.equal(mission.lighting.zones.length, 4);
assert.equal(mission.lighting.lamps.length, 12);
assert.equal(mission.lighting.apertures.length, 12);
assert.equal(mission.enemies.spawns.length, 3);
assert.equal(mission.enemies.navigation.nodes.length, 10);
assert.equal(mission.enemies.navigation.edges.length, 9);
assert.equal(mission.sound.rooms.length, 5);
assert.equal(mission.sound.portals.length, 5);

assertUniqueIds(mission.geometry.walls, 'walls');
assertUniqueIds(mission.rooms, 'rooms');
assertUniqueIds(mission.connectors, 'connectors');
assertUniqueIds(mission.doors, 'doors');
assertUniqueIds(mission.windows, 'windows');
assertUniqueIds(mission.geometry.wallGapExits, 'wall-gap exits');
assertUniqueIds(mission.lighting.zones, 'lighting zones');
assertUniqueIds(mission.lighting.lamps, 'lamps');
assertUniqueIds(mission.lighting.apertures, 'apertures');
assertUniqueIds(mission.enemies.spawns, 'enemy spawns');
assertUniqueIds(mission.enemies.navigation.nodes, 'navigation nodes');

const roomsById = new Map(mission.rooms.map(room => [room.id, room]));
const connectorsById = new Map(mission.connectors.map(connector => [connector.id, connector]));
const doorsById = new Map(mission.doors.map(door => [door.id, door]));
const windowsById = new Map(mission.windows.map(windowSpec => [windowSpec.id, windowSpec]));
const aperturesById = new Map(mission.lighting.apertures.map(aperture => [aperture.id, aperture]));

for (const connector of mission.connectors) {
  for (const roomId of connector.rooms) {
    assert.ok(roomId === 'exterior' || roomsById.has(roomId), `${connector.id} references room ${roomId}`);
  }
  if (connector.doorId) assert.equal(doorsById.get(connector.doorId)?.connectorId, connector.id);
  if (connector.windowId) assert.equal(windowsById.get(connector.windowId)?.connectorId, connector.id);
  for (const apertureId of connector.apertureIds ?? []) {
    assert.equal(aperturesById.get(apertureId)?.connectorId, connector.id);
  }
}

for (const exit of mission.geometry.wallGapExits) {
  const connector = connectorsById.get(exit.connectorId);
  assert.equal(connector?.kind, 'window');
  assert.ok(connector.windowId);
}

const resolvedNavNodes = Object.fromEntries(mission.enemies.navigation.nodes.map(node => {
  const point = node.roomId
    ? roomsById.get(node.roomId)?.center
    : connectorsById.get(node.connectorId)?.position;
  assert.ok(point, `${node.id} must resolve to a room or connector position`);
  return [node.id, [point.x, point.y]];
}));
assert.deepEqual(
  JSON.parse(JSON.stringify(resolvedNavNodes)),
  {
    lobby: [460, 590],
    gap_corr_left: [270, 449],
    gap_corr_right: [819, 449],
    corridor: [589, 229],
    gap_room_a: [409, 295],
    room_a: [200, 229],
    gap_room_bc: [769, 210],
    room_bc: [930, 229],
    gap_room_f: [909, 590],
    room_f: [991, 590],
  },
);

for (const [from, to] of mission.enemies.navigation.edges) {
  assert.ok(resolvedNavNodes[from], `navigation edge references ${from}`);
  assert.ok(resolvedNavNodes[to], `navigation edge references ${to}`);
}

for (const connectorId of mission.sound.portals) {
  const connector = connectorsById.get(connectorId);
  assert.equal(connector?.kind, 'door');
  assert.equal(connector.rooms.length, 2);
}
for (const roomId of mission.sound.rooms) assert.ok(roomsById.has(roomId));

assert.deepEqual(
  JSON.parse(JSON.stringify(mission.enemies.spawns.map(spawn => ({
    id: spawn.id,
    x: spawn.x,
    y: spawn.y,
    archetype: spawn.archetype,
    patrolNodes: spawn.patrolRoute.length,
  })))),
  [
    { id: 'enemy_1', x: 580, y: 100, archetype: 'melee', patrolNodes: 0 },
    { id: 'enemy_2', x: 500, y: 590, archetype: 'melee', patrolNodes: 2 },
    { id: 'enemy_3', x: 200, y: 229, archetype: 'shooter', patrolNodes: 8 },
  ],
);

const primaryExfil = mission.objective.exfilPoints[0];
assert.equal(connectorsById.get(primaryExfil.connectorId)?.id, 'primary_entry_gap');
assert.equal(mission.objective.pickupRule.excludeStartingSpaces, true);

console.log('Reference mission parity checks passed.');
