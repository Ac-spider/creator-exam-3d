# Task 7 Report — Audited Fixed Art Set

Date: 2026-07-10
Baseline: `94cb280f0815aa74da104e9db85f5c9fccb39e6b`

## RED / GREEN

- RED: `node debug/art-assets-tests.js` exited 1 with `AssertionError: public/assets/art must exist` before any art asset was added.
- GREEN: `node debug/art-assets-tests.js` passed with `5 files, 449254 bytes`.
- GREEN: `node debug/server-api-tests.js` passed, including the real WebP HTTP response assertions.
- GREEN: `npm run check` passed for 77 JavaScript files.

## Generation and visual audit

All four CGs were generated with the built-in image generation tool and converted locally; no generated source PNG is stored in the repository.

- `cg-prologue.webp`: accepted. No text-like marks, hero, concrete summon, logo, or watermark. The left title area and lower-right button area remain usable after the final crop.
- `cg-night-watch.webp`: accepted. The final 21:9 crop remains one continuous panorama with useful left, middle, and right regions; the upper copy areas remain dark.
- `cg-airspace-bridge.webp`: accepted. No foreground aircraft or concrete creation; the left briefing area and lower-right button area remain usable.
- `cg-ending.webp`: the first result was rejected because the luminous tree and figures occupied the lower-right button zone. It was regenerated once with the corrective sentence recorded in `ATTRIBUTION.md`; the final center-left copy area and lower-right button area are clear.

The four exact WebP outputs were reinspected with `view_image` at original detail after Sharp conversion.

## Asset audit

| File | Dimensions | Bytes | SHA-256 |
| --- | ---: | ---: | --- |
| `cg-prologue.webp` | 1920×1080 | 110678 | `06357B30E7119D7B33F1D19E060108EBB7CE19A6B440066B07D5FE9CDE617BED` |
| `cg-night-watch.webp` | 2520×1080 | 103172 | `D2A8B372DB6B5B0BC6961DB4A68A5564F8CC435A2591178E2D7841EB16D52ED8` |
| `cg-airspace-bridge.webp` | 1920×1080 | 101800 | `9B9D20845EB62E5DC4C3E458FCDA12C35D38D10E706C0E7D1490347D4604F5D1` |
| `cg-ending.webp` | 1920×1080 | 110542 | `149C5CAF787505D396B233709EB53ACD9D8062E690AD9AD79A9452650DBEE17C` |
| `textures/paper002-ui-grain.webp` | 512×512 | 23062 | `11AE4A4057C81FAADC0F8BBE8E1C230BC939DCC3DF9222CEC83BD107B1D7C8C4` |

Total art payload: 449254 bytes, below the hard 10 MiB budget. Paper002 matched both the pinned 23062-byte size and SHA-256 before use.

## Integration

- Added a complete local provenance ledger, including model, generation date, full final prompts, conversion settings, CC0 source, license, and pinned public-asset hash.
- Added the Paper002 texture as a local soft-light layer while preserving the existing `.glass` color fallback.
- Added only the `.webp` MIME mapping requested by the brief.
- Added the art audit to `debug/verify-all.js` immediately before the server API suite.

The workspace-dependency loader was unavailable in this agent tool environment when called. The conversion therefore used the brief's pinned bundled runtime path and verified Sharp `0.34.5` before producing the four exact outputs.
