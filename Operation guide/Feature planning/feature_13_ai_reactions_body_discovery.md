# Feature 13 - Local AI Event Reactions and Body Discovery

**Status: In progress.**

This feature closes the remaining Prototype 1 AI-reaction gaps before broader content or metagame work. Local perception and reactions must work on their own before any facility-wide alert system is added.

## Goal

Enemies should react believably to locally perceived evidence and nearby enemy behavior without gaining the player's current position through shared global knowledge.

## Information Rule

An enemy may react only to:

- something currently inside its own sight cone with clear line of sight;
- a sound that reaches it through the existing attenuation and room/door model; or
- a future, explicit facility-alert event added in the final first-pass increment.

Seeing evidence may place an enemy in full alert, but it does not reveal the player's live position. Alert movement must use the last locally known or inferred investigation position. Only direct player detection continually refreshes that position.

## Local Visual Stimuli

### Enemy corpse

- A living enemy detects an enemy corpse only when the corpse is inside its sight range and cone, is visible under the normal lighting rule, and has clear line of sight.
- The corpse is remembered per observer so it does not retrigger every frame.
- Discovery immediately enters full alert and records the corpse position as the local investigation position.
- Newly visible corpse evidence interrupts and clears pending or active door investigations, including a door-impact alert already in progress. The guard immediately enters corpse alert because a body is more severe than damaged-door or muffled-door evidence.
- Active alert sources use explicit severity precedence (`player` > `corpse` > `door-impact` / `lamp-impact` > heard `gunshot` > `door` > `alerted-enemy` > ordinary `sound`). A lower-priority event may refresh the alert timer, but it cannot overwrite the investigation target or the debug overlay's displayed reason.
- Direct player detection still overrides the evidence reaction and refreshes the player's last known position.
- A corpse behind a wall or closed door does not alert an enemy.
- Death emits one low-radius body-fall sound at the victim's position. Nearby guards may investigate that acoustic location under ordinary sound attenuation, but only later visual confirmation upgrades the reason to `corpse`.
- A clearly heard gunshot can interrupt an older damaged/destroyed-door alert and retarget the guard toward the perceived muzzle position. It does not override a corpse or directly witnessed impact, and a muffled gunshot uses the relevant doorway proxy rather than revealing an occluded exact source.

### Damaged or destroyed door

- A closed door is damaged evidence when `hp < maxHp`; in the final presentation this represents persistent bullet holes or punched-through damage on the panel. A destroyed door is always severe evidence.
- Door damage must be inside the observer's sight range and cone with clear line of sight. Unlike a character or corpse, the structural panel does not require lamp illumination to be recognized as damaged; otherwise the intact panel can block the light needed to reveal its own evidence.
- Each damage state is remembered per observer. Further damage may create a new observation, while an unchanged door does not retrigger continuously.
- Seeing an intact damaged door enters `suspicious` after the normal reaction delay. The enemy approaches the observer-side interaction point without automatically opening the door.
- At interaction range, the enemy stops and inspects the panel for a short confirmation delay (default 90 frames / 1.5 seconds). The enemy then treats the bullet damage as a serious threat, enters full alert, opens the door, crosses into the connected room, and uses the ordinary unknown-source alert/search path on the far side.
- A bullet damaging the door is also a transient impact stimulus. An enemy that has the impact point inside its own sight cone/range with clear line of sight witnesses the damage in real time and enters full alert immediately, skipping suspicious discovery, approach, and confirmation delay.
- A real-time witness records the resulting door damage state as understood, moves directly to the observer-side interaction point, opens the door, crosses the threshold, and uses the same far-side unknown-source alert/search target as destroyed-door discovery. This uses an explicit door-transit sequence; the generic alert pathfinder must not try to route to the far side while the damaged door is still closed.
- Enemies facing away, outside range, or occluded at the moment of impact do not receive the transient stimulus. They may later discover the persistent bullet damage through the suspicious inspection path.
- Seeing an already destroyed door remains an immediate full-alert event and records the opening as the local investigation position.
- If an inspected damaged door is destroyed before the enemy reaches it, the inspection escalates immediately using the destroyed-door path.
- Merely seeing a normally open, undamaged door is not evidence in this pass.

### Broken light fixture

