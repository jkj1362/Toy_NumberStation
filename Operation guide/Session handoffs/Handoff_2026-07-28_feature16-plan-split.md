# Session Handoff - 2026-07-28 - Feature 16 Plan Split

Read this file at the start of a new Codex task to continue the Number Stations prototype without reconstructing the prior sessions.

---

## 1. Project Identity

Number Stations is a top-down Cold War stealth prototype. The current playable loop is infiltration, manipulation of light and sound, avoidance or combat, objective pickup, and exfiltration. The FDD is `Operation guide/Feature planning/[FDD]Number_Stations.md`; the active Prototype 2 roadmap is `Operation guide/Feature planning/prototype_scope_milestone_02.md`.

Feature 13's local AI reactions and Feature 14's ballistics core are implemented, but the local reaction behavior is not yet considered stable. The roadmap was deliberately separated into `Feature 15A mission-data separation -> Feature 16 facility alert/escalation -> Feature 15B seeded generation`. The feature to begin now is **Feature 15A - Reference Mission Data Separation**.

⚠️ **Incomplete/stability warning:** Feature 13's local incident, suspicion-team, companion-sharing, and movement behaviors work in focused scenarios but remain vulnerable to bugs during ordinary play. Fix concrete regressions discovered while doing Feature 15A, but do not redesign AI behavior or fold facility-level behavior back into Feature 13.

⚠️ **Layout warning:** No temporary test layout is active. The standard facility and all three authored enemies are intact. Feature 15A must reproduce them exactly.

⚠️ **Documentation boundary:** Feature 13 and 14 planning documents contain the current implementation decisions. Their existing live documents remain older snapshots because no end-of-day live-state synchronization was requested. Feature 16 has a minimal live placeholder only to preserve one-to-one document coverage.

---

## 2. Current File Structure

```text
Toys/
|-- index.html                                      (37 lines)
|-- tuning.js                                      (605 lines)
|-- input.js                                       (269 lines)
|-- player.js                                      (324 lines)
|-- lighting.js                                    (866 lines)
|-- enemy.js                                      (2818 lines)
|-- sound.js                                       (915 lines)
|-- game.js                                       (2038 lines)
|-- Open Game.bat                                    (2 lines)
|-- Live features/
|   |-- feature_00...feature_12 live docs
|   |-- feature_13_ai_reactions_body_discovery.md
|   |-- feature_14_door_ballistics_destruction.md
|   |-- feature_15_seeded_mission_generation.md
|   |-- feature_16_facility_alert_escalation.md
|-- Operation guide/
|   |-- AGENT.md
|   |-- session handoff format.md
|   |-- Feature planning/
|   |   |-- [FDD]Number_Stations.md
|   |   |-- prototype_scope.md
|   |   |-- prototype_scope_milestone_02.md
|   |   |-- feature_00...feature_12 planning docs
|   |   |-- feature_13_ai_reactions_body_discovery.md
|   |   |-- feature_14_door_ballistics_destruction.md
|   |   |-- feature_15_seeded_mission_generation.md
|   |   |-- feature_16_facility_alert_escalation.md
|   |-- Session handoffs/
|       |-- previous immutable handoffs
|       |-- Handoff_2026-07-28_feature16-plan-split.md
```

Feature-planning documents current at this handoff:

| Document | Lines | Purpose |
|----------|------:|---------|
| `feature_13_ai_reactions_body_discovery.md` | 289 | Implemented local reaction rules plus ongoing stabilization boundary |
| `feature_14_door_ballistics_destruction.md` | 155 | Implemented ballistic/destruction core plus remaining regression boundary |
| `feature_15_seeded_mission_generation.md` | 94 | Phase 15A reference extraction and later Phase 15B generation |
| `feature_16_facility_alert_escalation.md` | 88 | Separate mission-level escalation design |
| `prototype_scope_milestone_02.md` | 203 | Authoritative Prototype 2 execution order |

---

## 3. Key Systems and Current State

