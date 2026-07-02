const TUNING_DEFAULTS = {
  debugAll: true,
  debugEnemySight: true,
  debugEnemyLabels: true,
  debugSoundSource: false,
  debugSoundAttenuation: false,
  debugSoundAllPaths: false,
  debugPerfOverlay: true,
  debugMapOverlay: true,
  debugSecondaryExfil: true,
  debugDoorHpBars: true,

  soundGunshotRadius: 350,
  soundFootstepRadius: 120,
  soundWallTransmission: 0.12,
  soundClosedDoorTransmission: 0.8,
  soundDoorDetourRatio: 1.5,
  soundVagueSourceDistance: 75,
  soundLifetime: 30,
  soundGunshotCueLifetime: 72,
  soundFootstepCueLifetime: 48,
  soundDefaultCueLifetime: 42,
  soundAttenuationDebugLifetime: 42,
  enemyFootstepCueRadius: 600,
  enemyFootstepCueInterval: 18,

  globalAmbient: 0,
  playerVisibleLightThreshold: 0.14,
  enemyDimLightThreshold: 0.18,
  enemyBrightLightThreshold: 0.35,
  roomLampRadius: 900,
  roomLampIntensity: 1,
  roomLampFalloffPower: 1.45,
  doorLightRange: 320,
  doorLightIntensity: 0.62,
  doorLightFalloffPower: 0.7,
  doorLightSpreadDegrees: 63,

  playerSneakSpeed: 0.8,
  playerWalkSpeed: 2.25,
  playerSprintSpeed: 4,
  playerSneakNoiseScale: 0.45,
  playerWalkNoiseScale: 1,
  playerSprintNoiseScale: 1.6,
  walkModeStickThreshold: 0.85,
  playerMaxHealth: 100,
  playerProjectileDamage: 100,
  playerRadius: 28,
  playerVisionAngleDegrees: 120,
  hardAimVisionMultiplier: 0.5,
  hardAimMagnetEnabled: true,
  hardAimMagnetAngleDegrees: 13,
  hardAimMagnetRange: 520,
  hardAimMagnetStrength: 0.25,
  hardAimMagnetReleaseFrames: 10,
  playerGlowRadius: 80,
  playerProximityRadius: 35,

  enemyAlertFrames: 180,
  enemySuspicionTimeout: 300,
  enemyReactionDelay: 45,
  enemySuspicionConfirmDelay: 75,
  enemyCautiousFrames: 1800,
  enemyRadius: 16,
  enemyHitRadius: 20,
  enemyProjectileHitRadius: 18,
  enemyPlayerVisibilitySampleRadius: 18,
  enemyVisionAngleDegrees: 120,
  enemyProximityRadius: 50,
  enemyPatrolSpeed: 1.5,
  enemyArrivalRadius: 8,
  enemyDoorwayArrivalRadius: 36,
  enemyMaxHealth: 100,
  enemyProjectileDamage: 50,
  enemyMeleeDamage: 25,
  enemyMeleeRange: 18,
  enemyMeleeCooldownFrames: 60,
  enemyShootingRange: 360,
  enemyShootingRangeTolerance: 40,
  enemyShotCooldownFrames: 75,
  enemyShotSpeed: 25,
  enemyAimSpreadDegrees: 9,
  playerHitFlashFrames: 18,
  enemyHitFlashFrames: 10,
  enemySearchSweepRate: 0.016,

  doorMaxHp: 60,
  doorDamage: 20,
  doorInteractRadius: 45,
  doorOpenAngleDegrees: 75,

  interactRadius: 30,
  exfilRadius: 40,
  corpseInteractRadius: 34,
  cameraSoftLookaheadDistance: 108,
  cameraHardAimDistance: 1920,
  cameraCornerPadding: 48,
  cameraHardAimOcclusionPadding: 48,
  cameraEase: 0.18,
  cameraLookaheadEase: 0.16,
  fogRenderScale: 2,
  inputDeadzone: 0.15,
};

const tuningState = { ...TUNING_DEFAULTS };

