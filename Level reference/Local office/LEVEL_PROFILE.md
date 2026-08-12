# Local Government Office — Level Profile

## Identity

- Stable profile ID: `local_government_office`
- Display name: Local Government Office
- Progression group: Early game / first-half facility
- Generator kind: Irregular, topology-first, single-floor
- Generation version: `2`
- Current implementation state: Structurally and spatially playable; deterministic role-specific room furnishing is authored for every generated room
- Playtest query: `?profile=local_government_office&seed=prototype-2`
- Reviewed placement snapshot: `Placement Previews/LocalOffice_Placement_prototype-2.png`
- Deferred: Multiple floors, facility-wide alert escalation, final balance, and progression unlocking

## Visual and spatial acceptance identity

The facility should read as a modest municipal or county administrative office rather than a corporate headquarters. It should combine public-facing service space with dense clerical work areas, records storage, support rooms, and a small restricted administrative section.

The current references indicate a late-1960s/1970s administrative language:

- Heavy metal or wood desks rather than modern minimalist workstations
- Typewriters, telephones, document trays, card systems, and filing cabinets
- Dense clerical rooms with imperfect but functional walking paths
- Low partitions or open-plan desk groupings in larger staff areas
- Wood paneling or warm institutional colors in public/administrative rooms
- Long fluorescent ceiling fixtures and broad, even work lighting
- Large exterior windows in some ordinary offices, with secure and archive areas potentially more enclosed
- Equipment and storage used as sight-line interruption and cover without turning every room into a maze

Generated seeds should not resemble a global row/column table. Some individual clerical rooms may contain orderly desk rows, but the building itself should use variable room sizes, offsets, branches, bends, short passages, and a mixture of public, staff, service, and secure circulation.

## Implemented facility values

```yaml
id: local_government_office
generationVersion: 2
generatorKind: irregular
roomCount: { min: 10, max: 16 }
roomSizeWeights: { small: 0.45, medium: 0.40, large: 0.15 }
corridorStyle: branching
loopCount: { min: 1, max: 3 }
deadEndCount: { min: 1, max: 4 }
entranceCount: { min: 1, max: 2 }
checkpointCount: { min: 1, max: 2 }
securityZoneCount: 3
enemyCount: { min: 7, max: 12 }
```

Security-zone intent:

- Zone 0 — public: entrance, reception, waiting/public service, public permit functions, and public restroom when generated
- Zone 1 — staff: clerical offices, records, meeting/support spaces, staff break room, storage, and utilities
- Zone 2 — secure: controlled antechamber/checkpoint and secure administrative office

## Implemented space profile

| Space | Requirement | Size | Zone | Current spatial intent | Reference status |
| --- | --- | --- | --- | --- | --- |
| Reception/lobby | Exactly 1; player start | Large | 0 | Exterior entrance, reception/checkpoint transition, room for arrivals and orientation | Approved synthesis of images 06, 13, and the generated reception concept |
| Public-service area | Exactly 1 | Large | 0 | Public counters or service desks with staff side and customer side | Approved generated counter concept, simplified when needed for clearance |
| Staff office | 2–4 | Medium | 1 | Dense clerical desks, files, low partitions, and navigable aisles | Strong coverage in images 01, 02, and 05 |
| Records/archive | Exactly 1 | Medium | 1 | Filing/card storage with constrained aisles and controlled access | Approved as a windowless, single-entrance archive with filing banks, cross-aisle, and clerk zone |
| Service/storage | Exactly 1 | Small | 1 | Supplies, boxed records, equipment, and maintenance storage | Missing direct reference |
| Secure antechamber | Exactly 1 | Small | 2 | Controlled transition immediately before the secure office | Approved generated secretary/security outer-office concept |
| Secure office | Exactly 1; objective room | Medium | 2 | Private administrative office with documents/storage and defensible sight lines | Strong coverage in images 10 and 11; image 10 better matches local-office scale |
| Meeting room | 0–2 | Medium | 1 | Table-centered room or small hearing/briefing space | Image 12 establishes formal boardroom language but must be scaled down substantially |
| Permit office | 0–2 | Medium | 0 | Public administrative processing, potentially using card/assignment boards | Image 04 provides useful language |
| Staff break room | 0–1 | Small | 1 | Compact staff-only support room | Missing direct reference |
| Restroom | 0–2 | Small | 0 | Simple public or staff restroom footprint | Missing; low priority unless made interactable |
| Utility room | 0–1 | Small | 1 | Mechanical, communications, or computing support equipment | Image 03 supports equipment density, but its scale is larger than intended |

