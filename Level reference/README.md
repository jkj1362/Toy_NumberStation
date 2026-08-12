# Level Reference Workflow

This directory is the visual and design-authoring source for facility profiles.

Each facility folder should contain:

- `LEVEL_PROFILE.md`: the current facility brief, implemented generator values, reference catalog, unresolved decisions, and reference requests.
- Reference images: photographs, plans, sketches, generated concepts, or annotated screenshots used to establish the facility's identity and spatial rules.
- `Placement Previews/`: saved images and a seed index for generated layouts that were actually reviewed. These are regression/reference snapshots, not hand-authored runtime maps.
- Optional subfolders when the collection becomes large, such as `Exterior`, `Reception`, `Offices`, `Archive`, `Circulation`, `Secure`, or `Generated Concepts`.

## Workflow

1. The designer adds reference images to the appropriate facility folder.
2. Codex reviews the new references and updates that folder's `LEVEL_PROFILE.md` with what each image establishes.
3. Conflicting references or missing spatial information are recorded under **Open decisions and requested references**. Missing information is not silently invented.
4. Approved spatial conclusions are translated into reusable space modules, motifs, or facility-profile parameters in the generator.
5. Generated seeds are reviewed against the profile's **Visual and spatial acceptance identity**.
6. Representative reviewed layouts are captured under that facility's `Placement Previews/` folder with the profile ID, generation version, and seed needed to reproduce them.
7. When the implementation changes, the `LEVEL_PROFILE.md` implementation-state section and reference needs are updated in the same work pass.

## Reference naming

Existing filenames may be retained. For new files, a descriptive name is preferred:

`<Facility>_<SpaceOrTopic>_<Number>.<extension>`

Examples:

- `LocalOffice_Reception_01.jpg`
- `LocalOffice_ArchiveShelving_01.png`
- `Warehouse_LoadingFloor_02.jpg`
- `Laboratory_SecureCorridor_01.png`

When an image is primarily about mood, furniture, lighting, or floorplan geometry, note that in its filename or beside it in `LEVEL_PROFILE.md`. One image may support several topics, but it should not be treated as proof of spatial relationships that are outside its frame.

## Profile ownership

`LEVEL_PROFILE.md` is the human-readable authoring brief. The runtime profile in `mission-generator.js` is the implemented data. While the facility is under active development, the profile file must show both the desired design and current implementation so differences remain visible.

The normalized generated mission remains the gameplay source at runtime. Reference images are design inputs and are never loaded by gameplay code.

Placement previews follow the same rule. They preserve what was reviewed and make visual regressions easier to spot, but the profile, generation version, and seed remain the authoritative recipe for recreating a layout.
