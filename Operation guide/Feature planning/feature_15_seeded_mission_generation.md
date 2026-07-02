# Feature 15 - Seeded Mission Data and Procedural Run Structure

**Status: Planned for Prototype 2.**

Mission data separation is still needed, but the goal is now seeded roguelike mission generation rather than a hand-authored second map.

## Goal

Create a clean runtime mission object that can be produced from fixed reference data or from a seeded procedural generator. The generated level should remain stable for the current character/run, then a new character death/restart should create a newly generated level.

## First-Pass Scope

- Extract current facility content out of gameplay logic into mission/run data.
- Define room modules and connector data that can eventually be recombined.
- Make walls, doors, rooms, lights, objective/exfil, enemies, nav, and sound portals load from mission data.
- Add a seed field or run identity that can reproduce a generated level.
- Keep the current hardcoded facility as a reference mission, fixed seed output, or test module set.
- Preserve current gameplay behavior while changing the data boundary.

## Non-Goals

- No full visual editor.
- No production-ready procedural variety.
- No metagame persistence yet.
- No full mission result screen yet.

## Suggested Runtime Shape

```javascript
const CURRENT_RUN = {
  seed: 'prototype-seed-001',
  characterId: 'prototype-character',
  mission: {
    id: 'generated_facility',
    world: { width: 3200, height: 1800 },
    geometry: { walls: [], wallGapExits: [] },
    rooms: [],
    lighting: { lamps: [], ambientZones: [], windowApertures: [], doorApertures: [] },
    doors: [],
    objective: { pickup: {}, exfilPoints: [] },
    enemies: [],
    enemyNav: { nodes: [], edges: [] },
    sound: { rooms: [], portals: [], attachBounds: [] },
  },
};
```

## Acceptance Criteria

- The current mission can load from one runtime mission object.
- The same seed can reproduce the same generated/fixed layout.
- A new seed can produce a different run target once generation exists.
- `resetGame()` preserves the current run layout unless character death explicitly starts a new run.
- Gameplay systems consume normalized runtime data, not scattered hardcoded mission constants.

## Related Files

- `game.js`
- `enemy.js`
- `sound.js`
- `lighting.js`
- `player.js`
- `tuning.js`
- Future candidate: `mission.js`, `run.js`, or `missions/`
