const LIGHT_GLOBAL_AMBIENT = 0.0;
const PLAYER_VISIBLE_LIGHT_THRESHOLD = 0.14;
const ENEMY_DIM_LIGHT_THRESHOLD = 0.18;
const ENEMY_BRIGHT_LIGHT_THRESHOLD = 0.35;

let lightingGlobalAmbient = LIGHT_GLOBAL_AMBIENT;
let lightingLamps = [];
let lightingZones = [];
let lightCanvas = document.createElement('canvas');
let lightCtx = lightCanvas.getContext('2d');

function clampLight(v) {
  return Math.max(0, Math.min(1, v));
}

function scaleLightingRect(r) {
  return {
    ...r,
    x: scaleGameX(r.x),
    y: scaleGameY(r.y),
    w: scaleGameX(r.w),
    h: scaleGameY(r.h),
  };
}

function scaleLightingLamp(lamp) {
  const scaled = {
    ...scaleGamePoint(lamp),
    radius: scaleGameUnit(lamp.radius ?? lamp.range),
    intensity: lamp.intensity ?? 1.0,
    falloffPower: lamp.falloffPower ?? 0.9,
    active: lamp.active !== false,
    defaultActive: lamp.active !== false,
  };
  const [odx, ody] = getLampOffset(scaled);
  scaled.lightX = scaled.x + odx;
  scaled.lightY = scaled.y + ody;
  return scaled;
}

function initLighting(missionLighting) {
  lightingGlobalAmbient = clampLight(missionLighting.globalAmbient ?? LIGHT_GLOBAL_AMBIENT);
  lightingZones = (missionLighting.zones ?? []).map(zone => ({
    ...scaleLightingRect(zone),
    ambient: clampLight(zone.ambient ?? 0),
  }));
  lightingLamps = (missionLighting.lamps ?? []).map(scaleLightingLamp);
  for (const lamp of lightingLamps) {
    lamp.visibilityPolygon = computeLampVisibilityPolygon(lamp);
  }
}

function resetLighting() {
  for (const lamp of lightingLamps) {
    lamp.active = lamp.defaultActive;
  }
}

function getLampOffset(lamp) {
  if (lamp.wallSide === 'N') return [0, scaleGameY(8)];
  if (lamp.wallSide === 'S') return [0, -scaleGameY(8)];
  if (lamp.wallSide === 'E') return [-scaleGameX(8), 0];
  return [scaleGameX(8), 0];
}

function pointInLampHalfPlane(lamp, wx, wy) {
  if (lamp.wallSide === 'N') return wy >= lamp.y - scaleGameY(18);
  if (lamp.wallSide === 'S') return wy <= lamp.y + scaleGameY(18);
  if (lamp.wallSide === 'E') return wx <= lamp.x + scaleGameX(18);
  return wx >= lamp.x - scaleGameX(18);
}

function pointInPolygon(points, wx, wy) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const pi = points[i];
    const pj = points[j];
    const intersects = ((pi.y > wy) !== (pj.y > wy)) &&
      (wx < (pj.x - pi.x) * (wy - pi.y) / (pj.y - pi.y) + pi.x);
    if (intersects) inside = !inside;
  }
  return inside;
}

function castLampRay(lamp, angle) {
  const hit = castVisRay(lamp.lightX, lamp.lightY, angle);
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  if (!hit) {
    return { x: lamp.lightX + dx * lamp.radius, y: lamp.lightY + dy * lamp.radius };
  }

  const hx = hit.x - lamp.lightX;
  const hy = hit.y - lamp.lightY;
  const hitDist = Math.hypot(hx, hy);
  const dist = Math.min(hitDist, lamp.radius);
  return { x: lamp.lightX + dx * dist, y: lamp.lightY + dy * dist };
}

function computeLampVisibilityPolygon(lamp) {
  const eps = 0.0001;
  const angles = [];

  for (const corner of WALL_CORNERS) {
    const angle = Math.atan2(corner.y - lamp.lightY, corner.x - lamp.lightX);
    angles.push(angle - eps, angle, angle + eps);
  }

  for (let i = 0; i < 96; i++) {
    angles.push((Math.PI * 2 * i) / 96);
  }

  const rays = [];
  for (const angle of angles) {
    const p = castLampRay(lamp, angle);
    rays.push({ ...p, angle: Math.atan2(p.y - lamp.lightY, p.x - lamp.lightX) });
  }

  rays.sort((a, b) => a.angle - b.angle);
  return rays;
}

function getLampContribution(lamp, wx, wy) {
  if (!lamp.active || !pointInLampHalfPlane(lamp, wx, wy)) return 0;
  if (!lamp.visibilityPolygon || !pointInPolygon(lamp.visibilityPolygon, wx, wy)) return 0;

  const dx = wx - lamp.lightX;
  const dy = wy - lamp.lightY;
  const dist = Math.hypot(dx, dy);
  if (dist > lamp.radius) return 0;

  const t = dist / lamp.radius;
  const falloff = Math.pow(1 - t, lamp.falloffPower);
  return clampLight(lamp.intensity * falloff);
}

function getPlayerGlowContribution(wx, wy) {
  const dx = wx - player.x;
  const dy = wy - player.y;
  const dist = Math.hypot(dx, dy);
  if (dist > PLAYER_GLOW_RADIUS) return 0;

  const t = dist / PLAYER_GLOW_RADIUS;
  return t <= 0.4 ? 1 : (1 - t) / 0.6;
}