| File | System | Current identifiers and non-obvious behavior |
|------|--------|-----------------------------------------------|
| `index.html` | Script order | `tuning.js`, `input.js`, `player.js`, `lighting.js`, `enemy.js`, `sound.js`, `game.js`. These are classic global scripts, not modules. A new pure mission-data script should load before every mission consumer. |
| `game.js` | Design/world scaling | Design space is `1100 x 750`; runtime world is `3200 x 1800`. `scaleGameX()`, `scaleGameY()`, `scaleGameUnit()`, `scaleGameRect()`, and `scaleGamePoint()` convert authored data. |
| `game.js` | Hardcoded mission geometry | `WALLS`, `DOOR_SPECS`, mutable `DOORS`, `WINDOW_SPECS`, mutable `WINDOWS`, `WALL_GAP_EXITS`, and `ROOMS` are separate top-level sources. Feature 15A must move their authored values into one reference mission while preserving runtime shapes expected by existing functions. |
| `game.js` | Mission state/reset | `pickup`, `exfilPoints`, `corpses`, `gamePhase`, `gapExits`, `resetDoors()`, `resetWindows()`, `initPickup()`, `initExfil()`, and `reset()` own mutable mission state. The current pickup still selects randomly among non-starting rooms on reset; preserve that behavior unless explicitly changed. |
| `game.js` | Ballistics | `createProjectile()`, `getProjectileCollision()`, `emitProjectileImpact()`, and `resolveProjectileTravel()` provide stable `shotId`, swept ordered collision, actor/geometry penetration, canonical impact data, and shared player/enemy behavior. |
| `game.js` | Door/window durability | Normal wooden doors use `doorMaxHp = 2000`, so standard `20`-damage rounds require 100 hits. The reinforced metal door has no HP and blocks all projectiles. Windows remain easy to break and linked exterior windows activate secondary exits. |
| `lighting.js` / `game.js` | Mission lighting split | `MISSION_LIGHTING` is currently authored in `game.js`, while `initLighting()`, `resetLighting()`, runtime lamp/aperture arrays, muzzle flashes, visibility sampling, and drawing live in `lighting.js`. Lamps currently receive positional target IDs by index; Feature 15A should author stable IDs while preserving behavior. |
| `lighting.js` | Visibility rules | Ordinary visual evidence requires illumination, cone/range, and clear line of sight. Live muzzle flash is self-illuminating and rendered as a short `360` degree aperture-aware light. Instant lamp destruction is self-illuminating; later recognition of an already broken lamp may occur in darkness as recognition of missing expected light. |
| `enemy.js` | Hardcoded enemy/nav data | `NAV_NODES`, `NAV_EDGES`, and `INITIAL_ENEMIES` are separate mission sources. `resetEnemies()` creates all mutable AI state and must continue to initialize every current field after spawn data is extracted. |
| `enemy.js` | Local incident system | `createEnemyIncident()`, `recordEnemyShotReaction()`, `reserveSuspicionCaseMember()`, `acceptSuspiciousCompanionIncident()`, and `detectVisibleCompanionIncident()` implement stable incident provenance, same-shot arbitration, capped suspicion cases, and observed alert sharing. |
| `enemy.js` | Local coordination | Suspicion cases default to four active investigators total. Alert propagation has no numeric cap, but each receiver must actually observe a lit, visible alerted companion. Relays preserve the original incident's identity, priority, age, provenance, and bounded location. |
| `enemy.js` | Alert precedence | Runtime rank order is direct player `500`, gunshot `450`, corpse `400`, active companion assignment `350`, witnessed impact family `300`, structural evidence `250`, heard impact `150`, ordinary sound `100`. Assignment rank is a temporary travel commitment, not an upgraded evidence rank. |
| `enemy.js` | Memory/confirmation | Local event memory defaults to `900` frames, same-shot memory to `300`, two distinct ballistic impacts within `180` frames confirm alert, and the suspicion team size defaults to `4`. One penetrating shot still confirms only once. |
| `sound.js` | Hardcoded acoustic topology | `SOUND_ROOM_SPECS`, four room-boundary constants, and `SOUND_PORTAL_SPECS` duplicate facility topology. `evaluateEnemySound()`, `getEnemySoundReactionPoint()`, `emitSound()`, and `resetSoundSystem()` must continue to use clear/muffled/vague localization rules after extraction. |
| `sound.js` | Current sound defaults | Gunshot `600`; ordinary wall/wood impact `420`; window/glass impact `500`; metal-door impact `480`; same-object destruction `560`; body fall `140`. The closed-door transmission default is `0.8`, applied to the same `600` gunshot rather than selecting a second gunshot radius. |
| `tuning.js` | Runtime controls | It is the authoritative source for exposed live values. Mission authored defaults and mutable runtime state must not create a second tuning system. |

### Critical distinctions to preserve

