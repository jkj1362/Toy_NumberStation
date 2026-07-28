# Feature 13 - Local AI Event Reactions and Body Discovery

**Status: Local-reaction implementation complete; stabilization and bug fixing remain ongoing. Facility-wide escalation has moved to Feature 16.**

This feature closes the remaining Prototype 1 AI-reaction gaps before broader content or metagame work. Local perception and reactions must work on their own before any facility-wide alert system is added.

## Goal

Enemies should react believably to locally perceived evidence and nearby enemy behavior without gaining the player's current position through shared global knowledge.

## Information Rule

An enemy may react only to:

- something currently inside its own sight cone with clear line of sight;
- a sound that reaches it through the existing attenuation and room/door model; or
- an explicit event shared by a locally perceived suspicious or alerted companion under the state-specific coordination rules below, carrying that event's original provenance and last known/inferred position; or
- a future, explicit facility-alert event owned by Feature 16.

Seeing evidence may place an enemy in full alert, but it does not reveal the player's live position. Alert movement must use the last locally known or inferred investigation position. Only direct player detection continually refreshes that position.

Unless a stimulus explicitly supplies its own transient light, direct visual perception requires sufficient illumination at the observed point in addition to range, cone, and clear line of sight. Darkness therefore removes ordinary direct visual impact/evidence reactions and leaves guards dependent on acoustically perceived positions. The self-illuminating exceptions are a live muzzle flash and witnessing an illuminated lamp at the instant it is destroyed. Already-broken lamp discovery is a separate structural-anomaly exception: a guard may recognize the absence of an expected active light without requiring the inactive fixture to illuminate itself.

Shared companion information never becomes more authoritative merely because it was relayed. The shared payload retains a stable event ID, original reason, original priority, location, age, and player-confirmation status. Each receiver deduplicates that event and may relay the same payload locally, but no relay may raise its information priority or refresh it into a newer event without a genuinely new stimulus.

## Local Visual Stimuli

### Enemy corpse

- A living enemy detects an enemy corpse only when the corpse is inside its sight range and cone, is visible under the normal lighting rule, and has clear line of sight.
- The corpse is remembered per observer so it does not retrigger every frame.
- Discovery immediately enters full alert and records the corpse position as the local investigation position.
- Newly visible corpse evidence interrupts and clears pending or active door investigations, including a door-impact alert already in progress. The guard immediately enters corpse alert because a body is more severe than damaged-door or muffled-door evidence.
- Runtime source precedence now follows the evidence and companion-assignment rules in **Resolved Alert Priority and Companion Coordination** below.
- Direct player detection still overrides the evidence reaction and refreshes the player's last known position.
- A corpse behind a wall or closed door does not alert an enemy.
- Death emits one low-radius body-fall sound at the victim's position. Nearby guards may investigate that acoustic location under ordinary sound attenuation, but only later visual confirmation upgrades the reason to `corpse`.
- A clearly heard gunshot can interrupt companion guidance, corpse, damaged/destroyed-door, and witnessed-impact reactions and retarget the guard toward the perceived muzzle position. A muffled gunshot uses the relevant doorway proxy rather than revealing an occluded exact source. Direct player detection remains the only higher-priority stimulus.

### Damaged or destroyed door

