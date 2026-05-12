# [제안] Number Stations

## Game Design Document v1.0

---

## 1. Overview

### Elevator Pitch

A Cold War-era stealth roguelike where you live as a deep-cover spy. By day, you maintain your civilian identity. By night, you decode orders from a numbers station radio broadcast and carry out covert operations — assassinations, sabotage, intel theft. Every mission destabilizes the country further, tightening security around you, until your cover is blown and you must flee, defect, or die. Then a new agent is sent, and it starts again.

### Genre

Top-down · Stealth · Roguelike · Immersive Sim-lite

### Platform

PC (Steam)

### Target Audience

- Fans of: Invisible Inc., Hotline Miami, Papers Please, Darkest Dungeon, Phantom Doctrine
- Players who enjoy: tension over action, information-driven gameplay, emergent stories, Cold War aesthetics

### Visual Style

3D environments with pixel art aesthetic (HD-2D inspired), orthographic top-down camera. Heavy use of dynamic lighting for stealth gameplay. Muted Cold War palette — grays, olive greens, amber lamplight, red alert accents.

### Core Fantasy

"I am a ghost living among ordinary people, and the walls are slowly closing in."

---

## 2. Core Loop

```
┌─────────────────────────────────────────────────┐
│                   ONE DAY = ONE CYCLE            │
│                                                  │
│  ☀ MORNING                                      │
│  ├─ Newspaper arrives (world events, intel)      │
│  ├─ Check environment (suspicion signs?)         │
│  └─ Daytime activity: talk to NPCs, gather info  │
│                                                  │
│  🌙 EVENING                                      │
│  ├─ Tune radio → Numbers station broadcast       │
│  ├─ Decode cipher → Reveal mission orders        │
│  └─ Prepare gear from stash                      │
│                                                  │
│  🌑 NIGHT                                        │
│  ├─ Execute mission (stealth gameplay)            │
│  └─ Return home (or don't...)                    │
│                                                  │
│  📊 END OF DAY                                   │
│  ├─ Suspicion updates                            │
│  ├─ Social unrest gauge updates                  │
│  ├─ Trust gauge updates                          │
│  └─ World state advances                         │
│                                                  │
│  ❌ GAME OVER TRIGGERS                           │
│  ├─ Cover blown → Flee / Defect / Die            │
│  └─ New agent deployed → NEW RUN                 │
└─────────────────────────────────────────────────┘
```

### What makes one run feel different from another

- Cipher key is randomized → decoding process differs each run
- Mission order and types are randomized
- NPC dispositions are randomized (some are suspicious by default, some are friendly)
- External world events (newspaper) are drawn from a randomized event pool
- Player choices in dialogue and mission approach create branching consequences

---

## 3. Day Phase — Life Under Cover

### 3a. Morning — The Newspaper

Each morning, a newspaper slides under your door. It's a **single-screen UI** styled as a physical newspaper. It contains:

- **Headline story** — Major event that may affect gameplay
    - Examples: "Government Announces Increased Border Security" (escape missions get harder), "Factory Workers Strike in Eastern District" (new mission opportunity), "Foreign Spy Ring Uncovered in Neighboring Country" (your trust gauge drops slightly)
- **Local news** — Hints relevant to your current mission
    - Example: "Senator to Attend Gala at National Theater Saturday" (assassination target schedule)
- **Classifieds** — Occasionally contains coded messages from your handler (dead drop locations, gear cache hints)

**Design principle:** The newspaper is never just flavor text. Every article either affects a game system or provides actionable intel. The player should learn to read it carefully.

### 3b. Morning — Environment Check

Before leaving home, the player can observe their apartment. Suspicion signs appear as the game progresses:

| Suspicion Level | Signs in Apartment |
| --- | --- |
| Low (safe) | Everything normal |
| Rising | Radio dial has been moved slightly (first warning) |
| Moderate | Small item out of place (book, cup) — someone searched |
| High | Unfamiliar footprints near door / mail has been opened |
| Critical | Listening device found / stranger watching from across the street |

**Design principle:** These are purely observational — the game never tells you "suspicion is at 73%." The player must learn to read environmental cues. This is the core UX design challenge of the game.

### 3c. Daytime — NPC Interaction

The player can visit **locations in their neighborhood** and talk to NPCs. This serves multiple purposes:

- **Gather mission intel** — Some missions require information only available through conversation ("What time does the guard shift change at the factory?")
- **Maintain cover** — Regular social interaction keeps suspicion low. Disappearing from daily life raises flags
- **Risk exposure** — Every conversation has a chance to raise the NPC's hidden suspicion gauge if dialogue choices are suspicious

**NPC Suspicion Mechanic:**

