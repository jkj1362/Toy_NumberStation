# Feature 14 - Geometry Ballistics, Penetration, and Impact Events

**Status: Core implementation complete for the current Prototype 2 geometry. Feature 13 impact-reaction integration and final map-level validation remain.**

This feature establishes shared projectile behavior for destructible and blocking geometry. It owns penetration, physical door/window damage, bullet holes, and impact events. Feature 13 consumes those impact events for local AI reactions.

## Goal

Bullets should pass through explicitly penetrable geometry, damage actors behind it, stop at explicitly blocking geometry, and produce consistent collision events that sound and AI systems can consume.

## Geometry Material Model

Ballistics must use explicit geometry properties rather than assuming behavior from an object type such as `door`:

- `destructible`: the object has HP and can change to a damaged/destroyed state.
- `projectileBehavior`: `penetrate` or `block`.
- `penetrationResistance`: finite power deducted when a penetrable object is crossed; ignored by unconditional blockers.
- `geometryId` and `geometryType`: stable event/debug identity, not behavioral inference.

The first-pass pairings are:

| Geometry | Destructible | Projectile behavior |
|----------|--------------|---------------------|
| Current wooden doors | Yes | Penetrate |
| Physical windows | Yes | Penetrate |
| Normal walls | No | Block |
| Reinforced/non-destructible metal door | No | Block |

Keeping destructibility and projectile blocking as explicit fields prevents future non-destructible doors from accidentally inheriting penetration merely because they are doors. It also leaves room for later materials that are indestructible but penetrable, or destructible but initially blocking, without rewriting projectile code.

## Projectile Rules

- Player and enemy projectiles use the same collision/penetration pipeline.
- Collision uses a swept segment from the previous to the next projectile position and resolves the nearest actor/geometry hit in travel order. Point sampling alone is not sufficient for fast bullets or multiple intersections in one frame.
- Each projectile has independent `damage` and `penetrationPower` values. Damage controls harm to actors; penetration power controls how many resistant targets the bullet can pass through. Door damage remains a separate tunable value, so a high-damage anti-personnel round does not automatically destroy a door.
- Each penetrable actor or geometry target resolves a `penetrationResistance`. After applying that hit's damage, subtract resistance from the projectile's remaining penetration power.
- If remaining penetration power is greater than zero, the projectile advances just beyond the target's exit face and continues in the same direction. If it reaches zero or below, the projectile stops in that target and is removed.
- On a `penetrate` geometry hit, the projectile also records the impact, damages the object when `destructible`, and creates a persistent bullet hole where supported.
- On a `block` geometry hit, the projectile records the impact and is removed.
- Blocking geometry is terminal regardless of remaining penetration power. Normal walls and configured non-destructible doors do not consume a finite amount and then allow passage.
- An actor behind penetrable geometry can be hit. Each actor can be damaged by a given projectile only once.
- Projectiles are also removed at map bounds.
- A projectile must remember geometry and actors already crossed during its current transit so it cannot repeatedly damage the same panel/actor or emit repeated impact events on consecutive frames while still inside an intersection.

## Actor and Armor Resistance

The first-pass normalized values make an unobstructed standard bullet stop in the first unarmored person. Stronger ammunition and upgrades gain penetration by increasing only their initial power:

| Source/target | Example penetration value |
|---------------|---------------------------|
| Standard bullet initial power | `1.0` |
| Unarmored body resistance | `1.0` |
| First penetrating upgrade | `2.0` |
| Bullet-proof covered hit resistance | `2.0` or greater |

- A standard bullet reduces to zero on the first unarmored actor. It damages that actor but cannot pass through them.
- A `2.0` penetration upgrade passes through one unarmored actor and stops in the second. Higher future ammunition can use greater initial power without changing collision logic.
- Damage and penetration resistance are resolved separately. Armor may reduce or transform character damage while still stopping the projectile.
- Future armor, helmets, and other equipment provide coverage-specific `penetrationResistance` and damage mitigation. On a covered hit, the equipment resistance overrides the body's default resistance rather than being blindly added to it.
- A bullet-proof item whose resistance is at least the projectile's remaining penetration power stops that bullet on the first protected actor, even if some damage or blunt trauma is still applied.
- This value model supports stronger future ammunition by assigning higher initial penetration power without hardcoding a two-person rule into collision logic.

## Object Resistance