- A closed door is damaged evidence when `hp < maxHp`; in the final presentation this represents persistent bullet holes or punched-through damage on the panel. A destroyed door is always severe evidence.
- Door damage must be sufficiently illuminated and inside the observer's sight range and cone with clear line of sight. In darkness, an enemy cannot visually recognize later damage or destruction and must rely on sound or another shared event.
- Each damage state is remembered per observer. Further damage may create a new observation, while an unchanged door does not retrigger continuously.
- Seeing an intact damaged door enters `suspicious` after the normal reaction delay. The enemy approaches the observer-side interaction point without automatically opening the door.
- At interaction range, the enemy stops and inspects the panel for a short confirmation delay (default 90 frames / 1.5 seconds). The enemy then treats the bullet damage as a serious threat, enters full alert, opens the door, crosses into the connected room, and uses the ordinary unknown-source alert/search path on the far side.
- A bullet damaging the door is also a transient impact stimulus. An enemy witnesses it in real time only when the impact point is sufficiently illuminated and inside its own sight cone/range with clear line of sight. A valid witness enters full alert immediately, skipping suspicious discovery, approach, and confirmation delay.
- A real-time witness records the resulting door damage state as understood, moves directly to the observer-side interaction point, opens the door, crosses the threshold, and uses the same far-side unknown-source alert/search target as destroyed-door discovery. This uses an explicit door-transit sequence; the generic alert pathfinder must not try to route to the far side while the damaged door is still closed.
- Enemies facing away, outside range, or occluded at the moment of impact do not receive the transient stimulus. They may later discover the persistent bullet damage through the suspicious inspection path.
- Seeing an already destroyed door remains an immediate full-alert event and records the opening as the local investigation position.
- If an inspected damaged door is destroyed before the enemy reaches it, the inspection escalates immediately using the destroyed-door path.
- Merely seeing a normally open, undamaged door is not evidence in this pass.

### Broken light fixture

- A bullet breaking a lamp is transient self-illuminating visual evidence. A guard with the impact inside its sight range and cone with clear line of sight immediately enters `alert` with reason `lamp-impact`, even though the fixture becomes dark during that event. This is an explicit lighting exception because the lamp was visibly illuminated at the instant of destruction.
- The real-time witness remembers that fixture as broken so it does not later downgrade or retrigger the same evidence as a new suspicion.
- A guard that did not witness the shot may later recognize the inactive fixture inside its cone/range with clear line of sight even when the area is dark. This represents noticing the absence of an expected active light rather than visually resolving an illuminated fixture.
- Later discovery enters `suspicious` with reason `broken-lamp` after the normal reaction delay. It forces the existing moving investigation even on the guard's first suspicion: navigate to a reachable stand-off point beside the wall fixture, sweep locally, return to the interrupted position, and resume the saved patrol route.
- Broken fixtures are remembered per observer and do not retrigger continuously.

### Suspicious companion search team

- Suspicion sharing creates a local **suspicion case** identified by the originating event/case ID. The default active investigation team is capped at four enemies total: the original perceiver plus at most three companions recruited because they observe suspicious behavior.
- The four-enemy limit is a case roster, not a fresh allowance for every update. New evidence discovered while working the same case retains the case ID and cannot recruit another wave of investigators.
- Direct perception remains authoritative. An enemy that personally perceives the stimulus may still enter `suspicious` after the four movement slots are occupied, but it becomes a support/holding observer rather than another enemy converging on the evidence point.
- Every distinct credible stimulus accepted by a suspicious case updates the members' evidence memory. A strictly clearer, louder, closer, or otherwise more prominent report may refine an existing event. Equal or worse repetitions are deduplicated.
- Knowledge updates and movement assignments are separate. The lead investigator uses the evidence position, while the other active investigators receive nearby non-overlapping search points. Support enemies remain locally vigilant instead of joining the convergence.
- A genuine case update may retarget active investigators without increasing `suspicionLevel`, creating a second confirmation, refreshing the event's age, or manufacturing a new companion event. Repeated relay of unchanged information cannot keep suspicion alive indefinitely.
- If any case member enters `alert`, the suspicion roster cap stops applying to that incident. The resulting alert then follows the uncapped observed-alert propagation below.

### Alerted companion

