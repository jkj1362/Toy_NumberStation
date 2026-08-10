function getRequestedMissionSeed() {
  if (globalThis.MISSION_SEED_OVERRIDE !== undefined) {
    return String(globalThis.MISSION_SEED_OVERRIDE);
  }
  if (typeof window !== 'undefined' && typeof URLSearchParams === 'function') {
    const seed = new URLSearchParams(window.location?.search ?? '').get('seed');
    if (seed) return seed;
  }
  return 'prototype-2';
}

function createNewMissionSeed() {
  const timePart = Date.now().toString(36);
  const randomPart = Math.floor(Math.random() * 0xffffffff).toString(36);
  return `${timePart}-${randomPart}`;
}

function getRequestedGenerationConfig() {
  if (globalThis.MISSION_GENERATION_CONFIG_OVERRIDE) {
    return { ...globalThis.MISSION_GENERATION_CONFIG_OVERRIDE };
  }
  if (typeof window === 'undefined' || typeof URLSearchParams !== 'function') return {};
  const params = new URLSearchParams(window.location?.search ?? '');
  const config = {};
  if (params.has('rows')) config.rows = params.get('rows');
  if (params.has('columns')) config.columns = params.get('columns');
  if (params.has('enemies')) config.enemyCount = params.get('enemies');
  return config;
}

const CURRENT_RUN = (() => {
  let requestedReference = globalThis.MISSION_USE_REFERENCE === true;
  if (!requestedReference && typeof window !== 'undefined' && typeof URLSearchParams === 'function') {
    requestedReference = new URLSearchParams(window.location?.search ?? '').get('mission') === 'reference';
  }
  const override = globalThis.MISSION_DEFINITION_OVERRIDE ??
    (requestedReference ? REFERENCE_MISSION : null);
  if (override) {
    return Object.freeze({
      seed: null,
      generated: false,
      missionDefinition: override,
    });
  }
  const seed = getRequestedMissionSeed();
  const generationConfig = getRequestedGenerationConfig();
  return Object.freeze({
    seed,
    generated: true,
    generationConfig: Object.freeze({ ...generationConfig }),
    missionDefinition: generateSeededMission(seed, generationConfig),
  });
})();
const ACTIVE_MISSION = CURRENT_RUN.missionDefinition;

function restartWithNewRun(seed = createNewMissionSeed()) {
  if (typeof window === 'undefined' || !window.location) return false;
  const params = new URLSearchParams(window.location.search);
  params.set('seed', String(seed));
  window.location.search = params.toString();
  return true;
}
