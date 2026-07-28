# Live Feature 16 - Facility Alert and Escalation

**Live status: Not implemented. Planned after Feature 15A mission-data separation and before Feature 15B seeded generation.**

The current game contains Feature 13's local perception, capped suspicion-case coordination, and uncapped but visually relayed companion alert behavior. It does not contain a separate mission-level evidence accumulator, facility alert level, decay model, affected-room state, or facility-wide search/readiness assignment system.

## Planned Boundary

- Feature 16 will consume immutable, deduplicated snapshots of Feature 13/14 local incidents.
- It will use Feature 15A's normalized room and connector topology to select affected connected spaces and distribute search/readiness work.
- It will not broadcast or continuously update the hidden player's position.
- Feature 13 will continue to own individual perception, local memory, local companion sharing, and local action priority.
- Feature 15B will later generate facilities that satisfy the same topology/data contract.

## Related Planning

- `Operation guide/Feature planning/feature_16_facility_alert_escalation.md`
- `Operation guide/Feature planning/feature_15_seeded_mission_generation.md`
