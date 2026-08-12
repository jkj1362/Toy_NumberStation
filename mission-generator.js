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

const DEFAULT_GENERATED_FACILITY_CONFIG = Object.freeze({
  rows: 3,
  columns: 3,
  enemyCount: 6,
  extraConnections: 2,
  roomWidth: 1028 / 3,
  roomHeight: 226,
  wallThickness: 18,
});

const SPACE_MODULES = freezeMissionDefinition({
  room_small: {
    id: 'room_small',
    spaceType: 'room',
    roomSize: 'small',
    width: { min: 180, max: 250 },
    height: { min: 150, max: 210 },
    clearance: 110,
  },
  room_medium: {
    id: 'room_medium',
    spaceType: 'room',
    roomSize: 'medium',
    width: { min: 250, max: 350 },
    height: { min: 190, max: 270 },
    clearance: 120,
  },
  room_large: {
    id: 'room_large',
    spaceType: 'room',
    roomSize: 'large',
    width: { min: 360, max: 480 },
    height: { min: 240, max: 340 },
    clearance: 130,
  },
  corridor_straight: {
    id: 'corridor_straight',
    spaceType: 'corridor',
    roomSize: null,
    width: { min: 180, max: 280 },
    height: { min: 110, max: 140 },
    clearance: 110,
    mayRotate: true,
  },
  corridor_corner: {
    id: 'corridor_corner',
    spaceType: 'junction',
    roomSize: null,
    width: { min: 76, max: 76 },
    height: { min: 76, max: 76 },
    clearance: 12,
  },
  checkpoint_junction: {
    id: 'checkpoint_junction',
    spaceType: 'junction',
    roomSize: null,
    width: { min: 190, max: 250 },
    height: { min: 160, max: 220 },
    clearance: 120,
    mayRotate: true,
  },
});

const FACILITY_SPACE_PROFILES = freezeMissionDefinition({
  reception_lobby: {
    id: 'reception_lobby', moduleId: 'room_large', role: 'reception_lobby',
    securityZone: 0, startingSpace: true, objectiveCompatible: false,
  },
  public_service_area: {
    id: 'public_service_area', moduleId: 'room_large', role: 'public_service',
    securityZone: 0, objectiveCompatible: false,
  },
  staff_office: {
    id: 'staff_office', moduleId: 'room_medium', role: 'staff_office',
    securityZone: 1, objectiveCompatible: false,
  },
  records_archive: {
    id: 'records_archive', moduleId: 'room_medium', role: 'records_archive',
    securityZone: 1, objectiveCompatible: true,
  },
  service_storage: {
    id: 'service_storage', moduleId: 'room_small', role: 'service_storage',
    securityZone: 1, objectiveCompatible: false,
  },
  secure_antechamber: {
    id: 'secure_antechamber', moduleId: 'room_small', role: 'secure_antechamber',
    securityZone: 2, objectiveCompatible: false,
  },
  secure_office: {
    id: 'secure_office', moduleId: 'room_medium', role: 'secure_office',
    securityZone: 2, objectiveCompatible: true,
  },
  meeting_room: {
    id: 'meeting_room', moduleId: 'room_medium', role: 'meeting_room',
    securityZone: 1, objectiveCompatible: false,
  },
  permit_office: {
    id: 'permit_office', moduleId: 'room_medium', role: 'permit_office',
    securityZone: 0, objectiveCompatible: false,
  },
  staff_break_room: {
    id: 'staff_break_room', moduleId: 'room_small', role: 'staff_break_room',
    securityZone: 1, objectiveCompatible: false,
  },
  restroom: {
    id: 'restroom', moduleId: 'room_small', role: 'restroom',
    securityZone: 0, objectiveCompatible: false,
  },
  utility_room: {
    id: 'utility_room', moduleId: 'room_small', role: 'utility_room',
    securityZone: 1, objectiveCompatible: false,
  },
});

const MOTIF_LIBRARY = freezeMissionDefinition({
  reception_checkpoint: {
    id: 'reception_checkpoint',
    requiredRoles: ['reception_lobby', 'checkpoint'],
    requiredAdjacencies: [['reception_lobby', 'checkpoint']],
  },
  office_cluster: {
    id: 'office_cluster',
    requiredRoles: ['staff_office', 'circulation'],
    requiredAdjacencies: [['staff_office', 'circulation']],
  },
  secure_antechamber: {
    id: 'secure_antechamber',
    requiredRoles: ['secure_antechamber', 'secure_office'],
    requiredAdjacencies: [['secure_antechamber', 'secure_office']],
  },
  storage_service_branch: {
    id: 'storage_service_branch',
    requiredRoles: ['service_storage', 'circulation'],
    requiredAdjacencies: [['service_storage', 'circulation']],
  },
  side_branch_corridor: {
    id: 'side_branch_corridor',
    requiredRoles: ['circulation'],
    requiredAdjacencies: [],
  },
  right_angle_bend: {
    id: 'right_angle_bend',
    requiredRoles: ['circulation'],
    requiredAdjacencies: [],
  },
  maintenance_loop: {
    id: 'maintenance_loop',
    requiredRoles: ['circulation'],
    requiredAdjacencies: [],
  },
});

const FACILITY_PROFILES = freezeMissionDefinition({
  tutorial_grid: {
    id: 'tutorial_grid',
    generationVersion: 1,
    generatorKind: 'seeded_grid',
    roomCount: { min: 9, max: 9 },
    roomSizeWeights: { small: 0, medium: 1, large: 0 },
    corridorStyle: 'aligned_grid',
    loopCount: { min: 2, max: 2 },
    deadEndCount: { min: 0, max: 4 },
    entranceCount: { min: 1, max: 1 },
    checkpointCount: { min: 0, max: 0 },
    securityZoneCount: 1,
    enemyCount: { min: 6, max: 6 },
    grid: DEFAULT_GENERATED_FACILITY_CONFIG,
  },
  local_government_office: {
    id: 'local_government_office',
    generationVersion: 2,
    generatorKind: 'irregular',
    roomCount: { min: 10, max: 16 },
    roomSizeWeights: { small: 0.45, medium: 0.40, large: 0.15 },
    corridorStyle: 'branching',
    loopCount: { min: 1, max: 3 },
    deadEndCount: { min: 1, max: 4 },
    entranceCount: { min: 1, max: 2 },
    checkpointCount: { min: 1, max: 2 },
    securityZoneCount: 3,
    enemyCount: { min: 7, max: 12 },
    mandatorySpaces: [
      { spaceProfileId: 'reception_lobby', count: { min: 1, max: 1 } },
      { spaceProfileId: 'public_service_area', count: { min: 1, max: 1 } },
      { spaceProfileId: 'staff_office', count: { min: 2, max: 4 }, selectionWeight: 3 },
      { spaceProfileId: 'records_archive', count: { min: 1, max: 1 } },
      { spaceProfileId: 'service_storage', count: { min: 1, max: 1 } },
      { spaceProfileId: 'secure_antechamber', count: { min: 1, max: 1 } },
      { spaceProfileId: 'secure_office', count: { min: 1, max: 1 } },
    ],
    optionalSpaces: [
      { spaceProfileId: 'meeting_room', count: { min: 0, max: 2 }, selectionWeight: 2 },
      { spaceProfileId: 'permit_office', count: { min: 0, max: 2 }, selectionWeight: 2 },
      { spaceProfileId: 'staff_break_room', count: { min: 0, max: 1 }, selectionWeight: 1 },
      { spaceProfileId: 'restroom', count: { min: 0, max: 2 }, selectionWeight: 2 },
      { spaceProfileId: 'utility_room', count: { min: 0, max: 1 }, selectionWeight: 1 },
    ],
    requiredMotifs: ['reception_checkpoint', 'office_cluster', 'secure_antechamber'],
    preferredMotifs: [
      { motifId: 'storage_service_branch', weight: 3 },
      { motifId: 'side_branch_corridor', weight: 3 },
      { motifId: 'right_angle_bend', weight: 2 },
      { motifId: 'maintenance_loop', weight: 1 },
    ],
    forbiddenMotifs: [],
  },
});

const FACILITY_RANGE_FIELDS = Object.freeze([
  'roomCount',
  'loopCount',
  'deadEndCount',
  'entranceCount',
  'checkpointCount',
  'enemyCount',
]);
const FACILITY_CORRIDOR_STYLES = Object.freeze(['aligned_grid', 'branching']);
const FACILITY_GENERATOR_KINDS = Object.freeze(['seeded_grid', 'irregular']);

function normalizeFacilityRange(range, fieldName) {
  const minimum = Number(range?.min);
  const maximum = Number(range?.max);
  if (!Number.isInteger(minimum) || !Number.isInteger(maximum) || minimum < 0 || maximum < minimum) {
    throw new Error(`Facility profile "${fieldName}" must be a non-negative integer range with min <= max.`);
  }
  return { min: minimum, max: maximum };
}

function normalizeRoomSizeWeights(weights) {
  const normalized = {};
  let total = 0;
  for (const size of ['small', 'medium', 'large']) {
    const value = Number(weights?.[size]);
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`Facility profile room-size weight "${size}" must be a non-negative number.`);
    }
    normalized[size] = value;
    total += value;
  }
  if (total <= 0) throw new Error('Facility profile room-size weights must contain a positive value.');
  for (const size of Object.keys(normalized)) normalized[size] /= total;
  return normalized;
}

function normalizeFacilitySpaceSelections(selections, fieldName) {
  if (!Array.isArray(selections)) {
    throw new Error(`Facility profile "${fieldName}" must be an array.`);
  }
  return selections.map(selection => {
    const spaceProfile = FACILITY_SPACE_PROFILES[selection.spaceProfileId];
    if (!spaceProfile) {
      throw new Error(`Facility profile references unknown space profile "${selection.spaceProfileId}".`);
    }
    if (!SPACE_MODULES[spaceProfile.moduleId]) {
      throw new Error(`Space profile "${spaceProfile.id}" references unknown module "${spaceProfile.moduleId}".`);
    }
    const selectionWeight = selection.selectionWeight === undefined
      ? 1
      : Number(selection.selectionWeight);
    if (!Number.isFinite(selectionWeight) || selectionWeight <= 0) {
      throw new Error(`Space profile selection "${spaceProfile.id}" must have a positive weight.`);
    }
    return {
      spaceProfileId: spaceProfile.id,
      count: normalizeFacilityRange(selection.count, `${fieldName}.${spaceProfile.id}.count`),
      selectionWeight,
    };
  });
}

function validateFacilityMotifIds(profile) {
  for (const motifId of profile.requiredMotifs) {
    if (!MOTIF_LIBRARY[motifId]) {
      throw new Error(`Facility profile "${profile.id}" references unknown required motif "${motifId}".`);
    }
  }
  for (const selection of profile.preferredMotifs) {
    if (!MOTIF_LIBRARY[selection.motifId]) {
      throw new Error(`Facility profile "${profile.id}" references unknown preferred motif "${selection.motifId}".`);
    }
    if (!Number.isFinite(selection.weight) || selection.weight <= 0) {
      throw new Error(`Preferred motif "${selection.motifId}" must have a positive weight.`);
    }
  }
  for (const motifId of profile.forbiddenMotifs) {
    if (!MOTIF_LIBRARY[motifId]) {
      throw new Error(`Facility profile "${profile.id}" references unknown forbidden motif "${motifId}".`);
    }
  }
}

function normalizeFacilityProfile(profileOrId) {
  const source = typeof profileOrId === 'string'
    ? FACILITY_PROFILES[profileOrId]
    : profileOrId;
  if (!source) throw new Error(`Unknown facility profile "${profileOrId}".`);
  if (!source.id || typeof source.id !== 'string') {
    throw new Error('Facility profile must have a stable string ID.');
  }
  if (!Number.isInteger(source.generationVersion) || source.generationVersion < 1) {
    throw new Error(`Facility profile "${source.id}" must have a positive integer generationVersion.`);
  }
  if (!FACILITY_GENERATOR_KINDS.includes(source.generatorKind)) {
    throw new Error(`Facility profile "${source.id}" has unsupported generator kind "${source.generatorKind}".`);
  }
  if (!FACILITY_CORRIDOR_STYLES.includes(source.corridorStyle)) {
    throw new Error(`Facility profile "${source.id}" has unsupported corridor style "${source.corridorStyle}".`);
  }
  if (!Number.isInteger(source.securityZoneCount) || source.securityZoneCount < 1) {
    throw new Error(`Facility profile "${source.id}" must have at least one security zone.`);
  }

  const normalized = {
    ...source,
    roomSizeWeights: normalizeRoomSizeWeights(source.roomSizeWeights),
    mandatorySpaces: normalizeFacilitySpaceSelections(source.mandatorySpaces ?? [], 'mandatorySpaces'),
    optionalSpaces: normalizeFacilitySpaceSelections(source.optionalSpaces ?? [], 'optionalSpaces'),
    requiredMotifs: [...(source.requiredMotifs ?? [])],
    preferredMotifs: (source.preferredMotifs ?? []).map(selection => ({
      motifId: selection.motifId,
      weight: Number(selection.weight),
    })),
    forbiddenMotifs: [...(source.forbiddenMotifs ?? [])],
  };
  for (const fieldName of FACILITY_RANGE_FIELDS) {
    normalized[fieldName] = normalizeFacilityRange(source[fieldName], fieldName);
  }
  validateFacilityMotifIds(normalized);
  if (normalized.generatorKind === 'irregular') {
    const minimumAuthoredRooms = normalized.mandatorySpaces
      .reduce((total, selection) => total + selection.count.min, 0);
    const maximumAuthoredRooms = [...normalized.mandatorySpaces, ...normalized.optionalSpaces]
      .reduce((total, selection) => total + selection.count.max, 0);
    if (minimumAuthoredRooms > normalized.roomCount.min ||
        maximumAuthoredRooms < normalized.roomCount.max) {
      throw new Error(`Facility profile "${normalized.id}" space selections cannot satisfy its room-count range.`);
    }
    const startingSpaceCount = normalized.mandatorySpaces
      .filter(selection => FACILITY_SPACE_PROFILES[selection.spaceProfileId].startingSpace)
      .reduce((total, selection) => total + selection.count.min, 0);
    if (startingSpaceCount !== 1) {
      throw new Error(`Facility profile "${normalized.id}" must author exactly one starting space.`);
    }
    if (!normalized.mandatorySpaces.some(selection =>
      FACILITY_SPACE_PROFILES[selection.spaceProfileId].objectiveCompatible)) {
      throw new Error(`Facility profile "${normalized.id}" needs an objective-compatible mandatory space.`);
    }
  }
  return freezeMissionDefinition(normalized);
}

