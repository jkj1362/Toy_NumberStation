# Feature 13 - Mission Data Separation

**Status: Next.**

This feature extracts the current hardcoded mission content into an authored mission definition while preserving the current playable behavior.

## Goal

Make the existing night mission load from structured mission data so Milestone 2 can add a second test map without duplicating gameplay logic.

## Non-Goals

- No visual mission editor.
- No procedural generation.
- No second map in the first extraction pass.
- No behavior changes to stealth, sound, lighting, combat, or doors except what is required to read the same data from a mission definition.

## Data To Extract

- World dimensions and camera/fog render settings if they remain mission-dependent.
- Wall rectangles and wall gap exits.
- Room centers, room bounds, and ambient zones.
- Doors, including orientation, default state, HP, sound transmission, and light aperture linkage.
- Lamps, window apertures, and door light aperture links.
- Objective pickup and exfil points.
- Enemy spawn data, archetypes, patrol routes, shooting values, and alert/sight defaults.
- Enemy nav nodes and graph edges.
- Sound room specs, sound portal specs, and sound room attachment bounds.
- Any current testing-only markers that should remain debug-only.

## Suggested First Pass

Use a plain JS mission definition first, because the current systems already share script globals and many values are functions or scaled constants.

Suggested shape:

```javascript
const CURRENT_MISSION = {
  id: 'facility_night_01',
  world: { width: 3200, height: 1800 },
  geometry: { walls: [], wallGapExits: [] },
  rooms: [],
  lighting: { lamps: [], ambientZones: [], windowApertures: [], doorApertures: [] },
  doors: [],
  objective: { pickup: {}, exfilPoints: [] },
  enemies: [],
  enemyNav: { nodes: [], edges: [] },
  sound: { rooms: [], portals: [], attachBounds: [] },
};
```

## Implementation Notes

- Preserve current behavior before adding a second map.
- Prefer small loader helpers over a large rewrite.
- Keep gameplay functions consuming normalized runtime objects, not raw authoring data.
- Avoid moving tuning defaults into mission data during this pass unless the value is clearly mission-specific.
- Keep debug overlay controls in `tuning.js`; mission data should not decide whether overlays are visible.
- Validate the extracted data by comparing the current map layout, doors, sound portals, lighting, enemies, objective, and exfil behavior against the pre-extraction build.

## Acceptance Criteria

- The current mission loads from one mission definition.
- `resetGame()` and related reset helpers restore mission state from the definition.
- Existing doors, lighting, sound portals, enemy patrols, objective pickup, and exfil still behave the same.
- No new second map is required yet, but the data shape should make one possible next.
- `node --check` passes for all source files.
- A VM smoke test can load scripts, reset the game, and run at least one update/draw cycle.
- The game is relaunched for manual playtest.

## Related Files

- `game.js`
- `enemy.js`
- `sound.js`
- `lighting.js`
- `player.js`
- `tuning.js`
- Future candidate: `mission.js` or `missions/facility_night_01.js`