- Each NPC has a hidden **suspicion value** (0–100)
- Suspicious dialogue choices (+5 to +15 per bad choice)
- Normal/friendly dialogue choices (-2 to -5 per interaction)
- If any NPC's suspicion crosses **threshold 1 (60):** They start behaving differently (shorter conversations, avoidant eye contact — visual cues only)
- If any NPC crosses **threshold 2 (85):** They report you. Authorities begin investigation. Suspicion signs escalate rapidly

> **🔵 DESIGN DECISION NEEDED:** How many NPCs in the neighborhood? Recommendation for MVP: 4–5 recurring characters (landlord, shopkeeper, neighbor, coworker, local official). Each has 2–3 conversation topics per day, rotating based on game state.
> 

**Dialogue System — MVP Design:**

- NOT a full branching dialogue tree (too much content for solo dev)
- Instead: **topic-based system.** Player selects a topic to discuss. Each topic has 2–3 response options ranging from safe → risky. Risky options yield better intel but raise suspicion
- Example:
    - Topic: "The factory on 5th street"
    - Safe: "I heard they're hiring — know anyone who works there?" (+intel: factory hours, -2 suspicion)
    - Risky: "What kind of security do they have?" (+intel: guard count and patrol, +10 suspicion)
    - Very risky: "I need to get inside after hours." (+intel: back entrance location, +20 suspicion)

---

## 4. Evening Phase — The Numbers Station

### 4a. Radio & Decoding

This is the **signature mechanic** of the game and the single most important UX design challenge.

**The experience:**

1. Player sits at desk, turns on radio
2. Tunes to the correct frequency (starts known, but may change if suspicion rises)
3. A robotic voice reads a sequence of numbers (audio + on-screen text)
4. Player must decode the numbers using their **cipher key** (given at start of run)

**Cipher system — MVP Design:**

The cipher is a simple **substitution table** unique to each run. At the start of a new game, the player receives a "one-time pad" — a reference card showing number-to-syllable mappings.

Example cipher key (partial):

```
14 = Hit    27 = tar    33 = get    08 = :
41 = lo     55 = cat    62 = Sa     71 = bo
83 = ta     90 = ge     17 = Man    29 = hunt
```

Broadcast example: `14 27 33 08 PARK JUNGSOO 41 55 08 NATIONAL THEATER`

Decoded: `Hit/tar/get: PARK JUNGSOO lo/cat: NATIONAL THEATER`

Mission: **Assassinate Park Jungsoo at the National Theater.**

**Design principles for the cipher:**

- The decoding should feel like **satisfying puzzle work**, not tedious busywork
- Provide a physical-feeling notepad UI where players can write/track their decoding
- The cipher key is always accessible — it's not a memory test
- Decoding time should be 1–3 minutes per message, not longer
- Wrong decoding is possible and has consequences (trust gauge drops)

> **🔵 DESIGN DECISION NEEDED:** Should decoding be manual (player looks up each number) or semi-assisted (player highlights a number and sees possible matches)? Manual is more immersive but risks becoming tedious after run 3. Recommendation: manual for first decode of a run (tutorial/immersion), then offer an "auto-decode" option for subsequent messages to respect player time.
> 

### 4b. Gear Preparation

After decoding the mission, the player selects gear from their **stash** for the night operation.

**Starting stash (every run):**

- Civilian clothes (default, no suspicion)
- Lockpick set
- Camera (for intel missions)
- Small flashlight

**Acquired during run (via dead drops, purchases, mission rewards):**

- Suppressed pistol
- Disguise (guard uniform, worker uniform)
- Wire cutters
- Sedative / chloroform
- Forged documents
- Radio jammer
- Explosive charges (for sabotage)

**Gear constraint:** Player has a **limited carry capacity** (e.g., 4–5 item slots). Must choose what to bring. Bringing a weapon means leaving behind a utility item. This creates meaningful pre-mission decisions.

> **🔵 DESIGN DECISION NEEDED:** Is gear consumed on use or persistent? Recommendation: consumables (sedative, explosives, forged docs) are single-use. Tools (lockpick, camera, flashlight) are persistent but can be lost if you're searched or forced to flee.
> 

---

## 5. Night Phase — Mission Execution

### 5a. Stealth Gameplay

The core of the action. Top-down stealth in procedurally-guarded environments.

**Player Actions:**

| Action | Input | Effect |
| --- | --- | --- |
| Walk | Analog / WASD | Slow, silent movement |
| Run | Shift + move | Fast, generates noise |
| Crouch | Ctrl | Slower, reduced visibility, silent |
| Interact | E | Open doors, pick locks, use items, pick up objects |
| Peek | Q (near corner/door) | Look around corner without exposing body |
| Attack (melee) | LMB (behind enemy) | Silent takedown (kill or subdue) |
| Attack (ranged) | LMB (with weapon) | Gunshot — loud unless suppressed |
| Use item | 1–5 hotbar | Context-dependent |
| Hide body | E (near body + hiding spot) | Prevents body discovery |

