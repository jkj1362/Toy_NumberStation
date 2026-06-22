# Feature ## - Metagame & Daytime Systems (TBD)

**Status: CONCEPTUAL** — daytime systems are deferred until the night-phase prototype is fully validated. This document captures design intent and already-implemented hooks to avoid losing context between sessions.

---

## Overview — Day/Night Cycle Structure

Each run day follows this structure:

```
DAYTIME  →  [Numbers Station Intercept]  →  NIGHTTIME  →  END OF DAY
```

| Phase | Nature | Notes |
|-------|--------|-------|
| **Daytime** | Player-driven, multiple activities | Espionage, NPC interaction, newspaper, gear prep, etc. |
| **Numbers Station Intercept** | Fixed intermission event, not daytime | Player listens to a radio broadcast and decodes the cipher to receive mission orders. NOT guaranteed every session — triggered by world state rules or random conditions. When it occurs, it is a single mandatory event for that cycle. |
| **Nighttime infiltration** | The mission | What the prototype validates |
| **End of day** | Automated | Suspicion, trust, social unrest gauges update based on mission outcome |

---

## Facility Map Espionage

### What It Is

Before a night mission, the player may acquire a floor plan of the target facility through daytime espionage activity. This is either:

- A **deliberate player choice** — spend resources, accept a risk (e.g., send a contact, break into a building to copy blueprints)
- A **random event** — a handler delivers intel, a source makes contact, a lucky find during another activity

Acquiring the map is described as a **significant advantage** — the player enters the night mission knowing the building layout in advance.

### Effect on the Night Mission

When the player successfully acquires the map before a mission:

- `hasMapKnowledge = true` is set for that night session
- `drawMapGeometry()` renders a **dim blue-grey schematic overlay** (25% alpha, `#6a7080`) of all wall geometry over the entire canvas
- This overlay is visible **everywhere** — in unlit rooms, outside the player's vision cone, throughout the entire map

Without map knowledge (default):
- Wall geometry is only visible where a lamp illuminates it **and** it falls within the player's 120° vision cone
- Unlit areas and areas behind the player are pitch black — layout is unknown until discovered

The overlay shows only **geometry**: walls, doorways (gaps appear naturally as openings). It does not reveal contents — enemies, pickups, and other entities remain hidden in darkness as normal.

### Technical Hook (already implemented in game.js)

```javascript
let hasMapKnowledge = true; // hardcoded true for prototype testing
                             // set false when daytime system is implemented
```

```javascript
function drawMapGeometry() {
  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = '#6a7080'; // cool grey-blue schematic — distinct from lit walls (#4a4a4a)
  for (const wall of WALLS) {
    ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
  }
  ctx.restore();
}
// called at very end of draw(), after drawLighting() and drawFog()
```

When the daytime system is implemented, `hasMapKnowledge` should be set based on whether the player performed a successful espionage activity during the preceding daytime phase.

---

## Other Daytime Activities (Stubs — Not Yet Designed)

These are noted for completeness based on the FDD. Full specs will be written when day-phase development begins.

| Activity | Brief description |
|----------|-------------------|
| **Newspaper** | Morning read — world events, escalating headlines, hidden intel in classifieds. Affects world state awareness. |
| **NPC Interaction** | Talk to recurring characters — gather information, maintain cover, manage per-NPC suspicion levels. |
| **Gear Preparation** | Manage a limited carry capacity before the mission. Starting gear: civilian clothes, lockpick, camera, flashlight. Acquirable: suppressed pistol, disguises, etc. |
| **Facility Map Espionage** | Covered above. |

All daytime activities are player-driven and may have multiple options in a single day. The player is not forced through a linear sequence — they choose what to pursue given available time and risk tolerance.

---

## Open Questions

| # | Question |
|---|----------|
| 1 | How is the map obtained mechanically? (cost in resources, a specific NPC relationship, risk of getting caught?) |
| 2 | Is it available every run or conditional on world state / mission difficulty? |
| 3 | Does the map reveal anything beyond wall geometry — patrol routes, guard positions, objective location? |
| 4 | Can the map be partial (some rooms known, others not)? Partial knowledge could be a lighter version of the same mechanic. |
| 5 | Is there a suspicion cost if the espionage activity is discovered? |
| 6 | How does the Numbers Station Intercept integrate with the daytime system — does it consume a daytime action slot, or is it purely an event that fires independently? |
