# Feature 02 - Lighting Renovation

**Status: DONE - GEOMETRY REVISION IMPLEMENTED**

The first lighting pass was implemented in `game.js`: wall lamps cut circular bright areas out
of an otherwise black darkness layer, and enemy sight used `isLitByLamps()` as a boolean gate.
That v1 proved the stealth loop, but it was too binary for hard-aim scouting and for future
multi-mission scalability.

This revision promotes lighting into a reusable system initialized from mission-specific
lighting data. Direct lamp light now spreads through open space until blocked by walls, fades
with distance, and stops at a maximum range. The current mission is only the first data set,
not a special case baked into the lighting code. Default darkness remains true darkness;
readability comes only from authored light sources, authored ambient/spill zones, and the
player's local glow.

---

## Problem Diagnosis

The current lighting model creates "lamp-pool stealth":

- `drawLighting()` fills the world with opaque black.
- Each active lamp erases a circular/half-plane region from the darkness.
- `enemyCanSeeCone()` returns false whenever `isLitByLamps(player.x, player.y)` is false.

This creates unnatural gameplay:

- Open floor near a lit area can become mechanically invisible just because it is outside a
  lamp radius.
- Enemy sight checks only the player center point, not a body-sized visibility footprint.
- Darkness has no gradation: there is no dim room ambience, silhouette visibility, spill, or
  low-confidence recognition.
- Hard aim can reveal more screen space without revealing more useful information, because
  much of the forward view remains pure black unless a lamp covers it.

The renovated system must represent light as a **level**, not a boolean, while still allowing
`0.0` pure darkness as a deliberate authored stealth state.

---

## Architecture Direction

Create a reusable `lighting.js` module loaded before `enemy.js` and `game.js`:

```html
<script src="player.js"></script>
<script src="lighting.js"></script>
<script src="enemy.js"></script>
<script src="game.js"></script>
```

`lighting.js` owns lighting behavior. Mission data owns lamp placement and ambient zones.

| Owner | Responsibility |
|-------|----------------|
| `lighting.js` | Runtime lamp state, light-level sampling, lighting render pass, lamp drawing, reset/init helpers |
| Mission data | Lamps, room/zone ambient values, optional global ambient defaults |
| `game.js` | Current mission orchestration, projectile collision ordering, draw order, camera transform |
| `enemy.js` | Enemy detection decisions using lighting API thresholds |

Do **not** hardcode one mission's lamp list inside `lighting.js` long-term. The current
implementation keeps mission data in `game.js` until a dedicated mission file exists, but the
lighting API accepts mission-provided data.

---

## Mission Lighting Data

Target shape:

```javascript
const missionLighting = {
  globalAmbient: 0.0,
  zones: [
    { id: 'lobby_lamp_spill', x: 320, y: 458, w: 360, h: 170, ambient: 0.10 },
    { id: 'entry_dim_spill', x: 430, y: 620, w: 140, h: 112, ambient: 0.08 },
  ],
  lamps: [
    { x: 200, y: 18, wallSide: 'N', radius: 360, intensity: 1.0, falloffPower: 0.85, color: '#ffdc96', active: true },
  ],
  apertures: [
    { id: 'room_a_west_window_moonlight', x: 18, y: 190, direction: 'E', width: 70, range: 360, intensity: 0.24, falloffPower: 1.05, color: '#9bb7d9', open: true },
  ],
};
```

Data remains authored in design-space coordinates (`1100x750`) and scaled at initialization,
matching the current wall/enemy/player setup.

### Lamp Fields

| Field | Meaning |
|-------|---------|
| `x`, `y` | Fixture position in mission design-space coordinates |
| `wallSide` | `N`, `S`, `E`, or `W`; controls half-plane projection |
| `radius` | Maximum direct lamp reach; light cannot contribute beyond this even in open space |
| `intensity` | Peak light contribution near the fixture, normally `0.0..1.0`; keep this high when the directly lit area should read as bright |
| `falloffPower` | Distance fade curve; higher values make light fall off faster and preserve more dark gaps |
| `color` | Render tint for fixture/glow |
| `active` | Runtime shoot-out state; reset from mission defaults |

### Ambient Zone Fields

| Field | Meaning |
|-------|---------|
| `id` | Debug/readability label |
| `x`, `y`, `w`, `h` | Rectangular room/area in mission design-space coordinates |
| `ambient` | Baseline light level inside the zone |

Rectangular zones are sufficient for the current prototype. Irregular room ambience can be
added later only if needed.

Do not use ambient zones as a blanket fix for the whole map. They should represent specific
fictional causes: lamp spill, open door spill, window/moonlight strips, emergency signs, or
rooms intentionally readable despite not being bright.

