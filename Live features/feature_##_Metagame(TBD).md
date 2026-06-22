# Live Feature ## - Metagame and Day Cycle

**Live status: Deferred.**

The current playable build implements only the night mission prototype. There is no live morning newspaper phase, evening numbers-station decoding phase, equipment preparation, end-of-day suspicion/trust update, campaign persistence, or roguelike world-state loop.

## Current In-Game Representation

- The game loads directly into the night mission from `index.html`.
- Mission state is reset locally in JavaScript; there is no saved campaign state.
- `hasMapKnowledge` is currently hardcoded on, so the prototype behaves as if the player already has a facility map.
- Prototype success returns to a fresh mission reset after exfil completion.

## Related Files

- `index.html`
- `game.js`