- A living enemy can join an incident after seeing another living enemy that is in `alert` and has a locally known engagement/investigation position.
- The companion must be inside the observer's sight range and cone, visible under the normal lighting rule, and have clear line of sight.
- The observer enters full alert and receives the companion's current incident payload rather than a new generic event: stable event ID, original reason and priority, last known/inferred position, age, and whether the original observer directly confirmed the player. It never receives or tracks the hidden player's current coordinates.
- A receiver may relay that same event to other locally observing enemies. Relaying never increases priority, resets event age, changes provenance, or creates a new confirmation. In particular, an impact event cannot be promoted above impact priority merely because it passed through an alerted companion.
- The same event is remembered per observer and deduplicated across direct observation and any number of relays, preventing continuous retriggers and companion-alert loops. A genuinely new stimulus creates a new event and may be shared separately.
- Alert expansion has no squad-size cap. Every enemy that actually observes an alerted companion may enter alert and may then relay that alert to further observers. This creates an uncapped recursive visual chain, not a global broadcast: darkness, facing, sight range, walls, and closed doors can stop propagation.
- An already-alerted receiver changes its action only for a higher-priority incident or strictly better information. A same-event refinement may update its fixed destination/path, but it does not add confirmation, refresh alert/reaction timers, restart a sweep, reset event age, or relay live player coordinates. Equal or lower-quality reports are ignored for action selection.
- While traveling to the shared search position, the receiver has an active companion assignment. Direct player detection, a gunshot, or local corpse detection may override that assignment immediately. Lower-priority local evidence may refresh awareness but does not pull the receiver away from the coordinated destination.
- Reaching the assigned search area and beginning the sweep fulfills and unlocks the companion assignment. From that point, each guard independently accepts and arbitrates its own locally perceived stimuli; a newly accepted stimulus becomes that guard's current event and may be shared with nearby enemies.
- Companion coordination controls alert state and temporary destination commitment, while the shared event's original priority controls its information authority. These are separate concepts and must not be collapsed into one boosted `alerted-enemy` reason.

### Projectile impact stimuli

Projectile impacts add a local heard-versus-witnessed reaction before facility-wide escalation is designed.

- Every projectile carries a stable shot/incident ID from muzzle creation through all penetrated geometry impacts.
- Muzzle and impact sounds from the same shot remain separate world sounds, but an enemy must not count the pair as two independent confirmations merely because one bullet produced both.
- An enemy that hears an impact without witnessing it enters or refreshes `suspicious`, but audio alone never supplies the exact collision coordinate. A same-room or otherwise unobstructed impact supplies only a short directional proxy; a muffled impact uses the relevant closed-door proxy. Exact impact knowledge requires the visual-witness conditions below.
- This heard-impact investigation moves on the first impact stimulus, performs a brief local check, and returns to the interrupted patrol behavior if no additional confirming stimulus is detected.
- A merely heard impact does not directly enter `alert`. Additional independent stimuli may refresh or escalate local suspicion according to the later tuning pass.
- An enemy that has the sufficiently illuminated real-time impact point inside its sight cone/range with clear line of sight witnesses the collision and enters `alert` immediately. The witnessed path takes priority over the heard path for that enemy and shot. Door, wall, window, and metal impacts do not bypass this illumination requirement.
- Witnessed impact search targets must be navigable. The enemy routes through available doors/portals into the room or connected space associated with the impact; it never targets a point inside geometry or paths directly through a blocking wall.
- A witnessed penetrable door/window impact may use an explicit near-side approach and threshold transit. A blocking wall or future non-penetrable door remains a navigation barrier and must be approached/searched from a reachable side.
- Impact observation does not reveal the shooter's live position. Directly seeing the shooter or muzzle remains the only immediate source of continuously refreshed actor coordinates.

## Resolved Same-Shot and Penetration Rules

One projectile may create a muzzle event, a gunshot sound, several penetrated-surface impacts, a terminal impact, and a destruction sound. These remain different perception routes associated with one stable `shotId`; they do not become independent confirmations merely because the projectile crossed several targets.

The following rules are resolved:

1. **Window prominence:** A window strike or break is more prominent than an ordinary wall impact. Glass impact audio must be louder and reach farther than ordinary wall-impact audio. When an observer perceives both a window impact and a later ordinary wall impact from the same projectile at otherwise equal information quality, the window event remains preferred; the terminal wall impact does not replace it merely because it occurred later. A broken window also remains persistent, readily observable structural evidence under the ordinary illumination, cone/range, and line-of-sight rules.
2. **Same-rank refinement without reconfirmation:** A later perception from the same `shotId` may refine the current investigation location when it is clearer, closer, or acoustically more prominent. This changes the best-known location but adds no suspicion count and creates no second confirmation.
3. **State-dependent companion updates:** Suspicious enemies share every distinct credible discovery within a fixed four-member case team and continually redistribute evidence-search destinations without double-counting suspicion. Direct perceivers beyond the four movement slots remain suspicious support rather than converging. Alert propagation is uncapped through actual observation, but an already-alerted receiver changes action only for higher-priority or strictly better information. Strictly better companion information about a remembered `shotId` may refine its fixed destination/path without adding confirmation, refreshing timers, restarting a sweep, resetting age, or streaming live player coordinates.
4. **Distinct gunshots remain independent:** Different `shotId` values represent different physical shots. A second heard gunshot confirms full alert even when it arrives during the first shot's normal 45-frame reaction delay; an existing pending reaction may not collapse the two shots into one.
5. **Repeated ballistic-impact threshold:** Two different ballistic shots whose impacts are heard within approximately three seconds (180 frames) confirm full alert. Several window, door, wall, lamp, or metal impacts produced by one penetrating projectile still contribute only once toward this threshold.
6. **Destruction supersedes same-object impact:** When one projectile both impacts and destroys the same door or window, the destruction route supersedes that object's ordinary impact route. It may carry the larger hearing reach and more useful structural location, but it remains one confirmation for that `shotId`. This same-object refinement does not override the already-resolved overall rule that a heard gunshot outranks impact-family information.
7. **Gunshot audio is source-neutral:** A heard gunshot causes exactly the same acoustic reaction, priority, delay, localization, and confirmation behavior whether the shooter is the player or an enemy. Visual recognition of an alerted companion remains a separate information-sharing route and must not weaken or strengthen the gunshot sound itself.
8. **Actor penetration adds no ballistic stimulus:** Hitting or penetrating a living enemy creates no additional bullet-impact stimulus. Victim behavior, enemy death/body-fall sound, later corpse discovery, and companion observation provide the relevant reactions.
9. **Same-shot memory remains five seconds:** Per-observer same-shot route memory remains 300 frames by default. Future unusually slow projectiles may explicitly override that lifetime rather than expanding every shot's memory.
10. **Silencer behavior is deferred:** No silencer-specific reaction rule is part of Feature 13. It will be designed only when the attachable item is implemented; the current sound system should simply allow that future shot to supply a reduced base gunshot radius before ordinary environmental transmission.

### Muzzle flash visual stimulus

- Every player or enemy shot creates a brief, visibly rendered muzzle flash at the muzzle position and links it to the projectile's stable `shotId`.
- The flash is a strong omnidirectional (`360` degree) transient world light, visually brightening the surrounding area like a camera flash rather than only drawing a small weapon sprite.
- Flash propagation uses the same geometry and aperture rules as other world lighting. Opaque walls and closed doors block it; valid open/destroyed door apertures and light-transmitting physical windows allow it through according to the existing lighting model.
- The flash has a short bounded lifetime and tuned radius/intensity. It must be long enough to render visibly and participate in enemy perception for the intended split second, without becoming persistent illumination.
- Because the flash supplies its own light, a guard may directly observe the muzzle in an otherwise dark room when the muzzle is inside range and vision cone with clear line of sight. This is an explicit self-illuminating exception, not ambient-light-independent general vision.
- The transient flash illumination also participates in the ordinary visibility test for the frames in which it exists. Characters or evidence inside the flash-lit, aperture-reachable area may therefore become visually detectable if the observer's own range, cone, and line-of-sight requirements are satisfied.
- Seeing the muzzle flash and hearing the gunshot remain separate perception routes associated with the same `shotId`. The visual route must not depend on the sound being heard, and the pair must not count as two independent confirmations for one guard.

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
5. **Done:** Require ordinary illumination for real-time door-impact witnesses and later damaged/destroyed-door discovery, while preserving both lamp exceptions: instant destruction and later recognition of an unexpectedly inactive fixture.
6. **Done:** Apply the resolved alert/companion priority model, add stable shared-event provenance plus per-observer event and `shotId` arbitration/deduplication, render aperture-aware transient muzzle-flash lighting, separate visual muzzle observation from sound hearing, and implement heard-impact moving suspicion using the acoustically perceived reachable point.
7. **Done:** Add geometry-independent witnessed-impact immediate alert/search with reachable near-side, room-side, or portal-transit targets.
8. **Done:** Implement the resolved same-shot refinements and state-dependent companion coordination: window-over-wall prominence, same-rank location refinement, distinct-shot confirmation during pending reactions, the two-impact/three-second alert threshold, same-object destruction precedence, source-neutral gunshot audio, capped four-member suspicion cases, strictly improving suspicious/alert companion updates, and uncapped observed-alert propagation.
9. **Ongoing stabilization:** Playtest and tune the completed local reaction set, fixing local bugs as they are encountered.
10. **Queued:** Run the final combined Feature 13/14 map-level regression matrix after the mission-data and facility-escalation boundaries are stable.