const NORMALIZED_FACILITY_PROFILES = freezeMissionDefinition(Object.fromEntries(
  Object.keys(FACILITY_PROFILES).map(profileId => [
    profileId,
    normalizeFacilityProfile(profileId),
  ])
));

function clampMissionInteger(value, fallback, minimum, maximum) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(minimum, Math.min(maximum, Math.round(number)));
}

function normalizeGeneratedFacilityConfig(config = {}) {
  const profileId = config.profileId === undefined ? 'tutorial_grid' : String(config.profileId);
  const profile = NORMALIZED_FACILITY_PROFILES[profileId];
  if (!profile) throw new Error(`Unknown facility profile "${profileId}".`);
  if (profile.generatorKind !== 'seeded_grid') {
    throw new Error(`Facility profile "${profileId}" requires the irregular facility generator.`);
  }
  const grid = profile.grid;
  const rows = clampMissionInteger(config.rows, grid.rows, 2, 8);
  const columns = clampMissionInteger(config.columns, grid.columns, 2, 8);
  const roomCount = rows * columns;
  const maximumConnections = rows * (columns - 1) + (rows - 1) * columns;
  const roomWidth = Math.max(260, Number(config.roomWidth) || grid.roomWidth);
  const roomHeight = Math.max(180, Number(config.roomHeight) || grid.roomHeight);
  const wallThickness = Math.max(12, Number(config.wallThickness) || grid.wallThickness);
  return Object.freeze({
    profile,
    rows,
    columns,
    enemyCount: clampMissionInteger(
      config.enemyCount,
      grid.enemyCount,
      0,
      Math.max(0, (roomCount - 1) * 4)
    ),
    extraConnections: clampMissionInteger(
      config.extraConnections,
      grid.extraConnections,
      0,
      Math.max(0, maximumConnections - (roomCount - 1))
    ),
    roomWidth,
    roomHeight,
    wallThickness,
  });
}

function randomMissionInteger(random, range) {
  return range.min + Math.floor(random() * (range.max - range.min + 1));
}

function selectWeightedMissionItem(items, random, getWeight) {
  const totalWeight = items.reduce((total, item) => total + getWeight(item), 0);
  let roll = random() * totalWeight;
  for (const item of items) {
    roll -= getWeight(item);
    if (roll < 0) return item;
  }
  return items[items.length - 1];
}

function createAuthoredFacilityRoomNodes(profile, roomCount, random, addNode) {
  const selections = [...profile.mandatorySpaces, ...profile.optionalSpaces];
  const counts = new Map(selections.map(selection => [selection.spaceProfileId, 0]));
  for (const selection of selections) {
    counts.set(selection.spaceProfileId, selection.count.min);
  }
  let selectedCount = [...counts.values()].reduce((total, count) => total + count, 0);
  while (selectedCount < roomCount) {
    const candidates = selections.filter(selection =>
      counts.get(selection.spaceProfileId) < selection.count.max
    );
    if (candidates.length === 0) {
      throw new Error(`Facility profile "${profile.id}" cannot fill ${roomCount} authored rooms.`);
    }
    const selected = selectWeightedMissionItem(
      candidates,
      random,
      selection => selection.selectionWeight
    );
    counts.set(selected.spaceProfileId, counts.get(selected.spaceProfileId) + 1);
    selectedCount++;
  }

  const nodesBySpaceProfile = new Map();
  for (const selection of selections) {
    const count = counts.get(selection.spaceProfileId);
    if (count === 0) continue;
    const spaceProfile = FACILITY_SPACE_PROFILES[selection.spaceProfileId];
    const module = SPACE_MODULES[spaceProfile.moduleId];
    const instances = [];
    for (let index = 0; index < count; index++) {
      const node = addNode({
        id: count === 1
          ? `space_${spaceProfile.id}`
          : `space_${spaceProfile.id}_${index + 1}`,
        spaceProfileId: spaceProfile.id,
        moduleId: module.id,
        spaceType: module.spaceType,
        roomSize: module.roomSize,
        role: spaceProfile.role,
        securityZone: spaceProfile.securityZone,
        startingSpace: spaceProfile.startingSpace === true,
        objectiveCompatible: spaceProfile.objectiveCompatible === true,
      });
      instances.push(node);
    }
    nodesBySpaceProfile.set(spaceProfile.id, instances);
  }
  return nodesBySpaceProfile;
}

function generateIrregularFacilityTopology(seedInput, profileId = 'local_government_office') {
  const seed = String(seedInput);
  const profile = NORMALIZED_FACILITY_PROFILES[profileId];
  if (!profile) throw new Error(`Unknown facility profile "${profileId}".`);
  if (profile.generatorKind !== 'irregular') {
    throw new Error(`Facility profile "${profileId}" does not use irregular topology generation.`);
  }

  const random = createSeededMissionRandom(
    `${seed}:topology:${profile.id}:v${profile.generationVersion}`
  );
  const roomCount = randomMissionInteger(random, profile.roomCount);
  const checkpointCount = randomMissionInteger(random, profile.checkpointCount);
  const entranceCount = randomMissionInteger(random, profile.entranceCount);
  const enemyCount = randomMissionInteger(random, profile.enemyCount);
  const corridorCount = Math.max(2, Math.ceil(roomCount / 4));
  const nodes = [];

  function addNode(spec) {
    const node = {
      objectiveCompatible: false,
      startingSpace: false,
      minimumConnectors: spec.spaceType === 'room' ? 1 : 2,
      maximumConnectors: spec.spaceType === 'room' ? 3 : 4,
      ...spec,
    };
    nodes.push(node);
    return node;
  }

  const authoredRooms = createAuthoredFacilityRoomNodes(profile, roomCount, random, addNode);
  function getAuthoredRooms(spaceProfileId) {
    return authoredRooms.get(spaceProfileId) ?? [];
  }
  function getRequiredAuthoredRoom(spaceProfileId) {
    const room = getAuthoredRooms(spaceProfileId)[0];
    if (!room) throw new Error(`Facility profile "${profile.id}" requires "${spaceProfileId}".`);
    return room;
  }
  const entryNode = getRequiredAuthoredRoom('reception_lobby');
  const publicServiceNode = getRequiredAuthoredRoom('public_service_area');
  const recordsNode = getRequiredAuthoredRoom('records_archive');
  const secureAntechamberNode = getRequiredAuthoredRoom('secure_antechamber');
  const objectiveNode = getRequiredAuthoredRoom('secure_office');
  recordsNode.maximumConnectors = 1;
  secureAntechamberNode.maximumConnectors = 2;

  const corridorNodes = [];
  for (let index = 0; index < corridorCount; index++) {
    corridorNodes.push(addNode({
      id: `space_corridor_${index + 1}`,
      moduleId: 'corridor_straight',
      spaceType: 'corridor',
      roomSize: null,
      role: 'circulation',
      securityZone: Math.min(
        profile.securityZoneCount - 1,
        Math.floor(index * profile.securityZoneCount / corridorCount)
      ),
    }));
  }
  const checkpointNodes = [];
  for (let index = 0; index < checkpointCount; index++) {
    checkpointNodes.push(addNode({
      id: `space_checkpoint_${index + 1}`,
      moduleId: 'checkpoint_junction',
      spaceType: 'junction',
      roomSize: null,
      role: 'checkpoint',
      securityZone: Math.min(profile.securityZoneCount - 1, index + 1),
    }));
  }

  const backbone = [entryNode, checkpointNodes[0], publicServiceNode];
  for (let index = 0; index < corridorNodes.length; index++) {
    backbone.push(corridorNodes[index]);
    if (index === Math.floor(corridorNodes.length / 2) - 1 && checkpointNodes[1]) {
      backbone.push(checkpointNodes[1]);
    }
  }
  backbone.push(secureAntechamberNode, objectiveNode);

  const backboneIds = new Set(backbone.map(node => node.id));
  const officeBranch = [
    ...getAuthoredRooms('staff_office'),
    ...getAuthoredRooms('meeting_room'),
    ...getAuthoredRooms('permit_office'),
  ];
  const serviceBranch = [
    ...getAuthoredRooms('service_storage'),
    ...getAuthoredRooms('utility_room'),
    ...getAuthoredRooms('staff_break_room'),
    ...getAuthoredRooms('restroom'),
    recordsNode,
  ];
  const assignedBranchIds = new Set([...officeBranch, ...serviceBranch].map(node => node.id));
  const remainingBranchRooms = nodes.filter(node =>
    node.spaceType === 'room' &&
    !backboneIds.has(node.id) &&
    !assignedBranchIds.has(node.id)
  );
  const branchChains = [officeBranch, serviceBranch];
  if (remainingBranchRooms.length > 0) branchChains.push(remainingBranchRooms);

  const maximumDeadEnds = Math.min(profile.deadEndCount.max, roomCount - backbone.length + 3);
  const minimumDeadEnds = Math.max(
    profile.deadEndCount.min,
    Math.min(maximumDeadEnds, branchChains.length + 1)
  );
  const targetDeadEndCount = randomMissionInteger(random, {
    min: minimumDeadEnds,
    max: maximumDeadEnds,
  });
  const targetBranchCount = targetDeadEndCount - 1;
  while (branchChains.length < targetBranchCount) {
    const splittable = branchChains
      .map((chain, index) => ({ chain, index }))
      .filter(item => item.chain.length > 1)
      .sort((a, b) => b.chain.length - a.chain.length || a.index - b.index)[0];
    if (!splittable) break;
    branchChains.push([splittable.chain.pop()]);
  }

  const edges = [];
  const edgePairs = new Set();
  const degreeById = new Map(nodes.map(node => [node.id, 0]));
  const motifInstances = [];
  function addTopologyEdge(a, b, routeType) {
    const pair = [a.id, b.id].sort().join('|');
    if (edgePairs.has(pair)) return false;
    edgePairs.add(pair);
    degreeById.set(a.id, degreeById.get(a.id) + 1);
    degreeById.set(b.id, degreeById.get(b.id) + 1);
    edges.push({
      id: `topology_edge_${edges.length + 1}`,
      spaces: [a.id, b.id],
      routeType,
    });
    return true;
  }

  for (let index = 0; index < backbone.length - 1; index++) {
    addTopologyEdge(backbone[index], backbone[index + 1], 'main');
  }
  motifInstances.push(
    {
      id: 'motif_reception_checkpoint_1',
      motifId: 'reception_checkpoint',
      spaces: [entryNode.id, checkpointNodes[0].id],
    },
    {
      id: 'motif_secure_antechamber_1',
      motifId: 'secure_antechamber',
      spaces: [secureAntechamberNode.id, objectiveNode.id],
    }
  );

  const branchAttachments = [...corridorNodes, ...checkpointNodes];
  for (let branchIndex = 0; branchIndex < branchChains.length; branchIndex++) {
    const branch = branchChains[branchIndex];
    if (branch.length === 0) continue;
    const availableAttachments = branchAttachments.filter(node =>
      (branchIndex >= 2 || node.role === 'circulation') &&
      degreeById.get(node.id) < node.maximumConnectors
    );
    if (availableAttachments.length === 0) {
      throw new Error(`Facility profile "${profile.id}" has no connector capacity for a branch.`);
    }
    const attachment = availableAttachments[Math.floor(random() * availableAttachments.length)];
    addTopologyEdge(attachment, branch[0], 'branch');
    for (let index = 0; index < branch.length - 1; index++) {
      addTopologyEdge(branch[index], branch[index + 1], 'branch');
    }
    if (branchIndex === 0) {
      motifInstances.push({
        id: 'motif_office_cluster_1',
        motifId: 'office_cluster',
        spaces: [attachment.id, ...branch.map(node => node.id)],
      });
    } else if (branchIndex === 1) {
      motifInstances.push({
        id: 'motif_storage_service_branch_1',
        motifId: 'storage_service_branch',
        spaces: [attachment.id, ...branch.map(node => node.id)],
      });
    } else {
      motifInstances.push({
        id: `motif_side_branch_corridor_${branchIndex - 1}`,
        motifId: 'side_branch_corridor',
        spaces: [attachment.id, ...branch.map(node => node.id)],
      });
    }
  }

  const targetLoopCount = randomMissionInteger(random, profile.loopCount);
  const loopCandidates = shuffleMissionItems(nodes.filter(node =>
    node !== entryNode &&
    node !== objectiveNode &&
    degreeById.get(node.id) > 1
  ), random);
  const possibleLoopPairs = [];
  for (let aIndex = 0; aIndex < loopCandidates.length; aIndex++) {
    for (let bIndex = aIndex + 1; bIndex < loopCandidates.length; bIndex++) {
      possibleLoopPairs.push([loopCandidates[aIndex], loopCandidates[bIndex]]);
    }
  }
  let loopCount = 0;
  for (const [a, b] of shuffleMissionItems(possibleLoopPairs, random)) {
    if (loopCount >= targetLoopCount) break;
    if (degreeById.get(a.id) >= a.maximumConnectors ||
        degreeById.get(b.id) >= b.maximumConnectors) continue;
    if (addTopologyEdge(a, b, 'loop')) loopCount++;
  }
  if (loopCount !== targetLoopCount) {
    throw new Error(`Facility profile "${profile.id}" could not satisfy its loop count.`);
  }
  if (loopCount > 0) {
    motifInstances.push({
      id: 'motif_maintenance_loop_1',
      motifId: 'maintenance_loop',
      spaces: edges.filter(edge => edge.routeType === 'loop').flatMap(edge => edge.spaces),
    });
  }

  const deadEndCount = nodes.filter(node =>
    node !== entryNode && degreeById.get(node.id) === 1
  ).length;
  return freezeMissionDefinition({
    seed,
    profileId: profile.id,
    generationVersion: profile.generationVersion,
    nodes,
    edges,
    motifInstances,
    requiredRoute: backbone.map(node => node.id),
    metrics: {
      roomCount,
      corridorCount,
      checkpointCount,
      entranceCount,
      enemyCount,
      securityZoneCount: profile.securityZoneCount,
      loopCount,
      deadEndCount,
    },
  });
}

