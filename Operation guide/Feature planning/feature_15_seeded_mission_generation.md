# Feature 15 - Mission Data Separation and Seeded Procedural Runs

**Status: Phase 15A is the next implementation feature. Phase 15B waits until Feature 16 is complete.**

Feature 15 is split into two phases so facility-wide escalation can be built against normalized mission topology before procedural generation begins:

`Feature 15A - mission data separation` -> `Feature 16 - facility alert/escalation` -> `Feature 15B - seeded procedural generation`

## Shared Goal

Create a clean mission-data boundary that first reproduces the current facility exactly, then later allows a seeded procedural generator to produce equivalent runtime mission definitions. Gameplay systems should consume normalized mission data instead of owning scattered hardcoded layout constants.

## Phase 15A - Reference Mission Data Separation

### Goal

Extract the current fixed facility into one normalized reference mission definition without changing its layout, actors, tuning, or behavior. The result must be a stable foundation for Feature 16's facility topology and Feature 15B's generator.

### Scope

- Define one reference mission with stable IDs for rooms, connectors, walls, wall-gap exits, doors, windows, lamps, ambient zones, objective/exfil points, enemy spawns, patrol routes, navigation nodes/edges, sound rooms, and sound portals.
- Instantiate mutable runtime state from the reference definition instead of mutating the authored definition.
- Make `game.js`, `lighting.js`, `enemy.js`, and `sound.js` consume the same normalized mission source.
- Preserve the current facility exactly as the reference mission: identical geometry, actor placements, patrols, navigation, sound transmission, lighting apertures, objective, and exfil.
- Preserve existing reset behavior. `resetGame()` restores runtime state for the same reference mission rather than rebuilding a different layout.
- Keep the data model compatible with a later generated mission, but do not add procedural choices in this phase.

### Suggested Static/Runtime Boundary

```javascript
const CURRENT_RUN = {
  missionDefinition: REFERENCE_MISSION,
  mission: instantiateMission(REFERENCE_MISSION),
};
```

The definition contains authored topology and initial values. The instantiated mission contains mutable door/window/light/actor/objective state. Feature 16 will later own a separate mutable facility-alert state; it must not be embedded in the authored mission definition.

### Non-Goals

- No random generation, seeds, room recombination, or layout variety.
- No facility-wide escalation behavior; Feature 16 owns it.
- No AI reaction redesign beyond fixes required to preserve current behavior.
- No visual editor, metagame persistence, or mission result screen.

### Acceptance Criteria

- One normalized mission definition is the authoritative source for the current facility.
- The current layout, three enemy setups, objective/exfil, lights, doors, windows, navigation, and sound graph remain behaviorally and visually unchanged.
- Runtime mutations never alter the authored reference definition.
- `resetGame()` restores the same mission layout and all mutable mission state correctly.
- Gameplay systems no longer require their own duplicate hardcoded mission topology.
- Stable room and connector IDs are available for Feature 16 without inferring topology from rendering geometry.

## Phase 15B - Seeded Procedural Run Structure

### Goal

After Feature 16 works on normalized mission data, add a seeded generator that produces valid mission definitions through the same boundary. One character/run retains one generated facility; a new character after death may start with a new seed and facility.

### Scope

- Define room modules and compatible connector rules.
- Generate walls, gaps, doors, windows, lighting hooks, objective/exfil placement, enemy/nav data, and sound topology from a seed.
- Store seed and run identity separately from mutable mission state.
- Keep the current reference mission as a deterministic regression fixture and module-validation target.
- Preserve a generated mission across ordinary resets for the same run.
- Generate a different mission only when the run lifecycle explicitly requests a new seed.

### Non-Goals

- No production-scale content variety or final balance.
- No full visual editor.
- No campaign persistence or complete metagame loop.
- No full mission result/scoring screen.

### Acceptance Criteria

- The same seed reproduces the same mission definition.
- A different seed can produce a different valid mission.
- Generated missions satisfy the same data contract used by the reference mission and Feature 16.
- All rooms and critical objectives are reachable, and doors, apertures, navigation, and sound portals agree on connector ownership.
- Ordinary reset preserves the current run's generated layout; explicit new-run creation may replace it.

## Related Files

- `game.js`
- `enemy.js`
- `sound.js`
- `lighting.js`
- `player.js`
- `tuning.js`
- Future candidate: `mission.js`, `run.js`, or `missions/`
- `Operation guide/Feature planning/feature_16_facility_alert_escalation.md`
