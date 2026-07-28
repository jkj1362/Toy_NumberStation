# Live Feature 12 - Tuning and Debug Controls

**Live status: Implemented first pass.**

The prototype has a collapsible in-game tuning/debug panel so balance values and debug layers can be changed during play without editing source constants.

## Current Behavior

- The panel is collapsed by default behind a fixed right-side `Tune` button.
- Pointer/mouse input that begins on the panel is stopped before reaching the game.
- Numeric controls are sliders with current values; debug overlays are independent toggles.
- `All Debug Overlays` is the master switch for enemy cones/labels, sound debug, performance/map overlays, secondary exits, and door/window HP presentation.
- Gameplay-facing feedback such as normal audible-sound waves and mission HUD text is not removed by the debug master switch.
- General sound source rings are off by default. Projectile collision waves remain available as player-facing impact feedback without filling the screen with every source radius.
- Most values update immediately through runtime getters.
- Current sections are Debug Overlays, Sound, Lighting, Player, Enemy, Doors and Mission, and Camera and Input.

## Current Tunable Groups

- Sound: the shared `600` gunshot radius, normal impact, prominent glass/window impact, metal impact, destruction, footstep, body-fall, door transmission/detour, vague localization, cue lifetime, and enemy footstep values.
- Lighting: ambient, visibility thresholds, lamp values, door aperture values, exterior/window light integration, and muzzle-flash radius/intensity/falloff/lifetime.
- Player: walk/crouch/sprint speeds, noise, health/damage, collision, vision, aim assist, glow, and proximity.
- Enemy: separate ordinary (`1.5`), suspicious (`1.2`), and alert (`2.5`) speeds; state timing; normal/suspicious reaction delays; event/shot memory; repeated-impact confirmation window; suspicion-team size; collision/separation; vision; combat; shooting; and search sweeps.
- Doors and mission: normal wooden-door HP (`2000` by default), damage/resistance/thickness, glass HP/damage/resistance/thickness, metal-door behavior/thickness, swing durations, interaction/open angle, sound transmission, projectile/body resistance and power hooks, mission interaction, exfil, and corpse interaction.
- Camera and input: camera lookahead/easing, hard-aim offsets, corner/occlusion padding, fog scale, and gamepad deadzone.

## Current Caveats

- Values are runtime-only and do not persist across reloads.
- Player-facing ammunition selection/progression and armor equipment are deferred; only the underlying projectile power/resistance hooks exist.
- Some geometry/performance values need validation before becoming authored production defaults.
- The panel is a prototype tool, not final UI.

## Related Files

- `tuning.js`
- `input.js`
- `player.js`
- `lighting.js`
- `enemy.js`
- `sound.js`
- `game.js`
- `index.html`