Feature 13 remains strictly local. Feature 16 owns facility-wide readiness and search escalation, and it must not distribute perfect, continuously updated player tracking. The final regression pass will validate the local and facility loops together without moving facility state back into Feature 13.

## Implementation Status

- Implemented: local corpse discovery, damaged/destroyed-door discovery, broken-lamp discovery, and alerted-companion observation.
- Implemented: real-time door-impact witnessing now requires illumination at the impact and visible door panel in addition to range, cone, and line of sight; a dark impact cannot create a visual door alert.
- Implemented: later damaged/destroyed-door discovery now requires illumination from another active source in addition to range, cone, and line of sight.
- Implemented: a valid illuminated real-time door witness uses an immediate-alert near-side approach, explicit opening/crossing, and far-side search transition.
- Implemented: real-time witnessed lamp destruction remains an explicit self-illuminating exception and enters immediate local alert even though the lamp becomes inactive before notification.
- Implemented: later recognition of an already broken lamp remains lighting-independent inside range, cone, and line of sight. It enters `suspicious` with reason `broken-lamp`, moves to the fixture stand-off, sweeps locally, returns, and restores patrol behavior.
- Implemented: locally grounded alert targets that do not follow the hidden player's live coordinates.
- Implemented: enemies use explicit tuned movement speeds: `1.5` during ordinary behavior, `1.2` while cautiously approaching/searching in `suspicious`, and `2.5` while in `alert`. Suspicious return travel restores ordinary speed as soon as the investigation sweep is finished.
- Implemented: an ordinary patrol guard confirms direct player sight or a first proximity stimulus after the normal 45-frame reaction window, while a suspicious guard confirms newly detected player sight, proximity, or a second sound after a brief 10-frame delay. Guards already searching, returning from alert, or patrolling cautiously keep their immediate heightened response. Severe visual evidence that already causes immediate alert remains immediate, while specialized door/lamp evidence keeps its dedicated investigation rules.
- Implemented: deep room-side investigation points, open-panel path detours, hinge-clear doorway lanes, and mutual living-enemy separation.
- Implemented: muffled closed-door investigation with approach, owned opening, threshold crossing, local sweep, return, owned closing, and patrol-state restoration.
- Implemented: stable incident IDs, original reason/priority/location/frame/player-confirmation provenance, per-observer relay deduplication, non-increasing companion authority, active companion assignments, and sweep-time assignment unlock.
- Implemented: bounded event memory (default 900 frames) and same-shot route memory (default 300 frames), each also capped at 64 entries per enemy so stale IDs cannot grow indefinitely.
- Implemented: the agreed runtime interruption order: `direct player (500)` > `gunshot (450)` > `corpse (400)` > active `companion assignment (350)` > witnessed `impact (300)` > structural `door/broken-lamp evidence (250)` > heard `impact (150)` > ordinary `sound (100)`.
- Implemented: pending lower-priority reactions can be replaced by a higher-priority incident without extending the remaining reaction window.
- Implemented: a short rendered `360` degree muzzle-flash light (default radius 420, intensity 1, lifetime 4 frames) whose visibility polygon is rebuilt against the existing wall, door, window, and aperture lighting geometry.
- Implemented: direct muzzle observation is evaluated independently from gunshot hearing, works in darkness only because the flash is self-illuminating, and shares the projectile's stable `shotId` with audio and impact routes.
- Implemented: projectile impacts are guaranteed audible to enemies in the same modeled room. Ordinary wall/wood impacts use radius 420, more-prominent glass impacts use radius 500, metal-door impacts use radius 480, and same-object door/window destruction uses radius 560 before ordinary environmental transmission.
- Implemented: heard projectile impacts always use a vague directional point or closed-door proxy rather than the exact collision coordinate, force moving suspicion on the first accepted impact, and return through the existing suspicious investigation lifecycle if nothing confirms the threat.
- Implemented: every unsuppressed gunshot uses one base radius of 600. The ordinary sound model then applies wall, closed-door, and portal transmission; with the default closed-door transmission of 0.8, a gunshot has an effective radius of 480 across that door and remains localized to the doorway proxy.
- Implemented: per-enemy same-shot route arbitration orders direct muzzle observation above heard gunshot, witnessed door/lamp/general impact, and heard impact. Within one route rank, stricter information-quality ordering permits clearer/localized, more prominent, louder, or closer information to refine the fixed destination without adding confirmation.
- Implemented: sufficiently illuminated wall, window, door, and metal impacts inside an enemy's cone/range with clear line of sight create an exact witnessed-impact event. The guard enters immediate alert and receives a reachable stand-off target on its visible side rather than a point inside blocking geometry; existing penetrable-door witnessing retains its dedicated threshold-transit behavior.
- Implemented: a persistent broken window is remembered per observer and can be discovered later only under the ordinary illumination, cone/range, and line-of-sight rules. Discovery starts a local moving structural investigation rather than repeatedly retriggering.
- Implemented: a same-shot door/window destruction emission replaces that object's ordinary impact emission, carries the larger destruction radius and information prominence, and remains one `shotId` confirmation.
- Implemented: a second distinct gunshot replaces a pending first-gunshot suspicion with the short confirmation-to-alert reaction, and two distinct heard ballistic impacts within 180 frames do the same. Multiple penetrated surfaces from one `shotId` contribute once.
- Implemented: gunshot audio uses one source-neutral reaction path for player and enemy shooters; only the shooter itself is excluded from reacting to its own sound. Actor penetration still emits no extra ballistic-impact stimulus.
- Implemented: suspicion cases retain a maximum four-person active investigation roster. The originator and up to three companion recruits use distributed search positions; additional direct perceivers remain suspicious support instead of converging, and unchanged companion relays cannot open new slots.
- Implemented: suspicious members accept distinct case evidence and strict information improvements without adding suspicion/confirmation. Alert propagation remains numerically uncapped through actual visual observation, while already-alerted receivers adopt only higher-priority or strictly better information.
- Ongoing: playtest tuning and bug fixing for local reaction frequency, timing, movement, and suspicion accumulation.
- Moved to Feature 16: explicit facility-wide alert/search escalation.