### 5b. Enemy AI States

```
UNAWARE ──(sees/hears something)──► CURIOUS
   ▲                                    │
   │                              (investigates)
   │                                    │
   │                                    ▼
   └──(nothing found, timer)──── INVESTIGATING
                                        │
                                  (finds evidence)
                                        │
                                        ▼
                                    ALERT ──► COMBAT
                                        │
                                  (loses target)
                                        │
                                        ▼
                                    SEARCHING
                                        │
                                  (search timer expires)
                                        │
                                        ▼
                                    CAUTIOUS
                                   (heightened patrol,
                                    never fully returns
                                    to UNAWARE)
```

**Key AI design principle:** Guards who have been alerted **never fully return to Unaware.** They enter a permanent Cautious state with tighter patrol routes and faster detection. This prevents the player from just waiting out alerts indefinitely and creates cumulative tension — every mistake makes the rest of the mission harder.

### 5c. Detection Systems

**Sight:**

- Guards have a **vision cone** (90° forward, ~8 tiles range in light, ~3 tiles in dim)
- Player in **shadow** is invisible beyond 2 tiles
- Player in **light** is visible at full range
- Player **crouching** reduces detection range by ~30%
- Player **running** increases detection range by ~20% (movement catches eye)

**Sound:**

- **Walking** — 1 tile radius noise
- **Running** — 3 tile radius noise
- **Gunshot (unsuppressed)** — 15+ tile radius (basically entire map)
- **Gunshot (suppressed)** — 4 tile radius
- **Door opening** — 2 tile radius
- **Breaking glass** — 8 tile radius
- **Surface matters** — gravel/metal = louder, carpet/grass = quieter

**Light & Shadow:**

- Dynamic lights in environments create lit and shadowed zones
- Player can interact with some lights (turn off lamps, shoot out lights)
- Turning off a light may cause guards to investigate
- Shadow zones are the player's primary tool for movement

> **🔵 DESIGN DECISION NEEDED:** Should the player see enemy vision cones? Options: (A) Always visible — more gamey, less stressful, (B) Only visible when crouching / "focus mode" — rewards careful play, (C) Never visible — hardcore immersion. Recommendation for MVP: Option B. Crouching activates a subtle visual overlay showing nearby detection zones. This gives information to careful players without breaking immersion.
> 

### 5d. Mission Types (MVP: 4 types)

**1. Assassination (Hit)**

- Target is in the mission area, usually in an interior room
- Must reach target and eliminate them
- Optional: make it look like an accident (bonus reward, less social unrest)
- Escape after completion

**2. Sabotage**

- Reach target location (generator, communications tower, supply depot)
- Plant explosive or destroy equipment
- Escape before detonation / discovery
- Time-limited after planting

**3. Intelligence Collection (Collect Intel)**

- Reach target location (office, safe, filing cabinet)
- Photograph or steal documents
- Escape without detection (detection = intel is worthless, mission fails)
- Purest stealth mission — combat should be avoided entirely

**4. Escape (U R Compromised)**

- Special mission triggered when cover is blown
- Start at home, enemies closing in
- Reach one of 2 evacuation points
- Can choose to fight through or sneak out
- Final mission of the run — success or failure ends the run

---

## 6. Gauges & World State

### 6a. Social Unrest Gauge (Visible)

Fills as you complete missions. Each mission type adds different amounts:

| Mission Type | Unrest Added |
| --- | --- |
| Assassination | High (+15–25) |
| Sabotage | High (+15–20) |
| Intel Collection | Low (+5–10) |
| Disinformation | Medium (+10–15) |

**Milestones** (triggered at thresholds):

| Threshold | Milestone | Gameplay Effect |
| --- | --- | --- |
| 30% | **Heightened Security** | +2 guards per mission, checkpoints appear on some routes |
| 60% | **Cipher Compromised** | Special mission: retrieve new cipher from dead drop. Until completed, no new orders. Fail = trust drops sharply |
| 85% | **Martial Law** | Guards replaced by military, shoot-on-sight policy, heavily restricted movement, maximum tension |
| 100% | **Regime Destabilized** | Victory condition — but you still need to escape |

### 6b. NPC Suspicion (Hidden — Per NPC)

See Section 3c. Each NPC independently tracks suspicion. When any NPC reports you, it triggers an investigation that accelerates toward cover being blown.

### 6c. Trust Gauge (Hidden — From Your Country)

Your handlers evaluate your performance:

| Event | Trust Effect |
| --- | --- |
| Mission completed successfully | +10–15 |
| Mission completed with complications | +5 |
| Cipher decoded correctly | +2 (per message) |
| Cipher decoded incorrectly | -10 |
| Mission deadline missed | -15 |
| Consecutive failures | -20 (compounding) |

