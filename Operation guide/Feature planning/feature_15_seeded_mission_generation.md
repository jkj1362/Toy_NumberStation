# Feature 15 - Mission Data Separation and Seeded Procedural Runs

**Status: Phase 15A and the Phase 15B-I seeded-grid contract proof are implemented. Phase 15B-II irregular single-floor facility generation is active: the facility-profile registry, generalized generated-space metadata, and local-government-office topology graph are implemented; spatial placement is next. Feature 16 follows only after irregular generated topology is stable enough to exercise connected-space escalation without overfitting to a grid.**

Feature 15 is split into completed data separation, a completed grid-based generator proof, and an irregular single-floor generation pass:

`Feature 15A - mission data separation` -> `Feature 15B-I - seeded grid/tutorial proof` -> `Feature 15B-II - irregular single-floor generation` -> `Feature 16 - facility alert/escalation`

The original plan placed Feature 16 between mission separation and generation so escalation could prove the normalized mission contract first. That sequence was revised on 2026-07-31 because the five-room, three-enemy reference facility is too small to design or validate meaningful facility-wide behavior. The first generated `3 x 3` facility proved the mission contract and accepted a useful nine-room/six-enemy default scale, but its visible row/column structure is suitable mainly for a tutorial or deterministic stress fixture. Feature 15B-II must now produce irregular connected single-floor facilities before Feature 16 is designed, so facility search/readiness behavior is not overfitted to grid adjacency.

## Shared Goal

Create a clean mission-data boundary that first reproduces the current facility exactly, then later allows a seeded procedural generator to produce equivalent runtime mission definitions. Gameplay systems should consume normalized mission data instead of owning scattered hardcoded layout constants.

## Phase 15A - Reference Mission Data Separation

### Implementation State

Implemented on 2026-07-31:

- `mission.js` now owns the immutable design-space `REFERENCE_MISSION`.
- Stable IDs connect rooms, doors, windows, openings, exits, lamps, apertures, enemy spawns, and navigation nodes.
- `game.js` instantiates scaled wall, door, window, room, exit, objective, and exfil runtime data from the definition.
- `lighting.js` instantiates mutable lighting state from the definition and uses authored stable lamp IDs for projectile targets.
- `enemy.js` resolves navigation nodes from shared room/connector positions and instantiates all three enemy configurations from the definition.
- `sound.js` resolves its rooms and portals from the shared rooms/connectors while retaining the reference facility's existing localization boundaries.
- Runtime reset continues to own mutable door/window damage, lamp activity, actor state, pickup selection, and exit activation; none of those mutations reach the frozen definition.
- `mission-parity.test.js` locks the complete reference definition and validates IDs and cross-system links.
- `runtime-smoke.test.js` loads the classic script stack with a canvas/DOM test harness, checks runtime shapes and reset isolation, and executes update/draw frames.

Feature 15A intentionally did not add seeds, alternate layouts, facility escalation, or AI behavior changes. The live Feature 15 document remains unchanged until an explicit live-document synchronization request.

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

## Phase 15B-I - Seeded Grid Run Structure

### Implementation State

Implemented on 2026-07-31:

- `mission-generator.js` deterministically generates a connected grid facility from a string seed. Its default profile is `3 x 3`.
- The default generated definition contains nine rooms, ten door connectors, two physical window exits, one entry opening, shared wall/door/window/light/nav/sound topology, a seeded objective room, and six enemy configurations.
- A randomized spanning tree guarantees room reachability, then two additional connectors create route variation and loops.
- `run.js` selects the generated mission before gameplay consumers initialize. The default run uses seed `prototype-2`; `?seed=<value>` reproduces another seed and `?mission=reference` loads the authored regression facility.
- Ordinary reset restores mutable state on the same definition. Reset after death starts a new seed through the existing failure prompt and page reload boundary.
- `player.js`, `game.js`, `enemy.js`, and `sound.js` now consume the active run definition rather than the reference definition directly.
- Sound-room lookup now consumes per-room bounds, allowing both the authored partition and generated grid rooms to use the same localization code.
- `mission-generation.test.js` validates determinism, different-seed variation, immutability, identity links, geometry bounds, objective/player placement, enemy placement, navigation references, and full reachability across 100 seeds.
- `runtime-smoke.test.js` loads and executes update/draw frames for both the reference facility and the default generated facility, including reset/definition-isolation checks.
- `generateSeededMission(seed, facilityConfig)` now accepts per-facility row count, column count, enemy count, extra connector count, room dimensions, and wall thickness. The default remains the accepted `3 x 3` / six-enemy facility, while larger security profiles can request larger footprints and populations through the same contract.
- `run.js` accepts `MISSION_GENERATION_CONFIG_OVERRIDE` for facility/profile ownership and exposes `?rows=`, `?columns=`, and `?enemies=` as development/playtest overrides.
- Generated lamps select actual solid wall segments after door, window, and entry openings are resolved. A lamp may not be mounted on a door, window, opening, or other breakable connector geometry.
- Dense facility configurations distribute multiple same-room enemy spawns around the room center with physical spacing and outward initial facing instead of stacking them at one point.

The first pass intentionally uses one rectangular room module. The accepted default remains a `3 x 3` footprint with six enemies, but footprint dimensions and population are now facility configuration rather than generator constants. The seed varies the connected wall openings, doors, metal-door location, exterior-window rows, objective, enemies, and patrol assignments. This aligned generator remains useful as a tutorial profile, deterministic regression fixture, and dense-population stress case, but it is not the production architectural model.

### Goal

Add a seeded generator that produces valid mission definitions through the same boundary already exercised by the reference facility. One character/run retains one generated facility; a new character after death may start with a new seed and facility. The first generated facilities should be large enough to support later Feature 16 design, but this phase adds no facility-alert behavior.

### Scope

- Define room modules and compatible connector rules.
- Generate walls, gaps, doors, windows, lighting hooks, objective/exfil placement, enemy/nav data, and sound topology from a seed.
- Store seed and run identity separately from mutable mission state.
- Keep the current reference mission as a deterministic regression fixture and module-validation target.
- Preserve a generated mission across ordinary resets for the same run.
- Generate a different mission only when the run lifecycle explicitly requests a new seed.

### Non-Goals

- No production-scale content variety or final balance.
- No multi-floor topology, stairs/elevators, vertical navigation, inter-floor sound/light transmission, or floor-aware facility alert behavior. Buildings with multiple floors are deferred until the single-floor contract and escalation loop are stable.
- No full visual editor.
- No campaign persistence or complete metagame loop.
- No full mission result/scoring screen.

### Acceptance Criteria

- The same seed reproduces the same mission definition.
- A different seed can produce a different valid mission.
- Generated missions satisfy the same data contract used by the reference mission and Feature 16.
- All rooms and critical objectives are reachable, and doors, apertures, navigation, and sound portals agree on connector ownership.
- Ordinary reset preserves the current run's generated layout; explicit new-run creation may replace it.
- A facility configuration can deterministically change footprint and enemy population without introducing invalid connector, lamp, spawn, navigation, or sound ownership.

## Phase 15B-II - Irregular Single-Floor Facility Generation

### Implementation State

First implementation gate completed on 2026-08-10:

- `FACILITY_PROFILES` registers the tutorial plus the current early, late, and special facility catalog. Only `tutorial_grid` is a playable generator and `local_government_office` has active irregular-generation implementation; the remaining profiles are metadata placeholders rather than partial generators.
- The aligned generated mission identifies itself with `generation.profileId = 'tutorial_grid'` and its generated room records now carry `spaceType: 'room'` plus `roomSize: 'medium'` without changing its geometry or runtime behavior.
- `generateLocalGovernmentOfficeTopology(seed, overrides)` produces a deterministic topology request with `10-16` room nodes, corridor and junction nodes, public/restricted/secure zones, mandatory reception/office/checkpoint/secure/service motifs, optional office/service rooms, and `1-3` alternate-route loops.
- Topology output contains no row/column identities. It owns stable nodes and connector intents only; it does not yet assign coordinates or compile a playable mission.
- `mission-generation.test.js` validates the facility registry, tutorial space metadata, mandatory local-office nodes, stable edge references, full graph connectivity, cycle count, dead ends, lack of grid metadata, and determinism across 100 local-office topology seeds.

