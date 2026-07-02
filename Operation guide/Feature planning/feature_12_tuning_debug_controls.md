# Feature 12 - Tuning and Debug Controls

**Status: Implemented first pass for Milestone 2.**

This feature turns scattered prototype constants and always-visible debug layers into a collapsible runtime panel. The panel is a development tool, not final player UI.

## Goal

Make balance tuning and debug visualization controllable during play without changing source code between tests.

## Implemented Scope

- Collapsed-by-default `Tune` button fixed to the right side of the screen.
- Right-side panel that opens over the game view.
- Grouped sections for Debug Overlays, Sound, Lighting, Player, Enemy, Doors and Mission, and Camera and Input.
- Slider controls for numeric tunables, each with a visible current value.
- Toggle controls for debug overlays and binary gameplay-feel switches.
- Separate debug overlay inventory from balance tunables.
- Master `All Debug Overlays` toggle.
- Input guard so pointer/mouse interaction with the panel does not also reach movement, aiming, shooting, or interact controls.
- Runtime getter functions used by sound, lighting, player, enemy, door, camera, fog, and input systems.

## Control Model

- Numeric balance and feel values are slider actions.
- Debug overlays are toggle actions.
- Gameplay-facing binary options may also be toggles, but they are not automatically debug overlays.
- The debug master toggle must make the game view match the player-facing screen by hiding only debug information.

## Debug Overlay Inventory

- Enemy sight cones and proximity rings.
- Enemy index labels.
- Sound source rings.
- Sound attenuation paths.
- All evaluated sound paths, including lost paths.
- Performance overlay.
- Schematic map overlay.
- Secondary exfil testing marker.
- Door HP bars.

## Runtime Tunable Inventory

- Sound radius, transmission, detour, localization, cue lifetime, and enemy footstep cue values.
- Lighting ambient, threshold, lamp, and door aperture values.
- Player speed, noise, health, damage, size, vision, aim-assist, glow, and proximity values.
- Enemy timing, size, sight, movement, combat, shooting, and feedback values.
- Door HP, damage, interaction, open angle, and transmission values.
- Mission interaction/exfil/corpse radii.
- Camera lookahead/easing, fog render scale, and gamepad deadzone.

## Deferred Work

- Persisting tuning values between reloads.
- Export/import of tuned values into authored defaults.
- Better grouping or search if the panel grows.
- Marking any reload-only or high-risk performance controls directly in the UI.
- Final UI styling is out of scope; this is a prototype tool.

## Related Files

- `tuning.js`
- `input.js`
- `player.js`
- `lighting.js`
- `enemy.js`
- `sound.js`
- `game.js`
- `index.html`