Current objective placement is fixed to the secure office. Exfil points use generated exterior entrances. These rules may be tuned after room-dressing and playtest review.

## Implemented motifs and circulation

Required motifs:

- `reception_checkpoint`: reception/lobby directly connects to a checkpoint transition.
- `office_cluster`: staff offices connect to staff circulation rather than each functioning as isolated exterior rooms.
- `secure_antechamber`: the secure office is reached through a secure antechamber.

Preferred motifs:

- Storage/service branch — weight `3`
- Side-branch corridor — weight `3`
- Right-angle bend — weight `2`
- Maintenance/alternate loop — weight `1`

Structural expectations:

- At least one route from the public entrance through staff space to the secure region
- One to three circulation loops and one to four meaningful dead ends
- Straight and right-angle corridor runs with deliberate junctions
- No corridor routed through unrelated room interiors
- One or two exterior entrances and three exterior windows in the current prototype
- Lamps mounted only on solid wall spans, never on doors, windows, entrances, or breakable geometry
- Seven to twelve guards with spaced spawns and valid local or cross-space patrol paths

## Reference catalog

### `LocalOffice01.jpg`

Useful for a small or medium clerical office. It establishes freestanding metal desks, perimeter work counters, filing cabinets, desk-level equipment, exterior windows, and irregular walking lanes around furniture. Use it for staff-office and records-room furniture vocabulary. Do not infer the overall building plan from this room.

### `LocalOffice02.jpg`

Useful for a large, dense processing or bookkeeping floor. It establishes repeated workstation banks, high occupancy, narrow parallel aisles, structural columns, and uninterrupted fluorescent ceiling bands. It can inform a public-service back office or a rare large clerical room. Its bank scale should be reduced for this small local-government facility.

### `LocalOffice03.jpg`

Useful for computing, records-processing, communications, or utility equipment. It establishes equipment islands, large cabinets, broad service aisles, columns, and bright institutional lighting. Treat this as inspiration for a compact utility/computing room, not as evidence that the local office needs a full mainframe hall.

### `LocalOffice04.jpg`

Useful for permit processing, dispatch, scheduling, or a public administrative counter. It establishes wood counters/desks, wall-mounted card or assignment boards, paper trays, telephones, and a warmer public-facing palette. It does not clearly show customer circulation, so a direct service-counter reference is still needed.

### `LocalOffice05.jpg`

Useful for an open-plan staff office. It establishes low partitions, mixed desk orientations, filing shelves, plants, broad exterior glazing, repeated ceiling lights, and several overlapping sight lines. Use it to avoid placing all staff desks in a single perfect row while retaining readable aisles.

### `LocalOffice06 LobbyEntrance.jpg`

Strong primary reference for the entrance/lobby. It establishes a freestanding reception desk beside the arrival route, a long open lobby axis, a separate seating area, stone or institutional wall surfaces, wood accents, plants, and clear circulation past the receptionist toward interior doors. The scale is somewhat more prestigious than a small county office, so reduce the length and decorative monumentality while retaining its readable reception-to-circulation relationship.

### `LocalOffice07 LobbyEntrance.jpg`

Useful only as a secondary spatial reference for a clearly legible glass entrance threshold and unobstructed arrival zone. Its contemporary finishes, double-height volume, revolving doors, and corporate scale conflict with the otherwise late-1960s/1970s small-government direction. Do not use its style or full scale for this facility; it may be more appropriate to a later central-government profile.

### `LocalOffice08 Archive.jpg`