## Resolved Alert Priority and Companion Coordination

The implemented interruption order while a guard is traveling under alert-companion guidance is:

`direct player` > `gunshot` > `corpse` > active `companion assignment` > witnessed `impact` > structural `door/broken-lamp evidence` > heard `impact` > ordinary `sound`

This order does not promote shared evidence to companion-assignment priority. Companion assignment is a temporary coordination/commitment state, not a new information source. The carried event retains its original reason and rank, and a receiver's effective information authority must never exceed the authority held by the sharing guard. For example, a witnessed-impact event relayed through several guards remains witnessed-impact information.

The behavioral rules are:

- Suspicious companion sharing is organized by a fixed case ID and a default four-member active-investigator cap. New evidence inside that case updates the team but does not create another recruitment allowance.
- Direct perceivers are never denied their own suspicion state. If the four movement slots are occupied, additional direct perceivers hold/support locally instead of converging on the case target.
- Active suspicious investigators receive distributed search points around accepted evidence rather than one identical destination. Strict improvements and genuinely new case evidence can advance those assignments without increasing suspicion or confirmation.
- Direct player detection, gunshots, and locally detected corpses override an active companion assignment at any time.
- While traveling to the shared location, witnessed impacts, door evidence, and ordinary sounds do not redirect the assigned guard away from the coordinated response.
- Once the guard reaches the assigned location and starts sweeping, that assignment is fulfilled. The guard can then accept its own local stimuli under normal evidence arbitration and share any newly accepted event with nearby enemies.
- The first guard in a local group to accept a new stimulus becomes its initial sharer. Other guards receive or relay the same event ID and provenance rather than manufacturing successively stronger companion events.
- Alert observation is not subject to the suspicion-case cap. Every valid visual observer may enter alert, become another local relay, and continue the chain.
- An already-alerted guard adopts a companion update only when its priority is higher or its information quality is strictly better. Same-event refinement changes the fixed action target without refreshing timers, creating confirmation, or following live player coordinates.
- Shared information must be bounded and expire. Old event IDs cannot grow without limit or permanently prevent reactions to newer local evidence.