**If trust reaches 0:** Your country burns you. Your cover identity is leaked to the enemy. This triggers an immediate "Escape" mission with no warning signs — the most brutal game over scenario because you had no time to prepare.

### 6d. Personal Suspicion (Hidden — Aggregate)

A meta-gauge combining:

- Highest NPC suspicion value
- How often you've been spotted on missions (even if you escaped)
- Whether you've been out at unusual hours
- Whether any bodies or evidence were found on past missions

This drives the **apartment suspicion signs** (Section 3b) and ultimately determines when your cover is blown through the investigative route (as opposed to the trust route).

---

## 7. Run Structure & Endgame

### One Run

- Lasts approximately **8–15 days** (game days, not real days)
- Player receives 1 mission per night (sometimes none — rest days that build tension)
- Difficulty escalates via milestones and accumulating suspicion
- Run ends via: cover blown (flee/defect/die), trust burned (emergency escape), or victory (unrest hits 100% + successful escape)

### Between Runs

- New agent is deployed. Clean slate
- **Meta-progression (light):** Unlockable starting gear, new cipher types, cosmetic apartment changes
- The world doesn't carry over — each run is independent

> **🔵 DESIGN DECISION NEEDED:** How much meta-progression? Options: (A) None — pure roguelike, every run identical starting conditions, (B) Light unlocks — new starting gear options, harder difficulty modes, (C) Significant progression — upgrade your "agency" between runs. Recommendation: Option B. Light unlocks give replayability incentive without breaking the roguelike reset. You could unlock things like "start with suppressed pistol" or "start with one NPC already befriended."
> 

### Win Condition

Destabilize the country (100% unrest) AND successfully escape. This is extremely difficult — by the time unrest hits 100%, martial law is in effect and the player is likely under heavy suspicion. Winning should feel like barely surviving.

### Loss Conditions

1. **Killed during mission** — KIA. New agent next run
2. **Cover blown + failed escape** — Captured/killed. New agent next run
3. **Trust burned** — Betrayed by own country. Emergency escape — usually fatal
4. **Defection** — Player voluntarily surrenders. Run ends. (Could unlock special narrative?)

---

## 8. MVP Scope Summary

### Included in MVP (Early Access)

- ✅ Full core loop (morning → evening → night → consequences)
- ✅ Cipher decoding system (1 cipher type)
- ✅ 4 mission types (assassination, sabotage, intel, escape)
- ✅ 3–4 mission maps (modular tile-based construction)
- ✅ Stealth gameplay (walk, run, crouch, melee takedown, suppressed pistol)
- ✅ Guard AI (5-state system: unaware → curious → investigating → alert → searching)
- ✅ Light/shadow stealth mechanics
- ✅ Sound detection system
- ✅ Newspaper system (8–10 event templates)
- ✅ 4–5 NPCs with suspicion-based dialogue
- ✅ All 3 gauges (unrest, trust, suspicion)
- ✅ 2 milestones (heightened security, cipher compromised)
- ✅ Run structure with clean restart
- ✅ 8–12 gear items

### Post-EA Roadmap

- 🔲 Additional mission types (kidnapping, disinformation, asset rescue, pointman)
- 🔲 More maps and environment types
- 🔲 Martial law milestone + military enemies
- 🔲 Full exposure endgame sequence (home raid, car chase)
- 🔲 Additional cipher types for variety
- 🔲 More NPCs and deeper dialogue
- 🔲 Meta-progression unlocks
- 🔲 Sound/music pass (original soundtrack)
- 🔲 Localization

---

## 9. Open Design Questions

These need resolution before or during prototyping:

| # | Question | Options | Impact |
| --- | --- | --- | --- |
| 1 | Vision cone visibility | Always / Crouch-only / Never | Core difficulty feel |
| 2 | Auto-decode after first cipher | Yes / No | Pacing vs. immersion |
| 3 | Gear persistence | Consumable vs. permanent tools | Resource tension |
| 4 | Meta-progression depth | None / Light / Heavy | Replayability model |
| 5 | NPC count in MVP | 3 / 4–5 / 6+ | Content workload |
| 6 | Run length (days) | Short (5–8) / Medium (8–15) / Long (15+) | Session length, pacing |
| 7 | Body discovery mechanic | Simple (timer) / Complex (patrol routes check) | AI complexity |
| 8 | Difficulty settings | None (designed difficulty) / Easy-Normal-Hard | Audience breadth |
| 9 | Narrative framing | Abstract (no specific country) / Fictional country / Real Cold War setting | Tone, controversy risk |
| 10 | Player character identity | Blank slate / Light backstory / Full character | Narrative investment |