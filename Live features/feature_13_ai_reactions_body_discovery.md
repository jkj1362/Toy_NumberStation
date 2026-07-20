# Live Feature 13 - Local AI Event Reactions and Body Discovery

**Live status: In progress. Corpse, structural evidence, companion, muffled-door investigation, movement tuning, and navigation fixes are implemented; general projectile-impact reactions and facility escalation remain.**

Enemy evidence reactions are local. A guard may act on its own sight, an attenuated sound it receives, or visible behavior from another guard, but does not gain the hidden player's live position through global knowledge.

## Current Behavior

- A locally visible corpse causes immediate alert, records the corpse position, and overrides pending/active door investigations. Corpses are remembered per observer.
- Death creates a quiet body-fall sound. Hearing it alone is ordinary acoustic evidence; seeing the body identifies it as a corpse.
- An already damaged intact door causes delayed suspicion, near-side approach, close inspection, escalation, opening, deep room entry, sweep, and return behavior.
- A guard that witnesses a door being hit skips delayed inspection and immediately enters `door-impact` alert, approaches from its current side, crosses, and searches beyond the swung panel.
- A guard that witnesses a lamp break immediately enters `lamp-impact` alert. Later discovery of that broken lamp causes `broken-lamp` suspicion, stand-off approach, sweep, return, and patrol resumption.
- A guard can join an alerted companion using that companion's locally known target, not the player's hidden coordinates.
- Muffled sounds use the attenuating door as the perceived proxy. Investigators save their interrupted behavior, open/cross/search, return, conditionally close an owned door, and restore patrol state.
- Door-side targets are placed beyond the full panel depth and toward a hinge-clear lane. General movement routes around intact open panels.
- Living guards separate after movement so they do not remain overlapped at shared targets.
- Ordinary, suspicious, and alert speeds are `1.5`, `1.2`, and `2.5`. Suspicious return travel restores ordinary speed.
- Ordinary player/proximity confirmation uses `45` frames; suspicious confirmation uses `10`; severe evidence and already heightened states can react immediately.
- Alert and suspicion reasons are simultaneously visible in different debug colors.

## Remaining Work

1. Resolve the proposed gunshot-priority change, add per-observer `shotId` arbitration/deduplication, and connect heard impacts to moving suspicion at the acoustically perceived reachable point.
2. Add geometry-independent witnessed-impact immediate alert/search with reachable side/room targets.
3. Finalize highest-priority same-shot upgrades across direct muzzle observation, witnessed impact, and heard impact.
4. Tune local reaction timing, repetition, suspicion accumulation, and overlapping-stimulus priority after the complete impact loop exists.
5. Add explicit facility-wide alert/search escalation without distributing perfect live player tracking.
6. Run final map-level regression tests across rooms, doors, windows, walls, attenuation routes, overlapping stimuli, and patrol restoration.

## Related Files

- `enemy.js`
- `sound.js`
- `game.js`
- `tuning.js`
- `lighting.js`