Next implementation gate: Step 4 variable-size spatial placement, followed by corridor routing and mission compilation. Until that gate is complete, the current playable default remains the tutorial/grid generator.

### Phase Decision

This work belongs before Feature 16. Facility escalation will select connected regions, distribute readiness/search assignments, and reason about circulation topology. Implementing it against only an aligned grid risks baking row/column assumptions into behavior that must later operate across variable rooms, branches, bends, junctions, and irregular circulation routes.

The current `3 x 3` generator becomes the `tutorial_grid` profile and remains a regression fixture. Production profiles must be topology-first and must not expose rows or columns as architectural concepts. A hidden coarse occupancy lattice may still be used internally for packing, collision checks, or corridor routing, provided the generated mission definition and visible facility are irregular.

### Architectural Model

Generation proceeds in this ownership order:

`facility profile -> abstract connectivity graph -> spatial placement -> corridor routing -> geometry/connectors -> lighting/nav/sound -> objectives/enemies -> validation`

The generator should pre-author a compact vocabulary of reusable primitives and graph motifs rather than complete building layouts.

Initial space primitives:

- Parameterized rectangular rooms in small, medium, and large size ranges.
- Straight corridor segments.
- Short connector passages.
- `90` degree corridor bends represented initially as connected rectangular segments and a corner/junction space.
- T-junction and cross-junction spaces.
- Wider lobby, checkpoint, or circulation sections.

Initial architectural motifs:

- Reception plus checkpoint.
- Office cluster connected to a circulation spine.
- Storage/service branch.
- Secure room with antechamber.
- Main corridor with side branches.
- Bent service route or maintenance loop.

Motifs are parameterized graph patterns. The generator may resize, rotate, mirror, reconnect, or omit them. They are not complete authored maps.

### Space and Connector Contract

Extend generated room records without breaking existing consumers:

```javascript
{
  id,
  spaceType: 'room' | 'corridor' | 'junction',
  roomSize: 'small' | 'medium' | 'large' | null,
  center,
  interior,
  bounds,
  startingSpace,
}
```

Corridor segments and junctions remain rectangular spaces during the first irregular pass. This allows existing room-bound sound lookup, navigation anchors, lighting ownership, and connected-space queries to continue working without requiring arbitrary polygon support. A bent corridor is a connected sequence of rectangular corridor/junction spaces rather than one L-shaped polygon.

Connectors remain the sole ownership boundary between spaces. Doors, open passages, windows, and the future vertical connectors must refer to stable space IDs. Production gameplay systems consume the compiled spaces/connectors and never inspect packing-lattice coordinates or generator-only motif records.

### Facility Profiles

Production generation uses architectural and security parameters rather than grid dimensions:

```javascript
{
  id: 'office_irregular',
  roomCount: { min: 10, max: 16 },
  roomSizeWeights: { small: 0.45, medium: 0.40, large: 0.15 },
  corridorStyle: 'branching',
  loopCount: { min: 1, max: 3 },
  deadEndCount: { min: 1, max: 4 },
  entranceCount: { min: 1, max: 2 },
  checkpointCount: { min: 1, max: 2 },
  securityZoneCount: 3,
  enemyCount: { min: 7, max: 12 },
}
```

Later profiles may represent offices, warehouses, laboratories, communications stations, or military facilities. Higher-security profiles may request more spaces, loops, checkpoints, restricted zones, and enemies. The profile selects architectural intent; the seed selects one deterministic realization.

### Facility Authoring Contract

Each facility is authored as data assembled from three independently extensible registries:

- **Space modules** define reusable room, corridor, and junction types. A module owns a stable ID, allowed size range and shape family, connector/socket rules, clearance requirements, and semantic tags such as `public`, `service`, or `secure`.
- **Motifs** define reusable local graph patterns by referencing space-module IDs and describing required and optional adjacency. Motifs may be shared by several facilities and must not contain facility-specific gameplay code.
- **Facility profiles** select mandatory spaces, allowed modules, motif requirements and weights, circulation rules, scale, security, and population. A new facility should normally be added as a new profile, not as a branch in the generator.