function placeIrregularFacilitySpaces(topology) {
  const profile = NORMALIZED_FACILITY_PROFILES[topology.profileId];
  if (!profile || profile.generatorKind !== 'irregular') {
    throw new Error(`Topology references unknown irregular profile "${topology.profileId}".`);
  }
  const random = createSeededMissionRandom(
    `${topology.seed}:placement:${profile.id}:v${profile.generationVersion}`
  );
  const nodesById = new Map(topology.nodes.map(node => [node.id, node]));
  const adjacency = new Map(topology.nodes.map(node => [node.id, []]));
  const routePriority = { main: 0, branch: 1, loop: 2 };
  for (const edge of topology.edges) {
    const [a, b] = edge.spaces;
    adjacency.get(a).push({ nodeId: b, routeType: edge.routeType });
    adjacency.get(b).push({ nodeId: a, routeType: edge.routeType });
  }
  for (const neighbors of adjacency.values()) {
    neighbors.sort((a, b) =>
      routePriority[a.routeType] - routePriority[b.routeType] ||
      a.nodeId.localeCompare(b.nodeId)
    );
  }

  function nodeSizePriority(node) {
    if (node.startingSpace) return 0;
    if (node.role === 'secure_office') return 1;
    if (node.roomSize === 'large') return 2;
    if (node.role === 'checkpoint') return 3;
    if (node.roomSize === 'medium') return 4;
    if (node.roomSize === 'small') return 5;
    return 6;
  }
  function randomModuleDimension(range) {
    const steps = Math.floor((range.max - range.min) / 10);
    return range.min + Math.floor(random() * (steps + 1)) * 10;
  }

  const dimensionsById = new Map();
  const dimensionOrder = [...topology.nodes].sort((a, b) =>
    nodeSizePriority(a) - nodeSizePriority(b) || a.id.localeCompare(b.id)
  );
  for (const node of dimensionOrder) {
    const module = SPACE_MODULES[node.moduleId];
    if (!module) throw new Error(`Topology space "${node.id}" has unknown module "${node.moduleId}".`);
    let w = randomModuleDimension(module.width);
    let h = randomModuleDimension(module.height);
    if (module.mayRotate && random() < 0.5) [w, h] = [h, w];
    dimensionsById.set(node.id, { w, h, clearance: module.clearance });
  }

  const startId = topology.requiredRoute[0];
  const placementOrder = [];
  const queued = new Set([startId]);
  const queue = [startId];
  while (queue.length > 0) {
    const nodeId = queue.shift();
    placementOrder.push(nodeId);
    for (const neighbor of adjacency.get(nodeId)) {
      if (queued.has(neighbor.nodeId)) continue;
      queued.add(neighbor.nodeId);
      queue.push(neighbor.nodeId);
    }
  }
  if (placementOrder.length !== topology.nodes.length) {
    throw new Error(`Topology "${topology.seed}" must be connected before placement.`);
  }

  const placed = new Map();
  const startDimensions = dimensionsById.get(startId);
  placed.set(startId, {
    x: -startDimensions.w / 2,
    y: -startDimensions.h / 2,
    ...startDimensions,
  });

  function rectanglesRespectClearance(candidate, other) {
    const clearance = Math.max(candidate.clearance, other.clearance);
    return candidate.x >= other.x + other.w + clearance ||
      candidate.x + candidate.w + clearance <= other.x ||
      candidate.y >= other.y + other.h + clearance ||
      candidate.y + candidate.h + clearance <= other.y;
  }
  function getPlacementBounds(candidate = null) {
    const rectangles = [...placed.values(), ...(candidate ? [candidate] : [])];
    return {
      minX: Math.min(...rectangles.map(rectangle => rectangle.x)),
      minY: Math.min(...rectangles.map(rectangle => rectangle.y)),
      maxX: Math.max(...rectangles.map(rectangle => rectangle.x + rectangle.w)),
      maxY: Math.max(...rectangles.map(rectangle => rectangle.y + rectangle.h)),
    };
  }

  for (const nodeId of placementOrder.slice(1)) {
    const dimensions = dimensionsById.get(nodeId);
    const connectedAnchors = adjacency.get(nodeId)
      .map(neighbor => placed.get(neighbor.nodeId))
      .filter(Boolean);
    const anchors = connectedAnchors.length > 0 ? connectedAnchors : [...placed.values()];
    const directions = shuffleMissionItems(['E', 'S', 'W', 'N'], random);
    const offsets = shuffleMissionItems([0, -0.35, 0.35, -0.7, 0.7], random);
    const nodeJitter = Math.round((random() - 0.5) * 70);
    let bestCandidate = null;
    let bestScore = Infinity;

    for (let ring = 0; ring < 32; ring++) {
      for (const anchor of anchors) {
        for (let directionIndex = 0; directionIndex < directions.length; directionIndex++) {
          const direction = directions[directionIndex];
          for (const offset of offsets) {
            const gap = Math.max(dimensions.clearance, anchor.clearance) + ring * 55;
            let x;
            let y;
            if (direction === 'E' || direction === 'W') {
              x = direction === 'E'
                ? anchor.x + anchor.w + gap
                : anchor.x - dimensions.w - gap;
              y = anchor.y + (anchor.h - dimensions.h) / 2 + offset * anchor.h + nodeJitter;
            } else {
              x = anchor.x + (anchor.w - dimensions.w) / 2 + offset * anchor.w + nodeJitter;
              y = direction === 'S'
                ? anchor.y + anchor.h + gap
                : anchor.y - dimensions.h - gap;
            }
            const candidate = { x: Math.round(x), y: Math.round(y), ...dimensions };
            if ([...placed.values()].some(other => !rectanglesRespectClearance(candidate, other))) {
              continue;
            }
            const connectedDistance = connectedAnchors.reduce((total, connected) => {
              const candidateCenterX = candidate.x + candidate.w / 2;
              const candidateCenterY = candidate.y + candidate.h / 2;
              const connectedCenterX = connected.x + connected.w / 2;
              const connectedCenterY = connected.y + connected.h / 2;
              return total + Math.hypot(
                candidateCenterX - connectedCenterX,
                candidateCenterY - connectedCenterY
              );
            }, 0);
            const bounds = getPlacementBounds(candidate);
            const area = (bounds.maxX - bounds.minX) * (bounds.maxY - bounds.minY);
            const score = connectedDistance + area * 0.0008 + ring * 80 + directionIndex * 4;
            if (score < bestScore) {
              bestScore = score;
              bestCandidate = candidate;
            }
          }
        }
      }
      if (bestCandidate) break;
    }
    if (!bestCandidate) {
      throw new Error(`Could not place irregular space "${nodeId}" without overlap.`);
    }
    placed.set(nodeId, bestCandidate);
  }

  const rawBounds = getPlacementBounds();
  const margin = 140;
  const translateX = margin - rawBounds.minX;
  const translateY = margin - rawBounds.minY;
  const spaces = topology.nodes.map(node => {
    const rectangle = placed.get(node.id);
    const interior = {
      x: rectangle.x + translateX,
      y: rectangle.y + translateY,
      w: rectangle.w,
      h: rectangle.h,
    };
    return {
      ...node,
      center: {
        x: interior.x + interior.w / 2,
        y: interior.y + interior.h / 2,
      },
      interior,
      bounds: { ...interior },
      placementClearance: rectangle.clearance,
    };
  });
  const designWidth = Math.ceil(rawBounds.maxX - rawBounds.minX + margin * 2);
  const designHeight = Math.ceil(rawBounds.maxY - rawBounds.minY + margin * 2);
  const uniqueCenterX = new Set(spaces.map(space => Math.round(space.center.x / 10))).size;
  const uniqueCenterY = new Set(spaces.map(space => Math.round(space.center.y / 10))).size;
  return freezeMissionDefinition({
    seed: topology.seed,
    profileId: topology.profileId,
    generationVersion: topology.generationVersion,
    world: { designWidth, designHeight },
    spaces,
    metrics: {
      uniqueCenterX,
      uniqueCenterY,
      footprintArea: designWidth * designHeight,
    },
  });
}

function simplifyOrthogonalMissionPath(points) {
  const simplified = [];
  for (const point of points) {
    const previous = simplified[simplified.length - 1];
    if (previous && previous.x === point.x && previous.y === point.y) continue;
    simplified.push({ x: point.x, y: point.y });
    while (simplified.length >= 3) {
      const a = simplified[simplified.length - 3];
      const b = simplified[simplified.length - 2];
      const c = simplified[simplified.length - 1];
      if ((a.x === b.x && b.x === c.x) || (a.y === b.y && b.y === c.y)) {
        simplified.splice(simplified.length - 2, 1);
      } else {
        break;
      }
    }
  }
  return simplified;
}

function missionPointInsideRectangle(point, rectangle) {
  return point.x > rectangle.x && point.x < rectangle.x + rectangle.w &&
    point.y > rectangle.y && point.y < rectangle.y + rectangle.h;
}

function missionOrthogonalSegmentBlocked(a, b, obstacles) {
  if (a.x !== b.x && a.y !== b.y) return true;
  if (a.x === b.x) {
    const minY = Math.min(a.y, b.y);
    const maxY = Math.max(a.y, b.y);
    return obstacles.some(obstacle =>
      a.x > obstacle.x && a.x < obstacle.x + obstacle.w &&
      maxY > obstacle.y && minY < obstacle.y + obstacle.h
    );
  }
  const minX = Math.min(a.x, b.x);
  const maxX = Math.max(a.x, b.x);
  return obstacles.some(obstacle =>
    a.y > obstacle.y && a.y < obstacle.y + obstacle.h &&
    maxX > obstacle.x && minX < obstacle.x + obstacle.w
  );
}

function findOrthogonalMissionPath(start, goal, obstacles, world, boundaryMargin) {
  const directCandidates = [];
  if (start.x === goal.x || start.y === goal.y) directCandidates.push([start, goal]);
  directCandidates.push(
    [start, { x: goal.x, y: start.y }, goal],
    [start, { x: start.x, y: goal.y }, goal]
  );
  const clearDirectCandidates = directCandidates
    .map(simplifyOrthogonalMissionPath)
    .filter(points => points.every((point, index) =>
      index === 0 || !missionOrthogonalSegmentBlocked(points[index - 1], point, obstacles)
    ))
    .sort((a, b) => {
      function pathLength(points) {
        let length = 0;
        for (let index = 1; index < points.length; index++) {
          length += Math.abs(points[index].x - points[index - 1].x) +
            Math.abs(points[index].y - points[index - 1].y);
        }
        return length;
      }
      return a.length - b.length || pathLength(a) - pathLength(b);
    });
  if (clearDirectCandidates.length > 0) return clearDirectCandidates[0];

  const xCoordinates = new Set([start.x, goal.x, boundaryMargin, world.designWidth - boundaryMargin]);
  const yCoordinates = new Set([start.y, goal.y, boundaryMargin, world.designHeight - boundaryMargin]);
  for (const obstacle of obstacles) {
    xCoordinates.add(obstacle.x);
    xCoordinates.add(obstacle.x + obstacle.w);
    yCoordinates.add(obstacle.y);
    yCoordinates.add(obstacle.y + obstacle.h);
  }
  const xs = [...xCoordinates]
    .filter(value => value >= boundaryMargin && value <= world.designWidth - boundaryMargin)
    .sort((a, b) => a - b);
  const ys = [...yCoordinates]
    .filter(value => value >= boundaryMargin && value <= world.designHeight - boundaryMargin)
    .sort((a, b) => a - b);
  const startX = xs.indexOf(start.x);
  const startY = ys.indexOf(start.y);
  const goalX = xs.indexOf(goal.x);
  const goalY = ys.indexOf(goal.y);
  if (startX < 0 || startY < 0 || goalX < 0 || goalY < 0) {
    throw new Error('Orthogonal route endpoints must remain inside the routing boundary.');
  }

  const heap = [];
  function heapPush(item) {
    heap.push(item);
    let index = heap.length - 1;
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (heap[parent].priority <= item.priority) break;
      heap[index] = heap[parent];
      index = parent;
    }
    heap[index] = item;
  }
  function heapPop() {
    const first = heap[0];
    const last = heap.pop();
    if (heap.length === 0) return first;
    let index = 0;
    while (true) {
      const left = index * 2 + 1;
      const right = left + 1;
      if (left >= heap.length) break;
      const child = right < heap.length && heap[right].priority < heap[left].priority
        ? right
        : left;
      if (heap[child].priority >= last.priority) break;
      heap[index] = heap[child];
      index = child;
    }
    heap[index] = last;
    return first;
  }

  function stateKey(xIndex, yIndex, direction) {
    return `${xIndex}:${yIndex}:${direction}`;
  }
  const startKey = stateKey(startX, startY, 'start');
  const bestCost = new Map([[startKey, 0]]);
  const previous = new Map();
  heapPush({ xIndex: startX, yIndex: startY, direction: 'start', cost: 0, priority: 0 });
  let goalState = null;
  const neighborOffsets = [
    { x: -1, y: 0, direction: 'horizontal' },
    { x: 1, y: 0, direction: 'horizontal' },
    { x: 0, y: -1, direction: 'vertical' },
    { x: 0, y: 1, direction: 'vertical' },
  ];
  while (heap.length > 0) {
    const current = heapPop();
    const currentKey = stateKey(current.xIndex, current.yIndex, current.direction);
    if (current.cost !== bestCost.get(currentKey)) continue;
    if (current.xIndex === goalX && current.yIndex === goalY) {
      goalState = current;
      break;
    }
    const currentPoint = { x: xs[current.xIndex], y: ys[current.yIndex] };
    for (const offset of neighborOffsets) {
      const xIndex = current.xIndex + offset.x;
      const yIndex = current.yIndex + offset.y;
      if (xIndex < 0 || yIndex < 0 || xIndex >= xs.length || yIndex >= ys.length) continue;
      const point = { x: xs[xIndex], y: ys[yIndex] };
      if (obstacles.some(obstacle => missionPointInsideRectangle(point, obstacle))) continue;
      if (missionOrthogonalSegmentBlocked(currentPoint, point, obstacles)) continue;
      const distance = Math.abs(point.x - currentPoint.x) + Math.abs(point.y - currentPoint.y);
      const turnCost = current.direction !== 'start' && current.direction !== offset.direction ? 90 : 0;
      const cost = current.cost + distance + turnCost;
      const key = stateKey(xIndex, yIndex, offset.direction);
      if (cost >= (bestCost.get(key) ?? Infinity)) continue;
      bestCost.set(key, cost);
      previous.set(key, currentKey);
      const heuristic = Math.abs(goal.x - point.x) + Math.abs(goal.y - point.y);
      heapPush({
        xIndex,
        yIndex,
        direction: offset.direction,
        cost,
        priority: cost + heuristic,
      });
    }
  }
  if (!goalState) throw new Error('No orthogonal path exists between the selected connector sockets.');

  const path = [];
  let key = stateKey(goalState.xIndex, goalState.yIndex, goalState.direction);
  while (key) {
    const [xIndex, yIndex] = key.split(':').map(Number);
    path.push({ x: xs[xIndex], y: ys[yIndex] });
    key = previous.get(key);
  }
  path.reverse();
  return simplifyOrthogonalMissionPath(path);
}

