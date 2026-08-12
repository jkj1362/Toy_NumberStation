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
  globalThis.__normalizedFacilityProfiles = NORMALIZED_FACILITY_PROFILES;
  globalThis.__normalizeFacilityProfile = normalizeFacilityProfile;
  globalThis.__generateIrregularTopology = generateIrregularFacilityTopology;
  globalThis.__placeIrregularSpaces = placeIrregularFacilitySpaces;
  globalThis.__routeIrregularConnections = routeIrregularFacilityConnections;
  globalThis.__compileIrregularStructure = compileIrregularFacilityStructure;
  globalThis.__generateIrregularMission = generateIrregularSeededMission;
  globalThis.__buildIrregularMissionAttempt = buildIrregularSeededMissionAttempt;
  globalThis.__validateIrregularMission = validateIrregularMissionDefinition;
  globalThis.__getIrregularAttemptSeed = getIrregularGenerationAttemptSeed;
  globalThis.__irregularMaxAttempts = IRREGULAR_GENERATION_MAX_ATTEMPTS;
  globalThis.__spaceModules = SPACE_MODULES;
  globalThis.__facilitySpaceProfiles = FACILITY_SPACE_PROFILES;
  globalThis.__motifLibrary = MOTIF_LIBRARY;
`, context);

const generateMission = context.__generateMission;
const facilityProfiles = context.__facilityProfiles;
const normalizedFacilityProfiles = context.__normalizedFacilityProfiles;
const normalizeFacilityProfile = context.__normalizeFacilityProfile;
const generateIrregularTopology = context.__generateIrregularTopology;
const placeIrregularSpaces = context.__placeIrregularSpaces;
const routeIrregularConnections = context.__routeIrregularConnections;
const compileIrregularStructure = context.__compileIrregularStructure;
const generateIrregularMission = context.__generateIrregularMission;
const buildIrregularMissionAttempt = context.__buildIrregularMissionAttempt;
const validateIrregularMissionDefinition = context.__validateIrregularMission;
const getIrregularAttemptSeed = context.__getIrregularAttemptSeed;
const irregularMaxAttempts = context.__irregularMaxAttempts;
const spaceModules = context.__spaceModules;
const facilitySpaceProfiles = context.__facilitySpaceProfiles;
const motifLibrary = context.__motifLibrary;

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
          Math.abs(wall.y + wall.h - boundary) < 0.001 ||
          Math.abs(wall.y + wall.h / 2 - boundary) < 0.001;
        return touchesBoundary && lamp.x >= wall.x + clearance && lamp.x <= wall.x + wall.w - clearance;
      }
      if (wall.h <= wall.w) return false;
      const touchesBoundary = Math.abs(wall.x - boundary) < 0.001 ||
        Math.abs(wall.x + wall.w - boundary) < 0.001 ||
        Math.abs(wall.x + wall.w / 2 - boundary) < 0.001;
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

function validateIrregularTopology(topology, seed) {
  const profile = normalizedFacilityProfiles.local_government_office;
  assert.equal(topology.seed, String(seed));
  assert.equal(topology.profileId, profile.id);
  assert.equal(topology.generationVersion, profile.generationVersion);
  assertDeepFrozen(topology, `topology(${seed})`);
  assertUniqueIds(topology.nodes, 'topology spaces', seed);
  assertUniqueIds(topology.edges, 'topology edges', seed);

  const nodesById = new Map(topology.nodes.map(node => [node.id, node]));
  const adjacency = new Map(topology.nodes.map(node => [node.id, []]));
  const edgePairs = new Set();
  for (const edge of topology.edges) {
    assert.equal(edge.spaces.length, 2, `${seed}: topology edges connect two spaces`);
    const [a, b] = edge.spaces;
    assert.ok(nodesById.has(a), `${seed}: topology edge references ${a}`);
    assert.ok(nodesById.has(b), `${seed}: topology edge references ${b}`);
    const pair = [a, b].sort().join('|');
    assert.equal(edgePairs.has(pair), false, `${seed}: topology edges cannot be duplicated`);
    edgePairs.add(pair);
    adjacency.get(a).push(b);
    adjacency.get(b).push(a);
  }

  const roomNodes = topology.nodes.filter(node => node.spaceType === 'room');
  const checkpoints = topology.nodes.filter(node => node.role === 'checkpoint');
  const entries = topology.nodes.filter(node => node.startingSpace);
  const objective = topology.nodes.find(node => node.role === 'secure_office');
  assert.ok(
    roomNodes.length >= profile.roomCount.min && roomNodes.length <= profile.roomCount.max,
    `${seed}: room count must stay within the profile`,
  );
  assert.equal(roomNodes.length, topology.metrics.roomCount);
  assert.equal(checkpoints.length, topology.metrics.checkpointCount);
  assert.ok(
    checkpoints.length >= profile.checkpointCount.min && checkpoints.length <= profile.checkpointCount.max,
    `${seed}: checkpoint count must stay within the profile`,
  );
  assert.equal(entries.length, 1, `${seed}: topology needs one entry`);
  assert.ok(
    topology.metrics.entranceCount >= profile.entranceCount.min &&
    topology.metrics.entranceCount <= profile.entranceCount.max,
    `${seed}: entrance count must stay within the profile`,
  );
  assert.equal(objective.objectiveCompatible, true, `${seed}: objective space must be eligible`);
  assert.equal(topology.requiredRoute[0], entries[0].id);
  assert.equal(topology.requiredRoute.at(-1), objective.id);
  for (let index = 0; index < topology.requiredRoute.length - 1; index++) {
    const pair = [topology.requiredRoute[index], topology.requiredRoute[index + 1]].sort().join('|');
    assert.ok(edgePairs.has(pair), `${seed}: required-route spaces must be adjacent`);
  }

  for (const node of topology.nodes) {
    assert.ok(['room', 'corridor', 'junction'].includes(node.spaceType));
    assert.ok(spaceModules[node.moduleId], `${seed}: ${node.id} must reference a registered module`);
    assert.equal(Object.hasOwn(node, 'grid'), false, `${seed}: irregular topology cannot expose grid coordinates`);
    assert.ok(node.securityZone >= 0 && node.securityZone < profile.securityZoneCount);
    const degree = adjacency.get(node.id).length;
    assert.ok(degree >= node.minimumConnectors, `${seed}: ${node.id} needs its minimum connectors`);
    assert.ok(degree <= node.maximumConnectors, `${seed}: ${node.id} exceeds its connector limit`);
  }

  const reached = new Set([entries[0].id]);
  const queue = [entries[0].id];
  while (queue.length > 0) {
    const nodeId = queue.shift();
    for (const neighborId of adjacency.get(nodeId)) {
      if (reached.has(neighborId)) continue;
      reached.add(neighborId);
      queue.push(neighborId);
    }
  }
  assert.equal(reached.size, topology.nodes.length, `${seed}: topology must be connected`);

  const loopCount = topology.edges.length - topology.nodes.length + 1;
  const deadEndCount = topology.nodes.filter(node =>
    !node.startingSpace && adjacency.get(node.id).length === 1
  ).length;
  assert.equal(loopCount, topology.metrics.loopCount);
  assert.equal(deadEndCount, topology.metrics.deadEndCount);
  assert.ok(loopCount >= profile.loopCount.min && loopCount <= profile.loopCount.max);
  assert.ok(deadEndCount >= profile.deadEndCount.min && deadEndCount <= profile.deadEndCount.max);

  for (const selection of profile.mandatorySpaces) {
    const count = roomNodes.filter(node => node.spaceProfileId === selection.spaceProfileId).length;
    assert.ok(
      count >= selection.count.min && count <= selection.count.max,
      `${seed}: mandatory space ${selection.spaceProfileId} must satisfy its count`,
    );
  }
  const motifInstancesById = new Map(topology.motifInstances.map(instance => [instance.motifId, instance]));
  for (const motifId of profile.requiredMotifs) {
    const motif = motifLibrary[motifId];
    const instance = motifInstancesById.get(motifId);
    assert.ok(instance, `${seed}: required motif ${motifId} must be instantiated`);
    for (const spaceId of instance.spaces) {
      assert.ok(nodesById.has(spaceId), `${seed}: motif ${motifId} references ${spaceId}`);
    }
    for (const [roleA, roleB] of motif.requiredAdjacencies) {
      const hasAdjacency = topology.edges.some(edge => {
        if (!instance.spaces.includes(edge.spaces[0]) || !instance.spaces.includes(edge.spaces[1])) return false;
        const roles = edge.spaces.map(spaceId => nodesById.get(spaceId).role);
        return (roles[0] === roleA && roles[1] === roleB) ||
          (roles[0] === roleB && roles[1] === roleA);
      });
      assert.equal(hasAdjacency, true, `${seed}: motif ${motifId} needs ${roleA}/${roleB} adjacency`);
    }
  }
}

function validateIrregularPlacement(topology, placement, seed) {
  assert.equal(placement.seed, String(seed));
  assert.equal(placement.profileId, topology.profileId);
  assert.equal(placement.generationVersion, topology.generationVersion);
  assert.equal(placement.spaces.length, topology.nodes.length);
  assertDeepFrozen(placement, `placement(${seed})`);
  assert.ok(placement.world.designWidth > 0 && placement.world.designHeight > 0);
  assert.ok(placement.metrics.uniqueCenterX >= Math.ceil(placement.spaces.length * 0.45));
  assert.ok(placement.metrics.uniqueCenterY >= Math.ceil(placement.spaces.length * 0.45));

  const topologyNodesById = new Map(topology.nodes.map(node => [node.id, node]));
  for (const space of placement.spaces) {
    const topologyNode = topologyNodesById.get(space.id);
    assert.ok(topologyNode, `${seed}: placed space ${space.id} must exist in topology`);
    assert.equal(space.role, topologyNode.role);
    assert.equal(Object.hasOwn(space, 'grid'), false, `${seed}: placement cannot expose grid coordinates`);
    assert.ok(space.interior.w > 0 && space.interior.h > 0);
    assert.ok(space.interior.x >= 0 && space.interior.y >= 0);
    assert.ok(space.interior.x + space.interior.w <= placement.world.designWidth);
    assert.ok(space.interior.y + space.interior.h <= placement.world.designHeight);
    assert.equal(space.center.x, space.interior.x + space.interior.w / 2);
    assert.equal(space.center.y, space.interior.y + space.interior.h / 2);

    const module = spaceModules[space.moduleId];
    const normalDimensions = space.interior.w >= module.width.min && space.interior.w <= module.width.max &&
      space.interior.h >= module.height.min && space.interior.h <= module.height.max;
    const rotatedDimensions = module.mayRotate === true &&
      space.interior.w >= module.height.min && space.interior.w <= module.height.max &&
      space.interior.h >= module.width.min && space.interior.h <= module.width.max;
    assert.ok(normalDimensions || rotatedDimensions, `${seed}: ${space.id} dimensions must match its module`);
  }

  for (let aIndex = 0; aIndex < placement.spaces.length; aIndex++) {
    const a = placement.spaces[aIndex];
    for (let bIndex = aIndex + 1; bIndex < placement.spaces.length; bIndex++) {
      const b = placement.spaces[bIndex];
      const clearance = Math.max(a.placementClearance, b.placementClearance);
      const separated = a.interior.x >= b.interior.x + b.interior.w + clearance ||
        a.interior.x + a.interior.w + clearance <= b.interior.x ||
        a.interior.y >= b.interior.y + b.interior.h + clearance ||
        a.interior.y + a.interior.h + clearance <= b.interior.y;
      assert.equal(separated, true, `${seed}: ${a.id} and ${b.id} must not overlap or violate clearance`);
    }
  }
}

function validateIrregularRouting(topology, placement, routing, seed) {
  assert.equal(routing.seed, String(seed));
  assert.equal(routing.profileId, topology.profileId);
  assert.equal(routing.generationVersion, topology.generationVersion);
  assert.equal(routing.routes.length, topology.edges.length);
  assert.equal(routing.metrics.routeCount, topology.edges.length);
  assert.equal(
    routing.metrics.straightRouteCount + routing.metrics.bentRouteCount,
    routing.metrics.routeCount,
  );
  assertDeepFrozen(routing, `routing(${seed})`);
  assertUniqueIds(routing.routes, 'routes', seed);
  assertUniqueIds(routing.routeSpaces, 'route spaces', seed);
  assertUniqueIds(routing.junctions, 'route junctions', seed);

  const spacesById = new Map(placement.spaces.map(space => [space.id, space]));
  const topologyEdgesById = new Map(topology.edges.map(edge => [edge.id, edge]));
  function pointOnSpaceBoundary(point, space) {
    const onHorizontal = (point.y === space.interior.y ||
      point.y === space.interior.y + space.interior.h) &&
      point.x >= space.interior.x && point.x <= space.interior.x + space.interior.w;
    const onVertical = (point.x === space.interior.x ||
      point.x === space.interior.x + space.interior.w) &&
      point.y >= space.interior.y && point.y <= space.interior.y + space.interior.h;
    return onHorizontal || onVertical;
  }
  function rectanglesOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x &&
      a.y < b.y + b.h && a.y + a.h > b.y;
  }

  for (const route of routing.routes) {
    const edge = topologyEdgesById.get(route.topologyEdgeId);
    assert.ok(edge, `${seed}: ${route.id} must reference a topology edge`);
    assert.deepEqual(
      JSON.parse(JSON.stringify(route.topologySpaces)),
      JSON.parse(JSON.stringify(edge.spaces)),
    );
    assert.equal(route.sockets.length, 2);
    assert.equal(route.points.length >= 2, true);
    assert.equal(route.bendCount, route.points.length - 2);
    assert.equal(route.sockets[0].spaceId, route.topologySpaces[0]);
    assert.equal(route.sockets[1].spaceId, route.topologySpaces[1]);
    assert.deepEqual(
      JSON.parse(JSON.stringify(route.points[0])),
      JSON.parse(JSON.stringify(route.sockets[0].position)),
    );
    assert.deepEqual(
      JSON.parse(JSON.stringify(route.points.at(-1))),
      JSON.parse(JSON.stringify(route.sockets[1].position)),
    );
    for (const socket of route.sockets) {
      assert.equal(
        pointOnSpaceBoundary(socket.position, spacesById.get(socket.spaceId)),
        true,
        `${seed}: ${route.id} socket must lie on ${socket.spaceId}`,
      );
    }
    for (let index = 1; index < route.points.length; index++) {
      const a = route.points[index - 1];
      const b = route.points[index];
      assert.ok(a.x === b.x || a.y === b.y, `${seed}: ${route.id} segments must be orthogonal`);
      assert.notDeepEqual(a, b, `${seed}: ${route.id} cannot contain zero-length segments`);
    }
  }

  for (const routeSpace of routing.routeSpaces) {
    assert.ok(spaceModules[routeSpace.moduleId], `${seed}: route space needs a registered module`);
    assert.ok(routeSpace.interior.w > 0 && routeSpace.interior.h > 0);
    assert.ok(routeSpace.interior.x >= 0 && routeSpace.interior.y >= 0);
    assert.ok(routeSpace.interior.x + routeSpace.interior.w <= placement.world.designWidth);
    assert.ok(routeSpace.interior.y + routeSpace.interior.h <= placement.world.designHeight);
    const route = routeSpace.sourceRouteId
      ? routing.routes.find(item => item.id === routeSpace.sourceRouteId)
      : null;
    const endpointIds = new Set(route?.topologySpaces ?? []);
    for (const space of placement.spaces) {
      if (endpointIds.has(space.id)) continue;
      assert.equal(
        rectanglesOverlap(routeSpace.interior, space.interior),
        false,
        `${seed}: ${routeSpace.id} cannot cross unrelated ${space.id}`,
      );
    }
  }

  const junctionKeys = new Set(routing.junctions.map(junction =>
    `${junction.position.x}:${junction.position.y}`));
  for (const route of routing.routes) {
    for (let index = 1; index < route.points.length - 1; index++) {
      const previous = route.points[index - 1];
      const point = route.points[index];
      const next = route.points[index + 1];
      if ((previous.x === point.x) !== (point.x === next.x)) {
        assert.ok(
          junctionKeys.has(`${point.x}:${point.y}`),
          `${seed}: ${route.id} bend must materialize a junction`,
        );
      }
    }
  }
}

function validateIrregularStructure(topology, placement, routing, structure, seed) {
  assert.equal(structure.seed, String(seed));
  assert.equal(structure.profileId, topology.profileId);
  assert.equal(structure.generationVersion, topology.generationVersion);
  assertDeepFrozen(structure, `structure(${seed})`);
  assertUniqueIds(structure.spaces, 'compiled spaces', seed);
  assertUniqueIds(structure.connectors, 'compiled connectors', seed);
  assertUniqueIds(structure.geometry.walls, 'compiled walls', seed);
  assertUniqueIds(structure.doors, 'compiled doors', seed);
  assertUniqueIds(structure.windows, 'compiled windows', seed);
  assertUniqueIds(structure.exteriorEntrances, 'compiled entrances', seed);
  assertUniqueIds(structure.geometry.wallGapExits, 'compiled wall-gap exits', seed);
  assertUniqueIds(structure.lighting.apertures, 'compiled apertures', seed);
  assertUniqueIds(structure.navigation.nodes, 'compiled navigation nodes', seed);
  assert.equal(structure.metrics.spaceCount, structure.spaces.length);
  assert.equal(structure.metrics.connectorCount, structure.connectors.length);
  assert.equal(structure.metrics.wallCount, structure.geometry.walls.length);
  assert.equal(structure.metrics.doorCount, structure.doors.length);
  assert.equal(structure.metrics.windowCount, structure.windows.length);
  assert.equal(structure.metrics.entranceCount, structure.exteriorEntrances.length);
  assert.equal(structure.exteriorEntrances.length, topology.metrics.entranceCount);
  assert.equal(structure.exteriorEntrances.filter(entrance => entrance.primary).length, 1);
  assert.equal(structure.windows.length, 3);

  const spacesById = new Map(structure.spaces.map(space => [space.id, space]));
  const connectorsById = new Map(structure.connectors.map(connector => [connector.id, connector]));
  const doorsById = new Map(structure.doors.map(door => [door.id, door]));
  const windowsById = new Map(structure.windows.map(windowSpec => [windowSpec.id, windowSpec]));
  const aperturesById = new Map(structure.lighting.apertures.map(aperture => [aperture.id, aperture]));
  const navNodeIds = new Set(structure.navigation.nodes.map(node => node.id));
  function rectanglesOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x &&
      a.y < b.y + b.h && a.y + a.h > b.y;
  }

  for (const wall of structure.geometry.walls) {
    assert.ok(wall.w > 0 && wall.h > 0, `${seed}: ${wall.id} must have positive dimensions`);
    assert.ok(wall.x >= 0 && wall.y >= 0, `${seed}: ${wall.id} must remain inside design space`);
    assert.ok(wall.x + wall.w <= structure.world.designWidth);
    assert.ok(wall.y + wall.h <= structure.world.designHeight);
  }
  for (const connector of structure.connectors) {
    assert.equal(connector.rooms.length, 2);
    assert.ok(
      connector.rooms[0] === 'exterior' || spacesById.has(connector.rooms[0]),
      `${seed}: ${connector.id} first space must exist`,
    );
    assert.ok(
      connector.rooms[1] === 'exterior' || spacesById.has(connector.rooms[1]),
      `${seed}: ${connector.id} second space must exist`,
    );
    if (connector.rooms.includes('exterior')) {
      assert.equal(connector.navNodeId, undefined, `${seed}: exterior connectors stay outside internal navigation`);
    } else {
      assert.ok(navNodeIds.has(connector.navNodeId), `${seed}: ${connector.id} nav node must exist`);
    }
    if (connector.kind === 'door') {
      assert.equal(doorsById.get(connector.doorId)?.connectorId, connector.id);
    }
    if (connector.kind === 'window') {
      assert.equal(windowsById.get(connector.windowId)?.connectorId, connector.id);
      assert.ok(connector.rooms.includes('exterior'));
    }
    for (const apertureId of connector.apertureIds) {
      assert.equal(aperturesById.get(apertureId)?.connectorId, connector.id);
    }
  }
  for (const door of structure.doors) {
    assert.equal(connectorsById.get(door.connectorId)?.kind, 'door');
    assert.equal(
      structure.geometry.walls.every(wall => !rectanglesOverlap(door, wall)),
      true,
      `${seed}: ${door.id} must occupy a compiled wall opening`,
    );
  }
  for (const windowSpec of structure.windows) {
    assert.equal(connectorsById.get(windowSpec.connectorId)?.kind, 'window');
    assert.equal(
      structure.geometry.walls.every(wall => !rectanglesOverlap(windowSpec, wall)),
      true,
      `${seed}: ${windowSpec.id} must occupy a compiled exterior opening`,
    );
  }
  for (const exit of structure.geometry.wallGapExits) {
    assert.equal(connectorsById.get(exit.connectorId)?.kind, 'window');
  }
  for (const aperture of structure.lighting.apertures) {
    assert.ok(['N', 'E', 'S', 'W'].includes(aperture.direction));
    assert.ok(connectorsById.has(aperture.connectorId));
  }
  for (const node of structure.navigation.nodes) {
    if (node.roomId) assert.ok(spacesById.has(node.roomId));
    if (node.connectorId) assert.ok(connectorsById.has(node.connectorId));
  }
  for (const [from, to] of structure.navigation.edges) {
    assert.ok(navNodeIds.has(from), `${seed}: navigation edge references ${from}`);
    assert.ok(navNodeIds.has(to), `${seed}: navigation edge references ${to}`);
  }
  for (const spaceId of structure.sound.rooms) assert.ok(spacesById.has(spaceId));
  for (const connectorId of structure.sound.portals) assert.ok(connectorsById.has(connectorId));
  assert.ok(structure.sound.portals.every(connectorId =>
    !connectorsById.get(connectorId).rooms.includes('exterior')));

  const adjacency = new Map(structure.spaces.map(space => [space.id, []]));
  for (const connector of structure.connectors.filter(item => !item.rooms.includes('exterior'))) {
    adjacency.get(connector.rooms[0]).push(connector.rooms[1]);
    adjacency.get(connector.rooms[1]).push(connector.rooms[0]);
  }
  const startingSpace = structure.spaces.find(space => space.startingSpace);
  const reached = new Set([startingSpace.id]);
  const queue = [startingSpace.id];
  while (queue.length > 0) {
    const spaceId = queue.shift();
    for (const neighborId of adjacency.get(spaceId)) {
      if (reached.has(neighborId)) continue;
      reached.add(neighborId);
      queue.push(neighborId);
    }
  }
  assert.equal(reached.size, structure.spaces.length, `${seed}: compiled spaces must remain connected`);
}

function validateGeneratedMission(mission, seed) {
  assert.equal(mission.generation.seed, String(seed));
  assert.equal(mission.generation.kind, 'seeded_grid');
  assert.equal(mission.generation.profileId, 'tutorial_grid');
  assert.equal(mission.generation.generationVersion, 1);
  assert.equal(mission.generation.facilityProfile.id, 'tutorial_grid');
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
  for (const room of mission.rooms) {
    assert.equal(room.spaceType, 'room', `${seed}: tutorial spaces remain rooms`);
    assert.equal(room.roomSize, 'medium', `${seed}: tutorial rooms use the medium module size`);
  }
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

function validateIrregularMission(mission, seed) {
  const profile = normalizedFacilityProfiles.local_government_office;
  assert.equal(mission.generation.kind, 'seeded_irregular');
  assert.equal(mission.generation.seed, String(seed));
  assert.equal(mission.generation.profileId, profile.id);
  assert.equal(mission.generation.generationVersion, profile.generationVersion);
  assertDeepFrozen(mission, `irregularMission(${seed})`);
  assertUniqueIds(mission.rooms, 'irregular mission rooms', seed);
  assertUniqueIds(mission.connectors, 'irregular mission connectors', seed);
  assertUniqueIds(mission.geometry.walls, 'irregular mission walls', seed);
  assertUniqueIds(mission.geometry.obstacles, 'irregular mission furniture', seed);
  assertUniqueIds(mission.doors, 'irregular mission doors', seed);
  assertUniqueIds(mission.windows, 'irregular mission windows', seed);
  assertUniqueIds(mission.lighting.lamps, 'irregular mission lamps', seed);
  assertUniqueIds(mission.lighting.apertures, 'irregular mission apertures', seed);
  assertUniqueIds(mission.enemies.spawns, 'irregular mission enemies', seed);
  assertGeneratedLampPlacement(mission, seed);

  const roomsById = new Map(mission.rooms.map(room => [room.id, room]));
  const connectorsById = new Map(mission.connectors.map(connector => [connector.id, connector]));
  const startRoom = mission.rooms.find(room => room.startingSpace);
  assert.ok(startRoom, `${seed}: irregular mission needs a starting room`);
  assert.ok(
    mission.player.start.x >= startRoom.interior.x &&
    mission.player.start.x <= startRoom.interior.x + startRoom.interior.w &&
    mission.player.start.y >= startRoom.interior.y &&
    mission.player.start.y <= startRoom.interior.y + startRoom.interior.h,
  );
  const objectiveRoom = roomsById.get(mission.objective.pickupRule.pickupRoomId);
  assert.equal(objectiveRoom.role, 'secure_office');
  assert.notEqual(objectiveRoom.id, startRoom.id);
  assert.equal(mission.objective.exfilPoints.length, mission.generation.topologyMetrics.entranceCount);
  for (const exfil of mission.objective.exfilPoints) {
    const connector = connectorsById.get(exfil.connectorId);
    assert.ok(connector?.rooms.includes('exterior'), `${seed}: exfil must use an exterior connector`);
  }

  function pointInsideWall(point) {
    return mission.geometry.walls.some(wall =>
      point.x > wall.x && point.x < wall.x + wall.w &&
      point.y > wall.y && point.y < wall.y + wall.h);
  }
  function pointInsideFurniture(point) {
    return mission.geometry.obstacles.some(obstacle =>
      obstacle.blocksMovement !== false &&
      point.x > obstacle.x && point.x < obstacle.x + obstacle.w &&
      point.y > obstacle.y && point.y < obstacle.y + obstacle.h);
  }
  for (const room of mission.rooms.filter(item => item.spaceType === 'room')) {
    const roomFurniture = mission.geometry.obstacles.filter(obstacle => obstacle.roomId === room.id);
    assert.ok(roomFurniture.length >= 2, `${seed}: ${room.id} must be furnished`);
    for (const obstacle of roomFurniture) {
      assert.ok(obstacle.x >= room.interior.x && obstacle.y >= room.interior.y);
      assert.ok(obstacle.x + obstacle.w <= room.interior.x + room.interior.w);
      assert.ok(obstacle.y + obstacle.h <= room.interior.y + room.interior.h);
    }
  }
  const archiveRoom = mission.rooms.find(room => room.role === 'records_archive');
  const archiveConnectors = mission.connectors.filter(connector => connector.rooms.includes(archiveRoom.id));
  assert.equal(archiveConnectors.length, 1, `${seed}: archive must have one entrance`);
  assert.equal(archiveConnectors[0].kind, 'door');
  assert.equal(archiveConnectors[0].rooms.includes('exterior'), false);
  assert.equal(
    mission.windows.some(windowSpec =>
      connectorsById.get(windowSpec.connectorId).rooms.includes(archiveRoom.id)
    ),
    false,
    `${seed}: archive cannot have a window`,
  );
  assert.ok(
    mission.geometry.obstacles.filter(obstacle =>
      obstacle.roomId === archiveRoom.id && obstacle.kind === 'archive_bank'
    ).length >= 2,
  );
  assert.equal(
    mission.geometry.obstacles.filter(obstacle =>
      obstacle.roomId === archiveRoom.id && obstacle.kind === 'archive_clerk_desk'
    ).length,
    1,
  );
  assert.equal(pointInsideWall(mission.player.start), false);
  assert.equal(pointInsideFurniture(mission.player.start), false);
  assert.ok(
    mission.enemies.spawns.length >= profile.enemyCount.min &&
    mission.enemies.spawns.length <= profile.enemyCount.max,
  );
  for (let index = 0; index < mission.enemies.spawns.length; index++) {
    const enemy = mission.enemies.spawns[index];
    const room = roomsById.get(enemy.roomId);
    assert.ok(room, `${seed}: ${enemy.id} must reference a room`);
    assert.ok(enemy.x >= room.interior.x && enemy.x <= room.interior.x + room.interior.w);
    assert.ok(enemy.y >= room.interior.y && enemy.y <= room.interior.y + room.interior.h);
    assert.equal(pointInsideWall(enemy), false, `${seed}: ${enemy.id} cannot spawn in a wall`);
    assert.equal(pointInsideFurniture(enemy), false, `${seed}: ${enemy.id} cannot spawn in furniture`);
    assert.ok(enemy.patrolRoute.length >= 2);
    for (const waypoint of enemy.patrolRoute) {
      assert.equal(pointInsideWall(waypoint), false, `${seed}: ${enemy.id} patrol cannot enter a wall`);
      assert.equal(pointInsideFurniture(waypoint), false, `${seed}: ${enemy.id} patrol cannot enter furniture`);
    }
    for (let otherIndex = index + 1; otherIndex < mission.enemies.spawns.length; otherIndex++) {
      const other = mission.enemies.spawns[otherIndex];
      if (enemy.roomId !== other.roomId) continue;
      assert.ok(Math.hypot(enemy.x - other.x, enemy.y - other.y) >= 75);
    }
  }

  const navNodeIds = new Set(mission.enemies.navigation.nodes.map(node => node.id));
  for (const node of mission.enemies.navigation.nodes) {
    if (node.roomId) assert.ok(roomsById.has(node.roomId));
    if (node.connectorId) assert.ok(connectorsById.has(node.connectorId));
  }
  for (const [from, to] of mission.enemies.navigation.edges) {
    assert.ok(navNodeIds.has(from));
    assert.ok(navNodeIds.has(to));
  }
  for (const roomId of mission.sound.rooms) assert.ok(roomsById.has(roomId));
  for (const connectorId of mission.sound.portals) assert.ok(connectorsById.has(connectorId));
}

const first = generateMission('deterministic-seed');
const repeat = generateMission('deterministic-seed');
const different = generateMission('different-seed');
assert.equal(JSON.stringify(first), JSON.stringify(repeat), 'same seed must reproduce the same mission');
assert.notEqual(JSON.stringify(first), JSON.stringify(different), 'different seeds must produce a different mission');
assertDeepFrozen(facilityProfiles, 'facilityProfiles');
assertDeepFrozen(normalizedFacilityProfiles, 'normalizedFacilityProfiles');
assertDeepFrozen(spaceModules, 'spaceModules');
assertDeepFrozen(facilitySpaceProfiles, 'facilitySpaceProfiles');
assertDeepFrozen(motifLibrary, 'motifLibrary');
assert.equal(normalizedFacilityProfiles.tutorial_grid.generatorKind, 'seeded_grid');
assert.equal(normalizedFacilityProfiles.local_government_office.generatorKind, 'irregular');
assert.deepEqual(
  JSON.parse(JSON.stringify(normalizedFacilityProfiles.local_government_office.roomCount)),
  { min: 10, max: 16 },
);
assert.equal(
  Object.values(normalizedFacilityProfiles.local_government_office.roomSizeWeights)
    .reduce((total, weight) => total + weight, 0),
  1,
);

const normalizedTestProfile = normalizeFacilityProfile({
  ...JSON.parse(JSON.stringify(normalizedFacilityProfiles.local_government_office)),
  id: 'normalization_test',
  generationVersion: 2,
  roomSizeWeights: { small: 1, medium: 2, large: 1 },
});
assert.equal(normalizedTestProfile.roomSizeWeights.small, 0.25);
assert.equal(normalizedTestProfile.roomSizeWeights.medium, 0.5);
assert.equal(normalizedTestProfile.roomSizeWeights.large, 0.25);
assertDeepFrozen(normalizedTestProfile, 'normalizedTestProfile');
assert.throws(
  () => normalizeFacilityProfile({
    ...normalizedTestProfile,
    id: 'invalid_range',
    roomCount: { min: 8, max: 3 },
  }),
  /roomCount.*min <= max/,
);
assert.throws(
  () => generateMission('unknown-profile', { profileId: 'missing' }),
  /Unknown facility profile/,
);
const firstOfficeMission = generateMission('future-office', { profileId: 'local_government_office' });
assert.equal(firstOfficeMission.generation.kind, 'seeded_irregular');
assert.ok(firstOfficeMission.generation.generationAttempt >= 0);
assert.ok(firstOfficeMission.generation.generationAttempt < irregularMaxAttempts);
assert.equal(
  firstOfficeMission.generation.attemptSeed,
  getIrregularAttemptSeed('future-office', firstOfficeMission.generation.generationAttempt),
);
assert.equal(validateIrregularMissionDefinition(firstOfficeMission), true);
assert.equal(
  JSON.stringify(firstOfficeMission),
  JSON.stringify(generateMission('future-office', { profileId: 'local_government_office' })),
  'same office seed and profile must reproduce the same complete mission',
);
assert.equal(irregularMaxAttempts, 4);
assert.equal(getIrregularAttemptSeed('future-office', 0), 'future-office');
assert.equal(getIrregularAttemptSeed('future-office', 1), 'future-office:irregular-attempt:1');
const retryOfficeMission = buildIrregularMissionAttempt('future-office', 'local_government_office', 1);
assert.equal(retryOfficeMission.generation.seed, 'future-office');
assert.equal(retryOfficeMission.generation.generationAttempt, 1);
assert.equal(retryOfficeMission.generation.attemptSeed, 'future-office:irregular-attempt:1');
assert.equal(validateIrregularMissionDefinition(retryOfficeMission), true);
assert.equal(
  JSON.stringify(retryOfficeMission),
  JSON.stringify(buildIrregularMissionAttempt('future-office', 'local_government_office', 1)),
  'the same bounded retry attempt must reproduce the same mission',
);
const invalidAttemptMetadata = JSON.parse(JSON.stringify(firstOfficeMission));
invalidAttemptMetadata.generation.attemptSeed = 'not-derived-from-run-seed';
assert.throws(
  () => validateIrregularMissionDefinition(invalidAttemptMetadata),
  /attempt seed must be derived/,
);
assert.throws(
  () => generateIrregularMission('bounded-error', 'missing_profile'),
  new RegExp(`after ${irregularMaxAttempts} attempts`),
);

const firstOfficeTopology = generateIrregularTopology('office-deterministic');
assert.equal(
  JSON.stringify(firstOfficeTopology),
  JSON.stringify(generateIrregularTopology('office-deterministic')),
  'same seed and profile must reproduce the same irregular topology',
);
assert.notEqual(
  JSON.stringify(firstOfficeTopology),
  JSON.stringify(generateIrregularTopology('office-different')),
  'different seeds should vary the irregular topology',
);
const firstOfficePlacement = placeIrregularSpaces(firstOfficeTopology);
assert.equal(
  JSON.stringify(firstOfficePlacement),
  JSON.stringify(placeIrregularSpaces(firstOfficeTopology)),
  'same topology must reproduce the same irregular placement',
);
const firstOfficeRouting = routeIrregularConnections(firstOfficeTopology, firstOfficePlacement);
assert.equal(
  JSON.stringify(firstOfficeRouting),
  JSON.stringify(routeIrregularConnections(firstOfficeTopology, firstOfficePlacement)),
  'same topology and placement must reproduce the same corridor routes',
);
const firstOfficeStructure = compileIrregularStructure(
  firstOfficeTopology,
  firstOfficePlacement,
  firstOfficeRouting,
);
assert.equal(
  JSON.stringify(firstOfficeStructure),
  JSON.stringify(compileIrregularStructure(firstOfficeTopology, firstOfficePlacement, firstOfficeRouting)),
  'same routed facility must reproduce the same compiled structure',
);
for (let index = 0; index < 100; index++) {
  const seed = `office-topology-${index}`;
  const topology = generateIrregularTopology(seed);
  validateIrregularTopology(topology, seed);
  const placement = placeIrregularSpaces(topology);
  validateIrregularPlacement(topology, placement, seed);
  const routing = routeIrregularConnections(topology, placement);
  validateIrregularRouting(topology, placement, routing, seed);
  validateIrregularStructure(
    topology,
    placement,
    routing,
    compileIrregularStructure(topology, placement, routing),
    seed,
  );
  validateIrregularMission(
    generateMission(seed, { profileId: 'local_government_office' }),
    seed,
  );
}

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

console.log('Seeded mission checks passed for 100 grid seeds and 100 complete irregular office seeds.');