For the current Cold War-era atmosphere, keep direct lamp `intensity` near `1.0` so areas
close to a fixture still read as clearly lit. Control the older, weaker-fixture feeling with
`radius` and `falloffPower`: radius controls how much of the room an intact fixture can reach,
while falloff controls how quickly brightness decays from the source. In the default state,
room lamps should broadly brighten their room; stealth gaps should come from broken lamps,
corners, occluding geometry, and authored spill/ambient differences.

### Aperture Fields

Apertures are intentional openings that allow weaker, shaped light to enter an otherwise
wall-blocked lighting model. Use them for windows, open doors, ducts, and narrow doorway
spill. They are not full-strength lamps.

| Field | Meaning |
|-------|---------|
| `id` | Debug/readability label |
| `x`, `y` | Aperture center in mission design-space coordinates |
| `direction` | `N`, `S`, `E`, or `W`; direction light projects into the playable space |
| `width` | Opening width along the wall |
| `range` | Maximum aperture light reach |
| `intensity` | Peak contribution near the opening; should usually be dimmer than lamps |
| `falloffPower` | Distance fade curve |
| `color` | Render tint; moonlight should be colder than lamp light |
| `open` | Whether the aperture currently transmits light |
| `kind` | Optional label such as `window`, `door`, or `duct` |
| `spreadRadians` | Optional beam widening angle; defaults can be chosen by `lighting.js` |

Window apertures are normally always open and represent weak exterior moonlight entering
through the existing exterior wall gaps. They should create dim visibility, not full bright
lamp visibility.

Door apertures are dynamic:

```text
closed door = blocker exists, aperture closed, light does not pass
open door   = blocker removed, aperture open, light can pass/spill through
```

The current implementation only enables exterior window apertures. Feature 09 owns the door
system that will turn door state into dynamic blockers and dynamic apertures. Until those
interactable doors exist as real blockers/openings, doorway artifacts should be softened with
small local ambient threshold zones rather than fake directional door beams.

---

## Public Lighting API

`lighting.js` should expose these globals for the current plain-script architecture:

```javascript
function initLighting(missionLighting) {}
function resetLighting() {}
function drawLamps() {}
function drawLighting() {}
function getLightLevel(wx, wy, options = {}) {}
function isLit(wx, wy) {}
function isLitByLamps(wx, wy) {}
```

### `initLighting(missionLighting)`

Scales mission lighting data into world coordinates and creates runtime lamp/zone state.
Called during mission setup before the first update/draw.

### `resetLighting()`

Restores all lamps to their mission default `active` state. Called by `reset()`.

### `getLightLevel(wx, wy, options = {})`

Returns a normalized light level in `0.0..1.0`.

Required behavior:

- Start from `globalAmbient`, normally `0.0` for this game.
- Add the highest containing zone ambient if the point is inside one or more zones.
- Add active lamp contribution only when the point is inside the lamp's wall-side half-plane,
  inside the lamp's geometry visibility polygon, and within the lamp's max range.
- Apply distance falloff from the fixture origin so brightness is strongest near the light
  source and weaker near the range edge.
- Add open aperture contribution only when the point is inside the aperture projection shape,
  inside the aperture's geometry visibility polygon, and within the aperture's max range.
- Include the player's self-glow only when `options.includePlayerGlow === true`.
- Clamp final value to `0.0..1.0`.

Use max-composition for ambient, aperture, lamp, and player-glow contributions rather than
summing everything unbounded. This keeps multiple nearby sources from creating artificial
overlap-hotspots. Rendering must follow the same max-composition rule as `getLightLevel()`;
do not layer light cutouts with additive or repeated `destination-out` composition.

### Compatibility Helpers

Keep these wrappers during migration:

```javascript
function isLit(wx, wy) {
  return getLightLevel(wx, wy, { includePlayerGlow: true }) >= PLAYER_VISIBLE_LIGHT_THRESHOLD;
}

function isLitByLamps(wx, wy) {
  return getLightLevel(wx, wy, { includePlayerGlow: false }) >= ENEMY_BRIGHT_LIGHT_THRESHOLD;
}
```

Existing callers can keep working while enemy/player visibility gradually moves to richer
thresholds.

---

## Visibility Thresholds

Initial constants:

| Constant | Starting value | Meaning |
|----------|----------------|---------|
| `LIGHT_GLOBAL_AMBIENT` | `0.0` | Default pure darkness outside authored light/spill |
| `PLAYER_VISIBLE_LIGHT_THRESHOLD` | `0.14` | Minimum light for player-facing marker/object visibility |
| `ENEMY_DIM_LIGHT_THRESHOLD` | `0.18` | Low-confidence/silhouette visibility |
| `ENEMY_BRIGHT_LIGHT_THRESHOLD` | `0.35` | Full enemy cone detection |

Enemy sight should not stay permanently binary. Target behavior:

- Bright light: normal cone sight.
- Dim light: reduced confidence, shorter confirmation range, or slower suspicion buildup.
- Darkness: cone sight fails except for close proximity/sound systems.