const TUNING_SECTIONS = [
  {
    title: 'Debug Overlays',
    controls: [
      { key: 'debugAll', label: 'All Debug Overlays', type: 'toggle' },
      { key: 'debugEnemySight', label: 'Enemy sight cones', type: 'toggle', debugChild: true },
      { key: 'debugEnemyLabels', label: 'Enemy labels', type: 'toggle', debugChild: true },
      { key: 'debugSoundSource', label: 'Sound source rings', type: 'toggle', debugChild: true },
      { key: 'debugSoundAttenuation', label: 'Sound attenuation paths', type: 'toggle', debugChild: true },
      { key: 'debugSoundAllPaths', label: 'Sound all paths', type: 'toggle', debugChild: true },
      { key: 'debugPerfOverlay', label: 'Performance overlay', type: 'toggle', debugChild: true },
      { key: 'debugMapOverlay', label: 'Map overlay', type: 'toggle', debugChild: true },
      { key: 'debugSecondaryExfil', label: 'Secondary exfil marker', type: 'toggle', debugChild: true },
      { key: 'debugDoorHpBars', label: 'Door HP bars', type: 'toggle', debugChild: true },
    ],
  },
  {
    title: 'Sound',
    controls: [
      { key: 'soundGunshotRadius', label: 'Gunshot radius', min: 80, max: 900, step: 10, unit: 'u' },
      { key: 'soundFootstepRadius', label: 'Footstep radius', min: 20, max: 360, step: 5, unit: 'u' },
      { key: 'soundWallTransmission', label: 'Wall transmission', min: 0, max: 1, step: 0.01, decimals: 2 },
      { key: 'soundClosedDoorTransmission', label: 'Door transmission', min: 0, max: 1, step: 0.01, decimals: 2 },
      { key: 'soundDoorDetourRatio', label: 'Door detour ratio', min: 1, max: 4, step: 0.05, decimals: 2 },
      { key: 'soundVagueSourceDistance', label: 'Vague source distance', min: 0, max: 240, step: 5, unit: 'u' },
      { key: 'soundLifetime', label: 'Source ring lifetime', min: 5, max: 180, step: 1, unit: 'f' },
      { key: 'soundGunshotCueLifetime', label: 'Gunshot cue lifetime', min: 5, max: 240, step: 1, unit: 'f' },
      { key: 'soundFootstepCueLifetime', label: 'Footstep cue lifetime', min: 5, max: 180, step: 1, unit: 'f' },
      { key: 'soundDefaultCueLifetime', label: 'Default cue lifetime', min: 5, max: 180, step: 1, unit: 'f' },
      { key: 'soundAttenuationDebugLifetime', label: 'Path debug lifetime', min: 5, max: 180, step: 1, unit: 'f' },
      { key: 'enemyFootstepCueRadius', label: 'Enemy footstep cue radius', min: 40, max: 1200, step: 10, unit: 'u' },
      { key: 'enemyFootstepCueInterval', label: 'Enemy footstep interval', min: 1, max: 90, step: 1, unit: 'f' },
    ],
  },
  {
    title: 'Lighting',
    controls: [
      { key: 'globalAmbient', label: 'Global ambient', min: 0, max: 1, step: 0.01, decimals: 2 },
      { key: 'playerVisibleLightThreshold', label: 'Player visible threshold', min: 0, max: 1, step: 0.01, decimals: 2 },
      { key: 'enemyDimLightThreshold', label: 'Enemy dim threshold', min: 0, max: 1, step: 0.01, decimals: 2 },
      { key: 'enemyBrightLightThreshold', label: 'Enemy bright threshold', min: 0, max: 1, step: 0.01, decimals: 2 },
      { key: 'roomLampRadius', label: 'Room lamp radius', min: 80, max: 1500, step: 10, unit: 'u' },
      { key: 'roomLampIntensity', label: 'Room lamp intensity', min: 0, max: 2, step: 0.01, decimals: 2 },
      { key: 'roomLampFalloffPower', label: 'Room lamp falloff', min: 0.2, max: 4, step: 0.05, decimals: 2 },
      { key: 'doorLightRange', label: 'Door light range', min: 40, max: 800, step: 10, unit: 'u' },
      { key: 'doorLightIntensity', label: 'Door light intensity', min: 0, max: 2, step: 0.01, decimals: 2 },
      { key: 'doorLightFalloffPower', label: 'Door light falloff', min: 0.2, max: 4, step: 0.05, decimals: 2 },
      { key: 'doorLightSpreadDegrees', label: 'Door light spread', min: 10, max: 180, step: 1, unit: 'deg' },
    ],
  },
  {
    title: 'Player',
    controls: [
      { key: 'playerSneakSpeed', label: 'Sneak speed', min: 0.2, max: 4, step: 0.05, decimals: 2 },
      { key: 'playerWalkSpeed', label: 'Walk speed', min: 0.5, max: 6, step: 0.05, decimals: 2 },
      { key: 'playerSprintSpeed', label: 'Sprint speed', min: 1, max: 9, step: 0.05, decimals: 2 },
      { key: 'playerSneakNoiseScale', label: 'Sneak noise', min: 0, max: 2, step: 0.01, decimals: 2 },
      { key: 'playerWalkNoiseScale', label: 'Walk noise', min: 0, max: 3, step: 0.01, decimals: 2 },
      { key: 'playerSprintNoiseScale', label: 'Sprint noise', min: 0, max: 4, step: 0.01, decimals: 2 },
      { key: 'walkModeStickThreshold', label: 'Analog walk threshold', min: 0, max: 1, step: 0.01, decimals: 2 },
      { key: 'playerMaxHealth', label: 'Max health', min: 1, max: 300, step: 1, unit: 'hp' },
      { key: 'playerProjectileDamage', label: 'Shot damage', min: 1, max: 300, step: 1, unit: 'dmg' },
      { key: 'playerRadius', label: 'Collision radius', min: 8, max: 60, step: 1, unit: 'u' },
      { key: 'playerVisionAngleDegrees', label: 'Vision angle', min: 45, max: 180, step: 1, unit: 'deg' },
      { key: 'hardAimVisionMultiplier', label: 'Hard-aim cone multiplier', min: 0.1, max: 1, step: 0.01, decimals: 2 },
      { key: 'hardAimMagnetEnabled', label: 'Hard-aim magnet', type: 'toggle' },
      { key: 'hardAimMagnetAngleDegrees', label: 'Magnet angle', min: 1, max: 45, step: 1, unit: 'deg' },
      { key: 'hardAimMagnetRange', label: 'Magnet range', min: 40, max: 1200, step: 10, unit: 'u' },
      { key: 'hardAimMagnetStrength', label: 'Magnet strength', min: 0, max: 1, step: 0.01, decimals: 2 },
      { key: 'hardAimMagnetReleaseFrames', label: 'Magnet release', min: 0, max: 60, step: 1, unit: 'f' },
      { key: 'playerGlowRadius', label: 'Glow radius', min: 0, max: 300, step: 5, unit: 'u' },
      { key: 'playerProximityRadius', label: 'Proximity radius', min: 0, max: 200, step: 5, unit: 'u' },
    ],
  },
  {
    title: 'Enemy',
    controls: [
      { key: 'enemyAlertFrames', label: 'Alert duration', min: 1, max: 600, step: 1, unit: 'f' },
      { key: 'enemySuspicionTimeout', label: 'Suspicion timeout', min: 1, max: 900, step: 1, unit: 'f' },
      { key: 'enemyReactionDelay', label: 'Reaction delay', min: 0, max: 180, step: 1, unit: 'f' },
      { key: 'enemySuspicionConfirmDelay', label: 'Confirm delay', min: 0, max: 240, step: 1, unit: 'f' },
      { key: 'enemyCautiousFrames', label: 'Cautious duration', min: 0, max: 3600, step: 30, unit: 'f' },
      { key: 'enemyRadius', label: 'Collision radius', min: 6, max: 50, step: 1, unit: 'u' },
      { key: 'enemyHitRadius', label: 'Hit radius', min: 6, max: 60, step: 1, unit: 'u' },
      { key: 'enemyProjectileHitRadius', label: 'Projectile hit radius', min: 4, max: 60, step: 1, unit: 'u' },
      { key: 'enemyPlayerVisibilitySampleRadius', label: 'Body sample radius', min: 0, max: 60, step: 1, unit: 'u' },
      { key: 'enemyVisionAngleDegrees', label: 'Vision angle', min: 30, max: 180, step: 1, unit: 'deg' },
      { key: 'enemyProximityRadius', label: 'Proximity radius', min: 0, max: 200, step: 5, unit: 'u' },
      { key: 'enemyPatrolSpeed', label: 'Patrol speed', min: 0.1, max: 6, step: 0.05, decimals: 2 },
      { key: 'enemyArrivalRadius', label: 'Arrival radius', min: 1, max: 50, step: 1, unit: 'u' },
      { key: 'enemyDoorwayArrivalRadius', label: 'Doorway arrival radius', min: 5, max: 100, step: 1, unit: 'u' },
      { key: 'enemyMaxHealth', label: 'Max health', min: 1, max: 300, step: 1, unit: 'hp' },
      { key: 'enemyProjectileDamage', label: 'Projectile damage', min: 1, max: 200, step: 1, unit: 'dmg' },
      { key: 'enemyMeleeDamage', label: 'Melee damage', min: 1, max: 200, step: 1, unit: 'dmg' },
      { key: 'enemyMeleeRange', label: 'Melee range', min: 0, max: 80, step: 1, unit: 'u' },
      { key: 'enemyMeleeCooldownFrames', label: 'Melee cooldown', min: 1, max: 240, step: 1, unit: 'f' },
      { key: 'enemyShootingRange', label: 'Shooting range', min: 40, max: 1200, step: 10, unit: 'u' },
      { key: 'enemyShootingRangeTolerance', label: 'Shooting tolerance', min: 0, max: 200, step: 5, unit: 'u' },
      { key: 'enemyShotCooldownFrames', label: 'Shot cooldown', min: 1, max: 240, step: 1, unit: 'f' },
      { key: 'enemyShotSpeed', label: 'Shot speed', min: 1, max: 80, step: 1 },
      { key: 'enemyAimSpreadDegrees', label: 'Aim spread', min: 0, max: 45, step: 1, unit: 'deg' },
      { key: 'playerHitFlashFrames', label: 'Player hit flash', min: 1, max: 120, step: 1, unit: 'f' },
      { key: 'enemyHitFlashFrames', label: 'Enemy hit flash', min: 1, max: 120, step: 1, unit: 'f' },
      { key: 'enemySearchSweepRate', label: 'Search sweep rate', min: 0.001, max: 0.08, step: 0.001, decimals: 3 },
    ],
  },
  {
    title: 'Doors and Mission',
    controls: [
      { key: 'doorMaxHp', label: 'Door max HP', min: 1, max: 300, step: 1, unit: 'hp' },
      { key: 'doorDamage', label: 'Door damage per shot', min: 1, max: 120, step: 1, unit: 'dmg' },
      { key: 'doorInteractRadius', label: 'Door interact radius', min: 10, max: 120, step: 1, unit: 'u' },
      { key: 'doorOpenAngleDegrees', label: 'Door open angle', min: 15, max: 150, step: 1, unit: 'deg' },
      { key: 'interactRadius', label: 'Objective interact radius', min: 10, max: 120, step: 1, unit: 'u' },
      { key: 'exfilRadius', label: 'Exfil radius', min: 10, max: 140, step: 1, unit: 'u' },
      { key: 'corpseInteractRadius', label: 'Corpse interact radius', min: 10, max: 120, step: 1, unit: 'u' },
    ],
  },
  {
    title: 'Camera and Input',
    controls: [
      { key: 'cameraSoftLookaheadDistance', label: 'Soft lookahead', min: 0, max: 400, step: 5, unit: 'px' },
      { key: 'cameraHardAimDistance', label: 'Hard-aim lookahead', min: 0, max: 2400, step: 20, unit: 'px' },
      { key: 'cameraCornerPadding', label: 'Corner padding', min: 0, max: 160, step: 1, unit: 'u' },
      { key: 'cameraHardAimOcclusionPadding', label: 'Occlusion padding', min: 0, max: 160, step: 1, unit: 'u' },
      { key: 'cameraEase', label: 'Camera ease', min: 0.01, max: 1, step: 0.01, decimals: 2 },
      { key: 'cameraLookaheadEase', label: 'Lookahead ease', min: 0.01, max: 1, step: 0.01, decimals: 2 },
      { key: 'fogRenderScale', label: 'Fog render scale', min: 1, max: 6, step: 1 },
      { key: 'inputDeadzone', label: 'Input deadzone', min: 0, max: 0.5, step: 0.01, decimals: 2 },
    ],
  },
];

