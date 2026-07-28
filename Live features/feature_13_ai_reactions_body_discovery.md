# Live Feature 13 - Local AI Event Reactions and Body Discovery

**Live status: Local-reaction implementation complete; stabilization, tuning, and final regression remain ongoing. Facility-wide escalation is separated into Feature 16.**

Enemy evidence reactions are locally grounded. A guard may act on its own vision, an attenuated sound it receives, or an incident relayed by a locally observed companion. No local route grants continuously updated knowledge of a hidden player's position.

## Current Information and Visibility Rules

- Every accepted incident carries stable identity, original reason/priority, provenance, age, information quality, fixed last-known/inferred location, and player-confirmation status.
- Relaying an incident never raises its authority, renews its age, creates a new confirmation, or replaces its bounded location with live player coordinates.
- Ordinary direct visual stimuli require sufficient illumination at the observed point plus cone/range and clear line of sight.
- Live muzzle flash and the instant an active lamp is destroyed are self-illuminating exceptions.
- Later recognition of an already broken lamp is also allowed in darkness because the absence of expected light is the evidence.
- Corpses, door damage/destruction, broken windows, ordinary projectile impacts, and companion observation do not bypass the illumination rule.

## Current Local Evidence Reactions

- A locally visible enemy corpse causes immediate alert, records the corpse position, interrupts door investigations, and is remembered per observer.
- Death emits one low-radius body-fall sound. Hearing it is unknown acoustic evidence; only later vision identifies a corpse.
- An illuminated intact damaged door causes delayed suspicion, near-side approach, close inspection, alert escalation, explicit opening/crossing, and far-side search.
- An illuminated real-time door strike witness immediately enters `door-impact` alert and skips the delayed inspection.
- An illuminated already destroyed door causes immediate local alert. Unilluminated door damage/destruction must be learned through sound or a companion.
- Witnessing an active lamp break causes immediate `lamp-impact` alert at a reachable fixture-side point.
- Later recognition of an already broken lamp causes `broken-lamp` suspicion, moving stand-off investigation, local sweep, return, and patrol restoration.
- Later discovery of a sufficiently illuminated broken window causes `broken-window` suspicion and a reachable structural investigation.
- A heard projectile impact starts moving `impact-heard` suspicion at an approximate reachable point. Audio never provides the exact collision coordinate.
- A sufficiently illuminated real-time wall, window, wood-door, or metal-door impact witness immediately enters `impact`/`door-impact` alert and receives a reachable near-side or room-side target rather than a point inside geometry.
- Heard and witnessed impacts do not reveal the shooter's current position.
- Muffled closed-door sounds use the attenuating door as the perceived proxy. Investigators save interrupted behavior, open/cross/search, return, conditionally close their own intact door, and restore patrol state.

## Current Muzzle Flash and Same-Shot Behavior

- Every player or enemy shot creates a rendered `360` degree transient muzzle-flash light and one stable `shotId`.
- The flash is clipped by walls and closed doors and transmitted through valid door/window apertures.
- A guard may see the muzzle in darkness only while it is inside cone/range with clear line of sight. The visual route is independent of whether the gunshot is heard.
- Per-observer route order for one shot is direct muzzle observation, heard gunshot, witnessed impact, then heard impact.
- Gunshot is the highest non-player local alert reason. The broader local order is `player` > `gunshot` > `corpse` > active companion assignment > witnessed impact > structural evidence > heard impact > ordinary sound.
- A later same-rank observation may refine location when it is clearer, closer, louder, or more prominent without increasing suspicion or confirmation.
- A window strike is more prominent and louder than an ordinary wall strike from the same projectile.
- A same-shot door/window destruction route supersedes that object's ordinary impact route without becoming a second confirmation.
- A second distinct gunshot confirms alert even if the first gunshot's reaction delay is still pending.
- Two different ballistic impacts heard within `180` frames confirm alert. Multiple penetrated surfaces from one `shotId` count once.
- Gunshot audio produces the same listener reaction for player and enemy shooters.
- Hitting or penetrating a living actor emits no additional ballistic-impact stimulus.
- Per-observer same-shot memory defaults to `300` frames. No silencer-specific behavior exists.

## Current Companion Coordination

- Suspicion sharing creates a case with a default four-member active-investigator cap: the original perceiver plus up to three companions.
- The cap belongs to the case, not each update. New evidence in the same case cannot recruit a new wave.
- Additional direct perceivers may still become suspicious but remain support/holding observers when movement slots are full.
- Distinct credible discoveries and strictly better information update the case. Active investigators receive distributed, non-overlapping search points and may be retargeted without added suspicion/confirmation.
- Unchanged relays cannot refresh timers or keep a case alive indefinitely.
- If a case member becomes alert, the suspicion cap stops applying to that incident.
- Alert propagation is numerically uncapped but still requires each receiver to visually observe a sufficiently illuminated alerted companion.
- A receiver carries the original incident payload. An impact relayed through alerted companions remains impact-ranked information.
- While traveling under a companion assignment, direct player detection, a gunshot, or local corpse discovery can interrupt it. Lower-priority evidence does not redirect the guard.
- Reaching the assigned area and beginning a sweep fulfills the assignment. The guard then resumes normal local intake and may share a genuinely new accepted incident.
- An already-alerted guard adopts companion information only when its priority is higher or its information quality is strictly better.

## Current Movement and Timing

- Ordinary, active suspicious, and alert movement defaults are `1.5`, `1.2`, and `2.5`.
- Ordinary player/proximity confirmation uses `45` frames; suspicious confirmation uses `10`.
- Door-side search points are placed beyond full panel depth and toward hinge-clear lanes.
- Generic navigation routes around intact swung panels, and living guards resolve mutual separation after movement.
- Unsuccessful investigations restore interrupted position, facing, patrol index, pause, and sweep progress.

## Current Caveats

- The local system is implemented but not accepted as fully stable. Bugs in local movement, assignment, or overlapping-stimulus behavior should be fixed as reproducible cases are discovered.
- Final broad Feature 13/14 map-level regression and feel tuning remain.
- Facility evidence accumulation, facility alert levels, decay, and connected-room assignments are not part of Feature 13 and do not exist yet. Feature 16 owns them.

## Related Files

- `enemy.js`
- `sound.js`
- `game.js`
- `tuning.js`
- `lighting.js`
