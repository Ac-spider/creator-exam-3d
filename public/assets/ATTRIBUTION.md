# Runtime Asset Provenance

The game serves every asset below from this repository. It does not hotlink third-party files at runtime. Generated still images and the ambientCG texture have their own detailed ledger in [`art/ATTRIBUTION.md`](./art/ATTRIBUTION.md).

## Kenney CC0 packs

- Publisher: Kenney
- Retrieved: 2026-07-10
- License: CC0 1.0 Universal
- Official license statement: https://kenney.nl/support
- CC0 legal tool: https://creativecommons.org/publicdomain/zero/1.0/
- Attribution required: No
- Commercial use, modification, and redistribution: Allowed
- Embedded license copies: `licenses/kenney-nature-cc0.txt`, `licenses/kenney-interface-cc0.txt`, `licenses/kenney-scifi-cc0.txt`

### Nature Kit models

- Official pack page: https://kenney.nl/assets/nature-kit
- Official archive: https://kenney.nl/media/pages/assets/nature-kit/37ac38a37b-1677698939/kenney_nature-kit.zip
- Archive SHA-256: `FA7974A0D342BFE63C38664BA9F8EC1A4AAB8EA25F099BDC56870E33588C4D9D`
- Local modification: selected self-contained GLB files were renamed only; no external buffers or textures are required.

| Local file | Original file in `Models/GLTF format/` | SHA-256 |
| --- | --- | --- |
| `models/kenney-nature/village-tent.glb` | `tent_detailedOpen.glb` | `D54D9665D07E0FF9680E56731C9F5338FC25D93788504D63B8375F54E6444193` |
| `models/kenney-nature/mine-cave.glb` | `cliff_blockCave_rock.glb` | `2C373A596840A4F3BFFA1ABA7A93D7DA9D2AA1DDED54F7A9966E4E4B3FCE7D43` |
| `models/kenney-nature/forest-pine.glb` | `tree_pineRoundC.glb` | `29080A4935BAE6B4AB29066F22C99C58F88B23CE4E2F79B4DCBB5E76DE73F69D` |
| `models/kenney-nature/border-gate.glb` | `fence_gate.glb` | `34D10D5620179B8A211A01EEA837CAA828C0782422F0B408E1A5838788888436` |
| `models/kenney-nature/sacred-oak.glb` | `tree_oak.glb` | `D7FD8773674928C50C11B66D12C636D49BDCC15A8B1C7FBB98E6F63A3439A3F3` |
| `models/kenney-nature/rift-ring.glb` | `statue_ring.glb` | `5C62E4165F7A76436FAA0B20E98B47D0A9E5021DCBF2A0EEF0CDF0912180F02C` |

### Interface Sounds

- Official pack page: https://kenney.nl/assets/interface-sounds
- Official archive: https://kenney.nl/media/pages/assets/interface-sounds/fa43c1dd4d-1677589452/kenney_interface-sounds.zip
- Archive SHA-256: `F2193D072726D6758A5F7871B2DCC54DCCE0D5C35C6F0A62F92549B327C81232`
- Local modification: selected OGG files were renamed only; runtime volume is controlled in code.

| Local file | Original file in `Audio/` | SHA-256 |
| --- | --- | --- |
| `audio/kenney/ui-select.ogg` | `select_003.ogg` | `9A612FD2F513D52A296906B41071C990F75DEFE56BE3BEE60D2D4E2423B51B8B` |
| `audio/kenney/creation-compile.ogg` | `glass_006.ogg` | `840500BE48078F1210F1FD7A9AC4E5665ED9B6F4A2B8DCE91A237152A65E94CC` |
| `audio/kenney/creation-place.ogg` | `drop_002.ogg` | `4AC4D1CEF7E936965CBF795852CA2020300B9E2BA7DAA59F2BF4F1F7BF416218` |
| `audio/kenney/legend-discovery.ogg` | `bong_001.ogg` | `D21D0F0B782445DB579D11E2506B24CD1AC9D664EE33AEAF807761AA7B6FD710` |
| `audio/kenney/level-win.ogg` | `confirmation_004.ogg` | `568967A3D9F8A8F6AF54EA01729C4882284308F2A27D78C07FFD7EE0D6951661` |
| `audio/kenney/level-loss.ogg` | `error_008.ogg` | `EBA17ECB2A426BFD4A8A6ACFF5F8A86202B6424A77AF0FD842E37809A1AB6D81` |

### Sci-fi Sounds

- Official pack page: https://kenney.nl/assets/sci-fi-sounds
- Official archive: https://kenney.nl/media/pages/assets/sci-fi-sounds/6b296f9ecf-1677589334/kenney_sci-fi-sounds.zip
- Archive SHA-256: `119340F351A5098AD814F78719438C0DA355A9CE8A4C8A3AF6A8D48AA3D49E04`
- Local modification: selected OGG was renamed only; runtime volume and playback rate are controlled in code.

| Local file | Original file in `Audio/` | SHA-256 |
| --- | --- | --- |
| `audio/kenney/rift-pulse.ogg` | `forceField_004.ogg` | `05609BB296CBC287AE95AC8924C89809D69C89D7BB357CC6A117EC1B1EF65E09` |