function routeIrregularFacilityConnections(topology, placement) {
  if (topology.seed !== placement.seed || topology.profileId !== placement.profileId) {
    throw new Error('Irregular topology and placement must belong to the same seed and profile.');
  }
  const corridorWidth = 76;
  const corridorHalfWidth = corridorWidth / 2;
  const obstacleMargin = corridorHalfWidth + 12;
  const boundaryMargin = corridorHalfWidth + 12;
  const spacesById = new Map(placement.spaces.map(space => [space.id, space]));
  const endpointAssignments = new Map(topology.edges.map(edge => [edge.id, {}]));
  const incidentBySpaceAndSide = new Map();

  function preferredSocketSide(space, neighbor) {
    const dx = neighbor.center.x - space.center.x;
    const dy = neighbor.center.y - space.center.y;
    if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 'E' : 'W';
    return dy >= 0 ? 'S' : 'N';
  }
  for (const edge of topology.edges) {
    const [aId, bId] = edge.spaces;
    const a = spacesById.get(aId);
    const b = spacesById.get(bId);
    for (const [space, neighbor] of [[a, b], [b, a]]) {
      const side = preferredSocketSide(space, neighbor);
      const key = `${space.id}:${side}`;
      if (!incidentBySpaceAndSide.has(key)) incidentBySpaceAndSide.set(key, []);
      incidentBySpaceAndSide.get(key).push({ edgeId: edge.id, space, neighbor, side });
    }
  }
  for (const incidents of incidentBySpaceAndSide.values()) {
    const side = incidents[0].side;
    incidents.sort((a, b) => {
      const aCoordinate = side === 'N' || side === 'S' ? a.neighbor.center.x : a.neighbor.center.y;
      const bCoordinate = side === 'N' || side === 'S' ? b.neighbor.center.x : b.neighbor.center.y;
      return aCoordinate - bCoordinate || a.edgeId.localeCompare(b.edgeId);
    });
    for (let index = 0; index < incidents.length; index++) {
      const incident = incidents[index];
      const fraction = (index + 1) / (incidents.length + 1);
      let point;
      let normal;
      if (side === 'N' || side === 'S') {
        point = {
          x: Math.round(incident.space.interior.x + incident.space.interior.w * fraction),
          y: side === 'N'
            ? incident.space.interior.y
            : incident.space.interior.y + incident.space.interior.h,
        };
        normal = { x: 0, y: side === 'N' ? -1 : 1 };
      } else {
        point = {
          x: side === 'W'
            ? incident.space.interior.x
            : incident.space.interior.x + incident.space.interior.w,
          y: Math.round(incident.space.interior.y + incident.space.interior.h * fraction),
        };
        normal = { x: side === 'W' ? -1 : 1, y: 0 };
      }
      endpointAssignments.get(incident.edgeId)[incident.space.id] = {
        side,
        point,
        normal,
        incidentCount: incidents.length,
      };
    }
  }
  for (const edge of topology.edges) {
    const [aId, bId] = edge.spaces;
    const aSpace = spacesById.get(aId);
    const bSpace = spacesById.get(bId);
    const aEndpoint = endpointAssignments.get(edge.id)[aId];
    const bEndpoint = endpointAssignments.get(edge.id)[bId];
    if (aEndpoint.incidentCount !== 1 || bEndpoint.incidentCount !== 1) continue;
    const horizontalFacing = (aEndpoint.side === 'E' && bEndpoint.side === 'W') ||
      (aEndpoint.side === 'W' && bEndpoint.side === 'E');
    const verticalFacing = (aEndpoint.side === 'N' && bEndpoint.side === 'S') ||
      (aEndpoint.side === 'S' && bEndpoint.side === 'N');
    if (horizontalFacing) {
      const start = Math.max(aSpace.interior.y, bSpace.interior.y) + corridorHalfWidth;
      const end = Math.min(
        aSpace.interior.y + aSpace.interior.h,
        bSpace.interior.y + bSpace.interior.h
      ) - corridorHalfWidth;
      if (end >= start) {
        const y = Math.round((start + end) / 2);
        aEndpoint.point.y = y;
        bEndpoint.point.y = y;
      }
    } else if (verticalFacing) {
      const start = Math.max(aSpace.interior.x, bSpace.interior.x) + corridorHalfWidth;
      const end = Math.min(
        aSpace.interior.x + aSpace.interior.w,
        bSpace.interior.x + bSpace.interior.w
      ) - corridorHalfWidth;
      if (end >= start) {
        const x = Math.round((start + end) / 2);
        aEndpoint.point.x = x;
        bEndpoint.point.x = x;
      }
    }
  }

  const obstacles = placement.spaces.map(space => ({
    id: space.id,
    x: space.interior.x - obstacleMargin,
    y: space.interior.y - obstacleMargin,
    w: space.interior.w + obstacleMargin * 2,
    h: space.interior.h + obstacleMargin * 2,
  }));
  const routes = [];
  for (const edge of topology.edges) {
    const [aId, bId] = edge.spaces;
    const aEndpoint = endpointAssignments.get(edge.id)[aId];
    const bEndpoint = endpointAssignments.get(edge.id)[bId];
    const aOutside = {
      x: aEndpoint.point.x + aEndpoint.normal.x * (obstacleMargin + 4),
      y: aEndpoint.point.y + aEndpoint.normal.y * (obstacleMargin + 4),
    };
    const bOutside = {
      x: bEndpoint.point.x + bEndpoint.normal.x * (obstacleMargin + 4),
      y: bEndpoint.point.y + bEndpoint.normal.y * (obstacleMargin + 4),
    };
    const routedMiddle = findOrthogonalMissionPath(
      aOutside,
      bOutside,
      obstacles,
      placement.world,
      boundaryMargin
    );
    const points = simplifyOrthogonalMissionPath([
      aEndpoint.point,
      aOutside,
      ...routedMiddle,
      bOutside,
      bEndpoint.point,
    ]);
    routes.push({
      id: `route_${edge.id}`,
      topologyEdgeId: edge.id,
      topologySpaces: [...edge.spaces],
      routeType: edge.routeType,
      sockets: [
        { spaceId: aId, side: aEndpoint.side, position: { ...aEndpoint.point } },
        { spaceId: bId, side: bEndpoint.side, position: { ...bEndpoint.point } },
      ],
      points,
      bendCount: Math.max(0, points.length - 2),
    });
  }

  const routeSpaces = [];
  const routeSegments = [];
  const junctionCandidates = new Map();
  function addJunctionCandidate(point, edgeId, kind) {
    const key = `${Math.round(point.x)}:${Math.round(point.y)}`;
    if (!junctionCandidates.has(key)) {
      junctionCandidates.set(key, { position: { x: point.x, y: point.y }, edgeIds: new Set(), kinds: new Set() });
    }
    const candidate = junctionCandidates.get(key);
    candidate.edgeIds.add(edgeId);
    candidate.kinds.add(kind);
  }
  for (const route of routes) {
    for (let index = 1; index < route.points.length; index++) {
      const a = route.points[index - 1];
      const b = route.points[index];
      const horizontal = a.y === b.y;
      const length = horizontal ? Math.abs(b.x - a.x) : Math.abs(b.y - a.y);
      if (length <= 0) continue;
      const interior = horizontal
        ? {
          x: Math.min(a.x, b.x), y: a.y - corridorHalfWidth,
          w: length, h: corridorWidth,
        }
        : {
          x: a.x - corridorHalfWidth, y: Math.min(a.y, b.y),
          w: corridorWidth, h: length,
        };
      const segment = {
        id: `${route.id}_segment_${index}`,
        spaceId: `space_${route.id}_segment_${index}`,
        segmentIndex: index,
        routeId: route.id,
        topologyEdgeId: route.topologyEdgeId,
        orientation: horizontal ? 'horizontal' : 'vertical',
        a: { ...a },
        b: { ...b },
        interior,
      };
      routeSegments.push(segment);
      routeSpaces.push({
        id: segment.spaceId,
        moduleId: 'corridor_straight',
        spaceType: 'corridor',
        roomSize: null,
        role: 'routed_corridor',
        sourceRouteId: route.id,
        center: { x: interior.x + interior.w / 2, y: interior.y + interior.h / 2 },
        interior: { ...interior },
        bounds: { ...interior },
      });
    }
    for (let index = 1; index < route.points.length - 1; index++) {
      const previous = route.points[index - 1];
      const point = route.points[index];
      const next = route.points[index + 1];
      if ((previous.x === point.x) !== (point.x === next.x)) {
        addJunctionCandidate(point, route.topologyEdgeId, 'bend');
      }
    }
  }

  function segmentIntersection(a, b) {
    if (a.orientation !== b.orientation) {
      const horizontal = a.orientation === 'horizontal' ? a : b;
      const vertical = a.orientation === 'vertical' ? a : b;
      const minX = Math.min(horizontal.a.x, horizontal.b.x);
      const maxX = Math.max(horizontal.a.x, horizontal.b.x);
      const minY = Math.min(vertical.a.y, vertical.b.y);
      const maxY = Math.max(vertical.a.y, vertical.b.y);
      if (vertical.a.x >= minX && vertical.a.x <= maxX &&
          horizontal.a.y >= minY && horizontal.a.y <= maxY) {
        return { x: vertical.a.x, y: horizontal.a.y };
      }
      return null;
    }
    if (a.orientation === 'horizontal' && a.a.y === b.a.y) {
      const start = Math.max(Math.min(a.a.x, a.b.x), Math.min(b.a.x, b.b.x));
      const end = Math.min(Math.max(a.a.x, a.b.x), Math.max(b.a.x, b.b.x));
      return end > start ? { x: (start + end) / 2, y: a.a.y } : null;
    }
    if (a.orientation === 'vertical' && a.a.x === b.a.x) {
      const start = Math.max(Math.min(a.a.y, a.b.y), Math.min(b.a.y, b.b.y));
      const end = Math.min(Math.max(a.a.y, a.b.y), Math.max(b.a.y, b.b.y));
      return end > start ? { x: a.a.x, y: (start + end) / 2 } : null;
    }
    return null;
  }
  for (let aIndex = 0; aIndex < routeSegments.length; aIndex++) {
    const a = routeSegments[aIndex];
    for (let bIndex = aIndex + 1; bIndex < routeSegments.length; bIndex++) {
      const b = routeSegments[bIndex];
      if (a.topologyEdgeId === b.topologyEdgeId) continue;
      const intersection = segmentIntersection(a, b);
      if (!intersection) continue;
      if (placement.spaces.some(space => missionPointInsideRectangle(intersection, space.interior))) continue;
      addJunctionCandidate(intersection, a.topologyEdgeId, 'shared');
      addJunctionCandidate(intersection, b.topologyEdgeId, 'shared');
    }
  }

  const junctions = [...junctionCandidates.values()]
    .sort((a, b) => a.position.y - b.position.y || a.position.x - b.position.x)
    .map((candidate, index) => {
      const interior = {
        x: candidate.position.x - corridorHalfWidth,
        y: candidate.position.y - corridorHalfWidth,
        w: corridorWidth,
        h: corridorWidth,
      };
      const junction = {
        id: `route_junction_${index + 1}`,
        moduleId: 'corridor_corner',
        spaceType: 'junction',
        junctionType: candidate.edgeIds.size > 1 ? 'shared' : 'bend',
        topologyEdgeIds: [...candidate.edgeIds].sort(),
        position: { ...candidate.position },
        interior,
      };
      routeSpaces.push({
        ...junction,
        role: 'route_junction',
        center: { ...candidate.position },
        bounds: { ...interior },
      });
      return junction;
    });

  return freezeMissionDefinition({
    seed: topology.seed,
    profileId: topology.profileId,
    generationVersion: topology.generationVersion,
    corridorWidth,
    routes,
    routeSegments,
    routeSpaces,
    junctions,
    metrics: {
      routeCount: routes.length,
      straightRouteCount: routes.filter(route => route.bendCount === 0).length,
      bentRouteCount: routes.filter(route => route.bendCount > 0).length,
      segmentCount: routeSegments.length,
      junctionCount: junctions.length,
    },
  });
}

function createIrregularUnionWalls(spaces, wallThickness) {
  const xs = [...new Set(spaces.flatMap(space => [
    space.interior.x,
    space.interior.x + space.interior.w,
  ]))].sort((a, b) => a - b);
  const ys = [...new Set(spaces.flatMap(space => [
    space.interior.y,
    space.interior.y + space.interior.h,
  ]))].sort((a, b) => a - b);
  const columnCount = xs.length - 1;
  const rowCount = ys.length - 1;
  const occupied = Array.from({ length: rowCount }, (_, row) =>
    Array.from({ length: columnCount }, (_, column) => {
      const point = {
        x: (xs[column] + xs[column + 1]) / 2,
        y: (ys[row] + ys[row + 1]) / 2,
      };
      return spaces.some(space => missionPointInsideRectangle(point, space.interior));
    })
  );
  const boundaries = [];

  for (let xIndex = 0; xIndex < xs.length; xIndex++) {
    let startY = null;
    for (let row = 0; row < rowCount; row++) {
      const leftOccupied = xIndex > 0 ? occupied[row][xIndex - 1] : false;
      const rightOccupied = xIndex < columnCount ? occupied[row][xIndex] : false;
      const boundary = leftOccupied !== rightOccupied;
      if (boundary && startY === null) startY = ys[row];
      if (startY !== null && (!boundary || row === rowCount - 1)) {
        const endY = boundary && row === rowCount - 1 ? ys[row + 1] : ys[row];
        boundaries.push({ orientation: 'vertical', coordinate: xs[xIndex], start: startY, end: endY });
        startY = null;
      }
    }
  }
  for (let yIndex = 0; yIndex < ys.length; yIndex++) {
    let startX = null;
    for (let column = 0; column < columnCount; column++) {
      const topOccupied = yIndex > 0 ? occupied[yIndex - 1][column] : false;
      const bottomOccupied = yIndex < rowCount ? occupied[yIndex][column] : false;
      const boundary = topOccupied !== bottomOccupied;
      if (boundary && startX === null) startX = xs[column];
      if (startX !== null && (!boundary || column === columnCount - 1)) {
        const endX = boundary && column === columnCount - 1 ? xs[column + 1] : xs[column];
        boundaries.push({ orientation: 'horizontal', coordinate: ys[yIndex], start: startX, end: endX });
        startX = null;
      }
    }
  }

  boundaries.sort((a, b) =>
    a.orientation.localeCompare(b.orientation) ||
    a.coordinate - b.coordinate ||
    a.start - b.start
  );
  return boundaries.map((boundary, index) => boundary.orientation === 'vertical'
    ? {
      id: `irregular_wall_${index + 1}`,
      orientation: boundary.orientation,
      x: boundary.coordinate - wallThickness / 2,
      y: boundary.start,
      w: wallThickness,
      h: boundary.end - boundary.start,
    }
    : {
      id: `irregular_wall_${index + 1}`,
      orientation: boundary.orientation,
      x: boundary.start,
      y: boundary.coordinate - wallThickness / 2,
      w: boundary.end - boundary.start,
      h: wallThickness,
    }
  );
}