function getZoneAmbient(wx, wy) {
  let ambient = 0;
  for (const zone of lightingZones) {
    if (wx >= zone.x && wx <= zone.x + zone.w &&
        wy >= zone.y && wy <= zone.y + zone.h) {
      ambient = Math.max(ambient, zone.ambient);
    }
  }
  return ambient;
}

function getLightLevel(wx, wy, options = {}) {
  let light = lightingGlobalAmbient;
  light = Math.max(light, getZoneAmbient(wx, wy));

  for (const lamp of lightingLamps) {
    light = Math.max(light, getLampContribution(lamp, wx, wy));
  }

  if (options.includePlayerGlow === true) {
    light = Math.max(light, getPlayerGlowContribution(wx, wy));
  }

  return clampLight(light);
}

function isLit(wx, wy) {
  return getLightLevel(wx, wy, { includePlayerGlow: true }) >= PLAYER_VISIBLE_LIGHT_THRESHOLD;
}

function isLitByLamps(wx, wy) {
  return getLightLevel(wx, wy, { includePlayerGlow: false }) >= ENEMY_BRIGHT_LIGHT_THRESHOLD;
}

function hitLampAt(wx, wy) {
  const hitRadius = scaleGameUnit(10);
  for (const lamp of lightingLamps) {
    if (!lamp.active) continue;
    const dx = wx - lamp.x;
    const dy = wy - lamp.y;
    if (dx * dx + dy * dy <= hitRadius * hitRadius) {
      lamp.active = false;
      return true;
    }
  }
  return false;
}

function applyDarknessCutout(alpha) {
  lightCtx.fillStyle = `rgba(255,255,255,${clampLight(alpha)})`;
  lightCtx.fill();
}

function drawAmbientZones() {
  for (const zone of lightingZones) {
    if (zone.ambient <= 0) continue;
    lightCtx.save();
    lightCtx.beginPath();
    lightCtx.rect(zone.x, zone.y, zone.w, zone.h);
    applyDarknessCutout(zone.ambient);
    lightCtx.restore();
  }
}

function drawLampLight(lamp) {
  if (!lamp.active || !lamp.visibilityPolygon || lamp.visibilityPolygon.length < 3) return;

  const W = lightCanvas.width;
  const H = lightCanvas.height;

  lightCtx.save();
  lightCtx.beginPath();
  if (lamp.wallSide === 'N') lightCtx.rect(0, lamp.y - scaleGameY(18), W, H);
  else if (lamp.wallSide === 'S') lightCtx.rect(0, 0, W, lamp.y + scaleGameY(18));
  else if (lamp.wallSide === 'E') lightCtx.rect(0, 0, lamp.x + scaleGameX(18), H);
  else lightCtx.rect(lamp.x - scaleGameX(18), 0, W, H);
  lightCtx.clip();

  lightCtx.beginPath();
  lightCtx.moveTo(lamp.visibilityPolygon[0].x, lamp.visibilityPolygon[0].y);
  for (let i = 1; i < lamp.visibilityPolygon.length; i++) {
    lightCtx.lineTo(lamp.visibilityPolygon[i].x, lamp.visibilityPolygon[i].y);
  }
  lightCtx.closePath();
  lightCtx.clip();

  const intensity = clampLight(lamp.intensity);
  const falloffAt = (t) => intensity * Math.pow(1 - t, lamp.falloffPower);
  const grad = lightCtx.createRadialGradient(lamp.lightX, lamp.lightY, 0, lamp.lightX, lamp.lightY, lamp.radius);
  grad.addColorStop(0, `rgba(255,255,255,${falloffAt(0)})`);
  grad.addColorStop(0.45, `rgba(255,255,255,${falloffAt(0.45)})`);
  grad.addColorStop(0.75, `rgba(255,255,255,${falloffAt(0.75)})`);
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  lightCtx.fillStyle = grad;
  lightCtx.beginPath();
  lightCtx.arc(lamp.lightX, lamp.lightY, lamp.radius, 0, Math.PI * 2);
  lightCtx.fill();
  lightCtx.restore();
}

function drawPlayerGlow() {
  const pg = lightCtx.createRadialGradient(player.x, player.y, 0, player.x, player.y, PLAYER_GLOW_RADIUS);
  pg.addColorStop(0, 'rgba(255,255,255,1)');
  pg.addColorStop(0.4, 'rgba(255,255,255,1)');
  pg.addColorStop(1, 'rgba(255,255,255,0)');
  lightCtx.fillStyle = pg;
  lightCtx.beginPath();
  lightCtx.arc(player.x, player.y, PLAYER_GLOW_RADIUS, 0, Math.PI * 2);
  lightCtx.fill();
}

function drawLamps() {
  for (const lamp of lightingLamps) {
    ctx.fillStyle = lamp.active ? lamp.color : '#444';
    ctx.beginPath();
    ctx.arc(lamp.x, lamp.y, scaleGameUnit(8), 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawLighting() {
  if (lightCanvas.width !== GAME_WIDTH || lightCanvas.height !== GAME_HEIGHT) {
    lightCanvas.width = GAME_WIDTH;
    lightCanvas.height = GAME_HEIGHT;
  }

  lightCtx.clearRect(0, 0, lightCanvas.width, lightCanvas.height);
  lightCtx.fillStyle = `rgba(0,0,0,${1 - lightingGlobalAmbient})`;
  lightCtx.fillRect(0, 0, lightCanvas.width, lightCanvas.height);

  lightCtx.globalCompositeOperation = 'destination-out';
  drawAmbientZones();
  for (const lamp of lightingLamps) drawLampLight(lamp);
  drawPlayerGlow();
  lightCtx.globalCompositeOperation = 'source-over';

  ctx.drawImage(lightCanvas, 0, 0);
}