- A bullet breaking a lamp is transient visual evidence. A guard with the impact inside its sight range and cone with clear line of sight immediately enters `alert` with reason `lamp-impact`, matching the severity of witnessing a door impact without revealing the shooter.
- The real-time witness remembers that fixture as broken so it does not later downgrade or retrigger the same evidence as a new suspicion.
- A guard that did not witness the shot may later recognize the inactive fixture inside its cone/range with clear line of sight. Structural fixture evidence does not require the broken lamp itself to illuminate its position.
- Later discovery enters `suspicious` with reason `broken-lamp` after the normal reaction delay. It forces the existing moving investigation even on the guard's first suspicion: navigate to a reachable stand-off point beside the wall fixture, sweep locally, return to the interrupted position, and resume the saved patrol route.
- Broken fixtures are remembered per observer and do not retrigger continuously.

### Alerted companion

- A living enemy can join an incident after seeing another living enemy that is in `alert` and has a locally known engagement/investigation position.
- The companion must be inside the observer's sight range and cone, visible under the normal lighting rule, and have clear line of sight.
- The observer enters full alert and copies the companion's last known engagement position. It does not copy the player's live coordinates.
- The same continuous companion alert is remembered per observer and does not retrigger every frame. A later, separate alert may be observed again.

### Projectile impact stimuli

Projectile impacts add a local heard-versus-witnessed reaction before facility-wide escalation is designed.

- Every projectile carries a stable shot/incident ID from muzzle creation through all penetrated geometry impacts.
- Muzzle and impact sounds from the same shot remain separate world sounds, but an enemy must not count the pair as two independent confirmations merely because one bullet produced both.
- An enemy that hears an impact without witnessing it enters or refreshes `suspicious` and investigates the acoustically perceived impact position. Clear hearing may identify the actual impact point; muffled or wall-vague hearing must use the existing proxy/perceived position instead of hidden exact coordinates.
- This heard-impact investigation moves on the first impact stimulus, performs a brief local check, and returns to the interrupted patrol behavior if no additional confirming stimulus is detected.
- A merely heard impact does not directly enter `alert`. Additional independent stimuli may refresh or escalate local suspicion according to the later tuning pass.
- An enemy that has the real-time impact point inside its sight cone/range with clear line of sight witnesses the collision and enters `alert` immediately. The witnessed path takes priority over the heard path for that enemy and shot.
- Witnessed impact search targets must be navigable. The enemy routes through available doors/portals into the room or connected space associated with the impact; it never targets a point inside geometry or paths directly through a blocking wall.
- A witnessed penetrable door/window impact may use an explicit near-side approach and threshold transit. A blocking wall or future non-penetrable door remains a navigation barrier and must be approached/searched from a reachable side.
- Impact observation does not reveal the shooter's live position. Directly seeing the shooter or muzzle remains the only immediate source of continuously refreshed actor coordinates.

## Closed-Door Sound Investigation

A heard sound with `localization === 'muffled'` and a closed-door proxy starts a special suspicious investigation. The enemy knows that something was heard in the connected room, but not the sound's exact position.

The sequence is:

1. Save the enemy's interrupted position, facing, patrol index, patrol pause, and patrol sweep progress.
2. Enter `suspicious` after the normal reaction delay and face the relevant connecting door.
3. Path to the listener side of that door.
4. Open the door if it is still closed, remembering whether this investigation opened it.
5. Cross through the clear lane away from the hinge and continue beyond the full swung-panel depth into the connected room's open space rather than stopping at the door collision area.
6. Search locally with a limited rotational sweep. The exact hidden sound source is never used as a movement target.
7. If the player is detected at any point, cancel the investigation and enter the normal direct-detection alert path.
8. If nothing is found, cross back to the original side.
9. Close the door only if this investigation opened it, the door is still intact and open, and closing is not obstructed.
10. Return to the interrupted position and restore the saved patrol/facing behavior.

Door-crossing waypoints use the ordinary close arrival radius rather than the wider doorway-navigation tolerance. The far-side point is placed beyond the complete swung-panel length, and the crossing lane stays toward the unhinged side of the aperture. This prevents an investigator from treating the doorway center as its destination or sweeping in the panel's shadow. General pursuit/search navigation adds temporary clearance nodes around open panel corners so guards route around the panel instead of repeatedly pushing into it.