The first implementation may preserve the existing boolean enemy call path by mapping
`isLitByLamps()` to `ENEMY_BRIGHT_LIGHT_THRESHOLD`, but the API must support dim-light logic
for the hard-aim follow-up.

---

## Rendering Model

Replace "everything black except lamp cutouts" with a layered darkness mask, while preserving
true black where no authored light source applies:

1. Clear `lightCanvas`.
2. Fill with a darkness alpha derived from `globalAmbient` (`0.0` means full darkness).
3. Apply ambient zones as broad rectangular/softened reductions in darkness.
4. Apply active lamp radial gradients clipped to the lamp's geometry visibility polygon,
   wall-side half-plane, and max range.
5. Apply open aperture gradients for windows/doorway spill. These are weaker than lamps and
   also geometry-clipped so they do not pass through solid walls.
6. Apply player self-glow as a small local reduction in darkness.
7. Draw the resulting darkness layer over the world.

Rendering and gameplay sampling must use the same conceptual values: geometry blocking,
distance falloff, max range, authored spill zones, aperture state, and max-composition.
The current renderer may sample a cached low-resolution static darkness map from
`getLightLevel()`/static light helpers, then apply the dynamic player glow on top. This avoids
visual overlap artifacts while keeping per-frame rendering practical.

Current draw order remains:

```text
drawFloor()
drawWalls()
drawLamps()
drawEnemies()
drawProjectiles()
drawPlayer()
drawLighting()
drawFog()
debug/HUD/world markers as currently ordered
```

The camera transform remains owned by `game.js`; lighting renders in world space under that
transform.

---

## Shootability

Lamp shoot-out behavior remains:

- Projectiles can disable active lamps.
- `LAMP_HIT_RADIUS` stays in the lighting system.
- `game.js` may still orchestrate projectile collision order, but lamp hit testing should call
  a lighting helper instead of directly mutating a `LAMPS` array.

Target helper:

```javascript
function hitLampAt(wx, wy) {
  // returns true and deactivates one lamp if the point hits an active fixture
}
```

This avoids exposing lamp runtime storage as a mission-specific global.

---

## Implementation Guide

1. Add `lighting.js` and load it between `player.js` and `enemy.js`.
2. Move current lamp constants, offsets, light canvas, lamp drawing, and lighting drawing from
   `game.js` into `lighting.js`.
3. Change lighting storage from hardcoded `LAMPS` to runtime state initialized by
   `initLighting(missionLighting)`.
4. Add `getLightLevel(wx, wy, options)` with global ambient, zone ambient, geometry-blocked
   lamp falloff, aperture falloff, max range, and optional player glow.
5. Keep `isLit()` and `isLitByLamps()` wrappers so existing pickup/exfil/enemy code continues
   working during the first migration.
6. Replace direct lamp reset/mutation in `game.js` with `resetLighting()` and `hitLampAt()`.
7. Update enemy sight only as far as needed for compatibility in this pass. Rich dim-light
   suspicion behavior can follow after the lighting model is stable.
8. Add aperture data for exterior windows and current always-open doorplaces. Later, when
   doors become interactive, closed doors must contribute blocker segments and set their
   aperture `open` state to false.
9. Perform a visual screenshot check after implementation. The expected visual is true dark
   zones where soundwaves matter, authored dim spill/readability near plausible sources, and
   direct lamp light that travels through open space but stops cleanly at walls.

---

## Success Criteria

- Lighting code is reusable across missions and does not depend on one hardcoded lamp list.
- The current mission can initialize lighting from mission-style data.
- Open floor stays pure dark by default, while authored spill/ambient zones create dim
  readability only where intended.
- Lamps still create stronger local pools, fade with distance, stop at walls, respect max
  range, and can still be shot out.
- Multiple light sources merge by maximum light level instead of visually stacking brighter
  overlap layers.
- Windows leak weak moonlight into the building without making exterior light as strong as
  lamps.
- Current open thresholds can use small local ambient spill zones to avoid harsh seams.
  Closed/open interactive doors should later drive aperture `open` state and blocker segments.
- Existing pickup/exfil visibility and enemy sight continue to function through compatibility
  helpers.
- `getLightLevel()` provides a stable base for future hard-aim and dim-light enemy detection.
- Screenshot QA confirms the lighting no longer reads as only hard circular islands in a black
  void, and that direct light does not visibly leak through walls.

---

## Deferred Decisions

| Topic | Decision |
|-------|----------|
| Dedicated mission files | Deferred. The API should support them, but data may remain near `game.js` for the first migration. |
| Irregular ambient zones | Deferred. Rectangular zones are enough for the prototype. |
| Full dim-light suspicion rules | Deferred until after the light-level API is in place. |
| Interactable doors | Deferred. Aperture data supports open/closed light state, but door collision/pathing/rendering belongs to a door feature. |
| Standalone lamps | Deferred. Wall lamps remain the first supported source type. |