function getIrregularExteriorWallCandidates(space, walls, wallThickness, minimumLength) {
  const candidates = [];
  const boundaries = {
    N: space.interior.y,
    S: space.interior.y + space.interior.h,
    W: space.interior.x,
    E: space.interior.x + space.interior.w,
  };
  for (const wall of walls) {
    const coordinate = wall.orientation === 'horizontal'
      ? wall.y + wallThickness / 2
      : wall.x + wallThickness / 2;
    let side = null;
    if (wall.orientation === 'horizontal') {
      if (coordinate === boundaries.N) side = 'N';
      else if (coordinate === boundaries.S) side = 'S';
    } else {
      if (coordinate === boundaries.W) side = 'W';
      else if (coordinate === boundaries.E) side = 'E';
    }
    if (!side) continue;
    const roomStart = side === 'N' || side === 'S' ? space.interior.x : space.interior.y;
    const roomEnd = roomStart + (side === 'N' || side === 'S' ? space.interior.w : space.interior.h);
    const wallStart = side === 'N' || side === 'S' ? wall.x : wall.y;
    const wallEnd = wallStart + (side === 'N' || side === 'S' ? wall.w : wall.h);
    const start = Math.max(roomStart + wallThickness, wallStart);
    const end = Math.min(roomEnd - wallThickness, wallEnd);
    if (end - start < minimumLength) continue;
    candidates.push({
      spaceId: space.id,
      wallId: wall.id,
      side,
      orientation: wall.orientation,
      coordinate,
      start,
      end,
      length: end - start,
    });
  }
  return candidates;
}

function splitIrregularWallsForOpenings(walls, openings, wallThickness) {
  const splitWalls = [];
  for (const wall of walls) {
    const coordinate = wall.orientation === 'horizontal'
      ? wall.y + wallThickness / 2
      : wall.x + wallThickness / 2;
    const wallStart = wall.orientation === 'horizontal' ? wall.x : wall.y;
    const wallEnd = wallStart + (wall.orientation === 'horizontal' ? wall.w : wall.h);
    const matchingOpenings = openings
      .filter(opening => opening.orientation === wall.orientation && opening.coordinate === coordinate)
      .map(opening => ({
        start: opening.center - opening.length / 2,
        end: opening.center + opening.length / 2,
      }))
      .filter(opening => opening.end > wallStart && opening.start < wallEnd)
      .sort((a, b) => a.start - b.start);
    let cursor = wallStart;
    for (const opening of matchingOpenings) {
      const openingStart = Math.max(wallStart, opening.start);
      const openingEnd = Math.min(wallEnd, opening.end);
      if (openingStart > cursor) {
        splitWalls.push({ ...wall, start: cursor, end: openingStart });
      }
      cursor = Math.max(cursor, openingEnd);
    }
    if (cursor < wallEnd) splitWalls.push({ ...wall, start: cursor, end: wallEnd });
  }
  splitWalls.sort((a, b) =>
    a.orientation.localeCompare(b.orientation) ||
    (a.orientation === 'horizontal' ? a.y - b.y || a.start - b.start : a.x - b.x || a.start - b.start)
  );
  return splitWalls.map((wall, index) => wall.orientation === 'horizontal'
    ? {
      id: `irregular_wall_${index + 1}`,
      orientation: wall.orientation,
      x: wall.start,
      y: wall.y,
      w: wall.end - wall.start,
      h: wall.h,
    }
    : {
      id: `irregular_wall_${index + 1}`,
      orientation: wall.orientation,
      x: wall.x,
      y: wall.start,
      w: wall.w,
      h: wall.end - wall.start,
    }
  );
}

function compileIrregularFacilityStructure(topology, placement, routing) {
  if (topology.seed !== placement.seed || topology.seed !== routing.seed ||
      topology.profileId !== placement.profileId || topology.profileId !== routing.profileId) {
    throw new Error('Irregular topology, placement, and routing must share one seed and profile.');
  }
  const wallThickness = 18;
  const spaces = [...placement.spaces, ...routing.routeSpaces];
  const spacesById = new Map(spaces.map(space => [space.id, space]));
  let walls = createIrregularUnionWalls(spaces, wallThickness);
  const connectors = [];
  const doors = [];
  const windows = [];
  const wallGapExits = [];
  const lightingApertures = [];

  function cardinalDirectionsBetween(a, b) {
    const dx = b.center.x - a.center.x;
    const dy = b.center.y - a.center.y;
    if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? ['E', 'W'] : ['W', 'E'];
    return dy >= 0 ? ['S', 'N'] : ['N', 'S'];
  }
  function addCompiledConnector(id, kind, roomIds, position, doorSpec = null) {
    if (connectors.some(connector => connector.id === id)) return;
    const a = spacesById.get(roomIds[0]);
    const b = spacesById.get(roomIds[1]);
    const directions = cardinalDirectionsBetween(a, b);
    const apertureIds = [`${id}_a`, `${id}_b`];
    const connector = {
      id,
      kind,
      rooms: [...roomIds],
      position: { ...position },
      navNodeId: `gap_${id}`,
      apertureIds,
    };
    if (doorSpec) connector.doorId = id;
    connectors.push(connector);
    if (doorSpec) {
      const vertical = doorSpec.side === 'E' || doorSpec.side === 'W';
      const length = routing.corridorWidth - wallThickness;
      doors.push({
        id,
        connectorId: id,
        x: vertical ? position.x - 3 : position.x - length / 2,
        y: vertical ? position.y - length / 2 : position.y - 3,
        w: vertical ? 6 : length,
        h: vertical ? length : 6,
        orientation: vertical ? 'vertical' : 'horizontal',
        material: doorSpec.material,
        defaultState: 'closed',
      });
    }
    for (let index = 0; index < 2; index++) {
      lightingApertures.push({
        id: apertureIds[index],
        connectorId: id,
        kind,
        x: position.x,
        y: position.y,
        direction: directions[index],
        width: routing.corridorWidth,
        range: 320,
        intensity: 0.62,
        falloffPower: 0.7,
        spreadRadians: 1.1,
        open: kind === 'opening',
      });
    }
  }

  const segmentsByRoute = new Map();
  for (const segment of routing.routeSegments) {
    if (!segmentsByRoute.has(segment.routeId)) segmentsByRoute.set(segment.routeId, []);
    segmentsByRoute.get(segment.routeId).push(segment);
  }
  for (const segments of segmentsByRoute.values()) {
    segments.sort((a, b) => a.segmentIndex - b.segmentIndex);
  }
  for (const route of routing.routes) {
    const segments = segmentsByRoute.get(route.id);
    const endpointSegments = [segments[0], segments[segments.length - 1]];
    for (let index = 0; index < route.sockets.length; index++) {
      const socket = route.sockets[index];
      const endpointSpace = spacesById.get(socket.spaceId);
      const segment = endpointSegments[index];
      const kind = endpointSpace.spaceType === 'room' ? 'door' : 'opening';
      addCompiledConnector(
        `connector_${route.topologyEdgeId}_${socket.spaceId}`,
        kind,
        index === 0
          ? [socket.spaceId, segment.spaceId]
          : [segment.spaceId, socket.spaceId],
        socket.position,
        kind === 'door'
          ? {
            side: socket.side,
            material: endpointSpace.securityZone >= 2 ? 'metal' : 'wood',
          }
          : null
      );
    }
  }

  function segmentContainsPoint(segment, point) {
    if (segment.orientation === 'horizontal') {
      return point.y === segment.a.y &&
        point.x >= Math.min(segment.a.x, segment.b.x) &&
        point.x <= Math.max(segment.a.x, segment.b.x);
    }
    return point.x === segment.a.x &&
      point.y >= Math.min(segment.a.y, segment.b.y) &&
      point.y <= Math.max(segment.a.y, segment.b.y);
  }
  for (const junction of routing.junctions) {
    const touchingSegments = routing.routeSegments.filter(segment =>
      junction.topologyEdgeIds.includes(segment.topologyEdgeId) &&
      segmentContainsPoint(segment, junction.position)
    );
    for (const segment of touchingSegments) {
      addCompiledConnector(
        `connector_${junction.id}_${segment.spaceId}`,
        'opening',
        [segment.spaceId, junction.id],
        junction.position
      );
    }
  }

  const exteriorRandom = createSeededMissionRandom(
    `${topology.seed}:exterior:${topology.profileId}:v${topology.generationVersion}`
  );
  const exteriorOpenings = [];
  const exteriorEntrances = [];
  function openingOverlaps(candidate, center, length) {
    const start = center - length / 2;
    const end = center + length / 2;
    return exteriorOpenings.some(opening =>
      opening.orientation === candidate.orientation &&
      opening.coordinate === candidate.coordinate &&
      end > opening.center - opening.length / 2 &&
      start < opening.center + opening.length / 2
    );
  }
  function selectExteriorOpening(space, length) {
    const candidates = shuffleMissionItems(
      getIrregularExteriorWallCandidates(space, walls, wallThickness, length + wallThickness * 2),
      exteriorRandom
    ).sort((a, b) => b.length - a.length);
    for (const candidate of candidates) {
      const minimumCenter = candidate.start + length / 2;
      const maximumCenter = candidate.end - length / 2;
      const center = Math.round(minimumCenter + exteriorRandom() * (maximumCenter - minimumCenter));
      if (openingOverlaps(candidate, center, length)) continue;
      return { ...candidate, center, length };
    }
    return null;
  }
  function exteriorOpeningPosition(opening) {
    return opening.orientation === 'horizontal'
      ? { x: opening.center, y: opening.coordinate }
      : { x: opening.coordinate, y: opening.center };
  }

  const primaryEntranceRoom = placement.spaces.find(space => space.role === 'reception_lobby');
  const secondaryEntranceRoomCandidates = [
    placement.spaces.find(space => space.role === 'service_storage'),
    placement.spaces.find(space => space.role === 'public_service'),
    ...shuffleMissionItems(placement.spaces.filter(space =>
      space.spaceType === 'room' &&
      !space.startingSpace &&
      space.role !== 'records_archive' &&
      space.securityZone < 2
    ), exteriorRandom),
  ].filter((space, index, items) => space && items.findIndex(item => item.id === space.id) === index);
  for (let index = 0; index < topology.metrics.entranceCount; index++) {
    const roomCandidates = index === 0 ? [primaryEntranceRoom] : secondaryEntranceRoomCandidates;
    let room = null;
    let opening = null;
    for (const candidateRoom of roomCandidates) {
      if (exteriorEntrances.some(entrance => entrance.roomId === candidateRoom.id)) continue;
      opening = selectExteriorOpening(candidateRoom, 110);
      if (!opening) continue;
      room = candidateRoom;
      break;
    }
    if (!room || !opening) {
      throw new Error(`Could not place exterior entrance ${index + 1} for "${topology.profileId}".`);
    }
    exteriorOpenings.push(opening);
    const id = index === 0 ? 'primary_entry_gap' : `secondary_entry_gap_${index}`;
    const position = exteriorOpeningPosition(opening);
    connectors.push({
      id,
      kind: 'opening',
      rooms: [room.id, 'exterior'],
      position,
      apertureIds: [],
    });
    exteriorEntrances.push({
      id,
      connectorId: id,
      roomId: room.id,
      side: opening.side,
      position,
      primary: index === 0,
    });
  }

  const windowRooms = shuffleMissionItems(placement.spaces.filter(space =>
    space.spaceType === 'room' &&
    !space.startingSpace &&
    space.role !== 'records_archive' &&
    space.securityZone < 2 &&
    !exteriorEntrances.some(entrance => entrance.roomId === space.id)
  ), exteriorRandom);
  const targetWindowCount = Math.min(3, windowRooms.length);
  for (const room of windowRooms) {
    if (windows.length >= targetWindowCount) break;
    const opening = selectExteriorOpening(room, 64);
    if (!opening) continue;
    exteriorOpenings.push(opening);
    const id = `window_${windows.length + 1}`;
    const apertureId = `${id}_moonlight`;
    const position = exteriorOpeningPosition(opening);
    const vertical = opening.orientation === 'vertical';
    const physicalWindowLength = opening.length - wallThickness;
    connectors.push({
      id,
      kind: 'window',
      rooms: [room.id, 'exterior'],
      position,
      windowId: id,
      apertureIds: [apertureId],
    });
    windows.push({
      id,
      connectorId: id,
      x: vertical ? position.x - 1.5 : position.x - physicalWindowLength / 2,
      y: vertical ? position.y - physicalWindowLength / 2 : position.y - 1.5,
      w: vertical ? 3 : physicalWindowLength,
      h: vertical ? physicalWindowLength : 3,
      orientation: vertical ? 'vertical' : 'horizontal',
      material: 'glass',
      defaultState: 'intact',
    });
    const inwardDirection = { N: 'S', S: 'N', W: 'E', E: 'W' }[opening.side];
    lightingApertures.push({
      id: apertureId,
      connectorId: id,
      kind: 'window',
      x: position.x,
      y: position.y,
      direction: inwardDirection,
      width: opening.length,
      range: 360,
      intensity: 0.24,
      falloffPower: 1.05,
      spreadRadians: 0.95,
      open: true,
      requiresExternalLight: true,
    });
    wallGapExits.push({ id: `${id}_exit`, connectorId: id, activated: false });
  }
  if (windows.length < targetWindowCount) {
    throw new Error(`Facility "${topology.seed}" could not place its exterior windows.`);
  }
  walls = splitIrregularWallsForOpenings(walls, exteriorOpenings, wallThickness);

  const navigableConnectors = connectors.filter(connector =>
    connector.rooms.every(roomId => spacesById.has(roomId))
  );
  const navigationNodes = [
    ...spaces.map(space => ({ id: space.id, roomId: space.id })),
    ...navigableConnectors.map(connector => ({ id: connector.navNodeId, connectorId: connector.id })),
  ];
  const navigationEdges = navigableConnectors.flatMap(connector => [
    [connector.rooms[0], connector.navNodeId],
    [connector.navNodeId, connector.rooms[1]],
  ]);
  return freezeMissionDefinition({
    seed: topology.seed,
    profileId: topology.profileId,
    generationVersion: topology.generationVersion,
    world: { ...placement.world },
    spaces,
    connectors,
    exteriorEntrances,
    geometry: { walls, wallGapExits },
    doors,
    windows,
    lighting: { apertures: lightingApertures },
    navigation: { nodes: navigationNodes, edges: navigationEdges },
    sound: {
      rooms: spaces.map(space => space.id),
      portals: navigableConnectors.map(connector => connector.id),
    },
    metrics: {
      spaceCount: spaces.length,
      connectorCount: connectors.length,
      wallCount: walls.length,
      doorCount: doors.length,
      windowCount: windows.length,
      entranceCount: exteriorEntrances.length,
    },
  });
}