function getTuningValue(key, fallback) {
  return Object.prototype.hasOwnProperty.call(tuningState, key) ? tuningState[key] : fallback;
}

function getTuningNumber(key, fallback) {
  const value = Number(getTuningValue(key, fallback));
  return Number.isFinite(value) ? value : fallback;
}

function getTuningBoolean(key, fallback = false) {
  const value = getTuningValue(key, fallback);
  return value === true;
}

function getTuningRadians(key, fallbackDegrees) {
  return getTuningNumber(key, fallbackDegrees) * Math.PI / 180;
}

function setTuningValue(key, value) {
  tuningState[key] = value;
  window.dispatchEvent(new CustomEvent('tuningchange', { detail: { key, value } }));
}

function isDebugOverlayEnabled(key) {
  return getTuningBoolean('debugAll', true) && getTuningBoolean(key, false);
}

function formatTuningValue(control) {
  const value = getTuningValue(control.key, TUNING_DEFAULTS[control.key]);
  if (control.type === 'toggle') return value ? 'on' : 'off';
  const decimals = control.decimals ?? (Number.isInteger(Number(control.step)) ? 0 : 2);
  const numeric = Number(value);
  const text = Number.isFinite(numeric) ? numeric.toFixed(decimals) : String(value);
  return `${text}${control.unit ? ` ${control.unit}` : ''}`;
}