- **Feature 13 local incidents are not Feature 16 facility state.** Local perception, local companion relays, and individual action arbitration remain in `enemy.js`. A future facility accumulator consumes immutable incident snapshots and never mutable enemy objects.
- **Shared alert is not shared live tracking.** Only direct player detection continuously refreshes actual player coordinates. A shared or facility assignment carries a bounded incident location or region.
- **One physical shot has one stable `shotId`.** Its muzzle, sound, penetrated impacts, and destruction routes may refine information but cannot become multiple confirmations for one observer.
- **Gunshot audio is source-neutral.** Player and enemy gunshots produce the same listener reaction; only the shooter ignores its own report.
- **Actor penetration emits no extra ballistic impact stimulus.** Victim state, death/body-fall sound, corpse discovery, and companion observation cover actor consequences.
- **Destruction supersedes same-object impact.** Door/window destruction may be louder and more useful, but it remains the same shot confirmation.
- **`isLit()` and `isLitByLamps()` are intentionally distinct.** Player self-glow must not make the player permanently visible to guards.
- **Door ownership and crossing are explicit.** A guard closes only an intact door that its own investigation opened. Reaching a generic portal tolerance is not proof that it crossed beyond the swung panel.
- **Mission definition versus runtime state must be distinct.** Door HP/state/holes, window HP/state, lamp activity, actor state, objective state, and future facility alert state must never mutate the authored reference definition.

---

## 4. Facility Layout

Coordinates below are authored design-space values scaled into the `3200 x 1800` runtime world.

```text
             Top perimeter wall
  +---------------------------------------------------+
  | Room A              | Corridor       | Room B/C    |
  | window/exit (9,190) |                | window/exit |
  |                     |                | (1091,190)  |
  |       door 409,295   |                | door 769,210|
  +---------------------+                +-------------+
  |                                      |             |
  | Lobby / lower entry                  | Room F      |
  | corridor doors 270,449 and 819,449   | metal door  |
  |                                      | 909,590     |
  |      entry/exfil gap x 430-570 at bottom           |
  +---------------------------------------------------+
```

| Purpose | ID | Design-space coordinate |
|---------|----|-------------------------|
| Lobby/corridor left | `corridor_left_door` | `(270, 449)` |
| Lobby/corridor right | `corridor_right_door` | `(819, 449)` |
| Room A/corridor | `room_a_east_door` | `(409, 295)` |
| Corridor/Room B-C | `room_bc_divider_door` | `(769, 210)` |
| Lobby/Room F metal door | `room_f_west_door` | `(909, 590)` |
| Room A physical window/exit | `room_a_west_window` | `(9, 190)` |
| Room B-C physical window/exit | `room_bc_east_window` | `(1091, 190)` |
| Bottom entry/primary exfil | entry gap | `x 430-570`, exfil center `(500, 741)` |

---

## 5. Feature Build Order

| Feature | Status | Notes |
|---------|--------|-------|
| 00-12 - Existing prototype systems | Done | Movement, geometry, lighting, objective/exfil, perception, patrol/AI, doors, camera/aim, health, and tuning/debug. |
| 13 - Local AI Event Reactions and Body Discovery | Implemented; stabilization ongoing | Local evidence, impact reactions, suspicion teams, and observed alert propagation exist. Fix concrete bugs as discovered. |
| 14 - Geometry Ballistics, Penetration, and Impact Events | Core complete; regression ongoing | Current geometry and Feature 13 impact integration exist. Final broad map/player-facing regression remains. |
| 15A - Reference Mission Data Separation | **NEXT** | Extract the exact current facility into normalized immutable definition plus mutable runtime state. |
| 16 - Facility Alert and Escalation | Pending after 15A | Accumulate deduplicated local incidents and distribute connected-space readiness/search without live player knowledge. |
| 15B - Seeded Procedural Run Structure | Pending after 16 | Generate valid mission definitions through the same contract and preserve them for a run. |
| Inventory/equipment and silencer | Deferred | The future silencer will reduce the base sound radius; no item behavior is part of this sequence. |
| Metagame | Deferred | Campaign/day-cycle consequences and full result flow are outside this sequence. |

---

## 6. Immediate Feature Spec - Feature 15A Reference Mission Data Separation

The authoritative plan is `Operation guide/Feature planning/feature_15_seeded_mission_generation.md`. Feature 15A changes ownership of mission data only. It must not generate a different layout, implement facility escalation, or intentionally change current AI/gameplay behavior.

### Already implemented; do not rebuild