Strong primary reference for the records/archive room. It establishes tall banks of small record drawers, storage above the cabinets, a long constrained center aisle, bright linear fluorescent lighting, and an office doorway at the aisle end. This supports a cabinet-lined archive variant with one principal traversable aisle and limited cross-space visibility. Gameplay dressing must widen the aisle enough for actors to pass and must avoid producing a single inescapable collision channel.

### `LocalOffice09 Archive.jpg`

Useful for the work desk associated with an archive or records office rather than the archive layout itself. It establishes a clerk desk placed in front of wall-mounted filing cabinets, multiple telephones, paper trays, and active documents. Combine this vocabulary with image 08 as a small work zone near the archive entrance; do not treat the visible cabinet wall alone as a complete room plan.

### `LocalOffice10 Antechamber.jpg`

Despite the filename, this is a strong reference for the secure office itself. It establishes a compact private office with one large desk, two visitor chairs, a rear credenza, wood wall panels, carpet, limited decoration, and a clear route around one side of the desk. Its restrained scale fits the local-government facility better than image 11. It does not show a checkpoint, waiting vestibule, or controlled antechamber.

### `LocalOffice11 Antechamber.jpg`

Despite the filename, this also depicts an executive/private office rather than an antechamber. It contributes a more prestigious secure-office variant: heavy wood desk, visitor chairs, wall-integrated storage, plants, patterned carpet, and a luminous ceiling feature. Use selectively or scale it down; its luxury and authority may fit the central-government office or mansion better than an ordinary local office.

### `LocalOffice12 Grand meeting room.jpg`

Useful for formal meeting-room composition: a broad U-shaped or horseshoe table, many perimeter chairs, a strong open center, wood wall panels, and a luminous grid ceiling. The shown room is too grand for the current local-office scale. A local version should use a smaller U-shaped table or ordinary rectangular conference table with fewer seats. Preserve the open center only if it creates useful movement and sight-line choices.

### `LocalOffice13 Reception.jpg`

Strong primary reference for the reception counter and waiting relationship. It establishes a curved or wraparound wood counter, seated receptionist, low waiting chairs along the adjacent circulation path, wood wall panels, and fluorescent ceiling panels. Remove the corporate branding and ensure the counter does not block the only path from the entrance. This image supports reception, not a multi-window public-service hall.

## Generated concept catalog

Generated concepts synthesize the source images into spatial proposals for this game. The current four concepts were approved as references on 2026-08-12; implementation may simplify their prop count to preserve movement, connector, patrol, and objective clearances.

### `LocalOffice_Generated_SecureAntechamber_01.png`

Proposes a true secure antechamber as a secretary/security outer office. It has exactly two controlled relationships: an open corridor entrance and a solid restricted-office door. A curved observation desk can see both doors, visitor chairs occupy one wall, and a broad route passes the desk without obstruction. This resolves the missing room type more directly than source images 10–11. Possible implementation simplification: reduce the waiting chairs from three to two in small generated rooms.

### `LocalOffice_Generated_PublicService_01.png`

Proposes a public-service room with a long curved wood counter, three clerk stations, waiting chairs, a short queue lane, wall-mounted permit/card boards, filing cabinets, one public entrance, and one staff-only rear door. The layout clearly separates public and staff circulation. For gameplay, the rope queue should be optional or omitted if it creates narrow collision geometry.

### `LocalOffice_Generated_ReceptionLobby_01.png`

Synthesizes source images 06 and 13 into a modest single-floor civic lobby. A curved counter sits beside rather than across the entrance route; waiting chairs, a low table, information board, and planters provide partial cover; the route from exterior doors to the deeper checkpoint remains broad and legible. This is the recommended current reception direction if approved.

### `LocalOffice_Generated_Archive_01.png`

Combines source images 08–09 into a gameplay-readable archive. The approved implementation keeps two short parallel filing banks, a cross-aisle, and a compact clerk zone near the primary controlled entrance. Cabinet ends interrupt sight lines while the cross-aisle prevents one endless dead-end channel. Departures from the generated image: the actual archive has exactly one entrance, no secondary staff door, no exterior window, and normally one clerk desk.