The compiled mission remains a normalized collection of spaces and connectors. Runtime gameplay systems consume that output and do not depend on which module, motif, or facility profile produced it.

#### Information required for each new facility

Before implementing a new facility, provide a facility brief containing:

1. **Identity and progression:** stable ID, display name, tutorial/early/late/special group, intended priority, and whether it has any availability restrictions. Progression unlocking itself remains outside Feature 15.
2. **Architectural intent:** the facility's recognizable character, rough real-world references, desired density or openness, and any visual or structural traits that distinguish it from other facilities.
3. **Scale ranges:** minimum and maximum room count, expected footprint/compactness, and enemy population range. These values are profile data so larger high-security facilities can be introduced without rewriting the generator.
4. **Mandatory space profiles:** for every required space, provide a stable semantic role, size category or range, minimum/maximum count, required security zone, entrance range, required or forbidden adjacency, exterior-access requirement, and objective eligibility when relevant.
5. **Optional space profiles:** provide the allowed pool, selection weight or count range, duplicate limits, and any adjacency or zone restrictions.
6. **Motifs:** list required, preferred, and forbidden motifs. For each required or preferred motif, state its count range or weight and whether rotation, mirroring, resizing, or partial omission is allowed.
7. **Circulation:** corridor character and width, desired branch/loop/dead-end ranges, junction preferences, alternate-route expectations, and checkpoint placement rules.
8. **Boundary access:** main and secondary entrance ranges, exit/exfil expectations, exterior-facing space requirements, and door/window restrictions.
9. **Security structure:** zone count and ordering, public-to-restricted transitions, guard count/archetype expectations, patrol coverage, and checkpoint rules.
10. **Gameplay placement:** valid objective and exfil regions, special interactables or hazards already supported by the game, and any facility-specific lighting intent that affects placement constraints.
11. **Constraints and non-goals:** impossible adjacencies, required separation, exceptional geometry rules, and deliberately deferred ideas such as multiple floors.
12. **Acceptance identity:** a short statement of what should make generated seeds recognizably belong to this facility, plus any seed examples or reference sketches used for visual review.

Only the facility identity, architectural intent, scale ranges, mandatory spaces, and motif/circulation direction are required to begin a first pass. Unspecified optional values may use documented defaults and remain tunable during seed review.

Use this copyable brief when starting a facility:

```yaml
id:
displayName:
progressionGroup: tutorial | early | late | special
generationVersion: 1
architecturalIntent:
scale:
  roomCount: { min: 0, max: 0 }
  enemyCount: { min: 0, max: 0 }
  footprintIntent:
mandatorySpaces: []
optionalSpaces: []
requiredMotifs: []
preferredMotifs: []
forbiddenMotifs: []
circulation:
boundaryAccess:
securityZones:
objectiveAndExfilRules:
visualIdentity:
specialConstraints: []
deferred: []
```

#### Scalable add, change, and removal rules

- Add a new space structure by registering a new stable space-module ID with its own validation. Existing motifs and profiles are unaffected until they explicitly reference it.
- Add a new motif by composing registered modules and validating its internal graph. Facilities opt into it by ID, count, or weight; adding the motif must not silently change unrelated profiles.
- Add a new facility by completing the brief and registering a facility profile that references existing modules and motifs. Add generator code only when the brief exposes a genuinely reusable capability that the registries cannot express.
- Promote useful facility-specific geometry behavior into a reusable module, motif rule, or profile parameter when practical. Avoid permanent one-off conditionals keyed to a facility ID.
- Give every module, motif, and facility profile a stable ID. Retired IDs must never be silently reused for different content.
- Record `profileId`, seed, `generationVersion`, and the complete compiled mission snapshot for a generated run. An old run must not be reconstructed from the latest registries alone.
- Increment `generationVersion` when a profile, module, motif, default, or algorithm change intentionally changes the result of an existing seed. Current versions may be tuned freely before compatibility becomes a production requirement.
- Do not remove a module or motif while an active profile references it. Registry validation must report those references. Deprecate it, migrate profiles and any supported saved content, then remove it.
- Removing a facility means excluding its profile from new mission selection. Previously saved compiled missions may remain playable when persistence is implemented; otherwise the save/version migration policy must explicitly reject them.