Living enemies resolve mutual body separation after movement. Overlapping guards share the displacement, reapply wall/door collision, and iterate until their centers retain at least two enemy radii of spacing, including when multiple guards converge on the same investigation point.

If the door is opened by someone else before the enemy reaches it, the enemy may continue through it but does not claim ownership and therefore does not close it. If the door is destroyed during the investigation, the enemy continues or returns without attempting to close it.

Clear same-room sounds continue to use the existing suspicious behavior. Existing direct visual confirmation and visible muzzle-flash reactions remain immediate alert triggers.

## First-Pass Order

1. **Done:** Local corpse discovery and full-alert reaction.
2. **Done:** Local damaged-door suspicious inspection and destroyed-door full-alert reaction.
3. **Done:** Local reaction to a visibly alerted/engaged companion.
4. **Done:** Closed-door muffled-sound investigation, including opening, threshold search, return, and owned-door closing.
5. **Next:** Resolve the gunshot-priority decision, add per-observer `shotId` arbitration/deduplication, and implement heard-impact moving suspicion using the acoustically perceived reachable point.
6. **Queued:** Add geometry-independent witnessed-impact immediate alert/search with reachable near-side, room-side, or portal-transit targets.
7. **Queued:** Finalize same-shot upgrades across direct muzzle observation, witnessed impact, and heard impact; then tune local reaction timing and suspicion accumulation.
8. **Queued:** Add explicit facility-wide alert/search escalation after local reactions are accepted.
9. **Queued:** Run the final combined Feature 13/14 map-level regression matrix.

Steps 1-7 must remain local. Step 8 may broaden awareness, but must not distribute perfect, continuously updated player tracking. Step 9 validates the completed local and facility loops without adding new design.

## Implementation Status

- Implemented: local corpse discovery, damaged/destroyed-door discovery, broken-lamp discovery, and alerted-companion observation.
- Implemented: real-time witnessed door impacts use an immediate-alert near-side approach, explicit opening/crossing, and far-side search transition.
- Implemented: real-time witnessed lamp destruction enters immediate local alert; later broken-lamp discovery uses the moving suspicious investigation and patrol-return path.
- Implemented: locally grounded alert targets that do not follow the hidden player's live coordinates.
- Implemented: enemies use explicit tuned movement speeds: `1.5` during ordinary behavior, `1.2` while cautiously approaching/searching in `suspicious`, and `2.5` while in `alert`. Suspicious return travel restores ordinary speed as soon as the investigation sweep is finished.
- Implemented: an ordinary patrol guard confirms direct player sight or a first proximity stimulus after the normal 45-frame reaction window, while a suspicious guard confirms newly detected player sight, proximity, or a second sound after a brief 10-frame delay. Guards already searching, returning from alert, or patrolling cautiously keep their immediate heightened response. Severe visual evidence that already causes immediate alert remains immediate, while specialized door/lamp evidence keeps its dedicated investigation rules.
- Implemented: deep room-side investigation points, open-panel path detours, hinge-clear doorway lanes, and mutual living-enemy separation.
- Implemented: muffled closed-door investigation with approach, owned opening, threshold crossing, local sweep, return, owned closing, and patrol-state restoration.
- Pending: heard projectile-impact investigation and geometry-independent witnessed-impact alert/search behavior.
- Pending: playtest tuning for local reaction frequency, timing, and suspicion accumulation.
- Pending: explicit facility-wide alert/search escalation after local tuning is accepted.

## Open Priority Decision

The implemented alert-source order is currently `player` > `corpse` > witnessed `door-impact` / `lamp-impact` > heard `gunshot` > `door` > `alerted-enemy` > ordinary `sound`. A clearly heard gunshot can already replace an older door alert, but it cannot replace corpse or witnessed-impact evidence.

The proposed alternative is to make heard `gunshot` the highest non-player reason, above corpse and witnessed impact. That proposal has not been applied yet. Confirm it during the projectile-impact integration pass because changing it affects same-shot deduplication, the debug reason, and whether acoustic evidence can redirect a guard away from severe visual evidence.

## Facility-Wide Escalation - Deferred Until Local Reactions Are Stable

