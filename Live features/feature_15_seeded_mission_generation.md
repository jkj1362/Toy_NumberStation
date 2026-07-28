# Live Feature 15 - Mission Data Separation and Seeded Procedural Runs

**Live status: Not implemented. Phase 15A is the next implementation feature; Phase 15B waits until Feature 16 is complete.**

The current facility is still hardcoded across `game.js`, `enemy.js`, `sound.js`, and the `MISSION_LIGHTING` data in `game.js`. There is no normalized immutable reference mission, shared connector topology, seed-based generator, or run-persistent generated layout.

## Planned Boundary

- **Feature 15A:** extract the exact current facility into normalized authored mission data plus separate mutable runtime state. Layout and behavior must remain unchanged.
- **Feature 16:** consume the normalized room/connector topology to implement facility-level alert/escalation.
- **Feature 15B:** add seeded procedural mission generation through the same data contract after Feature 16 is working.

The current standard facility remains the parity fixture. Feature 15A does not add random room generation, alternate layouts, facility alert behavior, or broad AI redesign.

## Related Planning

- `Operation guide/Feature planning/feature_15_seeded_mission_generation.md`
- `Operation guide/Feature planning/feature_16_facility_alert_escalation.md`