function updateDebugChildrenState(panel) {
  const disabled = !getTuningBoolean('debugAll', true);
  for (const input of panel.querySelectorAll('[data-debug-child="true"]')) {
    input.disabled = disabled;
    input.closest('.tuning-control')?.classList.toggle('is-disabled', disabled);
  }
}

function createTuningControl(control, panel) {
  const row = document.createElement('label');
  row.className = 'tuning-control';
  if (control.debugChild) row.dataset.debugChildRow = 'true';

  const name = document.createElement('span');
  name.className = 'tuning-label';
  name.textContent = control.label;
  row.appendChild(name);

  const value = document.createElement('span');
  value.className = 'tuning-value';
  value.textContent = formatTuningValue(control);

  if (control.type === 'toggle') {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = getTuningBoolean(control.key, TUNING_DEFAULTS[control.key]);
    checkbox.dataset.key = control.key;
    if (control.debugChild) checkbox.dataset.debugChild = 'true';
    checkbox.addEventListener('change', () => {
      setTuningValue(control.key, checkbox.checked);
      value.textContent = formatTuningValue(control);
      if (control.key === 'debugAll') updateDebugChildrenState(panel);
    });
    row.appendChild(checkbox);
  } else {
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(control.min);
    slider.max = String(control.max);
    slider.step = String(control.step);
    slider.value = String(getTuningNumber(control.key, TUNING_DEFAULTS[control.key]));
    slider.dataset.key = control.key;
    slider.addEventListener('input', () => {
      const step = Number(control.step);
      const raw = Number(slider.value);
      setTuningValue(control.key, Number.isInteger(step) ? Math.round(raw) : raw);
      value.textContent = formatTuningValue(control);
    });
    row.appendChild(slider);
  }

  row.appendChild(value);
  return row;
}

