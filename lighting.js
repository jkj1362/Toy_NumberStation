const LIGHT_GLOBAL_AMBIENT = 0.0;
const PLAYER_VISIBLE_LIGHT_THRESHOLD = 0.14;
const ENEMY_DIM_LIGHT_THRESHOLD = 0.18;
const ENEMY_BRIGHT_LIGHT_THRESHOLD = 0.35;

let lightingGlobalAmbient = LIGHT_GLOBAL_AMBIENT;
let lightingLamps = [];
let lightingZones = [];
let lightingApertures = [];
let lightCanvas = document.createElement('canvas');
let lightCtx = lightCanvas.getContext('2d');
const STATIC_LIGHT_RENDER_SCALE = 4;
const DYNAMIC_LIGHT_RENDER_SCALE = 2;
let staticLightCanvas = document.createElement('canvas');
let staticLightCtx = staticLightCanvas.getContext('2d');
let staticLightValueCanvas = document.createElement('canvas');
let staticLightValueCtx = staticLightValueCanvas.getContext('2d');
let staticLightSourceCanvas = document.createElement('canvas');
let staticLightSourceCtx = staticLightSourceCanvas.getContext('2d');
let staticLightDirty = true;
let staticLightImageData = null;

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

function scaleLightingAperture(aperture) {
  return {
    ...scaleGamePoint(aperture),
    width: scaleGameUnit(aperture.width ?? 40),
    range: scaleGameUnit(aperture.range ?? 180),
    intensity: aperture.intensity ?? 0.18,
    falloffPower: aperture.falloffPower ?? 1.1,
    spreadRadians: aperture.spreadRadians ?? Math.PI / 3,
    open: aperture.open !== false,
    defaultOpen: aperture.open !== false,
  };
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
  lightingApertures = (missionLighting.apertures ?? []).map(scaleLightingAperture);
  for (const aperture of lightingApertures) {
    aperture.visibilityPolygon = computeApertureVisibilityPolygon(aperture);
  }
  staticLightDirty = true;
  staticLightImageData = null;
}

function resetLighting() {
  for (const lamp of lightingLamps) {
    lamp.active = lamp.defaultActive;
  }
  for (const aperture of lightingApertures) {
    aperture.open = aperture.defaultOpen;
  }
  staticLightDirty = true;
  staticLightImageData = null;
}

function markStaticLightingDirty() {
  staticLightDirty = true;
  staticLightImageData = null;
}

function setLightingAperturesOpen(ids, open) {
  const idSet = new Set(Array.isArray(ids) ? ids : [ids]);
  let changed = false;
  for (const aperture of lightingApertures) {
    if (!idSet.has(aperture.id) || aperture.open === open) continue;
    aperture.open = open;
    changed = true;
  }
  if (changed) markStaticLightingDirty();
}

