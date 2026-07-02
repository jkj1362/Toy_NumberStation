# Feature 14 - Door Ballistics and Destruction Polish

**Status: Planned for Prototype 2.**

This feature makes doors behave like meaningful stealth/combat objects by adding bullet holes, penetration, and stronger alert consequences.

## Goal

Closed doors should record gunfire damage visually, allow bullets to pass through, threaten actors on the other side, and escalate enemy response.

## First-Pass Scope

- Shooting a closed door creates a persistent bullet hole at the impact point.
- Bullets can penetrate closed doors and continue past the impact.
- Penetrating bullets can damage or kill player/enemies behind the door.
- Door gunfire creates strong sound events.
- Door penetration/gunfire can trigger enemy alert or high-alert building search.
- Existing door HP/destruction remains, but direct always-on debug HP presentation should eventually be replaced with better player-facing damage feedback.

## Open Design Details

- Whether bullet holes are visual-only or also affect sight/sound.
- Penetration damage falloff through doors.
- Whether door material or HP changes penetration chance.
- Whether enemies infer bullet direction or only react to gunfire/impact location.

## Acceptance Criteria

- Door holes are visible and persist until reset.
- A shot through a door can hit an actor on the far side.
- Enemies respond strongly to door gunfire/penetration.
- Door visuals communicate damage more clearly than only debug HP bars.
- Existing door interaction, opening, destruction, sound transmission, and light aperture behavior still works.

## Related Files

- `game.js`
- `player.js`
- `enemy.js`
- `sound.js`
- `tuning.js`
