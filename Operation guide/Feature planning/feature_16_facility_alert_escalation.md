# Feature 16 - Facility Alert and Escalation

**Status: Deferred until after Feature 15B produces larger seeded facilities with enough rooms and enemies to validate facility-level behavior.**

Feature 16 is the explicit mission-level escalation layer. It converts locally grounded incidents into broader facility readiness and search behavior without turning guards into an omniscient hive mind.

## Goal

Allow serious or accumulating evidence to change the facility's overall security posture and coordinate searches across connected spaces, while each guard still needs local perception to obtain or refresh the player's actual position.

## Dependencies

- **Feature 13:** supplies immutable local incident snapshots, including stable event identity, reason, priority/severity inputs, perceived location, age, provenance, confidence/information quality, and player-confirmation status.
- **Feature 14:** supplies stable ballistic `shotId` events and destruction/penetration evidence without double-counting one projectile.
- **Feature 15A:** supplies normalized room IDs, connector IDs, navigation topology, sound portals, and the reference mission boundary.

Feature 15B procedural generation now precedes this system. Feature 16 will consume the same normalized contract after it has been exercised by both the reference mission and larger generated facilities.

## Ownership Boundary

- Mission data owns static topology and authored initial values.
- Feature 13 owns local perception, local memory, companion sharing, and individual reactions.
- Feature 16 owns mutable mission-level alert state, evidence accumulation, escalation thresholds, decay, and facility search/readiness assignments.
- Individual guards retain their own last-known or inferred investigation positions. Facility state never stores or distributes a continuously updated hidden-player coordinate.

## First-Pass Scope

- Define a facility incident input contract using immutable snapshots rather than references to mutable enemy state.
- Deduplicate inputs by stable incident/event identity so relays and multiple observers do not inflate severity.
- Map incident classes to explicit mission-level severity contributions. Corpse discovery, confirmed direct combat/gunshots, destruction, and repeated independent ballistic evidence should be distinguishable from ordinary suspicion.
- Accumulate facility evidence into readable alert levels with deliberate thresholds, decay, and reset behavior.
- Use normalized room/connector topology to select affected or connected search regions.
- Assign broader readiness/search work without sending every guard to one exact point.
- Preserve Feature 13's local rules: guards can still accept higher-priority local stimuli, direct detection remains authoritative, and shared information cannot become more authoritative through relay.
- Expose current facility alert level, contributing incidents, affected regions, and assignments in debug/tuning tools.

## Suggested State Boundary

```javascript
const facilityAlert = {
  level: 'normal',
  score: 0,
  incidents: new Map(),
  affectedRoomIds: new Set(),
  searchAssignments: new Map(),
};
```

Exact level names, weights, thresholds, decay timing, and assignment counts should be decided and tuned during Feature 16. They should not be hardcoded into Feature 13 or mission definitions.

## Implementation Order

1. Define and validate the immutable local-incident-to-facility contract.
2. Add deduplicated facility evidence storage and reset behavior.
3. Resolve severity classes, thresholds, escalation levels, and decay.
4. Select affected rooms/connector regions from Feature 15A topology.
5. Assign readiness/search behavior while preserving individual local knowledge.
6. Add debug visibility and tunables.
7. Run combined Feature 13/14/15A/16 regression scenarios.

## Non-Goals

- No procedural room generation; Feature 15B owns it.
- No global or continuously refreshed player-position broadcast.
- No replacement of Feature 13's local suspicion team cap or observed-alert relay rules.
- No full squad command hierarchy, tactical formations, radio dialogue, or reinforcement system.
- No metagame heat, campaign consequences, or mission-result scoring.

## Acceptance Criteria

- Repeated or severe independent local incidents can raise a visible facility alert level.
- The same incident cannot be counted repeatedly through companion relays, multiple observers, or multiple impacts from one penetrating shot.
- A raised facility alert changes readiness/search behavior across relevant connected spaces rather than making every guard rush one coordinate.
- Guards who have not directly detected the player receive bounded incident/search information, never the player's live position.
- Higher-priority local stimuli and direct player detection can still override facility assignments.
- Facility state decays or resets according to explicit rules and is fully cleared by mission reset.
- The reference facility's room, connector, nav, and sound topology agree on affected-region selection.
- Feature 13's local behaviors and Feature 14's ballistic semantics remain intact.

## Related Files

- `enemy.js` - individual local perception, incident snapshots, and assignment consumption
- `sound.js` - room/portal topology and acoustic incident provenance
- `game.js` - mission reset and possible facility-alert update ownership
- `tuning.js` - escalation weights, thresholds, decay, and debug controls
- Future candidate: `facility-alert.js`
- `Operation guide/Feature planning/feature_13_ai_reactions_body_discovery.md`
- `Operation guide/Feature planning/feature_15_seeded_mission_generation.md`
