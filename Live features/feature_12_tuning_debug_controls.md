# Live Feature 12 - Tuning and Debug Controls

**Live status: Implemented first pass.**

The prototype has a collapsible in-game tuning/debug panel so balance values and debug visibility layers can be changed during play without editing source constants.

## Current Behavior

- The panel is collapsed by default.
- A fixed `Tune` button sits on the right side of the screen.
- Opening the panel covers the right side of the screen with grouped controls.
- Pointer and mouse input that starts on the panel is stopped before it reaches the game, so using sliders or toggles does not move the player or fire weapons.
- Numeric balance controls are sliders with the current value shown beside each slider.
- Debug overlays are separate toggle actions under the `Debug Overlays` group.
- `All Debug Overlays` is the master visibility toggle for debug-only visuals.
- Turning the master debug toggle off hides enemy sight cones, enemy labels, sound source rings, sound attenuation paths, all-path sound debug, the perf overlay, map overlay, secondary exfil marker, and door HP bars.
- Gameplay-facing feedback, such as normal player sound cues and mission HUD text, is not treated as a debug overlay.
- Most values update in real time through runtime getter functions.
- Current sections are Debug Overlays, Sound, Lighting, Player, Enemy, Doors and Mission, and Camera and Input.

## Current Tunable Groups

- Sound: gunshot and footstep radius, wall/door transmission, door detour ratio, vague source distance, cue lifetimes, enemy footstep cue radius, and enemy footstep interval.
- Lighting: ambient, player/enemy light thresholds, lamp radius/intensity/falloff, door aperture range/intensity/falloff/spread.
- Player: movement speeds, movement noise, stick walk threshold, health, damage, collision radius, vision cone, hard-aim vision, aim assist, glow radius, and proximity radius.
- Enemy: state timing, reaction delays, collision/hit sizes, sight sampling, vision, movement, combat, shooting, hit flash, and search sweep values.
- Doors and mission: door HP, damage, interaction radius, open angle, sound transmission, mission interaction radius, exfil radius, and corpse interaction radius.
- Camera and input: camera lookahead, hard-aim camera distance, corner padding, hard-aim occlusion padding, camera easing, lookahead easing, fog render scale, and gamepad deadzone.

## Current Caveats

- Tuning values are runtime-only and do not persist across reloads.
- Some performance-oriented values can be changed live, but may still need follow-up validation before they are considered safe authored defaults.
- The panel is a prototype tool, not final game UI.
- Debug overlays default to visible in the current development build, with the master toggle available to verify the player-facing view.

## Related Files

- `tuning.js`
- `input.js`
- `player.js`
- `lighting.js`
- `enemy.js`
- `sound.js`
- `game.js`
- `index.html`