function rebuildLightingVisibilityPolygons() {
  for (const lamp of lightingLamps) {
    lamp.visibilityPolygon = computeLampVisibilityPolygon(lamp);
  }
  for (const aperture of lightingApertures) {
    aperture.visibilityPolygon = computeApertureVisibilityPolygon(aperture);
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

function getDirectionVector(direction) {
  if (direction === 'N') return { x: 0, y: -1, angle: -Math.PI / 2 };
  if (direction === 'S') return { x: 0, y: 1, angle: Math.PI / 2 };
  if (direction === 'W') return { x: -1, y: 0, angle: Math.PI };
  return { x: 1, y: 0, angle: 0 };
}

function angleDiff(a, b) {
  let diff = a - b;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
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
  if (typeof rebuildRayGeometryIfNeeded === 'function') rebuildRayGeometryIfNeeded();
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

function castApertureRay(aperture, angle) {
  const hit = castVisRay(aperture.x, aperture.y, angle);
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  if (!hit) {
    return { x: aperture.x + dx * aperture.range, y: aperture.y + dy * aperture.range };
  }

  const hitDist = Math.hypot(hit.x - aperture.x, hit.y - aperture.y);
  const dist = Math.min(hitDist, aperture.range);
  return { x: aperture.x + dx * dist, y: aperture.y + dy * dist };
}

function computeApertureVisibilityPolygon(aperture) {
  if (typeof rebuildRayGeometryIfNeeded === 'function') rebuildRayGeometryIfNeeded();
  const eps = 0.0001;
  const dir = getDirectionVector(aperture.direction);
  const half = aperture.spreadRadians / 2;
  const angles = [dir.angle - half, dir.angle + half];

  for (const corner of WALL_CORNERS) {
    const angle = Math.atan2(corner.y - aperture.y, corner.x - aperture.x);
    if (Math.abs(angleDiff(angle, dir.angle)) <= half + eps) {
      angles.push(angle - eps, angle, angle + eps);
    }
  }

  for (let i = 0; i <= 24; i++) {
    angles.push(dir.angle - half + (aperture.spreadRadians * i) / 24);
  }

  const rays = [];
  for (const angle of angles) {
    if (Math.abs(angleDiff(angle, dir.angle)) > half + eps) continue;
    const p = castApertureRay(aperture, angle);
    rays.push({ ...p, angle: angleDiff(angle, dir.angle) });
  }

  rays.sort((a, b) => a.angle - b.angle);
  return [{ x: aperture.x, y: aperture.y }, ...rays];
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

function getApertureContribution(aperture, wx, wy) {
  if (!aperture.open) return 0;
  if (!aperture.visibilityPolygon || !pointInPolygon(aperture.visibilityPolygon, wx, wy)) return 0;

  const dir = getDirectionVector(aperture.direction);
  const vx = wx - aperture.x;
  const vy = wy - aperture.y;
  const forward = vx * dir.x + vy * dir.y;
  if (forward < 0 || forward > aperture.range) return 0;

  const lateral = Math.abs(vx * -dir.y + vy * dir.x);
  const spreadWidth = Math.tan(aperture.spreadRadians / 2) * forward;
  const maxLateral = aperture.width / 2 + spreadWidth;
  if (lateral > maxLateral) return 0;

  const t = forward / aperture.range;
  const falloff = Math.pow(1 - t, aperture.falloffPower);
  const edgeFade = 1 - lateral / maxLateral;
  const lateralFalloff = edgeFade * edgeFade * (3 - 2 * edgeFade);
  return clampLight(aperture.intensity * falloff * lateralFalloff);
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
  let light = getStaticLightLevel(wx, wy);

  if (options.includePlayerGlow === true) {
    light = Math.max(light, getPlayerGlowContribution(wx, wy));
  }

  return clampLight(light);
}

function computeStaticLightLevel(wx, wy) {
  let light = lightingGlobalAmbient;
  light = Math.max(light, getZoneAmbient(wx, wy));

  for (const lamp of lightingLamps) {
    light = Math.max(light, getLampContribution(lamp, wx, wy));
  }

  for (const aperture of lightingApertures) {
    light = Math.max(light, getApertureContribution(aperture, wx, wy));
  }

  return clampLight(light);
}

function getCachedStaticLightLevel(wx, wy) {
  if (!staticLightImageData || staticLightDirty) return null;
  const x = Math.max(0, Math.min(staticLightImageData.width - 1, Math.floor(wx / STATIC_LIGHT_RENDER_SCALE)));
  const y = Math.max(0, Math.min(staticLightImageData.height - 1, Math.floor(wy / STATIC_LIGHT_RENDER_SCALE)));
  const i = (y * staticLightImageData.width + x) * 4;
  return clampLight(1 - staticLightImageData.data[i + 3] / 255);
}

function getStaticLightLevel(wx, wy) {
  const cached = getCachedStaticLightLevel(wx, wy);
  return cached === null ? computeStaticLightLevel(wx, wy) : cached;
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
    const dx = wx - lamp.lightX;
    const dy = wy - lamp.lightY;
    if (dx * dx + dy * dy <= hitRadius * hitRadius) {
      lamp.active = false;
      markStaticLightingDirty();
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

function drawApertureLight(aperture) {
  if (!aperture.open || !aperture.visibilityPolygon || aperture.visibilityPolygon.length < 3) return;

  const dir = getDirectionVector(aperture.direction);

  lightCtx.save();
  lightCtx.beginPath();
  lightCtx.moveTo(aperture.visibilityPolygon[0].x, aperture.visibilityPolygon[0].y);
  for (let i = 1; i < aperture.visibilityPolygon.length; i++) {
    lightCtx.lineTo(aperture.visibilityPolygon[i].x, aperture.visibilityPolygon[i].y);
  }
  lightCtx.closePath();
  lightCtx.clip();

  const endX = aperture.x + dir.x * aperture.range;
  const endY = aperture.y + dir.y * aperture.range;
  const intensity = clampLight(aperture.intensity);
  const falloffAt = (t) => intensity * Math.pow(1 - t, aperture.falloffPower);
  const grad = lightCtx.createLinearGradient(aperture.x, aperture.y, endX, endY);
  grad.addColorStop(0, `rgba(255,255,255,${falloffAt(0)})`);
  grad.addColorStop(0.5, `rgba(255,255,255,${falloffAt(0.5)})`);
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  lightCtx.fillStyle = grad;
  lightCtx.fillRect(
    Math.min(aperture.x, endX) - aperture.range,
    Math.min(aperture.y, endY) - aperture.range,
    aperture.range * 2 + Math.abs(endX - aperture.x),
    aperture.range * 2 + Math.abs(endY - aperture.y)
  );
  lightCtx.restore();
}

function drawPlayerGlow(offsetX = 0, offsetY = 0, renderScale = 1) {
  const glowX = (player.x - offsetX) / renderScale;
  const glowY = (player.y - offsetY) / renderScale;
  const glowRadius = PLAYER_GLOW_RADIUS / renderScale;
  const pg = lightCtx.createRadialGradient(glowX, glowY, 0, glowX, glowY, glowRadius);
  pg.addColorStop(0, 'rgba(255,255,255,1)');
  pg.addColorStop(0.4, 'rgba(255,255,255,1)');
  pg.addColorStop(1, 'rgba(255,255,255,0)');
  lightCtx.fillStyle = pg;
  lightCtx.beginPath();
  lightCtx.arc(glowX, glowY, glowRadius, 0, Math.PI * 2);
  lightCtx.fill();
}

function resizeStaticLightCanvases(w, h) {
  const canvases = [staticLightCanvas, staticLightValueCanvas, staticLightSourceCanvas];
  for (const canvas of canvases) {
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  }
}

function lightCanvasX(wx) { return wx / STATIC_LIGHT_RENDER_SCALE; }
function lightCanvasY(wy) { return wy / STATIC_LIGHT_RENDER_SCALE; }
function lightCanvasUnit(v) { return v / STATIC_LIGHT_RENDER_SCALE; }

function renderStaticSource(drawSource) {
  staticLightSourceCtx.setTransform(1, 0, 0, 1, 0, 0);
  staticLightSourceCtx.globalCompositeOperation = 'source-over';
  staticLightSourceCtx.clearRect(0, 0, staticLightSourceCanvas.width, staticLightSourceCanvas.height);

  drawSource(staticLightSourceCtx);

  staticLightValueCtx.save();
  staticLightValueCtx.globalCompositeOperation = 'lighten';
  staticLightValueCtx.drawImage(staticLightSourceCanvas, 0, 0);
  staticLightValueCtx.restore();
}

function renderStaticAmbientZones() {
  for (const zone of lightingZones) {
    if (zone.ambient <= 0) continue;
    renderStaticSource((sourceCtx) => {
      sourceCtx.fillStyle = `rgba(255,255,255,${clampLight(zone.ambient)})`;
      sourceCtx.fillRect(
        lightCanvasX(zone.x),
        lightCanvasY(zone.y),
        lightCanvasX(zone.w),
        lightCanvasY(zone.h)
      );
    });
  }
}

function renderStaticLampLight(lamp) {
  if (!lamp.active || !lamp.visibilityPolygon || lamp.visibilityPolygon.length < 3) return;

  renderStaticSource((sourceCtx) => {
    const w = staticLightSourceCanvas.width;
    const h = staticLightSourceCanvas.height;

    sourceCtx.save();
    sourceCtx.beginPath();
    if (lamp.wallSide === 'N') sourceCtx.rect(0, lightCanvasY(lamp.y - scaleGameY(18)), w, h);
    else if (lamp.wallSide === 'S') sourceCtx.rect(0, 0, w, lightCanvasY(lamp.y + scaleGameY(18)));
    else if (lamp.wallSide === 'E') sourceCtx.rect(0, 0, lightCanvasX(lamp.x + scaleGameX(18)), h);
    else sourceCtx.rect(lightCanvasX(lamp.x - scaleGameX(18)), 0, w, h);
    sourceCtx.clip();

    sourceCtx.beginPath();
    sourceCtx.moveTo(lightCanvasX(lamp.visibilityPolygon[0].x), lightCanvasY(lamp.visibilityPolygon[0].y));
    for (let i = 1; i < lamp.visibilityPolygon.length; i++) {
      sourceCtx.lineTo(lightCanvasX(lamp.visibilityPolygon[i].x), lightCanvasY(lamp.visibilityPolygon[i].y));
    }
    sourceCtx.closePath();
    sourceCtx.clip();

    const lightX = lightCanvasX(lamp.lightX);
    const lightY = lightCanvasY(lamp.lightY);
    const radius = lightCanvasUnit(lamp.radius);
    const intensity = clampLight(lamp.intensity);
    const falloffAt = (t) => intensity * Math.pow(1 - t, lamp.falloffPower);
    const grad = sourceCtx.createRadialGradient(lightX, lightY, 0, lightX, lightY, radius);
    grad.addColorStop(0, `rgba(255,255,255,${falloffAt(0)})`);
    grad.addColorStop(0.45, `rgba(255,255,255,${falloffAt(0.45)})`);
    grad.addColorStop(0.75, `rgba(255,255,255,${falloffAt(0.75)})`);
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    sourceCtx.fillStyle = grad;
    sourceCtx.beginPath();
    sourceCtx.arc(lightX, lightY, radius, 0, Math.PI * 2);
    sourceCtx.fill();
    sourceCtx.restore();
  });
}

function renderStaticApertureLight(aperture) {
  if (!aperture.open || !aperture.visibilityPolygon || aperture.visibilityPolygon.length < 3) return;

  renderStaticSource((sourceCtx) => {
    const dir = getDirectionVector(aperture.direction);

    sourceCtx.save();
    sourceCtx.beginPath();
    sourceCtx.moveTo(lightCanvasX(aperture.visibilityPolygon[0].x), lightCanvasY(aperture.visibilityPolygon[0].y));
    for (let i = 1; i < aperture.visibilityPolygon.length; i++) {
      sourceCtx.lineTo(lightCanvasX(aperture.visibilityPolygon[i].x), lightCanvasY(aperture.visibilityPolygon[i].y));
    }
    sourceCtx.closePath();
    sourceCtx.clip();

    const startX = lightCanvasX(aperture.x);
    const startY = lightCanvasY(aperture.y);
    const endX = lightCanvasX(aperture.x + dir.x * aperture.range);
    const endY = lightCanvasY(aperture.y + dir.y * aperture.range);
    const range = lightCanvasUnit(aperture.range);
    const intensity = clampLight(aperture.intensity);
    const falloffAt = (t) => intensity * Math.pow(1 - t, aperture.falloffPower);
    const grad = sourceCtx.createLinearGradient(startX, startY, endX, endY);
    grad.addColorStop(0, `rgba(255,255,255,${falloffAt(0)})`);
    grad.addColorStop(0.5, `rgba(255,255,255,${falloffAt(0.5)})`);
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    sourceCtx.fillStyle = grad;
    sourceCtx.fillRect(
      Math.min(startX, endX) - range,
      Math.min(startY, endY) - range,
      range * 2 + Math.abs(endX - startX),
      range * 2 + Math.abs(endY - startY)
    );
    sourceCtx.restore();
  });
}

function renderStaticLightCanvas() {
  const perfStart = performance.now();
  const w = Math.ceil(GAME_WIDTH / STATIC_LIGHT_RENDER_SCALE);
  const h = Math.ceil(GAME_HEIGHT / STATIC_LIGHT_RENDER_SCALE);
  resizeStaticLightCanvases(w, h);
  rebuildLightingVisibilityPolygons();

  const ambient = Math.round(clampLight(lightingGlobalAmbient) * 255);
  staticLightValueCtx.setTransform(1, 0, 0, 1, 0, 0);
  staticLightValueCtx.globalCompositeOperation = 'source-over';
  staticLightValueCtx.fillStyle = `rgb(${ambient},${ambient},${ambient})`;
  staticLightValueCtx.fillRect(0, 0, w, h);

  renderStaticAmbientZones();
  for (const lamp of lightingLamps) renderStaticLampLight(lamp);
  for (const aperture of lightingApertures) renderStaticApertureLight(aperture);

  const lightImage = staticLightValueCtx.getImageData(0, 0, w, h);
  const image = staticLightCtx.createImageData(w, h);
  const lightData = lightImage.data;
  const data = image.data;
  for (let i = 0; i < data.length; i += 4) {
    const light = Math.max(lightData[i], lightData[i + 1], lightData[i + 2]) / 255;
    data[i] = 0;
    data[i + 1] = 0;
    data[i + 2] = 0;
    data[i + 3] = Math.round((1 - light) * 255);
  }

  staticLightCtx.putImageData(image, 0, 0);
  staticLightImageData = image;
  staticLightDirty = false;
  if (typeof recordPerf === 'function') {
    recordPerf('staticLightMs', performance.now() - perfStart);
  }
}

function drawLamps() {
  for (const lamp of lightingLamps) {
    ctx.fillStyle = lamp.active ? lamp.color : '#444';
    ctx.beginPath();
    ctx.arc(lamp.lightX, lamp.lightY, scaleGameUnit(6), 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawLighting() {
  const lightWidth = Math.ceil(VIEWPORT_WIDTH / DYNAMIC_LIGHT_RENDER_SCALE);
  const lightHeight = Math.ceil(VIEWPORT_HEIGHT / DYNAMIC_LIGHT_RENDER_SCALE);
  if (lightCanvas.width !== lightWidth || lightCanvas.height !== lightHeight) {
    lightCanvas.width = lightWidth;
    lightCanvas.height = lightHeight;
  }

  if (staticLightDirty) renderStaticLightCanvas();

  lightCtx.clearRect(0, 0, lightCanvas.width, lightCanvas.height);
  lightCtx.imageSmoothingEnabled = true;
  lightCtx.drawImage(
    staticLightCanvas,
    camera.x / STATIC_LIGHT_RENDER_SCALE,
    camera.y / STATIC_LIGHT_RENDER_SCALE,
    VIEWPORT_WIDTH / STATIC_LIGHT_RENDER_SCALE,
    VIEWPORT_HEIGHT / STATIC_LIGHT_RENDER_SCALE,
    0,
    0,
    lightWidth,
    lightHeight
  );

  lightCtx.globalCompositeOperation = 'destination-out';
  drawPlayerGlow(camera.x, camera.y, DYNAMIC_LIGHT_RENDER_SCALE);
  lightCtx.globalCompositeOperation = 'source-over';

  ctx.drawImage(lightCanvas, camera.x, camera.y, VIEWPORT_WIDTH, VIEWPORT_HEIGHT);
}