#### Facility onboarding workflow

1. Write and review the facility brief.
2. Reuse existing space modules where possible; register and validate only the missing primitives.
3. Reuse existing motifs where possible; add and graph-test new motifs independently.
4. Register the facility profile without changing runtime consumers.
5. Generate topology, pack geometry, and run connectivity, reachability, placement, and reset validation.
6. Run the deterministic seed batch, then visually review representative, sparse, dense, and edge-case seeds against the facility's acceptance identity.
7. Tune profile weights and ranges, record the accepted `generationVersion`, and keep the brief beside the profile as its authoring source.

The local government office is the first production use of this contract. Warehouse, factory, laboratory, library, and later facilities should repeat the same onboarding process, while sharing or extending the registries rather than cloning the generator.

### Implementation Steps

#### Step 1 - Generalize the space contract without changing geometry

- Add `spaceType` and optional size/module metadata to generated space records.
- Keep existing `rooms`, connector IDs, bounds, centers, nav nodes, and sound-room behavior compatible.
- Mark the aligned generator as `tutorial_grid` rather than the production default architecture.
- Preserve reference and tutorial mission output while consumers migrate to the extended contract.

Acceptance gate:

- Reference parity, grid-generation, runtime-smoke, and reset-isolation tests remain green.
- Existing gameplay systems require no row/column lookup.

#### Step 2 - Add facility-profile normalization

- Define deterministic defaults and validation for room counts, size weights, corridor style, loops, dead ends, entrances, checkpoints, security zones, and enemy population.
- Keep development overrides separate from authored production profiles.
- Store the normalized profile identity/configuration in generation metadata.

Acceptance gate:

- The same seed plus profile reproduces the same normalized request.
- Invalid ranges are rejected or normalized before topology generation.

#### Step 3 - Generate the abstract connectivity graph

- Create entry, objective-compatible, ordinary, restricted, corridor, junction, and checkpoint nodes before assigning coordinates.
- Guarantee a connected main route from entry to the objective region.
- Add profile-bounded branches, dead ends, alternate routes, and loops.
- Enforce per-space minimum/maximum connector counts and motif adjacency constraints.

Acceptance gate:

- Graph tests validate connectivity, route existence, connector-degree rules, requested loop/dead-end bounds, and deterministic reproduction without rendering geometry.

#### Step 4 - Place variable-sized rooms

- Place entry, objective, large/special, medium, then small anchor spaces in that order.
- Allocate continuous design-space rectangles using a hidden coarse occupancy lattice or equivalent packing structure.
- Support irregular offsets, variable dimensions, motif rotation/mirroring, and spacing between unrelated room clusters.
- Use deterministic retry/backtracking when a placement blocks required topology.

Acceptance gate:

- Placed rooms never overlap or violate clearance.
- The output has no required global row or column alignment.
- Identical seed/profile/attempt inputs reproduce identical placements.

#### Step 5 - Route corridors and junctions

- Select compatible wall sockets on connected spaces.
- Route straight, one-bend, and multi-bend circulation paths without crossing unrelated room interiors.
- Materialize corridor runs as rectangular corridor spaces plus corner/T/cross junction spaces.
- Penalize unnecessary bends while allowing profile-specific straight, branching, or service-route character.
- Merge compatible overlapping routes into deliberate junctions rather than accidental geometry intersections.

Acceptance gate:

- Every abstract graph edge has a traversable compiled route.
- Corridor widths retain player/enemy clearance.
- Bends and junctions have stable space/connector identities for navigation and sound.

#### Step 6 - Compile walls, openings, and subsystem topology

- Derive exterior/interior walls from completed space boundaries instead of separately authoring duplicate geometry.
- Create doors and open passages only at valid shared wall sockets.
- Add exterior windows/exits only on valid exterior wall segments.
- Generate lighting apertures, room/corridor nav nodes, nav edges, sound spaces, and sound portals from the same connectors.
- Continue selecting lamps only from solid non-breakable wall segments after openings are finalized.