People visible in source or generated references indicate human scale and intended room use only. They are not permanent room occupants and do not imply civilian NPC placement.

## Room-dressing rules suggested by current references

These rules now drive the first deterministic furnishing implementation:

- Keep a continuous player-width route between every door and the room's important destination.
- Use desks and cabinets to create partial visual occlusion; do not fully seal room interiors with furniture.
- Place filing/storage banks against solid walls or as short islands with accessible aisle ends.
- Larger clerical rooms may use repeated workstation groupings, but introduce offsets, columns, cabinets, or cross-aisles to break perfect repetition.
- Maintain additional clearance near doors, windows, lamps, objective positions, and patrol waypoints.
- Keep public counter furniture readable as a boundary between visitor and staff space.
- Secure and archive dressing should increase controlled sight lines and storage density without creating collision traps.
- Preserve wall ownership: wall-mounted boards, shelves, and lamps must not overlap connector openings.

## Remaining art-direction decisions and requested references

The level is playable without resolving these items. A top-down sketch, real photograph, game screenshot, generated concept, or written decision can refine later visual-dressing passes.

Resolved for the first playable pass:

1. Public service uses the generated counter-and-waiting concept, with queue ropes omitted from collision geometry.
2. Secure antechamber uses the generated secretary/security outer-office concept.
3. Reception uses the generated synthesis as its dominant motif.
4. Records/archive access: **Resolved — exactly one controlled entrance and no exterior window.**
5. Staff offices use a weighted mixture of enclosed clerical desks and low-partition/open-plan groupings.

Helpful next:

6. Corridors/junctions: width, wall finish, signage, columns/alcoves, and whether public and staff corridors should look distinct.
7. Meeting/permit spaces: whether image 12 should become a scaled-down formal meeting variant or whether ordinary rectangular conference rooms should dominate.
8. Service/storage: shelving, boxes, carts, maintenance equipment, and desired clutter density.
9. Exterior/entrance: facade and window rhythm, main-door character, and whether a secondary staff/service entrance is common.
10. Lighting character by zone: uniformly fluorescent, selective darkness, window spill, or more deliberate differences between public/staff/secure spaces.

Low priority or safely deferrable:

- Restroom detailing beyond a collision-safe footprint
- Exact period-correct prop catalog
- Multi-floor stairs/elevators
- Exterior grounds and preparation/lobby house integration

## Designer notes

Add decisions here in plain language. Codex will translate confirmed choices into the profile, reusable modules, motifs, and validation rules.

- Dominant historical period/style: **Strong reference direction: late 1960s/1970s; image 07 is treated as a spatial-only exception**
- Dominant staff-office type: **Weighted mixture of image 01's enclosed clerical vocabulary and image 05's low-partition/open-plan vocabulary**
- Public-service counter organization: **Approved continuous counter with public waiting side; prop count may contract to fit the generated room safely**
- Reception organization: **Approved generated synthesis of image 06's open route and image 13's curved counter**
- Archive organization: **Approved with two short cabinet banks, cross-aisle, one clerk zone, exactly one entrance, and no exterior window**
- Reference people: **Scale indicators only; no permanent civilian occupants are implied**
- Secure antechamber identity: **Approved small secretary/security outer office observing both controlled relationships**
- Secure-office identity: **Provisional compact private office based primarily on image 10; image 11 is a more prestigious variant**
- Desired clutter level: **Unresolved**
- Any image elements that must not be used: **Unresolved**

## Implemented furnishing contract

The first playable room-dressing pass now provides:

- Deterministic reception, public-service, staff-office, archive, service/storage, secure, meeting, permit, break-room, restroom, and utility furnishing rules
- Movement-blocking furniture integrated with actor collision and projectiles
- Tall cabinets, banks, partitions, boards, and shelving integrated with sight and light occlusion
- Door, window, wall, connector-route, patrol, actor-spawn, and objective clearances validated before a mission can load
- An archive invariant of one internal entrance, zero windows, two or more filing banks, and exactly one clerk desk

Future references can replace or extend individual role modules without changing the topology-first generator. Profile generation versions should be incremented whenever those changes intentionally alter existing seeds.
