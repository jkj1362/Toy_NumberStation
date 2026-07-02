# Feature 13 - Corpse, Body Discovery, and AI Event Reactions

**Status: Next.**

This feature closes missed Prototype 1 AI reaction behavior before broader content or metagame work.

## Goal

Enemies should respond believably to corpses, visible companion behavior, attenuated closed-door sounds, and severe suspicious events without becoming omniscient.

## First-Pass Scope

- Implement corpse discovery when a living enemy has line of sight to a corpse.
- Add a reaction path from corpse discovery to investigation, alert, or broader search.
- Let enemies react when they see another enemy chasing, running toward, or fighting the player.
- Let enemies investigate muffled/attenuated sounds through closed doors using the relevant door/room side as the perceived source.
- Escalate repeated or severe suspicious events into a broader alert/search state.
- Keep reactions grounded in local sight, local hearing, or explicit high-alert escalation.

## Non-Goals

- No full squad tactics system.
- No dialogue/bark system unless needed as temporary debug text.
- No corpse hiding, blood trails, or cleanup mechanics yet.
- No global knowledge of the player position unless the player is directly detected.

## Acceptance Criteria

- A guard seeing a corpse changes behavior instead of ignoring it.
- A guard seeing a companion chase/fight the player can join the alert.
- A guard hearing a muffled closed-door cue investigates the door/room side, not the exact hidden source.
- Severe events can produce a facility-wide search/high-alert response without giving perfect player tracking.
- Existing patrol, search, return, cautious, and alert behavior still works.

## Related Files

- `enemy.js`
- `sound.js`
- `game.js`
- `tuning.js`
