function hashMissionSeed(seed) {
  const text = String(seed);
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createSeededMissionRandom(seed) {
  let state = hashMissionSeed(seed) || 0x6d2b79f5;
  return function random() {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleMissionItems(items, random) {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

const FACILITY_PROFILES = Object.freeze({
  tutorial_grid: Object.freeze({
    id: 'tutorial_grid',
    displayName: 'Tutorial Facility',
    progressionGroup: 'tutorial',
    generatorKind: 'seeded_grid',
    implementationStatus: 'implemented',
  }),
  local_government_office: Object.freeze({
    id: 'local_government_office',
    displayName: 'Local Government Office',
    progressionGroup: 'early',
    generatorKind: 'irregular_single_floor',
    implementationStatus: 'topology',
    roomCount: Object.freeze({ min: 10, max: 16 }),
    enemyCount: Object.freeze({ min: 7, max: 12 }),
    roomSizeWeights: Object.freeze({ small: 0.45, medium: 0.40, large: 0.15 }),
    loopCount: Object.freeze({ min: 1, max: 3 }),
    deadEndCount: Object.freeze({ min: 1, max: 4 }),
    checkpointCount: Object.freeze({ min: 1, max: 2 }),
    securityZoneCount: 3,
  }),
  warehouse: Object.freeze({ id: 'warehouse', displayName: 'Warehouse', progressionGroup: 'early', generatorKind: 'unimplemented', implementationStatus: 'planned' }),
  factory: Object.freeze({ id: 'factory', displayName: 'Factory', progressionGroup: 'early', generatorKind: 'unimplemented', implementationStatus: 'planned' }),
  laboratory: Object.freeze({ id: 'laboratory', displayName: 'Laboratory', progressionGroup: 'early', generatorKind: 'unimplemented', implementationStatus: 'planned' }),
  library: Object.freeze({ id: 'library', displayName: 'Library', progressionGroup: 'early', generatorKind: 'unimplemented', implementationStatus: 'planned' }),
  military_base: Object.freeze({ id: 'military_base', displayName: 'Military Base', progressionGroup: 'late', generatorKind: 'unimplemented', implementationStatus: 'planned' }),
  mansion: Object.freeze({ id: 'mansion', displayName: 'Mansion', progressionGroup: 'late', generatorKind: 'unimplemented', implementationStatus: 'planned' }),
  central_government_office: Object.freeze({ id: 'central_government_office', displayName: 'Central Government Office', progressionGroup: 'late', generatorKind: 'unimplemented', implementationStatus: 'planned' }),
  underground_bunker: Object.freeze({ id: 'underground_bunker', displayName: 'Underground Bunker', progressionGroup: 'late', generatorKind: 'unimplemented', implementationStatus: 'planned' }),
  prison: Object.freeze({ id: 'prison', displayName: 'Prison', progressionGroup: 'special', generatorKind: 'unimplemented', implementationStatus: 'deferred' }),
});

function chooseWeightedRoomSize(random, weights) {
  const roll = random();
  if (roll < weights.small) return 'small';
  if (roll < weights.small + weights.medium) return 'medium';
  return 'large';
}

function generateLocalGovernmentOfficeTopology(seedInput, overrides = {}) {
  const profile = FACILITY_PROFILES.local_government_office;
  const seed = String(seedInput);
  const random = createSeededMissionRandom(`${seed}:local-government-office:topology`);
  const roomCount = clampMissionInteger(
    overrides.roomCount,
    profile.roomCount.min + Math.floor(random() * (profile.roomCount.max - profile.roomCount.min + 1)),
    profile.roomCount.min,
    profile.roomCount.max
  );
  const loopCount = clampMissionInteger(
    overrides.loopCount,
    profile.loopCount.min + Math.floor(random() * (profile.loopCount.max - profile.loopCount.min + 1)),
    profile.loopCount.min,
    profile.loopCount.max
  );
  const nodes = [];
  const edges = [];

  function addRoom(id, motif, securityZone, roomSize = null, mandatory = true) {
    nodes.push({
      id,
      spaceType: 'room',
      roomSize: roomSize ?? chooseWeightedRoomSize(random, profile.roomSizeWeights),
      motif,
      securityZone,
      mandatory,
    });
  }

  function addCirculation(id, spaceType, motif, securityZone) {
    nodes.push({ id, spaceType, roomSize: null, motif, securityZone, mandatory: true });
  }

  function connect(a, b, connectorKind = 'door', role = 'ordinary') {
    const id = `link_${[a, b].sort().join('__')}`;
    if (edges.some(edge => edge.id === id)) return false;
    edges.push({ id, a, b, connectorKind, role });
    return true;
  }

  addCirculation('entry_passage', 'corridor', 'reception_checkpoint', 'public');
  addCirculation('main_hall', 'corridor', 'circulation_spine', 'public');
  addCirculation('service_corridor', 'corridor', 'storage_service_branch', 'restricted');
  addCirculation('secure_corridor', 'corridor', 'secure_antechamber', 'secure');
  addCirculation('public_junction', 'junction', 'side_branch_junction', 'public');

  addRoom('reception', 'reception_checkpoint', 'public', 'medium');
  addRoom('public_service_office', 'office_cluster', 'public', 'large');
  addRoom('administration_office', 'office_cluster', 'restricted', 'medium');
  addRoom('records_office', 'office_cluster', 'restricted', 'medium');
  addRoom('meeting_room', 'office_cluster', 'public', 'medium');
  addRoom('security_checkpoint', 'reception_checkpoint', 'restricted', 'small');
  addRoom('secure_records', 'secure_antechamber', 'secure', 'medium');
  addRoom('staff_break_room', 'storage_service_branch', 'restricted', 'small');
  addRoom('storage_room', 'storage_service_branch', 'restricted', 'small');

  connect('reception', 'entry_passage', 'door', 'entry');
  connect('entry_passage', 'main_hall', 'opening', 'circulation');
  connect('main_hall', 'public_junction', 'opening', 'circulation');
  connect('public_junction', 'public_service_office');
  connect('main_hall', 'administration_office');
  connect('main_hall', 'records_office');
  connect('public_junction', 'meeting_room');
  connect('main_hall', 'security_checkpoint', 'door', 'checkpoint');
  connect('security_checkpoint', 'secure_corridor', 'door', 'checkpoint');
  connect('secure_corridor', 'secure_records');
  connect('main_hall', 'service_corridor', 'opening', 'circulation');
  connect('service_corridor', 'staff_break_room');
  connect('service_corridor', 'storage_room');

  const optionalRoomSpecs = shuffleMissionItems([
    { baseId: 'clerks_office', motif: 'office_cluster', zone: 'public' },
    { baseId: 'tax_office', motif: 'office_cluster', zone: 'public' },
    { baseId: 'archive_room', motif: 'secure_antechamber', zone: 'secure' },
    { baseId: 'supply_room', motif: 'storage_service_branch', zone: 'restricted' },
    { baseId: 'supervisor_office', motif: 'office_cluster', zone: 'restricted' },
    { baseId: 'utility_room', motif: 'storage_service_branch', zone: 'restricted' },
    { baseId: 'conference_room', motif: 'office_cluster', zone: 'public' },
  ], random);
  const mandatoryRoomCount = nodes.filter(node => node.spaceType === 'room').length;
  const optionalCount = roomCount - mandatoryRoomCount;
  for (let index = 0; index < optionalCount; index++) {
    const spec = optionalRoomSpecs[index];
    addRoom(spec.baseId, spec.motif, spec.zone, null, false);
    const parent = spec.zone === 'secure'
      ? 'secure_corridor'
      : (spec.motif === 'storage_service_branch' ? 'service_corridor' : 'public_junction');
    connect(parent, spec.baseId);
  }

  const loopCandidates = shuffleMissionItems([
    ['meeting_room', 'service_corridor'],
    ['records_office', 'secure_corridor'],
    ['administration_office', 'public_junction'],
    ['staff_break_room', 'public_junction'],
    ['storage_room', 'secure_corridor'],
  ], random);
  let addedLoops = 0;
  for (const [a, b] of loopCandidates) {
    if (addedLoops >= loopCount) break;
    if (connect(a, b, 'door', 'alternate-route')) addedLoops++;
  }

  return Object.freeze({
    profileId: profile.id,
    seed,
    roomCount,
    loopCount: addedLoops,
    nodes: Object.freeze(nodes.map(node => Object.freeze(node))),
    edges: Object.freeze(edges.map(edge => Object.freeze(edge))),
  });
}

const DEFAULT_GENERATED_FACILITY_CONFIG = Object.freeze({
  rows: 3,
  columns: 3,
  enemyCount: 6,
  extraConnections: 2,
  roomWidth: 1028 / 3,
  roomHeight: 226,
  wallThickness: 18,
});

function clampMissionInteger(value, fallback, minimum, maximum) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(minimum, Math.min(maximum, Math.round(number)));
}

function normalizeGeneratedFacilityConfig(config = {}) {
  const rows = clampMissionInteger(config.rows, DEFAULT_GENERATED_FACILITY_CONFIG.rows, 2, 8);
  const columns = clampMissionInteger(config.columns, DEFAULT_GENERATED_FACILITY_CONFIG.columns, 2, 8);
  const roomCount = rows * columns;
  const maximumConnections = rows * (columns - 1) + (rows - 1) * columns;
  const roomWidth = Math.max(260, Number(config.roomWidth) || DEFAULT_GENERATED_FACILITY_CONFIG.roomWidth);
  const roomHeight = Math.max(180, Number(config.roomHeight) || DEFAULT_GENERATED_FACILITY_CONFIG.roomHeight);
  const wallThickness = Math.max(12, Number(config.wallThickness) || DEFAULT_GENERATED_FACILITY_CONFIG.wallThickness);
  return Object.freeze({
    rows,
    columns,
    enemyCount: clampMissionInteger(
      config.enemyCount,
      DEFAULT_GENERATED_FACILITY_CONFIG.enemyCount,
      0,
      Math.max(0, (roomCount - 1) * 4)
    ),
    extraConnections: clampMissionInteger(
      config.extraConnections,
      DEFAULT_GENERATED_FACILITY_CONFIG.extraConnections,
      0,
      Math.max(0, maximumConnections - (roomCount - 1))
    ),
    roomWidth,
    roomHeight,
    wallThickness,
  });
}

function createGeneratedGridAxis(count, roomSize, wallThickness, designLength) {
  const interiorEnd = designLength - wallThickness;
  const roomSpan = designLength - wallThickness * 2 - wallThickness * (count - 1);
  const step = roomSpan / count + wallThickness;
  const starts = Array.from({ length: count }, (_, index) =>
    Math.round(wallThickness + index * step));
  return starts.map((start, index) => {
    const end = index + 1 < count ? starts[index + 1] - wallThickness : interiorEnd;
    const soundMin = index === 0 ? 0 : start - wallThickness / 2;
    const soundMax = index + 1 < count ? starts[index + 1] - wallThickness / 2 : designLength;
    return { start, size: end - start, soundMin, soundMax };
  });
}

function getGeneratedRoomLampPlacement(room, walls) {
  const left = room.interior.x;
  const right = room.interior.x + room.interior.w;
  const top = room.interior.y;
  const bottom = room.interior.y + room.interior.h;
  const candidates = [];

  function addHorizontalCandidate(wall, boundary, wallSide) {
    if (wall.w <= wall.h) return;
    if (Math.abs(wall.y - boundary) > 0.001 && Math.abs(wall.y + wall.h - boundary) > 0.001) return;
    const start = Math.max(left, wall.x);
    const end = Math.min(right, wall.x + wall.w);
    if (end - start < 36) return;
    candidates.push({ x: (start + end) / 2, y: boundary, wallSide, length: end - start });
  }

  function addVerticalCandidate(wall, boundary, wallSide) {
    if (wall.h <= wall.w) return;
    if (Math.abs(wall.x - boundary) > 0.001 && Math.abs(wall.x + wall.w - boundary) > 0.001) return;
    const start = Math.max(top, wall.y);
    const end = Math.min(bottom, wall.y + wall.h);
    if (end - start < 36) return;
    candidates.push({ x: boundary, y: (start + end) / 2, wallSide, length: end - start });
  }

  for (const wall of walls) {
    addHorizontalCandidate(wall, top, 'N');
    addHorizontalCandidate(wall, bottom, 'S');
    addVerticalCandidate(wall, left, 'W');
    addVerticalCandidate(wall, right, 'E');
  }

  candidates.sort((a, b) => b.length - a.length || a.wallSide.localeCompare(b.wallSide));
  const placement = candidates[0];
  if (!placement) throw new Error(`Generated room "${room.id}" has no solid wall segment for a lamp.`);
  return placement;
}

function generateSeededMission(seedInput, facilityConfig = {}) {
  const seed = String(seedInput);
  const random = createSeededMissionRandom(seed);
  const config = normalizeGeneratedFacilityConfig(facilityConfig);
  const wallThickness = config.wallThickness;
  const designWidth = Math.round(
    config.wallThickness * 2 + config.columns * config.roomWidth +
    (config.columns - 1) * config.wallThickness
  );
  const designHeight = Math.round(
    config.wallThickness * 2 + config.rows * config.roomHeight +
    (config.rows - 1) * config.wallThickness
  );
  const world = {
    designWidth,
    designHeight,
    width: Math.round(designWidth * (3200 / 1100)),
    height: Math.round(designHeight * (1800 / 750)),
  };
  const columns = createGeneratedGridAxis(config.columns, config.roomWidth, config.wallThickness, designWidth)
    .map(spec => ({ x: spec.start, w: spec.size, soundMin: spec.soundMin, soundMax: spec.soundMax }));
  const rows = createGeneratedGridAxis(config.rows, config.roomHeight, config.wallThickness, designHeight)
    .map(spec => ({ y: spec.start, h: spec.size, soundMin: spec.soundMin, soundMax: spec.soundMax }));
  const startRoomId = `room_${rows.length - 1}_${Math.floor(columns.length / 2)}`;
  const rooms = [];
  const roomsById = new Map();

  for (let row = 0; row < rows.length; row++) {
    for (let column = 0; column < columns.length; column++) {
      const xSpec = columns[column];
      const ySpec = rows[row];
      const room = {
        id: `room_${row}_${column}`,
        spaceType: 'room',
        roomSize: 'medium',
        moduleType: 'rect_standard',
        grid: { row, column },
        center: {
          x: xSpec.x + xSpec.w / 2,
          y: ySpec.y + ySpec.h / 2,
        },
        interior: { x: xSpec.x, y: ySpec.y, w: xSpec.w, h: ySpec.h },
        bounds: {
          x: xSpec.soundMin,
          y: ySpec.soundMin,
          w: xSpec.soundMax - xSpec.soundMin,
          h: ySpec.soundMax - ySpec.soundMin,
        },
        startingSpace: `room_${row}_${column}` === startRoomId,
      };
      rooms.push(room);
      roomsById.set(room.id, room);
    }
  }

  const candidateConnections = [];
  for (let row = 0; row < rows.length; row++) {
    for (let column = 0; column < columns.length - 1; column++) {
      const a = `room_${row}_${column}`;
      const b = `room_${row}_${column + 1}`;
      candidateConnections.push({
        id: `door_${a}__${b}`,
        a,
        b,
        orientation: 'vertical',
        wallX: columns[column].x + columns[column].w,
        position: {
          x: columns[column].x + columns[column].w + wallThickness / 2,
          y: roomsById.get(a).center.y,
        },
      });
    }
  }
  for (let row = 0; row < rows.length - 1; row++) {
    for (let column = 0; column < columns.length; column++) {
      const a = `room_${row}_${column}`;
      const b = `room_${row + 1}_${column}`;
      candidateConnections.push({
        id: `door_${a}__${b}`,
        a,
        b,
        orientation: 'horizontal',
        wallY: rows[row].y + rows[row].h,
        position: {
          x: roomsById.get(a).center.x,
          y: rows[row].y + rows[row].h + wallThickness / 2,
        },
      });
    }
  }

  const parent = new Map(rooms.map(room => [room.id, room.id]));
  function findRoot(id) {
    let root = id;
    while (parent.get(root) !== root) root = parent.get(root);
    while (parent.get(id) !== id) {
      const next = parent.get(id);
      parent.set(id, root);
      id = next;
    }
    return root;
  }
  function joinRooms(a, b) {
    const rootA = findRoot(a);
    const rootB = findRoot(b);
    if (rootA === rootB) return false;
    parent.set(rootB, rootA);
    return true;
  }

  const shuffledConnections = shuffleMissionItems(candidateConnections, random);
  const selectedIds = new Set();
  for (const connection of shuffledConnections) {
    if (joinRooms(connection.a, connection.b)) selectedIds.add(connection.id);
  }
  for (const connection of shuffledConnections) {
    if (selectedIds.size >= rooms.length - 1 + config.extraConnections) break;
    selectedIds.add(connection.id);
  }
  const selectedConnections = candidateConnections.filter(connection => selectedIds.has(connection.id));
  const metalDoorId = selectedConnections[Math.floor(random() * selectedConnections.length)].id;

  const connectors = [];
  const doors = [];
  const lightingApertures = [];
  for (const connection of selectedConnections) {
    const apertureIds = connection.orientation === 'vertical'
      ? [`${connection.id}_e`, `${connection.id}_w`]
      : [`${connection.id}_n`, `${connection.id}_s`];
    connectors.push({
      id: connection.id,
      kind: 'door',
      rooms: [connection.a, connection.b],
      position: { ...connection.position },
      doorId: connection.id,
      navNodeId: `gap_${connection.id}`,
      apertureIds,
    });

    if (connection.orientation === 'vertical') {
      doors.push({
        id: connection.id,
        connectorId: connection.id,
        x: connection.wallX + wallThickness / 2 - 3,
        y: connection.position.y - 45,
        w: 6,
        h: 90,
        orientation: 'vertical',
        material: connection.id === metalDoorId ? 'metal' : 'wood',
        defaultState: 'closed',
      });
      lightingApertures.push(
        {
          id: apertureIds[0], connectorId: connection.id, kind: 'door',
          x: connection.wallX + wallThickness, y: connection.position.y, direction: 'E',
          width: 90, range: 320, intensity: 0.62, falloffPower: 0.7,
          spreadRadians: 1.1, open: false,
        },
        {
          id: apertureIds[1], connectorId: connection.id, kind: 'door',
          x: connection.wallX, y: connection.position.y, direction: 'W',
          width: 90, range: 320, intensity: 0.62, falloffPower: 0.7,
          spreadRadians: 1.1, open: false,
        },
      );
    } else {
      doors.push({
        id: connection.id,
        connectorId: connection.id,
        x: connection.position.x - 50,
        y: connection.wallY + wallThickness / 2 - 3,
        w: 100,
        h: 6,
        orientation: 'horizontal',
        material: connection.id === metalDoorId ? 'metal' : 'wood',
        defaultState: 'closed',
      });
      lightingApertures.push(
        {
          id: apertureIds[0], connectorId: connection.id, kind: 'door',
          x: connection.position.x, y: connection.wallY, direction: 'N',
          width: 100, range: 320, intensity: 0.62, falloffPower: 0.7,
          spreadRadians: 1.1, open: false,
        },
        {
          id: apertureIds[1], connectorId: connection.id, kind: 'door',
          x: connection.position.x, y: connection.wallY + wallThickness, direction: 'S',
          width: 100, range: 320, intensity: 0.62, falloffPower: 0.7,
          spreadRadians: 1.1, open: false,
        },
      );
    }
  }

  const exteriorWindowRowCount = Math.max(1, rows.length - 1);
  const leftWindowRow = Math.floor(random() * exteriorWindowRowCount);
  const rightWindowRow = Math.floor(random() * exteriorWindowRowCount);
  const rightColumn = columns.length - 1;
  const windowSpecs = [
    {
      id: `window_left_${leftWindowRow}`,
      roomId: `room_${leftWindowRow}_0`,
      side: 'left',
      center: { x: wallThickness / 2, y: roomsById.get(`room_${leftWindowRow}_0`).center.y },
    },
    {
      id: `window_right_${rightWindowRow}`,
      roomId: `room_${rightWindowRow}_${rightColumn}`,
      side: 'right',
      center: {
        x: designWidth - wallThickness / 2,
        y: roomsById.get(`room_${rightWindowRow}_${rightColumn}`).center.y,
      },
    },
  ];
  const windows = [];
  const wallGapExits = [];
  for (const windowSpec of windowSpecs) {
    const apertureId = `${windowSpec.id}_moonlight`;
    connectors.push({
      id: windowSpec.id,
      kind: 'window',
      rooms: [windowSpec.roomId, 'exterior'],
      position: { ...windowSpec.center },
      windowId: windowSpec.id,
      apertureIds: [apertureId],
    });
    windows.push({
      id: windowSpec.id,
      connectorId: windowSpec.id,
      x: windowSpec.center.x - 1.5,
      y: windowSpec.center.y - 30,
      w: 3,
      h: 60,
      orientation: 'vertical',
      material: 'glass',
      defaultState: 'intact',
    });
    lightingApertures.push({
      id: apertureId,
      connectorId: windowSpec.id,
      kind: 'window',
      x: windowSpec.side === 'left' ? wallThickness : designWidth - wallThickness,
      y: windowSpec.center.y,
      direction: windowSpec.side === 'left' ? 'E' : 'W',
      width: 70,
      range: 360,
      intensity: 0.24,
      falloffPower: 1.05,
      spreadRadians: 0.95,
      open: true,
      requiresExternalLight: true,
    });
    wallGapExits.push({
      id: `${windowSpec.id}_exit`,
      connectorId: windowSpec.id,
      activated: false,
    });
  }

  const startRoom = roomsById.get(startRoomId);
  connectors.push({
    id: 'primary_entry_gap',
    kind: 'opening',
    rooms: [startRoomId, 'exterior'],
    position: { x: startRoom.center.x, y: designHeight - wallThickness / 2 },
  });

  const walls = [];
  function addWall(x, y, w, h) {
    if (w <= 0 || h <= 0) return;
    walls.push({ id: `wall_${walls.length}`, x, y, w, h });
  }

  addWall(0, 0, designWidth, wallThickness);
  const entryLeft = startRoom.center.x - 70;
  const entryRight = startRoom.center.x + 70;
  addWall(0, designHeight - wallThickness, entryLeft, wallThickness);
  addWall(entryRight, designHeight - wallThickness, designWidth - entryRight, wallThickness);

  const leftGap = {
    start: windowSpecs[0].center.y - 30,
    end: windowSpecs[0].center.y + 30,
  };
  addWall(0, 0, wallThickness, leftGap.start);
  addWall(0, leftGap.end, wallThickness, designHeight - leftGap.end);
  const rightGap = {
    start: windowSpecs[1].center.y - 30,
    end: windowSpecs[1].center.y + 30,
  };
  addWall(designWidth - wallThickness, 0, wallThickness, rightGap.start);
  addWall(designWidth - wallThickness, rightGap.end, wallThickness, designHeight - rightGap.end);

  const connectionsByPair = new Map(selectedConnections.map(connection => [
    [connection.a, connection.b].sort().join('|'),
    connection,
  ]));
  function connectionBetween(a, b) {
    return connectionsByPair.get([a, b].sort().join('|')) ?? null;
  }

  for (let row = 0; row < rows.length; row++) {
    for (let column = 0; column < columns.length - 1; column++) {
      const a = `room_${row}_${column}`;
      const b = `room_${row}_${column + 1}`;
      const wallX = columns[column].x + columns[column].w;
      const connection = connectionBetween(a, b);
      if (!connection) {
        addWall(wallX, rows[row].y, wallThickness, rows[row].h);
      } else {
        const gapStart = connection.position.y - 45;
        const gapEnd = connection.position.y + 45;
        addWall(wallX, rows[row].y, wallThickness, gapStart - rows[row].y);
        addWall(wallX, gapEnd, wallThickness, rows[row].y + rows[row].h - gapEnd);
      }
    }
  }
  for (let row = 0; row < rows.length - 1; row++) {
    for (let column = 0; column < columns.length; column++) {
      const a = `room_${row}_${column}`;
      const b = `room_${row + 1}_${column}`;
      const wallY = rows[row].y + rows[row].h;
      const connection = connectionBetween(a, b);
      if (!connection) {
        addWall(columns[column].x, wallY, columns[column].w, wallThickness);
      } else {
        const gapStart = connection.position.x - 50;
        const gapEnd = connection.position.x + 50;
        addWall(columns[column].x, wallY, gapStart - columns[column].x, wallThickness);
        addWall(gapEnd, wallY, columns[column].x + columns[column].w - gapEnd, wallThickness);
      }
    }
  }

  const lightingLamps = rooms.map((room, index) => {
    const placement = getGeneratedRoomLampPlacement(room, walls);
    return {
      id: `lamp_${index + 1}`,
      roomId: room.id,
      x: placement.x,
      y: placement.y,
      wallSide: placement.wallSide,
      radius: 900,
      intensity: 1,
      falloffPower: 1.45,
      color: '#ffdc96',
      active: true,
    };
  });
  const lightingZones = [{
    id: 'entry_dim_spill',
    roomId: startRoomId,
    x: startRoom.center.x - 70,
    y: startRoom.interior.y + startRoom.interior.h - 92,
    w: 140,
    h: 92,
    ambient: 0.08,
  }];

  const eligibleObjectiveRooms = rooms.filter(room => !room.startingSpace);
  const pickupRoom = eligibleObjectiveRooms[Math.floor(random() * eligibleObjectiveRooms.length)];

  const roomConnections = new Map(rooms.map(room => [room.id, []]));
  for (const connector of connectors.filter(connector => connector.kind === 'door')) {
    roomConnections.get(connector.rooms[0]).push({ connector, neighborId: connector.rooms[1] });
    roomConnections.get(connector.rooms[1]).push({ connector, neighborId: connector.rooms[0] });
  }
  const enemyRoomAssignments = [];
  while (enemyRoomAssignments.length < config.enemyCount) {
    const cycleRooms = shuffleMissionItems(eligibleObjectiveRooms, random);
    for (const room of cycleRooms) {
      if (enemyRoomAssignments.length >= config.enemyCount) break;
      enemyRoomAssignments.push(room);
    }
  }
  const enemiesPerRoom = new Map();
  for (const room of enemyRoomAssignments) {
    enemiesPerRoom.set(room.id, (enemiesPerRoom.get(room.id) ?? 0) + 1);
  }
  const nextRoomSlot = new Map();
  const enemySpawns = enemyRoomAssignments.map((room, index) => {
    const roomEnemyCount = enemiesPerRoom.get(room.id);
    const roomSlot = nextRoomSlot.get(room.id) ?? 0;
    nextRoomSlot.set(room.id, roomSlot + 1);
    const spawnAngle = roomEnemyCount > 1
      ? (hashMissionSeed(`${seed}:${room.id}:spawn`) / 4294967296) * Math.PI * 2 +
        roomSlot * (Math.PI * 2 / roomEnemyCount)
      : 0;
    const spawnRadius = roomEnemyCount > 1
      ? Math.min(58, Math.min(room.interior.w, room.interior.h) / 2 - 40)
      : 0;
    const spawn = {
      x: room.center.x + Math.cos(spawnAngle) * spawnRadius,
      y: room.center.y + Math.sin(spawnAngle) * spawnRadius,
    };
    const isShooter = index % 3 === 2;
    let patrolRoute;
    if (index % 3 === 0 && roomConnections.get(room.id).length > 0) {
      const options = roomConnections.get(room.id);
      const routeConnection = options[(Math.floor(random() * options.length) + roomSlot) % options.length];
      const neighbor = roomsById.get(routeConnection.neighborId);
      patrolRoute = [
        { x: spawn.x, y: spawn.y, pauseFrames: 90, sweep: Math.PI / 2, sweepSpeed: 0.008 },
        { x: routeConnection.connector.position.x, y: routeConnection.connector.position.y, pauseFrames: 0, sweep: 0, sweepSpeed: 0 },
        { x: neighbor.center.x, y: neighbor.center.y, pauseFrames: 90, sweep: Math.PI / 2, sweepSpeed: 0.008 },
        { x: routeConnection.connector.position.x, y: routeConnection.connector.position.y, pauseFrames: 0, sweep: 0, sweepSpeed: 0 },
      ];
    } else {
      const horizontal = (index + roomSlot) % 2 === 0;
      const offset = Math.min(55, (horizontal ? room.interior.w : room.interior.h) * 0.18);
      if (horizontal) {
        patrolRoute = [
          { x: Math.max(room.interior.x + 40, spawn.x - offset), y: spawn.y, pauseFrames: 120, sweep: Math.PI / 2, sweepSpeed: 0.008 },
          { x: Math.min(room.interior.x + room.interior.w - 40, spawn.x + offset), y: spawn.y, pauseFrames: 120, sweep: Math.PI / 2, sweepSpeed: -0.008 },
        ];
      } else {
        patrolRoute = [
          { x: spawn.x, y: Math.max(room.interior.y + 40, spawn.y - offset), pauseFrames: 120, sweep: Math.PI / 2, sweepSpeed: 0.008 },
          { x: spawn.x, y: Math.min(room.interior.y + room.interior.h - 40, spawn.y + offset), pauseFrames: 120, sweep: Math.PI / 2, sweepSpeed: -0.008 },
        ];
      }
    }
    const facingTarget = patrolRoute.find(point => Math.hypot(point.x - spawn.x, point.y - spawn.y) > 0.001);
    const angle = roomEnemyCount > 1
      ? Math.atan2(Math.cos(spawnAngle), -Math.sin(spawnAngle))
      : Math.atan2(facingTarget.x - spawn.x, -(facingTarget.y - spawn.y));
    return {
      id: `enemy_${index + 1}`,
      roomId: room.id,
      x: spawn.x,
      y: spawn.y,
      angle,
      targetAngle: angle,
      archetype: isShooter ? 'shooter' : 'melee',
      visionAngle: Math.PI * 2 / 3,
      sightRange: Infinity,
      proximityRadius: 50,
      patrolSpeed: 1.5,
      shootingRange: isShooter ? 360 : 0,
      shootingRangeTolerance: isShooter ? 40 : 0,
      shotCooldownFrames: isShooter ? 75 : 0,
      shotSpeed: isShooter ? 25 : 0,
      aimSpreadRadians: isShooter ? 0.16 : 0,
      patrolRoute,
    };
  });

  const navigationNodes = [
    ...rooms.map(room => ({ id: room.id, roomId: room.id })),
    ...connectors
      .filter(connector => connector.kind === 'door')
      .map(connector => ({ id: connector.navNodeId, connectorId: connector.id })),
  ];
  const navigationEdges = [];
  for (const connector of connectors.filter(connector => connector.kind === 'door')) {
    navigationEdges.push(
      [connector.rooms[0], connector.navNodeId],
      [connector.navNodeId, connector.rooms[1]],
    );
  }

  return freezeMissionDefinition({
    id: `generated_facility_${hashMissionSeed(seed).toString(16).padStart(8, '0')}`,
    generation: {
      kind: 'seeded_grid',
      profileId: 'tutorial_grid',
      seed,
      rows: rows.length,
      columns: columns.length,
      enemyCount: config.enemyCount,
      extraConnections: config.extraConnections,
      roomWidth: config.roomWidth,
      roomHeight: config.roomHeight,
      wallThickness: config.wallThickness,
    },
    world,
    player: {
      start: { x: startRoom.center.x, y: startRoom.interior.y + startRoom.interior.h - 52 },
    },
    rooms,
    connectors,
    geometry: {
      walls,
      wallGapExits,
    },
    doors,
    windows,
    lighting: {
      globalAmbient: 0,
      externalLightAvailable: true,
      zones: lightingZones,
      lamps: lightingLamps,
      apertures: lightingApertures,
    },
    objective: {
      pickupRule: {
        excludeStartingSpaces: true,
        pickupRoomId: pickupRoom.id,
      },
      exfilPoints: [
        {
          id: 'primary_entry_exfil',
          connectorId: 'primary_entry_gap',
          type: 'primary',
          active: false,
          discovered: true,
        },
      ],
    },
    enemies: {
      spawns: enemySpawns,
      navigation: {
        nodes: navigationNodes,
        edges: navigationEdges,
      },
    },
    sound: {
      rooms: rooms.map(room => room.id),
      portals: connectors
        .filter(connector => connector.kind === 'door')
        .map(connector => connector.id),
    },
  });
}