- Penetrable doors, windows, and future objects have finite `penetrationResistance` values, normally lower than an unarmored body for the current lightweight materials.
- Every penetrated object reduces remaining power. A bullet may pass through several low-resistance objects, but eventually stops when a later object's resistance exhausts the budget.
- Object HP and penetration resistance remain separate. A hit can damage an object and still stop in it, or pass through without destroying it.
- Whether damage state changes resistance is deferred; first pass uses the object's configured material resistance consistently.
- Exact door/window resistance values belong in tuning. They should permit multiple penetrations during testing without allowing unlimited travel through authored penetrable geometry.

## Doors and Windows

- Shooting an intact destructible door, whether closed, open, opening, or closing, applies the separate tunable door-damage amount and creates a persistent bullet hole at the entry impact. A penetrated door remains intact until accumulated door damage reduces its HP to zero.
- Current destructible doors use a thin panel, distinct from the thicker non-destructible metal-door material. Their bullet hit geometry follows the swung panel in every intact state.
- Normal destructible doors are tuned to survive nine standard hits and break on the tenth (`200` HP at `20` damage per hit).
- Whether that hit merely damages or fully destroys the door is separate from penetration. The projectile continues only when its remaining penetration power exceeds the panel's resistance; otherwise it stops in the damaged/destroyed panel.
- Door opening, closing, movement blocking, ray blocking, lighting apertures, and sound transmission continue to use door state and remain separate from projectile penetration.
- Doors animate both opening and closing through the same swing path; closing is the exact reverse of opening. Wooden doors use `12` frames and the heavier metal door uses `24` frames by default.
- Doors open away from the interacting actor, so players and enemies push the panel. A pulled-close door remains in a transitional `closing` state until its panel reaches the frame, and the closing actor is retained on the side where the close began instead of being ejected through the doorway when the closed blocker becomes active.
- An intact swung door panel remains physical blocking geometry throughout opening, open, and closing states. Its rotated panel blocks player/enemy movement and vision while the unobstructed portion of the doorway remains traversable. Enemy navigation exposes temporary clearance points around the rotated panel ends so movement can maneuver around the blocker rather than treating it as a passable aperture or repeatedly pushing into it.
- The two existing exterior moonlight apertures now have separate physical glass records. Intact glass is thinner than a normal door, blocks movement, remains transparent to sight and aperture light, and uses finite penetration resistance.
- Physical windows are tuned to break on the third standard hit (`60` HP at `20` damage per hit). Bullet holes/cracks persist while intact; destruction removes movement and projectile blocking and leaves glass debris.
- Destroying a window immediately activates its linked secondary exit with no follow-up interaction. Alternatively, the player can interact within close range to open the intact window silently; this also removes its blocker and activates the same exit without damaging the glass.
- Exterior window apertures require external light. The current mission defaults to moonlight, while `setExternalWeatherState()` disables window light during rain or when moonlight intensity is zero and restores it for a clear bright-moon condition. This is the integration boundary for the future weather system.
- `room_f_west_door` is the first reinforced metal-door instance. It uses the previous thick `18`-unit panel, remains normally openable, sets `destructible: false` and `projectileBehavior: 'block'`, takes no HP damage, and stops every bullet.

## Impact Events and Sound

- Firing creates the existing muzzle sound. Every collision with geometry creates a separate projectile-impact sound, regardless of whether the geometry penetrates or blocks.
- Muzzle and impact sounds use separate tunable radii. The normal door/wall impact default is `220` design units versus the `350`-unit muzzle report. Glass impacts are much quieter at `90`; metal-door impacts are louder at `260` but remain below the muzzle report. Normal door and window destruction share the `240`-unit destruction radius. Their source positions remain distinct.
- Every projectile and all sounds/impacts derived from it share a stable shot/incident ID.
- Each impact event includes impact position, incoming direction, source actor/type, geometry ID/type, destructibility, projectile behavior, and whether the hit destroyed the object.
- Bullet-triggered destruction must not accidentally dispatch duplicate AI confirmations for the same collision. The projectile impact is the canonical collision incident; a separate structural-destruction sound may remain for presentation only if it is linked to the same incident ID and deduplicated by AI.
- Sound propagation still uses the existing room/door attenuation model. Hearing does not bypass closed doors or walls and does not expose an occluded exact impact position.
- A player-facing muffled doorway arc is attached to the actual attenuating portal, not merely the final portal in a multi-door route. It is created and remains visible only while the source and player are on opposite sides of that specific closed door; moving to the source side or opening/closing the door suppresses the arc.