function findIrregularNavigationPath(navigation, startId, targetId) {
  const adjacency = new Map(navigation.nodes.map(node => [node.id, []]));
  for (const [a, b] of navigation.edges) {
    adjacency.get(a).push(b);
    adjacency.get(b).push(a);
  }
  const previous = new Map([[startId, null]]);
  const queue = [startId];
  while (queue.length > 0) {
    const nodeId = queue.shift();
    if (nodeId === targetId) break;
    for (const neighborId of adjacency.get(nodeId)) {
      if (previous.has(neighborId)) continue;
      previous.set(neighborId, nodeId);
      queue.push(neighborId);
    }
  }
  if (!previous.has(targetId)) return [];
  const path = [];
  for (let nodeId = targetId; nodeId !== null; nodeId = previous.get(nodeId)) path.push(nodeId);
  return path.reverse();
}

function missionRectanglesOverlapWithPadding(a, b, padding = 0) {
  return a.x < b.x + b.w + padding && a.x + a.w + padding > b.x &&
    a.y < b.y + b.h + padding && a.y + a.h + padding > b.y;
}

function missionSegmentIntersectsExpandedRectangle(a, b, rectangle, padding = 0) {
  const minX = rectangle.x - padding;
  const maxX = rectangle.x + rectangle.w + padding;
  const minY = rectangle.y - padding;
  const maxY = rectangle.y + rectangle.h + padding;
  let minimumT = 0;
  let maximumT = 1;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  for (const [origin, delta, minimum, maximum] of [
    [a.x, dx, minX, maxX],
    [a.y, dy, minY, maxY],
  ]) {
    if (Math.abs(delta) < 0.000001) {
      if (origin < minimum || origin > maximum) return false;
      continue;
    }
    const first = (minimum - origin) / delta;
    const second = (maximum - origin) / delta;
    const entry = Math.min(first, second);
    const exit = Math.max(first, second);
    minimumT = Math.max(minimumT, entry);
    maximumT = Math.min(maximumT, exit);
    if (minimumT > maximumT) return false;
  }
  return maximumT >= 0 && minimumT <= 1;
}

function generateLocalGovernmentOfficeFurnishings(structure, seedInput) {
  const seed = String(seedInput);
  const random = createSeededMissionRandom(`${seed}:furnishings:local-government-office:v2`);
  const rooms = structure.spaces.filter(space => space.spaceType === 'room');
  const connectorsByRoom = new Map(rooms.map(room => [room.id, []]));
  for (const connector of structure.connectors) {
    for (const roomId of connector.rooms) {
      if (connectorsByRoom.has(roomId)) connectorsByRoom.get(roomId).push(connector.position);
    }
  }
  const obstacles = [];
  const countsByRole = {};
  const sequenceByRoom = new Map();

  function centerRectangle(room) {
    const halfWidth = Math.min(52, Math.max(22, room.interior.w * 0.13));
    const halfHeight = Math.min(52, Math.max(22, room.interior.h * 0.13));
    return {
      x: room.center.x - halfWidth,
      y: room.center.y - halfHeight,
      w: halfWidth * 2,
      h: halfHeight * 2,
    };
  }

  function candidateRectangle(room, item, candidate) {
    const rotated = candidate.rotate === true;
    const width = rotated ? item.h : item.w;
    const height = rotated ? item.w : item.h;
    return {
      x: Math.round(room.interior.x + room.interior.w * candidate.x - width / 2),
      y: Math.round(room.interior.y + room.interior.h * candidate.y - height / 2),
      w: width,
      h: height,
    };
  }

  function validFurnitureRectangle(room, rectangle, item) {
    const wallMargin = 16;
    if (rectangle.x < room.interior.x + wallMargin ||
        rectangle.y < room.interior.y + wallMargin ||
        rectangle.x + rectangle.w > room.interior.x + room.interior.w - wallMargin ||
        rectangle.y + rectangle.h > room.interior.y + room.interior.h - wallMargin) return false;
    const blocksTravel = item.blocksMovement !== false || item.blocksSight === true;
    if (blocksTravel && missionRectanglesOverlapWithPadding(rectangle, centerRectangle(room), 6)) return false;
    for (const connectorPosition of connectorsByRoom.get(room.id)) {
      const connectorKeepout = {
        x: connectorPosition.x - 40,
        y: connectorPosition.y - 40,
        w: 80,
        h: 80,
      };
      if (missionRectanglesOverlapWithPadding(rectangle, connectorKeepout)) return false;
      if (blocksTravel && missionSegmentIntersectsExpandedRectangle(
        room.center,
        connectorPosition,
        rectangle,
        20,
      )) return false;
    }
    return obstacles.every(obstacle =>
      obstacle.roomId !== room.id || !missionRectanglesOverlapWithPadding(rectangle, obstacle, 10)
    );
  }

  function addFurniture(room, item, candidates) {
    const ordered = random() < 0.5 ? candidates : [...candidates].reverse();
    for (const candidate of ordered) {
      const rectangle = candidateRectangle(room, item, candidate);
      if (!validFurnitureRectangle(room, rectangle, item)) continue;
      const sequence = (sequenceByRoom.get(room.id) ?? 0) + 1;
      sequenceByRoom.set(room.id, sequence);
      obstacles.push({
        id: `furniture_${room.id}_${sequence}`,
        roomId: room.id,
        kind: item.kind,
        material: item.material ?? 'wood',
        blocksMovement: item.blocksMovement !== false,
        blocksSight: item.blocksSight === true,
        blocksProjectiles: item.blocksProjectiles !== false,
        x: rectangle.x,
        y: rectangle.y,
        w: rectangle.w,
        h: rectangle.h,
      });
      countsByRole[room.role] = (countsByRole[room.role] ?? 0) + 1;
      return true;
    }
    return false;
  }

  const corners = [
    { x: 0.22, y: 0.22 }, { x: 0.78, y: 0.22 },
    { x: 0.22, y: 0.78 }, { x: 0.78, y: 0.78 },
  ];
  const wallCenters = [
    { x: 0.5, y: 0.2 }, { x: 0.5, y: 0.8 },
    { x: 0.2, y: 0.5, rotate: true }, { x: 0.8, y: 0.5, rotate: true },
  ];
  const sideSlots = [
    { x: 0.24, y: 0.35 }, { x: 0.76, y: 0.35 },
    { x: 0.24, y: 0.65 }, { x: 0.76, y: 0.65 },
    { x: 0.35, y: 0.2 }, { x: 0.65, y: 0.2 },
    { x: 0.35, y: 0.8 }, { x: 0.65, y: 0.8 },
  ];

  function addFallbackFurniture(room) {
    const fallbackByRole = {
      restroom: { kind: 'restroom_fixture', w: 32, h: 20, material: 'ceramic', blocksSight: false },
      staff_break_room: { kind: 'chair', w: 22, h: 22, material: 'fabric', blocksSight: false },
      service_storage: { kind: 'storage_crates', w: 34, h: 26, material: 'wood' },
      secure_antechamber: { kind: 'waiting_chair', w: 22, h: 22, material: 'fabric', blocksSight: false },
      utility_room: { kind: 'equipment_case', w: 34, h: 22, material: 'metal' },
    };
    const item = fallbackByRole[room.role] ?? {
      kind: 'filing_cabinet', w: 36, h: 20, material: 'metal', blocksSight: true,
    };
    while (obstacles.filter(obstacle => obstacle.roomId === room.id).length < 2) {
      const added = addFurniture(
        room,
        item,
        [...corners, ...wallCenters, ...sideSlots],
      );
      if (added) continue;
      if (!addFurniture(
        room,
        {
          kind: room.role === 'restroom' ? 'restroom_fixture' : 'wall_fixture',
          w: 30,
          h: 12,
          material: room.role === 'restroom' ? 'ceramic' : 'metal',
          blocksMovement: false,
          blocksSight: false,
          blocksProjectiles: false,
        },
        [...wallCenters, ...corners, ...sideSlots],
      )) break;
    }
  }

  for (const room of rooms) {
    switch (room.role) {
      case 'reception_lobby':
        addFurniture(room, { kind: 'reception_counter', w: 120, h: 34 }, [...corners, ...wallCenters]);
        addFurniture(room, { kind: 'reception_return', w: 34, h: 76 }, [...corners.map(item => ({ ...item, rotate: true })), ...sideSlots]);
        addFurniture(room, { kind: 'waiting_chair', w: 24, h: 24, blocksSight: false }, sideSlots);
        addFurniture(room, { kind: 'waiting_chair', w: 24, h: 24, blocksSight: false }, [...sideSlots].reverse());
        addFurniture(room, { kind: 'low_table', w: 48, h: 30, blocksSight: false }, corners);
        addFurniture(room, { kind: 'information_board', w: 72, h: 20, material: 'wood', blocksSight: true }, wallCenters);
        break;
      case 'public_service':
        addFurniture(room, { kind: 'service_counter', w: 128, h: 32 }, [...wallCenters, ...corners]);
        addFurniture(room, { kind: 'service_counter', w: 96, h: 32 }, [...wallCenters].reverse().concat(corners));
        addFurniture(room, { kind: 'clerk_desk', w: 68, h: 34 }, sideSlots);
        addFurniture(room, { kind: 'clerk_desk', w: 68, h: 34 }, [...sideSlots].reverse());
        addFurniture(room, { kind: 'waiting_chair', w: 24, h: 24, blocksSight: false }, corners);
        addFurniture(room, { kind: 'waiting_chair', w: 24, h: 24, blocksSight: false }, [...corners].reverse());
        addFurniture(room, { kind: 'filing_cabinet', w: 64, h: 24, material: 'metal', blocksSight: true }, wallCenters);
        break;
      case 'staff_office':
        addFurniture(room, { kind: 'clerical_desk', w: 72, h: 36 }, [...corners, ...sideSlots]);
        addFurniture(room, { kind: 'clerical_desk', w: 72, h: 36 }, [...corners].reverse().concat(sideSlots));
        addFurniture(room, { kind: 'filing_cabinet', w: 70, h: 24, material: 'metal', blocksSight: true }, wallCenters);
        addFurniture(room, { kind: 'low_partition', w: 22, h: 82, material: 'fabric', blocksSight: true }, sideSlots.map(item => ({ ...item, rotate: true })));
        break;
      case 'records_archive':
        addFurniture(room, { kind: 'archive_clerk_desk', w: 68, h: 34 }, [...corners, ...wallCenters, ...sideSlots]);
        addFurniture(room, { kind: 'archive_bank', w: 34, h: 72, material: 'metal', blocksSight: true }, sideSlots.map(item => ({ ...item, rotate: true })));
        addFurniture(room, { kind: 'archive_bank', w: 34, h: 72, material: 'metal', blocksSight: true }, [...sideSlots].reverse().map(item => ({ ...item, rotate: true })));
        addFurniture(room, { kind: 'archive_bank', w: 34, h: 62, material: 'metal', blocksSight: true }, corners.map(item => ({ ...item, rotate: true })));
        addFurniture(room, { kind: 'archive_bank', w: 34, h: 62, material: 'metal', blocksSight: true }, [...corners].reverse().map(item => ({ ...item, rotate: true })));
        addFurniture(room, { kind: 'paper_cart', w: 30, h: 24, material: 'metal', blocksSight: false }, sideSlots);
        break;
      case 'service_storage':
        addFurniture(room, { kind: 'storage_shelf', w: 30, h: 86, material: 'metal', blocksSight: true }, wallCenters.map(item => ({ ...item, rotate: true })));
        addFurniture(room, { kind: 'storage_shelf', w: 30, h: 72, material: 'metal', blocksSight: true }, [...wallCenters].reverse().map(item => ({ ...item, rotate: true })));
        addFurniture(room, { kind: 'storage_crates', w: 48, h: 38, material: 'wood' }, corners);
        break;
      case 'secure_antechamber':
        addFurniture(room, { kind: 'security_desk', w: 82, h: 34 }, [...corners, ...wallCenters]);
        addFurniture(room, { kind: 'waiting_chair', w: 24, h: 24, blocksSight: false }, sideSlots);
        addFurniture(room, { kind: 'waiting_chair', w: 24, h: 24, blocksSight: false }, [...sideSlots].reverse());
        addFurniture(room, { kind: 'filing_cabinet', w: 58, h: 24, material: 'metal', blocksSight: true }, wallCenters);
        break;
      case 'secure_office':
        addFurniture(room, { kind: 'executive_desk', w: 100, h: 42 }, [...wallCenters, ...corners]);
        addFurniture(room, { kind: 'credenza', w: 90, h: 24 }, [...wallCenters].reverse());
        addFurniture(room, { kind: 'visitor_chair', w: 26, h: 26, blocksSight: false }, sideSlots);
        addFurniture(room, { kind: 'visitor_chair', w: 26, h: 26, blocksSight: false }, [...sideSlots].reverse());
        break;
      case 'meeting_room':
        addFurniture(room, { kind: 'meeting_table', w: 112, h: 54 }, [...corners, ...wallCenters]);
        addFurniture(room, { kind: 'meeting_chair', w: 24, h: 24, blocksSight: false }, sideSlots);
        addFurniture(room, { kind: 'meeting_chair', w: 24, h: 24, blocksSight: false }, [...sideSlots].reverse());
        addFurniture(room, { kind: 'meeting_chair', w: 24, h: 24, blocksSight: false }, corners);
        break;
      case 'permit_office':
        addFurniture(room, { kind: 'permit_counter', w: 104, h: 32 }, [...wallCenters, ...corners]);
        addFurniture(room, { kind: 'clerical_desk', w: 68, h: 34 }, sideSlots);
        addFurniture(room, { kind: 'card_board', w: 76, h: 20 }, wallCenters);
        break;
      case 'staff_break_room':
        addFurniture(room, { kind: 'break_table', w: 62, h: 42, blocksSight: false }, corners);
        addFurniture(room, { kind: 'kitchen_counter', w: 82, h: 26 }, wallCenters);
        addFurniture(room, { kind: 'chair', w: 24, h: 24, blocksSight: false }, sideSlots);
        break;
      case 'restroom':
        addFurniture(room, { kind: 'stall_partition', w: 24, h: 54, material: 'metal', blocksSight: true }, [...corners, ...sideSlots].map(item => ({ ...item, rotate: true })));
        addFurniture(room, { kind: 'sink_counter', w: 52, h: 20, material: 'ceramic' }, [...wallCenters, ...corners]);
        break;
      case 'utility_room':
        addFurniture(room, { kind: 'equipment_cabinet', w: 34, h: 82, material: 'metal', blocksSight: true }, wallCenters.map(item => ({ ...item, rotate: true })));
        addFurniture(room, { kind: 'equipment_console', w: 72, h: 34, material: 'metal' }, corners);
        addFurniture(room, { kind: 'equipment_cabinet', w: 34, h: 68, material: 'metal', blocksSight: true }, [...wallCenters].reverse().map(item => ({ ...item, rotate: true })));
        break;
      default:
        break;
    }
    addFallbackFurniture(room);
  }

  return freezeMissionDefinition({
    obstacles,
    metrics: {
      obstacleCount: obstacles.length,
      furnishedRoomCount: rooms.filter(room => obstacles.some(obstacle => obstacle.roomId === room.id)).length,
      countsByRole,
    },
  });
}

