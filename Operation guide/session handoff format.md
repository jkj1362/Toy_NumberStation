# Session Handoff Format Guide

This document defines the rules for writing session handoff documents for the Number Stations prototype. Follow this format every time a session handoff is needed so that any new chat session can resume work with full context and zero ambiguity.

---

## When to Write a Handoff

Write a handoff document when:
- The session context is approaching its limit (recommended at ~60% token usage — see CLAUDE.md)
- A significant feature milestone has been completed
- The working state of the codebase has materially changed from the previous handoff

Do **not** write a handoff for minor fixes or single-line changes within a session. Handoffs mark meaningful state transitions.

---

## File Location

All handoff documents live in:

```
Operation guide/
```

Never put them in the project root or `design/` folder.

---

## File Naming Convention

```
Handoff_YYYY-MM-DD_slug.md
```

| Part | Rule | Example |
|------|------|---------|
| Prefix | Always `Handoff_` | `Handoff_` |
| Date | ISO 8601, session date | `2026-05-21` |
| Slug | Hyphen-separated, lowercase, describes what was just completed | `F06-patrol-complete` |

**Slug naming rules:**
- Use the feature number if a feature was just completed: `F04-sight-complete`, `F06-patrol-complete`
- Use a short description if the session was mixed work: `enemy-fixes`, `suspicion-system`
- Keep it under 30 characters
- No spaces — use hyphens

**Examples:**
```
Handoff_2026-05-12_walls-complete.md
Handoff_2026-05-15_objective-exfil-complete.md
Handoff_2026-05-21_F06-patrol-complete.md
```

---

## Document Structure

Every handoff document must contain all of the following sections, in this order:

### Required header

```markdown
# Session Handoff — YYYY-MM-DD — [What was just completed]

Read this file at the start of a new chat session to resume work on the Number Stations prototype with full context.

---
```

### Section 1 — Project Identity

One-paragraph summary: project name, prototype goal, where the FDD lives, where the scope doc lives, and what the **next feature** is. The "next feature" line is the most important — it tells the incoming session what to do first.

### Section 2 — File Structure

A directory tree of the current project showing all meaningful files. Update this every handoff. Do not list `.git` or other tooling files.

### Section 3 — Key Systems (game.js / enemy.js)

A table or section per source file listing:
- System name
- Key identifiers (constants, functions, objects) the new session will reference

Include any **critical distinctions** that caused bugs or required non-obvious decisions (e.g., `isLit` vs `isLitByLamps`, load order constraint between enemy.js and game.js). These are the things most likely to be re-broken by a new session that doesn't know the history.

### Section 4 — Facility Layout

Include the ASCII layout diagram and the gap coordinate table. Update if the layout changed (it probably didn't). This section can be copied verbatim from the previous handoff if nothing changed.

### Section 5 — Feature Build Order

A table with all features, their status (`✅ Done` / `⬅ NEXT` / `Pending`), and the feature number. Always mark exactly one feature as `⬅ NEXT`.

### Section 6 — Next Feature Spec

The most important section for the incoming session. Include:
- What is already implemented (don't re-implement it)
- What still needs to be done, broken into concrete sub-tasks
- Any new data model fields that need to be added to `resetEnemies()` or equivalent
- Relevant code snippets showing the approach (pseudocode is fine)
- Reference to the design doc for full detail: `design/feature_XX_name.md`

### Section 7 — Gap / Navigation Coordinates

Static reference table of all room gap center coordinates. Copy from previous handoff if unchanged.

### Section 8 — Coding Conventions

The full list of project-specific conventions. Always include:
- File/module architecture and load order rules
- Angle convention (`angle=0` = facing up)
- Any non-obvious invariants that have been established (e.g., `pushOutOfWalls` called twice, patrol turn rate split)
- Working style rules (plan mode, design doc before implementation, etc.)

---

## What to Include vs. Omit

| Include | Omit |
|---------|------|
| Every function name the next session will call | Implementation details of stable, working systems |
| Non-obvious invariants and past bugs | Resolved bugs (unless the fix is a convention) |
| Current state of INITIAL_ENEMIES / test layouts | Git history, commit messages |
| Design decisions and their rationale | Exploratory ideas that weren't implemented |
| Anything marked ⚠️ or TODO | Cosmetic/formatting notes |

**Rule of thumb:** If the next session would be confused or would break something without knowing it, write it down. If it's derivable from reading the code, omit it.

---

## Updating the Previous Handoff

Do **not** edit old handoff documents. Each handoff is an immutable snapshot. If you need to correct something from a previous handoff, the correction lives in the new handoff's relevant section.

---

## Quality Check Before Saving

Before saving a handoff document, verify:

- [ ] File is in `Operation guide/` with correct naming format
- [ ] "Next feature" is clearly identified in Section 1 and Section 6
- [ ] All source files and their line counts are current
- [ ] `INITIAL_ENEMIES` reflects the current state (including any test layouts with a ⚠️ note)
- [ ] Any ⚠️ caveats (test layouts, temporary hacks, known bugs) are prominently marked
- [ ] Coding conventions section is complete and up to date
- [ ] The incoming session can start working immediately without reading any other document first