- The standard walls, doors, windows, room centers, wall-gap exits, primary/secondary exfil behavior, and objective pickup logic.
- Door/window mutable state, projectile behavior, apertures, lighting, collision, and reset semantics.
- All three enemy spawn/archetype/patrol configurations and the reactive navigation graph.
- The sound-room and portal graph plus closed-door attenuation/localization.
- Feature 13 local incidents and Feature 14 projectile/impact behavior.

### Required result

Create one immutable design-space `REFERENCE_MISSION` (the filename may be `mission.js` or similarly focused) and instantiate/scale mutable runtime data from it. Every subsystem should obtain topology and authored values from this source.

Suggested shape:

```javascript
const REFERENCE_MISSION = {
  id: 'reference_facility',
  world: { designWidth: 1100, designHeight: 750, width: 3200, height: 1800 },
  geometry: {
    walls: [],
    wallGapExits: [],
  },
  rooms: [],
  connectors: [
    // Stable ID, connected room IDs, door/window ID, position, traversal/acoustic/light links.
  ],
  doors: [],
  windows: [],
  lighting: {
    globalAmbient: 0,
    externalLightAvailable: true,
    zones: [],
    lamps: [],
    apertures: [],
  },
  objective: {
    pickupRule: { excludeStartingSpaces: true },
    exfilPoints: [],
  },
  enemies: {
    spawns: [],
    navNodes: {},
    navEdges: [],
  },
  sound: {
    rooms: [],
    portals: [],
    roomBoundaries: {},
  },
};

function instantiateMission(definition) {
  return {
    definition,
    doors: instantiateDoors(definition.doors),
    windows: instantiateWindows(definition.windows),
    gapExits: definition.geometry.wallGapExits.map(copyGapExit),
    // Other mutable state remains separate from the frozen authored definition.
  };
}
```

The exact object nesting can vary, but stable IDs and a single ownership path cannot.

### Implementation sequence

1. **Inventory and parity fixture**
   - Record counts, IDs, coordinates, material flags, states, apertures, room memberships, actor routes, nav edges, sound portals, and reset results from the current facility.
   - Treat the existing game as the parity fixture. Do not start with procedural abstractions.

2. **Add the reference mission source**
   - Keep authored values in design-space units.
   - Load the pure data script before `lighting.js`, `enemy.js`, `sound.js`, and `game.js`.
   - Do not call `scaleGame*()` or `scaleEnemy*()` from the pure data file; those functions currently belong to later-loaded consumers.
   - Give every cross-system entity a stable ID, especially rooms, connectors, lamps, doors, windows, exits, enemy spawns, and nav nodes.

3. **Migrate geometry and objective consumers**
   - Source `WALLS`, door/window specs, wall-gap exits, and `ROOMS` from `REFERENCE_MISSION`.
   - Preserve runtime `DOORS`/`WINDOWS` shapes and every existing helper contract.
   - Preserve current pickup selection among eligible rooms, primary exfil placement, secondary window-exit activation, and reset behavior.

4. **Migrate lighting**
   - Source zones, lamps, and apertures from `REFERENCE_MISSION.lighting`.
   - Preserve all aperture IDs used by doors/windows.
   - Prefer authored stable lamp IDs; keep projectile-target identity and broken-lamp observer memory stable.
   - Preserve external-light/weather gating and muzzle-flash behavior.

5. **Migrate enemies and navigation**
   - Source enemy spawn definitions, patrol routes, `NAV_NODES`, and `NAV_EDGES` from the mission.
   - Keep `resetEnemies()` as the initializer of mutable AI fields unless a smaller instantiation helper makes parity clearer.
   - Preserve every current reset field, including `currentIncident`, `companionAssignment`, evidence memories, `shotReactions`, `recentBallisticImpacts`, suspicion-case fields, door investigations, search/return fields, health, and shooter cooldown state.

6. **Migrate acoustic topology**
   - Source sound rooms, portals, and room-boundary values from the mission.
   - Ensure connector IDs, room pairs, door IDs, coordinates, navigation anchors, and light apertures refer to the same authored connector.
   - Preserve the current clear/muffled/vague paths and `0.8` closed-door transmission.

7. **Reset and parity verification**
   - Reset repeatedly and verify that definition arrays/objects never acquire runtime fields or mutations.
   - Verify the standard three enemies, patrols, all door/window states, lamp activity, pickup behavior, exfil behavior, nav routes, and sound routes.
   - Run syntax checks for every script and focused non-browser checks for data identity/counts.
   - Open or refresh the game and visually compare the facility, lighting, actors, objective/exfil, doors/windows, and debug overlays.

