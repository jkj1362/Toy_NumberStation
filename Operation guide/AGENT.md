# AGENT.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

### Visual Screenshot Check

When checking current progress or implementing work that affects the codebase, game behavior, mathematics, geometry, rendering, UI, or any player-facing visual system, verify the work visually instead of relying only on code inspection.

- Open or run the game when practical.
- Take a screenshot of the current game screen.
- Use the screenshot to decide how to proceed and to QA the result.
- Treat screenshot verification as part of the normal development loop for visualization work.
- When the user asks for a visual change or reports a visual problem, inspect the current game screen directly before analyzing the situation or applying a fix.

### Refresh After Code Changes

After making actual codebase changes, refresh the running game so the user can immediately inspect the updated behavior.

- If the game is already open in a browser, refresh that browser page.
- If the browser refresh is not practical, reopen the game with `Open Game.bat`.
- Do this after the code fix and before the final response, unless the user explicitly asks not to launch or refresh the game.
- In the final response, state how the game was refreshed or explain why it could not be refreshed.

This is especially important for upcoming visualization development and QA, where correctness depends on what is actually visible on screen.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

## 5. Session Handoff

**When context reaches ~60%, alert the user and recommend writing a session handoff document.**

When you estimate the session token usage has crossed 60%, proactively say:

> "We're getting deep into the session context. I recommend writing a session handoff document now so we can continue in a fresh session without losing any state. Want me to write one?"

If the user agrees, write the handoff immediately following the format and rules in:

```
Operation guide/session handoff format.md
```

Key rules:
- Save to `Operation guide/Session handoffs/` with filename `Handoff_YYYY-MM-DD_slug.md`
- Always mark exactly one feature as the next to implement
- Include a ⚠️ warning for any temporary test layouts or known incomplete states in the code
- The incoming session must be able to start work immediately from the handoff alone

---

## 6. Documentation Organization

**Keep planning docs separate from live-state docs. Keep feature docs mirrored one-to-one.**

Use these locations:
- `Operation guide/Feature planning/` contains pre-implementation feature planning docs iterated with AI.
- `Live features/` contains live-state feature explanation docs describing what the game currently implements.
- `Operation guide/Session handoffs/` contains session handoff documents.
- `Operation guide/` root contains common operation docs such as `AGENT.md` and `session handoff format.md`.

Feature planning docs and live feature docs must match one-to-one by feature. If there is a planning doc such as `Operation guide/Feature planning/feature_02_lighting.md`, there must also be a live-state doc such as `Live features/feature_02_lighting.md`.