Acceptance gate:

- Geometry, doors/windows, lighting, navigation, and sound agree on every connector.
- No door, window, lamp, spawn, or objective occupies invalid/blocking geometry.

#### Step 7 - Add architectural motifs

- Implement the initial reception/checkpoint, office cluster, storage/service branch, secure antechamber, side-branch corridor, and maintenance-loop motifs.
- Allow profile-driven motif weights and required/forbidden motif combinations.
- Rotate, mirror, resize, and reconnect motifs while retaining their internal architectural constraints.

Acceptance gate:

- At least two seeds produce visibly different circulation structures rather than differently opened versions of the same grid.
- Motifs remain composable and do not own complete facility output.

#### Step 8 - Place gameplay content after geometry is final

- Select objective/exfil spaces with meaningful route separation and security-zone constraints.
- Place lamps, enemies, and future interactable hooks from compiled geometry.
- Preserve enemy personal-space spawn rules and generate local/cross-space patrols through valid navigation routes.
- Scale guard count, archetype mix, patrol coverage, and checkpoints through the facility profile.

Acceptance gate:

- Objectives and exits are reachable and not trivially colocated.
- Enemy spawns and patrol routes remain clear of walls/connectors and do not stack actors.

#### Step 9 - Add validation and bounded regeneration

- Validate space overlap/clearance, global reachability, objective/exfil reachability, corridor width, connector sockets, lamp clearance, spawn clearance, nav references, sound portal ownership, and exterior-window validity.
- On failure, retry with a deterministic attempt number derived from the original seed and profile.
- Cap attempts and surface a clear generation error rather than loading a partially invalid mission.

Acceptance gate:

- Every loaded irregular mission has passed the complete validator.
- Retry behavior is deterministic and bounded.

#### Step 10 - Automated and visual regression

- Run at least 100 automated irregular seeds per active facility profile.
- Visually review at least 10 representative office seeds.
- Cover small, default, and `20+` room profiles plus sparse/dense guard populations.
- Exercise straight, bent, branching, looped, and dead-end circulation.
- Recheck ordinary reset, death/new-run seed replacement, local reactions, ballistics, lamp placement, patrol navigation, and sound localization.

Acceptance gate:

- Generated facilities are deterministic, connected, contract-valid, and visibly architectural rather than table-like.
- The topology is sufficiently varied for Feature 16 to select regions and distribute searches without grid assumptions.

### Phase 15B-II Acceptance Criteria

- The tutorial grid remains available as a deterministic tutorial/regression profile.
- At least one production facility profile generates variable-size rooms connected by straight and bent corridor/junction spaces.
- Production mission definitions contain no gameplay-facing row/column dependency.
- Reusable primitives and motifs produce multiple visibly distinct facility structures without requiring complete handcrafted maps.
- All generated geometry compiles through the existing normalized mission contract and retains stable cross-system IDs.
- The same seed/profile reproduces the same valid mission; failed placements use deterministic bounded retries.
- Small, default, and `20+` room single-floor facilities pass automated reachability, clearance, connector, lighting, navigation, sound, spawn, reset, and runtime checks.
- Feature 16 can consume the resulting generic space/connector graph without knowing how the facility was packed.

### Deferred Multi-Floor Boundary

Multi-floor buildings remain outside Feature 15B-II. Do not implement stairs/elevators, vertical navigation, floor switching/rendering, inter-floor sound/light transmission, or floor-aware facility escalation during this pass.

The generic graph must avoid assumptions that prevent later `floorId` and vertical-connector additions, but no floor fields or incomplete vertical behavior need to be introduced prematurely. Multi-floor generation should be designed after Feature 16's single-floor escalation loop is proven, because vertical connectors affect navigation, acoustics, visibility, camera presentation, and escalation propagation together.

## Related Files

- `game.js`
- `enemy.js`
- `sound.js`
- `lighting.js`
- `player.js`
- `tuning.js`
- Future candidate: `mission.js`, `run.js`, or `missions/`
- `Operation guide/Feature planning/feature_16_facility_alert_escalation.md`