### Explicitly excluded from Feature 15A

- No seeds, random room assembly, connector selection, or alternate layout.
- No Feature 16 evidence score, alert level, decay, or facility assignment behavior.
- No changes to the four-member local suspicion cap or uncapped observed-alert propagation.
- No broad AI refactor in response to known instability; use focused fixes only when a reproducible regression blocks parity.
- No change to door/window durability, sound radii, muzzle-flash visibility, or illumination exceptions.

### Feature 15A acceptance

- One normalized mission definition owns the current facility's authored topology.
- The definition remains unchanged across play and reset.
- All runtime systems reproduce the current facility and behavior.
- Room and connector IDs are stable and shared by geometry, navigation, sound, lighting, and exits.
- No gameplay system retains a second independently authored copy of mission topology.
- The result is sufficient for Feature 16 to ask which rooms/connectors an incident affects without deriving that answer from rendered rectangles.

---

## 7. Gap and Navigation Coordinates

| ID | Type | Coordinate / route role |
|----|------|-------------------------|
| `lobby` | room/nav center | `(460, 590)` |
| `room_a` | room/nav center | `(200, 229)` |
| `corridor` | room/nav center | `(589, 229)` |
| `room_bc` | room/nav center | `(930, 229)` |
| `room_f` | room/nav center | `(991, 590)` |
| `gap_corr_left` | nav/door anchor | `(270, 449)` |
| `gap_corr_right` | nav/door anchor | `(819, 449)` |
| `gap_room_a` | nav/door anchor | `(409, 295)` |
| `gap_room_bc` | nav/door anchor | `(769, 210)` |
| `gap_room_f` | nav/door anchor | `(909, 590)` |

Current authored enemies:

| Enemy | Role | Spawn/route |
|-------|------|-------------|
| 1 | Static melee sentry | `(580, 100)`, no patrol route |
| 2 | Lobby melee patrol | starts `(500, 590)`, route `(420, 590) <-> (580, 590)` |
| 3 | Cross-room shooter | `(200, 229) -> (409, 295) -> (589, 229) -> (769, 210) -> (930, 229)` and return |

---

## 8. Coding Conventions and Verification

- Preserve the classic global-script architecture unless the user explicitly approves a module conversion.
- Preserve script dependency order. A new mission-data script should contain pure authored data and load before all consumers.
- `angle = 0` means facing up. Direction is `dx = sin(angle)`, `dy = -cos(angle)`.
- Use `apply_patch` for hand edits and preserve unrelated user changes.
- Keep authored mission data in `1100 x 750` design space; scale only while creating runtime consumer data.
- Prefer stable semantic IDs over positional array indexes. Cross-system connector ownership must be explicit.
- Never mutate `REFERENCE_MISSION`; copy nested mutable records before use. A shallow top-level copy is not enough for doors, windows, routes, or arrays.
- Use tuning getters for exposed values; do not bake current tunable defaults into a competing runtime source.
- Keep destructibility, HP, projectile behavior, resistance, and sound/light transmission as separate concepts.
- Preserve `shotId`, incident ID, source actor/type, geometry metadata, and information provenance through all local perception routes.
- Keep local perception local. Only direct player detection may continuously refresh actual player coordinates.
- Preserve the illumination exceptions precisely: muzzle flash and instant lamp destruction are self-illuminating; later broken-lamp recognition is lighting-independent; ordinary actors, impacts, doors, windows, and corpse evidence require illumination.
- Preserve explicit door-investigation ownership, hinge-clear crossing, deep room-side targets, open-panel detours, and enemy separation.
- `pushOutOfWalls()` is intentionally used around movement/collision stages; do not collapse repeated collision resolution without proving parity.
- General sound-source debug rings remain off by default; player-facing collision cues are separate.
- Plan and implement in small migrations. Verify parity after each subsystem instead of moving every constant at once.
- After gameplay code changes, refresh or reopen `Open Game.bat` and inspect the result visually.
- Planning documents may describe future behavior. Live documents describe only implemented behavior and are synchronized only when the user explicitly requests it.

Minimum verification commands:

```powershell
foreach ($file in @('mission.js','tuning.js','input.js','player.js','lighting.js','enemy.js','sound.js','game.js')) {
  if (Test-Path -LiteralPath $file) { node --check $file }
}
```

Also inspect the final document and source changes for whitespace/errors, run focused data-parity checks, and manually test the standard facility before declaring Feature 15A complete.