## AI Boundary

- Feature 14 emits neutral projectile-impact data and sound events; it does not directly choose enemy states.
- Feature 13 decides whether each enemy heard or witnessed the impact and chooses suspicious investigation versus immediate alert/search.
- A single enemy processes one shot/impact through one highest-priority reaction path: direct shooter/muzzle observation, witnessed impact, or heard impact.
- Building-level severity weights and facility-wide escalation remain deferred until these local reactions are implemented and tuned.

## Compartmentalized Implementation Order

1. Add explicit destructibility/projectile-behavior metadata to walls, current doors, and physical-window records. **Done.**
2. Introduce a shared swept projectile collision result and migrate both player and enemy projectiles to it without changing current terminal-hit behavior. **Done.**
3. Add projectile penetration power plus actor/object resistance resolution, including target-hit deduplication. **Done for unarmored actors and current geometry; armor coverage is deferred to the equipment/gear system.**
4. Add continued travel through actors and penetrable geometry until resistance exhausts the budget or blocking geometry is reached. **Done; default rounds stop in the first body.**
5. Add persistent door bullet-hole records and the physical window data/state boundary. **Done for the two exterior window apertures.**
6. Emit canonical geometry-impact events and independently tuned muzzle/impact sounds with shared shot IDs. **Done; material-specific glass and metal impact radii are implemented.**
7. Add Feature 13 heard-impact suspicious investigation using the acoustically perceived reachable point. **Next through Feature 13.**
8. Add Feature 13 witnessed-impact immediate alert and reachable room/connected-space search. **Pending through Feature 13.**
9. Run map-level tests for collision ordering, one-person maximum with default values, test-tuned two-person penetration, accumulated object resistance, all door orientations, blocking walls, sound attenuation, and heard-versus-witnessed reaction priority. **Partially complete; final reaction-priority coverage waits on steps 7-8.**
10. Tune only after the complete local loop is stable; then proceed to facility escalation weighting.

## Deferred Design Details

- Player-facing ammunition selection, ammunition variants, and progression upgrades are deferred until the inventory system exists. Feature 14 retains only the underlying per-projectile damage and penetration-power hooks.
- Coverage-specific armor resistance and damage mitigation are deferred until the equipment/gear system exists. The current first pass retains unarmored body resistance only.
- Whether bullet holes create small sight or sound leaks; first pass keeps them visual evidence only.
- Material-specific speed loss, post-penetration damage falloff, ricochet, and projectile deformation.
- Damage-state resistance changes, such as an almost-destroyed door becoming easier to penetrate.
- Advanced inference of shooter position from impact direction. First pass stores direction for debug/future use but does not grant hidden shooter coordinates.
- Building-level alert severity and communication behavior.

## Acceptance Criteria

- Current destructible doors and physical windows allow penetration; normal walls and configured non-destructible doors stop bullets.
- Door/window behavior comes from explicit material properties rather than geometry type checks.
- Bullet holes are visible and persist until reset.
- With default values, an unobstructed standard bullet damages one unarmored actor and stops in that first actor.
- A `2.0` penetration upgrade can hit two unarmored actors at most and stops on the second.
- Door/window resistance accumulates across penetrations, so bullets can cross multiple lightweight objects but cannot cross an unlimited number.
- Blocking walls and configured non-destructible doors stop bullets regardless of remaining penetration power.
- Every geometry collision emits one canonical impact event and an impact sound using the separate projectile-impact radius.
- **Pending Feature 13 integration:** One shot's muzzle and impact sounds share an incident ID and do not accidentally double-confirm the same AI reaction.
- **Pending Feature 13 integration:** Heard-only impacts produce suspicious investigation; witnessed impacts produce immediate alert and reachable connected-space search.
- Existing door interaction, opening, destruction, sound transmission, and light aperture behavior still works.
- Window destruction and silent close-range opening each activate the linked secondary exit exactly once.
- Wooden and metal doors animate closed in reverse, metal doors move more slowly, and closing never transfers the closing actor through the doorway.
- Open, opening, and closing intact door panels block character movement along the rotated panel and remain consistent with their vision-blocking geometry.
- Muffled doorway arcs appear only at the actual closed attenuating door and only when the source and player occupy opposite sides.

## Related Files

- `game.js`
- `player.js`
- `enemy.js`
- `sound.js`
- `tuning.js`
- `lighting.js`