- Do not add automatic building-wide knowledge while implementing the local stimuli.
- After local behavior is tuned, define suspicion weights or severity for corpses, destroyed doors, repeated impacts/sounds, and active combat.
- Accumulate those events into an explicit high-alert threshold.
- Crossing the threshold may start a broader search and alter patrol readiness, but enemies still need direct perception to know the player's current position.

## Non-Goals

- No full squad tactics or command hierarchy.
- No dialogue/bark system unless temporary debug text is needed.
- No corpse hiding, blood trails, or cleanup mechanics.
- No reaction to ordinary open doors in this pass.
- No global knowledge of the player's position.
- No facility-wide escalation until the local reaction increments are complete and tuned.

## Acceptance Criteria

- A guard who locally sees an enemy corpse enters alert and investigates the corpse position without tracking the hidden player.
- A guard that sees a corpse while a door investigation or door alert is pending or active cancels that investigation and immediately enters corpse alert; later door evidence does not replace the corpse reason in the debug overlay.
- A guard who sees an intact damaged door becomes suspicious, approaches without opening it early, and stops for the configured close-inspection delay at interaction range before escalating.
- On close inspection, that guard enters alert, opens the damaged door, crosses, and performs the ordinary unknown-source search in the connected room.
- A guard that directly witnesses a bullet damage the door enters alert immediately and skips the inspection sequence.
- That witness approaches the damaged door from its current side, opens it at interaction range, and crosses without first routing away toward another navigation portal.
- A guard who sees a destroyed door enters alert immediately.
- A guard that directly sees a lamp break enters immediate `lamp-impact` alert and investigates a reachable point beside the fixture without learning the hidden shooter's location.
- A guard that later discovers an already broken lamp enters `broken-lamp` suspicion, moves to inspect it on the first suspicion, performs a local sweep, and resumes its interrupted patrol; the same fixture does not retrigger continuously.
- A guard who locally sees an alerted companion can join using the companion's last known engagement position.
- **Pending impact integration:** A guard who only hears a projectile impact becomes suspicious, investigates the perceived reachable point, and returns if nothing else is detected.
- **Pending impact integration:** Hearing the muzzle and impact sounds from one shot does not by itself count as two independent confirmations.
- **Pending impact integration:** A guard who witnesses a projectile collide with geometry enters alert immediately and searches a reachable room/side associated with that impact.
- **Pending impact integration:** A witnessed impact does not make the guard path through a blocking wall or infer the hidden shooter's live coordinates.
- Corpse and companion stimuli do not work through walls, closed doors, darkness, or outside the observer's cone/range. Door damage requires cone/range/line of sight but is intentionally independent of lamp illumination.
- A muffled sound through a closed connecting door produces the complete suspicious door-investigation sequence.
- After opening an investigation door, the guard crosses fully to the intended room-side waypoint before beginning its sweep; it does not stop at the doorway because of the wider navigation-gap tolerance.
- Suspicious, searching, and alerted movement routes around an intact open panel rather than repeatedly colliding with it, and door investigations sweep from open room space beyond the panel's full reach.
- Living enemies never remain overlapped when moving or sharing a destination; they separate and compromise their final positions without entering blocking geometry.
- An unsuccessful door investigation restores the interrupted patrol position, facing, waypoint, pause, and sweep progress.
- The investigator closes only an intact door that it opened for that investigation.
- Seeing the player during any evidence or door reaction immediately transfers to normal player-confirmed alert behavior.
- Enemies move at tuned speed `2.5` in `alert`, at `1.2` during an active suspicious approach/search, and at the normal `1.5` speed while returning from a completed investigation or performing ordinary behavior.
- An ordinary patrol enemy that directly detects the player uses the normal reaction delay (default 45 frames); a suspicious enemy that detects the player or receives a second confirming sound uses the short suspicious-confirm delay (default 10 frames).
- Existing patrol, ordinary suspicion, search, return, cautious, melee alert, and shooter alert behavior still works.
- Facility-wide escalation remains absent until the final first-pass increment.

## Related Files

- `enemy.js` - perception, local stimulus memory, alert knowledge, investigation phases, and return behavior
- `sound.js` - attenuated sound result and closed-door investigation dispatch
- `game.js` - corpse data and door state/interaction helpers
- `tuning.js` - tunable reaction, search, sight, and movement values
