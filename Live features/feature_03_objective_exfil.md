# Live Feature 03 - Objective Pickup and Exfil

**Live status: Implemented.**

The mission loop is: infiltrate, find the pickup, collect it, activate exfil, and leave alive.

## Current Behavior

- On reset, the pickup is placed randomly in a non-starting room.
- The pickup has a visible diamond only when it is in the player's vision cone and lit.
- If the pickup is not directly visible, a hint marker is still drawn at its location.
- Pressing `E` or gamepad face-left / button `2` interacts with the pickup when close enough.
- After pickup, the game enters `exfil` phase and activates the primary bottom exfil point.
- Side wall gap exits can be discovered/activated when visible, lit, and interacted with.
- Reaching an active exfil point completes the mission and resets after a short delay.

## Current Caveats

- The objective type is always a simple physical pickup.
- Exfil completion is a reset, not a score screen or campaign transition.
- The hint marker intentionally pierces fog in the current prototype.

## Related Files

- `input.js`
- `game.js`