function initTuningUi() {
  const toggle = document.createElement('button');
  toggle.id = 'tuning-toggle';
  toggle.type = 'button';
  toggle.textContent = 'Tune';
  toggle.setAttribute('aria-expanded', 'false');

  const panel = document.createElement('aside');
  panel.id = 'tuning-panel';
  panel.setAttribute('aria-label', 'Tuning and debug controls');
  panel.setAttribute('aria-hidden', 'true');

  const stopGamePointerInput = (event) => {
    event.stopPropagation();
  };
  for (const eventName of ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'mousemove', 'click', 'dblclick', 'contextmenu', 'wheel']) {
    toggle.addEventListener(eventName, stopGamePointerInput);
    panel.addEventListener(eventName, stopGamePointerInput);
  }

  const header = document.createElement('div');
  header.className = 'tuning-header';
  const title = document.createElement('h2');
  title.textContent = 'Tuning';
  const close = document.createElement('button');
  close.type = 'button';
  close.textContent = 'Close';
  close.addEventListener('click', () => setTuningOpen(false));
  header.append(title, close);
  panel.appendChild(header);

  const content = document.createElement('div');
  content.className = 'tuning-content';
  panel.appendChild(content);

  for (const section of TUNING_SECTIONS) {
    const details = document.createElement('details');
    details.className = 'tuning-section';
    details.open = section.title === 'Debug Overlays' || section.title === 'Sound';
    const summary = document.createElement('summary');
    summary.textContent = section.title;
    details.appendChild(summary);
    for (const control of section.controls) {
      details.appendChild(createTuningControl(control, panel));
    }
    content.appendChild(details);
  }

  function setTuningOpen(open) {
    document.body.classList.toggle('tuning-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    panel.setAttribute('aria-hidden', String(!open));
  }

  toggle.addEventListener('click', () => {
    setTuningOpen(!document.body.classList.contains('tuning-open'));
  });

  document.body.append(toggle, panel);
  updateDebugChildrenState(panel);
}