function getIrregularGenerationAttemptSeed(seedInput, attempt) {
  const seed = String(seedInput);
  return attempt === 0 ? seed : `${seed}:irregular-attempt:${attempt}`;
}

function buildIrregularSeededMissionAttempt(
  seedInput,
  profileId = 'local_government_office',
  generationAttempt = 0,
) {
  const runSeed = String(seedInput);
  const seed = getIrregularGenerationAttemptSeed(runSeed, generationAttempt);
  const profile = NORMALIZED_FACILITY_PROFILES[profileId];
  if (!profile || profile.generatorKind !== 'irregular') {
    throw new Error(`Facility profile "${profileId}" does not use irregular mission generation.`);
  }
  const topology = generateIrregularFacilityTopology(seed, profileId);
  const placement = placeIrregularFacilitySpaces(topology);
  const routing = routeIrregularFacilityConnections(topology, placement);
  const structure = compileIrregularFacilityStructure(topology, placement, routing);
  const furnishings = generateLocalGovernmentOfficeFurnishings(structure, seed);
  const contentRandom = createSeededMissionRandom(
    `${seed}:content:${profile.id}:v${profile.generationVersion}`
  );
  const designScale = 2.5;
  const world = {
    designWidth: structure.world.designWidth,
    designHeight: structure.world.designHeight,
    width: Math.round(structure.world.designWidth * designScale),
    height: Math.round(structure.world.designHeight * designScale),
  };
  const roomsById = new Map(structure.spaces.map(space => [space.id, space]));
  const connectorsById = new Map(structure.connectors.map(connector => [connector.id, connector]));
  const startingRoom = placement.spaces.find(space => space.startingSpace);
  const objectiveRoom = placement.spaces.find(space => space.role === 'secure_office');

  const lightingLamps = placement.spaces
    .filter(space => space.spaceType === 'room')
    .map((room, index) => {
      const lamp = getGeneratedRoomLampPlacement(room, structure.geometry.walls);
      return {
        id: `lamp_${index + 1}`,
        roomId: room.id,
        x: lamp.x,
        y: lamp.y,
        wallSide: lamp.wallSide,
        radius: 900,
        intensity: 1,
        falloffPower: 1.45,
        color: '#ffdc96',
        active: true,
      };
    });
  const lightingZones = [{
    id: 'entry_dim_spill',
    roomId: startingRoom.id,
    x: startingRoom.center.x - 70,
    y: startingRoom.center.y - 46,
    w: 140,
    h: 92,
    ambient: 0.08,
  }];

  function navigationPoint(nodeId) {
    const node = structure.navigation.nodes.find(item => item.id === nodeId);
    if (node.roomId) return roomsById.get(node.roomId).center;
    return connectorsById.get(node.connectorId).position;
  }
  const blockingFurniture = furnishings.obstacles.filter(obstacle => obstacle.blocksMovement !== false);
  function findClearFurniturePoint(room, desired, salt, forbiddenPoints = []) {
    const candidates = [{ x: desired.x, y: desired.y }];
    const angleOffset = (hashMissionSeed(`${seed}:${room.id}:${salt}`) / 4294967296) * Math.PI * 2;
    for (const radius of [18, 32, 48, 64, 82]) {
      for (let index = 0; index < 12; index++) {
        const angle = angleOffset + index * Math.PI * 2 / 12;
        candidates.push({
          x: room.center.x + Math.cos(angle) * radius,
          y: room.center.y + Math.sin(angle) * radius,
        });
      }
    }
    for (const candidate of candidates) {
      const wallClearance = 32;
      if (candidate.x < room.interior.x + wallClearance ||
          candidate.x > room.interior.x + room.interior.w - wallClearance ||
          candidate.y < room.interior.y + wallClearance ||
          candidate.y > room.interior.y + room.interior.h - wallClearance) continue;
      if (blockingFurniture.some(obstacle =>
        obstacle.roomId === room.id &&
        candidate.x > obstacle.x - 22 && candidate.x < obstacle.x + obstacle.w + 22 &&
        candidate.y > obstacle.y - 22 && candidate.y < obstacle.y + obstacle.h + 22
      )) continue;
      if (forbiddenPoints.some(point => Math.hypot(candidate.x - point.x, candidate.y - point.y) < 75)) continue;
      return candidate;
    }
    throw new Error(`Could not place clear gameplay point in furnished room "${room.id}".`);
  }
  const eligibleEnemyRooms = placement.spaces.filter(space =>
    space.spaceType === 'room' && !space.startingSpace
  );
  const enemyRoomAssignments = [];
  const initialEnemyRooms = shuffleMissionItems(eligibleEnemyRooms, contentRandom);
  for (const room of initialEnemyRooms) {
    if (enemyRoomAssignments.length >= topology.metrics.enemyCount) break;
    enemyRoomAssignments.push(room);
  }
  const duplicateEnemyRooms = [...eligibleEnemyRooms].sort((a, b) =>
    b.interior.w * b.interior.h - a.interior.w * a.interior.h || a.id.localeCompare(b.id)
  );
  let duplicateIndex = 0;
  while (enemyRoomAssignments.length < topology.metrics.enemyCount) {
    enemyRoomAssignments.push(duplicateEnemyRooms[duplicateIndex % Math.min(3, duplicateEnemyRooms.length)]);
    duplicateIndex++;
  }
  const enemiesPerRoom = new Map();
  for (const room of enemyRoomAssignments) {
    enemiesPerRoom.set(room.id, (enemiesPerRoom.get(room.id) ?? 0) + 1);
  }
  const nextRoomSlot = new Map();
  const placedSpawnPointsByRoom = new Map();
  const enemySpawns = enemyRoomAssignments.map((room, index) => {
    const roomEnemyCount = enemiesPerRoom.get(room.id);
    const roomSlot = nextRoomSlot.get(room.id) ?? 0;
    nextRoomSlot.set(room.id, roomSlot + 1);
    const spawnAngle = roomEnemyCount > 1
      ? (hashMissionSeed(`${seed}:${room.id}:irregular-spawn`) / 4294967296) * Math.PI * 2 +
        roomSlot * (Math.PI * 2 / roomEnemyCount)
      : 0;
    const spawnRadius = roomEnemyCount > 1
      ? Math.min(60, Math.min(room.interior.w, room.interior.h) / 2 - 30)
      : 0;
    const desiredSpawn = {
      x: room.center.x + Math.cos(spawnAngle) * spawnRadius,
      y: room.center.y + Math.sin(spawnAngle) * spawnRadius,
    };
    const roomSpawnPoints = placedSpawnPointsByRoom.get(room.id) ?? [];
    const spawn = findClearFurniturePoint(room, desiredSpawn, `enemy-spawn-${index}`, roomSpawnPoints);
    roomSpawnPoints.push(spawn);
    placedSpawnPointsByRoom.set(room.id, roomSpawnPoints);
    let patrolRoute;
    if (index % 3 === 0 && eligibleEnemyRooms.length > 1) {
      const roomIndex = eligibleEnemyRooms.findIndex(item => item.id === room.id);
      const targetRoom = eligibleEnemyRooms[
        (roomIndex + 1 + Math.floor(contentRandom() * (eligibleEnemyRooms.length - 1))) %
        eligibleEnemyRooms.length
      ];
      const path = findIrregularNavigationPath(structure.navigation, room.id, targetRoom.id);
      const forward = path.slice(1).map((nodeId, pathIndex) => {
        const point = navigationPoint(nodeId);
        return {
          x: point.x,
          y: point.y,
          pauseFrames: pathIndex === path.length - 2 ? 90 : 0,
          sweep: pathIndex === path.length - 2 ? Math.PI / 2 : 0,
          sweepSpeed: pathIndex === path.length - 2 ? 0.008 : 0,
        };
      });
      patrolRoute = [
        { x: spawn.x, y: spawn.y, pauseFrames: 90, sweep: Math.PI / 2, sweepSpeed: 0.008 },
        ...forward,
        ...forward.slice(0, -1).reverse().map(point => ({ ...point, pauseFrames: 0, sweep: 0, sweepSpeed: 0 })),
      ];
    } else {
      const horizontal = index % 2 === 0;
      const offset = Math.min(28, (horizontal ? room.interior.w : room.interior.h) * 0.12);
      const firstDesired = horizontal
        ? { x: spawn.x - offset, y: spawn.y }
        : { x: spawn.x, y: spawn.y - offset };
      const secondDesired = horizontal
        ? { x: spawn.x + offset, y: spawn.y }
        : { x: spawn.x, y: spawn.y + offset };
      const firstWaypoint = findClearFurniturePoint(room, firstDesired, `local-patrol-a-${index}`);
      const secondWaypoint = findClearFurniturePoint(room, secondDesired, `local-patrol-b-${index}`);
      patrolRoute = [
        {
          x: firstWaypoint.x, y: firstWaypoint.y,
          pauseFrames: 120, sweep: Math.PI / 2, sweepSpeed: 0.008,
        },
        {
          x: secondWaypoint.x, y: secondWaypoint.y,
          pauseFrames: 120, sweep: Math.PI / 2, sweepSpeed: -0.008,
        },
      ];
    }
    const facingTarget = patrolRoute.find(point =>
      Math.hypot(point.x - spawn.x, point.y - spawn.y) > 0.001
    ) ?? room.center;
    const angle = roomEnemyCount > 1
      ? Math.atan2(Math.cos(spawnAngle), -Math.sin(spawnAngle))
      : Math.atan2(facingTarget.x - spawn.x, -(facingTarget.y - spawn.y));
    const isShooter = index % 3 === 2;
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

  return freezeMissionDefinition({
    id: `generated_${profile.id}_${hashMissionSeed(seed).toString(16).padStart(8, '0')}`,
    generation: {
      kind: 'seeded_irregular',
      seed: runSeed,
      attemptSeed: seed,
      generationAttempt,
      profileId: profile.id,
      generationVersion: profile.generationVersion,
      facilityProfile: profile,
      topologyMetrics: topology.metrics,
      placementMetrics: placement.metrics,
      routingMetrics: routing.metrics,
      structureMetrics: structure.metrics,
      furnishingMetrics: furnishings.metrics,
    },
    world,
    player: { start: { ...startingRoom.center } },
    rooms: structure.spaces,
    connectors: structure.connectors,
    geometry: {
      ...structure.geometry,
      obstacles: furnishings.obstacles,
    },
    doors: structure.doors,
    windows: structure.windows,
    lighting: {
      globalAmbient: 0,
      externalLightAvailable: true,
      zones: lightingZones,
      lamps: lightingLamps,
      apertures: structure.lighting.apertures,
    },
    objective: {
      pickupRule: {
        excludeStartingSpaces: true,
        pickupRoomId: objectiveRoom.id,
      },
      exfilPoints: structure.exteriorEntrances.map((entrance, index) => ({
        id: entrance.primary ? 'primary_entry_exfil' : `secondary_entry_exfil_${index}`,
        connectorId: entrance.connectorId,
        type: entrance.primary ? 'primary' : 'secondary',
        active: false,
        discovered: entrance.primary,
      })),
    },
    enemies: {
      spawns: enemySpawns,
      navigation: structure.navigation,
    },
    sound: structure.sound,
  });
}

const IRREGULAR_GENERATION_MAX_ATTEMPTS = 4;

function validateIrregularMissionDefinition(mission, expectedProfileId = 'local_government_office') {
  const profile = NORMALIZED_FACILITY_PROFILES[expectedProfileId];
  function invalid(message) {
    throw new Error(`Invalid irregular mission: ${message}`);
  }
  function requireCondition(condition, message) {
    if (!condition) invalid(message);
  }
  function requireUniqueIds(items, label) {
    requireCondition(Array.isArray(items), `${label} must be an array`);
    const ids = items.map(item => item?.id);
    requireCondition(ids.every(Boolean), `${label} must have stable IDs`);
    requireCondition(new Set(ids).size === ids.length, `${label} IDs must be unique`);
  }
  function rectanglesOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x &&
      a.y < b.y + b.h && a.y + a.h > b.y;
  }
  function pointInsideWall(point) {
    return mission.geometry.walls.some(wall =>
      point.x > wall.x && point.x < wall.x + wall.w &&
      point.y > wall.y && point.y < wall.y + wall.h
    );
  }
  function pointInsideObstacle(point) {
    return (mission.geometry.obstacles ?? []).some(obstacle =>
      obstacle.blocksMovement !== false &&
      point.x > obstacle.x && point.x < obstacle.x + obstacle.w &&
      point.y > obstacle.y && point.y < obstacle.y + obstacle.h
    );
  }
  function pointInsideBlockingGeometry(point) {
    return pointInsideWall(point) || pointInsideObstacle(point);
  }
  function pointInsideSpace(point, space) {
    return point.x >= space.interior.x && point.x <= space.interior.x + space.interior.w &&
      point.y >= space.interior.y && point.y <= space.interior.y + space.interior.h;
  }

  requireCondition(profile?.generatorKind === 'irregular', `unknown irregular profile "${expectedProfileId}"`);
  requireCondition(mission?.generation?.kind === 'seeded_irregular', 'generation kind must be seeded_irregular');
  requireCondition(mission.generation.profileId === profile.id, 'profile identity must match the request');
  requireCondition(Number.isInteger(mission.generation.generationAttempt), 'generation attempt must be an integer');
  requireCondition(
    mission.generation.attemptSeed === getIrregularGenerationAttemptSeed(
      mission.generation.seed,
      mission.generation.generationAttempt,
    ),
    'attempt seed must be derived from the run seed and attempt number',
  );
  requireCondition(mission.world.designWidth > 0 && mission.world.designHeight > 0, 'world bounds must be positive');

  requireUniqueIds(mission.rooms, 'spaces');
  requireUniqueIds(mission.connectors, 'connectors');
  requireUniqueIds(mission.geometry.walls, 'walls');
  requireUniqueIds(mission.geometry.obstacles ?? [], 'furniture obstacles');
  requireUniqueIds(mission.geometry.wallGapExits, 'wall-gap exits');
  requireUniqueIds(mission.doors, 'doors');
  requireUniqueIds(mission.windows, 'windows');
  requireUniqueIds(mission.lighting.lamps, 'lamps');
  requireUniqueIds(mission.lighting.apertures, 'lighting apertures');
  requireUniqueIds(mission.enemies.spawns, 'enemy spawns');
  requireUniqueIds(mission.enemies.navigation.nodes, 'navigation nodes');

  const spacesById = new Map(mission.rooms.map(space => [space.id, space]));
  const connectorsById = new Map(mission.connectors.map(connector => [connector.id, connector]));
  const doorsById = new Map(mission.doors.map(door => [door.id, door]));
  const windowsById = new Map(mission.windows.map(windowSpec => [windowSpec.id, windowSpec]));
  const aperturesById = new Map(mission.lighting.apertures.map(aperture => [aperture.id, aperture]));
  const navNodeIds = new Set(mission.enemies.navigation.nodes.map(node => node.id));
  const startingSpaces = mission.rooms.filter(space => space.startingSpace);
  const authoredRooms = mission.rooms.filter(space => space.spaceType === 'room');
  requireCondition(startingSpaces.length === 1, 'exactly one starting space is required');
  requireCondition(pointInsideSpace(mission.player.start, startingSpaces[0]), 'player start must be inside the starting space');
  requireCondition(!pointInsideBlockingGeometry(mission.player.start), 'player start cannot overlap blocking geometry');

  for (const space of mission.rooms) {
    requireCondition(['room', 'corridor', 'junction'].includes(space.spaceType), `${space.id} has an invalid space type`);
    requireCondition(space.interior.w > 0 && space.interior.h > 0, `${space.id} must have positive dimensions`);
    requireCondition(space.interior.x >= 0 && space.interior.y >= 0, `${space.id} begins outside the world`);
    requireCondition(
      space.interior.x + space.interior.w <= mission.world.designWidth &&
      space.interior.y + space.interior.h <= mission.world.designHeight,
      `${space.id} extends outside the world`,
    );
  }
  for (const wall of mission.geometry.walls) {
    requireCondition(wall.w > 0 && wall.h > 0, `${wall.id} must have positive dimensions`);
    requireCondition(wall.x >= 0 && wall.y >= 0, `${wall.id} begins outside the world`);
    requireCondition(
      wall.x + wall.w <= mission.world.designWidth && wall.y + wall.h <= mission.world.designHeight,
      `${wall.id} extends outside the world`,
    );
  }
  const obstacles = mission.geometry.obstacles ?? [];
  for (let index = 0; index < obstacles.length; index++) {
    const obstacle = obstacles[index];
    const room = spacesById.get(obstacle.roomId);
    requireCondition(room?.spaceType === 'room', `${obstacle.id} must belong to an authored room`);
    requireCondition(obstacle.w > 0 && obstacle.h > 0, `${obstacle.id} must have positive dimensions`);
    requireCondition(
      obstacle.x >= room.interior.x && obstacle.y >= room.interior.y &&
      obstacle.x + obstacle.w <= room.interior.x + room.interior.w &&
      obstacle.y + obstacle.h <= room.interior.y + room.interior.h,
      `${obstacle.id} must stay inside its room`,
    );
    requireCondition(
      mission.geometry.walls.every(wall => !rectanglesOverlap(obstacle, wall)),
      `${obstacle.id} overlaps a wall`,
    );
    requireCondition(
      mission.doors.every(door => !rectanglesOverlap(obstacle, door)),
      `${obstacle.id} overlaps a door`,
    );
    requireCondition(
      mission.windows.every(windowSpec => !rectanglesOverlap(obstacle, windowSpec)),
      `${obstacle.id} overlaps a window`,
    );
    for (let otherIndex = index + 1; otherIndex < obstacles.length; otherIndex++) {
      const other = obstacles[otherIndex];
      if (obstacle.roomId !== other.roomId) continue;
      requireCondition(!rectanglesOverlap(obstacle, other), `${obstacle.id} overlaps ${other.id}`);
    }
  }
  for (const room of authoredRooms) {
    requireCondition(
      obstacles.filter(obstacle => obstacle.roomId === room.id).length >= 2,
      `${room.id} must receive room-specific furniture`,
    );
  }

  for (const connector of mission.connectors) {
    requireCondition(connector.rooms.length === 2, `${connector.id} must connect two spaces`);
    requireCondition(
      connector.rooms.every(spaceId => spaceId === 'exterior' || spacesById.has(spaceId)),
      `${connector.id} references a missing space`,
    );
    if (connector.kind === 'door') {
      requireCondition(doorsById.get(connector.doorId)?.connectorId === connector.id, `${connector.id} door ownership is invalid`);
    }
    if (connector.kind === 'window') {
      requireCondition(windowsById.get(connector.windowId)?.connectorId === connector.id, `${connector.id} window ownership is invalid`);
      requireCondition(connector.rooms.includes('exterior'), `${connector.id} window must face the exterior`);
    }
    for (const apertureId of connector.apertureIds ?? []) {
      requireCondition(aperturesById.get(apertureId)?.connectorId === connector.id, `${connector.id} aperture ownership is invalid`);
    }
  }
  for (const door of mission.doors) {
    requireCondition(connectorsById.get(door.connectorId)?.kind === 'door', `${door.id} connector ownership is invalid`);
    requireCondition(
      mission.geometry.walls.every(wall => !rectanglesOverlap(door, wall)),
      `${door.id} overlaps a solid wall`,
    );
  }
  for (const windowSpec of mission.windows) {
    requireCondition(connectorsById.get(windowSpec.connectorId)?.kind === 'window', `${windowSpec.id} connector ownership is invalid`);
    requireCondition(
      mission.geometry.walls.every(wall => !rectanglesOverlap(windowSpec, wall)),
      `${windowSpec.id} overlaps a solid wall`,
    );
  }
  for (const exit of mission.geometry.wallGapExits) {
    requireCondition(connectorsById.get(exit.connectorId)?.kind === 'window', `${exit.id} must belong to a window connector`);
  }

  const internalConnectors = mission.connectors.filter(connector => !connector.rooms.includes('exterior'));
  const adjacency = new Map(mission.rooms.map(space => [space.id, []]));
  for (const connector of internalConnectors) {
    adjacency.get(connector.rooms[0]).push(connector.rooms[1]);
    adjacency.get(connector.rooms[1]).push(connector.rooms[0]);
  }
  const reached = new Set([startingSpaces[0].id]);
  const queue = [startingSpaces[0].id];
  while (queue.length > 0) {
    const spaceId = queue.shift();
    for (const neighborId of adjacency.get(spaceId)) {
      if (reached.has(neighborId)) continue;
      reached.add(neighborId);
      queue.push(neighborId);
    }
  }
  requireCondition(reached.size === mission.rooms.length, 'all compiled spaces must be reachable');

  const objectiveRoom = spacesById.get(mission.objective.pickupRule.pickupRoomId);
  requireCondition(objectiveRoom?.role === 'secure_office', 'objective must be placed in the secure office');
  requireCondition(reached.has(objectiveRoom.id), 'objective space must be reachable');
  requireCondition(
    mission.objective.exfilPoints.length >= profile.entranceCount.min &&
    mission.objective.exfilPoints.length <= profile.entranceCount.max,
    'exfil count must satisfy the profile',
  );
  for (const exfil of mission.objective.exfilPoints) {
    requireCondition(connectorsById.get(exfil.connectorId)?.rooms.includes('exterior'), `${exfil.id} must use an exterior connector`);
  }
  const archiveRoom = authoredRooms.find(room => room.role === 'records_archive');
  const archiveConnectors = mission.connectors.filter(connector =>
    connector.rooms.includes(archiveRoom.id)
  );
  requireCondition(archiveConnectors.length === 1, 'records archive must have exactly one entrance');
  requireCondition(
    archiveConnectors[0].kind === 'door' && !archiveConnectors[0].rooms.includes('exterior'),
    'records archive entrance must be one internal door',
  );
  requireCondition(
    mission.windows.every(windowSpec =>
      !connectorsById.get(windowSpec.connectorId).rooms.includes(archiveRoom.id)
    ),
    'records archive cannot have an exterior window',
  );
  const archiveFurniture = obstacles.filter(obstacle => obstacle.roomId === archiveRoom.id);
  requireCondition(
    archiveFurniture.filter(obstacle => obstacle.kind === 'archive_bank').length >= 2,
    'records archive needs at least two filing banks',
  );
  requireCondition(
    archiveFurniture.filter(obstacle => obstacle.kind === 'archive_clerk_desk').length === 1,
    'records archive needs exactly one clerk desk',
  );

  requireCondition(mission.lighting.lamps.length === authoredRooms.length, 'every authored room must have one lamp');
  const breakableGeometry = [...mission.doors, ...mission.windows];
  const lampClearance = 12;
  for (const lamp of mission.lighting.lamps) {
    const room = spacesById.get(lamp.roomId);
    requireCondition(room?.spaceType === 'room', `${lamp.id} must belong to an authored room`);
    const boundary = {
      N: room.interior.y,
      S: room.interior.y + room.interior.h,
      W: room.interior.x,
      E: room.interior.x + room.interior.w,
    }[lamp.wallSide];
    const mountedOnWall = mission.geometry.walls.some(wall => {
      if (lamp.wallSide === 'N' || lamp.wallSide === 'S') {
        if (wall.w <= wall.h) return false;
        const touches = Math.abs(wall.y - boundary) < 0.001 ||
          Math.abs(wall.y + wall.h - boundary) < 0.001 ||
          Math.abs(wall.y + wall.h / 2 - boundary) < 0.001;
        return touches && lamp.x >= wall.x + lampClearance && lamp.x <= wall.x + wall.w - lampClearance;
      }
      if (wall.h <= wall.w) return false;
      const touches = Math.abs(wall.x - boundary) < 0.001 ||
        Math.abs(wall.x + wall.w - boundary) < 0.001 ||
        Math.abs(wall.x + wall.w / 2 - boundary) < 0.001;
      return touches && lamp.y >= wall.y + lampClearance && lamp.y <= wall.y + wall.h - lampClearance;
    });
    requireCondition(mountedOnWall, `${lamp.id} must be mounted on a solid wall`);
    requireCondition(
      breakableGeometry.every(item => !(
        lamp.x >= item.x - lampClearance && lamp.x <= item.x + item.w + lampClearance &&
        lamp.y >= item.y - lampClearance && lamp.y <= item.y + item.h + lampClearance
      )),
      `${lamp.id} overlaps breakable geometry`,
    );
  }

  requireCondition(
    mission.enemies.spawns.length >= profile.enemyCount.min &&
    mission.enemies.spawns.length <= profile.enemyCount.max,
    'enemy count must satisfy the profile',
  );
  for (let index = 0; index < mission.enemies.spawns.length; index++) {
    const enemy = mission.enemies.spawns[index];
    const room = spacesById.get(enemy.roomId);
    requireCondition(room?.spaceType === 'room', `${enemy.id} must belong to an authored room`);
    requireCondition(pointInsideSpace(enemy, room), `${enemy.id} must spawn inside its room`);
    requireCondition(!pointInsideBlockingGeometry(enemy), `${enemy.id} cannot spawn in blocking geometry`);
    requireCondition(enemy.patrolRoute.length >= 2, `${enemy.id} needs a patrol route`);
    for (const waypoint of enemy.patrolRoute) {
      requireCondition(!pointInsideBlockingGeometry(waypoint), `${enemy.id} patrol enters blocking geometry`);
    }
    for (let otherIndex = index + 1; otherIndex < mission.enemies.spawns.length; otherIndex++) {
      const other = mission.enemies.spawns[otherIndex];
      if (enemy.roomId !== other.roomId) continue;
      requireCondition(Math.hypot(enemy.x - other.x, enemy.y - other.y) >= 75, 'same-room enemies need personal space');
    }
  }

  for (const node of mission.enemies.navigation.nodes) {
    if (node.roomId) requireCondition(spacesById.has(node.roomId), `${node.id} references a missing space`);
    if (node.connectorId) requireCondition(connectorsById.has(node.connectorId), `${node.id} references a missing connector`);
  }
  for (const [from, to] of mission.enemies.navigation.edges) {
    requireCondition(navNodeIds.has(from) && navNodeIds.has(to), `navigation edge ${from}/${to} is invalid`);
  }
  for (const spaceId of mission.sound.rooms) requireCondition(spacesById.has(spaceId), `sound space ${spaceId} is invalid`);
  for (const connectorId of mission.sound.portals) {
    const connector = connectorsById.get(connectorId);
    requireCondition(connector && !connector.rooms.includes('exterior'), `sound portal ${connectorId} is invalid`);
  }
  return true;
}

function generateIrregularSeededMission(seedInput, profileId = 'local_government_office') {
  const seed = String(seedInput);
  const failures = [];
  for (let attempt = 0; attempt < IRREGULAR_GENERATION_MAX_ATTEMPTS; attempt++) {
    try {
      const mission = buildIrregularSeededMissionAttempt(seed, profileId, attempt);
      validateIrregularMissionDefinition(mission, profileId);
      return mission;
    } catch (error) {
      failures.push(`attempt ${attempt + 1}: ${error.message}`);
    }
  }
  throw new Error(
    `Could not generate valid irregular facility "${profileId}" for seed "${seed}" after ` +
    `${IRREGULAR_GENERATION_MAX_ATTEMPTS} attempts. ${failures.join(' | ')}`,
  );
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
    if (Math.abs(wall.y - boundary) > 0.001 &&
        Math.abs(wall.y + wall.h - boundary) > 0.001 &&
        Math.abs(wall.y + wall.h / 2 - boundary) > 0.001) return;
    const start = Math.max(left, wall.x);
    const end = Math.min(right, wall.x + wall.w);
    if (end - start < 36) return;
    candidates.push({ x: (start + end) / 2, y: boundary, wallSide, length: end - start });
  }

  function addVerticalCandidate(wall, boundary, wallSide) {
    if (wall.h <= wall.w) return;
    if (Math.abs(wall.x - boundary) > 0.001 &&
        Math.abs(wall.x + wall.w - boundary) > 0.001 &&
        Math.abs(wall.x + wall.w / 2 - boundary) > 0.001) return;
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

function generateSeededGridMission(seedInput, facilityConfig = {}) {
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
        moduleType: 'rect_standard',
        spaceType: 'room',
        roomSize: 'medium',
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
      seed,
      profileId: config.profile.id,
      generationVersion: config.profile.generationVersion,
      facilityProfile: config.profile,
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

function generateSeededMission(seedInput, facilityConfig = {}) {
  const profileId = facilityConfig.profileId === undefined
    ? 'tutorial_grid'
    : String(facilityConfig.profileId);
  const profile = NORMALIZED_FACILITY_PROFILES[profileId];
  if (!profile) throw new Error(`Unknown facility profile "${profileId}".`);
  if (profile.generatorKind === 'irregular') {
    return generateIrregularSeededMission(seedInput, profileId);
  }
  return generateSeededGridMission(seedInput, facilityConfig);
}