The runtime now implements this model with numeric ranks `500 > 450 > 400 > 350 > 300 > 250 > 150 > 100`. A received event retains the sharer's original information priority, but the receiver's temporary travel commitment is compared at the separate companion-assignment threshold of `350`. This is why the receiver's own direct player detection, gunshot, or corpse can always break the assignment even when the carried payload originally came from a high-priority event. Once the receiver starts its destination sweep, the assignment clears and ordinary evidence arbitration resumes.

## Facility-Wide Escalation - Moved to Feature 16

Feature 13 ends at locally perceived or locally relayed incidents. Feature 16 will consume immutable snapshots of those incidents, accumulate mission-level alert state, and assign broader readiness/search behavior without sharing the player's live position. See `Operation guide/Feature planning/feature_16_facility_alert_escalation.md`.

## Non-Goals

- No full squad tactics or command hierarchy.
- No dialogue/bark system unless temporary debug text is needed.
- No corpse hiding, blood trails, or cleanup mechanics.
- No reaction to ordinary open doors in this pass.
- No global knowledge of the player's position.
- No facility-wide escalation inside Feature 13; that system belongs to Feature 16.

## Acceptance Criteria

- A guard who locally sees an enemy corpse enters alert and investigates the corpse position without tracking the hidden player.
- A guard that sees a corpse while a door investigation or door alert is pending or active cancels that investigation and immediately enters corpse alert; later door evidence does not replace the corpse reason in the debug overlay.
- A guard who sees a sufficiently illuminated intact damaged door becomes suspicious, approaches without opening it early, and stops for the configured close-inspection delay at interaction range before escalating; the same evidence remains visually undiscovered in darkness.
- On close inspection, that guard enters alert, opens the damaged door, crosses, and performs the ordinary unknown-source search in the connected room.
- A guard that directly witnesses a sufficiently illuminated bullet impact damage the door enters alert immediately and skips the inspection sequence; a dark impact can only be perceived through its sound path.
- That witness approaches the damaged door from its current side, opens it at interaction range, and crosses without first routing away toward another navigation portal.
- A guard who sees a sufficiently illuminated destroyed door enters alert immediately; an unilluminated destroyed door is not later discovered visually.
- A guard that directly sees a lamp break enters immediate `lamp-impact` alert and investigates a reachable point beside the fixture without learning the hidden shooter's location.
- A guard that later recognizes an already broken lamp, including through the absence of its expected light in an otherwise dark area, enters `broken-lamp` suspicion, moves to inspect it on the first suspicion, performs a local sweep, and resumes its interrupted patrol; the same fixture does not retrigger continuously.
- A guard who locally sees an alerted companion can join using the companion's last known engagement position.
- A suspicious event recruits no more than four active investigators total by companion propagation: the originator plus at most three companions. Later evidence updates within that case do not recruit another wave.
- Additional enemies that directly perceive the same suspicious event may become suspicious support, but only four receive converging investigation movement assignments.
- Suspicious case members accept distinct credible evidence and strict information-quality improvements, use distributed investigation points, and do not gain extra suspicion/confirmation from relays.
- Once a case member becomes alert, the four-enemy cap is discarded. Every enemy that actually observes an alerted companion may alert and relay recursively, subject to ordinary light, cone/range, and line-of-sight limits.
- A companion shares the original event ID, provenance, reason, priority, age, and inferred/last-known location; each relay preserves that information and never raises its authority.
- Multiple guards relaying the same event do not create repeated confirmations, priority inflation, or alert loops.
- A guard traveling under a companion assignment ignores lower-priority redirection, but direct player detection, a gunshot, or local corpse detection overrides the assignment immediately.
- After reaching the shared search area and beginning its sweep, each guard can independently accept new local stimuli and share a genuinely new accepted event with nearby enemies.
- A guard who only hears a projectile impact becomes suspicious, investigates the perceived reachable point, and returns if nothing else is detected.
- Hearing the muzzle and impact sounds from one shot does not by itself count as two independent confirmations.
- Every shot visibly emits a short `360` degree world light that is clipped by walls/closed doors and transmitted through valid apertures; it can illuminate characters and evidence during its active frames.
- A guard can see an otherwise-dark muzzle flash only inside its range/cone with clear line of sight, independently of whether the gunshot sound reaches it, and the visual/audio routes retain one shared `shotId`.
- A guard who witnesses a projectile collide with geometry enters alert immediately and searches a reachable room/side associated with that impact.
- A witnessed impact does not make the guard path through a blocking wall or infer the hidden shooter's live coordinates.
- A window impact or break is acoustically more prominent than an ordinary wall impact. If both are perceived from one penetrating shot at otherwise equal quality, the window remains the selected event, and the persistent broken window remains locally observable structural evidence.
- A clearer, closer, or louder equal-rank observation may refine the same shot's investigation location without adding suspicion or confirmation.
- Strictly better same-shot information received from a companion may refine suspicious or alert action, while equal/lower information is ignored and the refinement does not refresh timers, restart a sweep, reset event age, or stream live player coordinates.
- Two distinct gunshots confirm alert even when the second arrives during the first shot's pending reaction delay.
- Two different ballistic impacts heard within 180 frames confirm alert; multiple impacts from one penetrating `shotId` count only once.
- A same-shot door/window destruction route supersedes that object's ordinary impact route without becoming a second confirmation.
- Gunshot audio produces the same reaction regardless of whether its source actor is the player or an enemy.
- Hitting or penetrating a living enemy produces no additional bullet-impact stimulus.
- Same-shot route memory remains 300 frames by default, and silencer rules remain deferred until the item is implemented.
- Corpse, companion, and later damaged/destroyed-door stimuli do not work through walls, closed doors, darkness, or outside the observer's cone/range. Real-time door/wall/window/metal impact witnesses also require illumination. A live muzzle flash and the instant of lamp destruction supply their own visual-event illumination; later broken-lamp recognition is additionally allowed in darkness because the missing expected light is itself the evidence, but it still requires range, cone, and clear line of sight.
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
- Facility-wide escalation remains absent from Feature 13 and is specified separately in Feature 16.

## Related Files

- `enemy.js` - perception, local stimulus memory, alert knowledge, investigation phases, and return behavior
- `sound.js` - attenuated sound result and closed-door investigation dispatch
- `game.js` - corpse data and door state/interaction helpers
- `tuning.js` - tunable reaction, search, sight, and movement values
- `Operation guide/Feature planning/feature_16_facility_alert_escalation.md` - separate facility-level escalation plan