function injectTuningStyles() {
  const style = document.createElement('style');
  style.textContent = `
    #tuning-toggle {
      position: fixed;
      right: 0;
      top: 50%;
      z-index: 20;
      transform: translateY(-50%);
      min-width: 44px;
      min-height: 88px;
      padding: 10px 8px;
      border: 1px solid rgba(214, 232, 255, 0.45);
      border-right: 0;
      border-radius: 8px 0 0 8px;
      background: rgba(12, 18, 24, 0.92);
      color: #d8f6ff;
      font: 700 13px/1.1 system-ui, sans-serif;
      writing-mode: vertical-rl;
      text-orientation: mixed;
      cursor: pointer;
    }

    #tuning-panel {
      position: fixed;
      inset: 0 0 0 auto;
      z-index: 19;
      width: min(440px, 44vw);
      max-width: 100vw;
      transform: translateX(100%);
      transition: transform 140ms ease-out;
      background: rgba(8, 12, 16, 0.96);
      border-left: 1px solid rgba(214, 232, 255, 0.2);
      color: #d8f6ff;
      font: 13px/1.35 system-ui, sans-serif;
      box-shadow: -18px 0 40px rgba(0, 0, 0, 0.42);
    }

    .tuning-open #tuning-panel {
      transform: translateX(0);
    }

    .tuning-open #tuning-toggle {
      right: min(440px, 44vw);
    }

    .tuning-header {
      height: 56px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 0 16px;
      border-bottom: 1px solid rgba(214, 232, 255, 0.16);
    }

    .tuning-header h2 {
      margin: 0;
      font-size: 18px;
      font-weight: 800;
      letter-spacing: 0;
    }

    .tuning-header button {
      border: 1px solid rgba(214, 232, 255, 0.32);
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.08);
      color: #d8f6ff;
      padding: 7px 10px;
      cursor: pointer;
    }

    .tuning-content {
      height: calc(100vh - 56px);
      overflow: auto;
      padding: 10px 12px 18px;
    }

    .tuning-section {
      border-bottom: 1px solid rgba(214, 232, 255, 0.12);
      padding: 6px 0;
    }

    .tuning-section summary {
      cursor: pointer;
      font-size: 14px;
      font-weight: 800;
      padding: 8px 4px;
      user-select: none;
    }

    .tuning-control {
      display: grid;
      grid-template-columns: minmax(124px, 1fr) minmax(112px, 1fr) 64px;
      align-items: center;
      gap: 8px;
      min-height: 34px;
      padding: 3px 4px;
    }

    .tuning-control input[type="range"] {
      width: 100%;
      accent-color: #69d7ff;
    }

    .tuning-control input[type="checkbox"] {
      width: 18px;
      height: 18px;
      accent-color: #69d7ff;
      justify-self: start;
    }

    .tuning-control.is-disabled {
      opacity: 0.42;
    }

    .tuning-label {
      color: #e8fbff;
      min-width: 0;
    }

    .tuning-value {
      color: #90d7ef;
      font: 700 12px/1.2 ui-monospace, SFMono-Regular, Consolas, monospace;
      text-align: right;
      white-space: nowrap;
    }

    @media (max-width: 820px) {
      #tuning-panel {
        width: min(380px, 88vw);
      }

      .tuning-open #tuning-toggle {
        right: min(380px, 88vw);
      }

      .tuning-control {
        grid-template-columns: 1fr;
        gap: 4px;
        padding: 7px 4px;
      }

      .tuning-value {
        text-align: left;
      }
    }
  `;
  document.head.appendChild(style);
}

function initTuningWhenReady() {
  injectTuningStyles();
  initTuningUi();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTuningWhenReady);
} else {
  initTuningWhenReady();
}
