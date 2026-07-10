# Task 10 Report: Documentation and Visual QA

Date: 2026-07-10
Baseline: `89ad262`

## RED / GREEN

- RED: `node debug/art-assets-tests.js` initially failed because README and architecture did not document `?debug=1`, `public/assets/art`, `environmentGroup`, or `prepareStages(current, next)`.
- GREEN: README and architecture now document the player-visible shell, local fixed art, debug gate, decorative environment boundary, realtime creation visual families, and staged Air Combat loading.
- RED: the first 1280×720 level-1 layout measurement found `#end-turn-btn` outside the viewport after a generated card expanded the dock from 171px to 517px.
- GREEN: desktop card previews now float above the dock, have a bounded scroll area, escape the legacy clip path, and leave compile/place/end-turn in the viewport. A browser smoke source contract protects the layout seam.

## Visual QA matrix

Final directory: `%TEMP%\creator-exam-art-ui-qa-final` (not committed).

- `desktop-1280x720-level-1.png` through `desktop-1280x720-level-6.png`
- `desktop-1440x900-level-1.png` through `desktop-1440x900-level-6.png`
- `mobile-760-world-drawer.png`
- `reduced-motion.png`
- `forced-colors.png`
- `art-blocked-fallback.png`

`qa-result.json` records `passed: true` and exactly 16 PNGs. Each desktop level used a fresh browser context/page so each image represents a stable first capture. All core-control bounding boxes passed, mobile retained the creation dock, blocked art still allowed compile/place/end-turn, and no page errors were observed.

All 16 images were visually inspected at original detail. The six environments are distinct, their decorative props stay outside playable tiles, unit/path/intent cues remain legible, and the mobile/accessibility/fallback views retain the required controls.

During inspection, the Codex image-preview transport intermittently painted alternate previews black. The same unchanged PNG displayed cleanly on the next `view_image` call, and DOM hit-testing/computed styles were normal; this was isolated to preview transport, not the saved screenshots or page. Clean previews were used for every acceptance decision.

## Review fix

- RED: independent review reproduced a true overflow failure at 1280×500. The card had `clientHeight=210` and `scrollHeight=289`, but `pointer-events: none` kept `scrollTop=0` and left the placement button with zero visible height.
- GREEN: the card now receives pointer and scroll input before placement, then publishes `data-placing="true"` so clicks pass through only while the player is choosing a board tile. The state clears on successful placement, a new card, or a level load.
- Live 1280×500 browser probe: wheel changed `scrollTop` from 0 to 79, the placement button became fully visible, placement mode published the click-through state, board placement completed, and no page errors occurred.
- The browser source smoke now requires both the scrollable default state and the placement-only click-through state. Trailing Markdown whitespace found by review was removed.
- Follow-up review found that compiling a replacement card cleared only the visual attribute. `showCard()` now also exits `placementMode`, and the smoke scopes both requirements to that method so a replacement card cannot be placed before its own placement confirmation.

## Full verification

- `npm run check`: PASS, 77 JavaScript files.
- `npm run test:reality`: PASS.
- `node debug/browser-demo-smoke.js`: PASS.
- `node debug/browser-modes-smoke.js`: PASS.
- `node debug/art-assets-tests.js`: PASS, 5 files / 449254 bytes.
- `node debug/server-api-tests.js`: PASS.
- `node debug/test-suite.js`: expected nonzero with the unchanged baseline of 199 PASS / 9 FAIL across 208 tests. Failure names match the recorded branch baseline.
- `node debug/verify-all.js`: 14 suites PASS; `test-suite` fails with the same 199/9 baseline, and `creation-placement-reliability` also fails.

The additional `creation-placement-reliability` failure is pre-existing rather than introduced here: running that focused suite in the main repository outside this worktree reproduces the same L1 `dig_channel` assertion. Diagnosis shows the scenario places on the mailman's occupied tile: placement drains water from 25 to 22 while preserving the occupied origin, then the turn advances flood back to 25 and finally converts the vacated origin to water. The test's combined `after < before && origin === WATER` condition cannot hold for that fixture. This unrelated baseline test/behavior seam was not changed by the art/UI redesign.

## Remaining risk

- Screenshots are temporary QA evidence rather than committed pixel goldens.
- Generated-card placement is intentionally a desktop overlay over part of the board; it remains bounded, scrollable, and dismissible through the existing placement flow.
- Full verification is baseline-clean for this plan, but the repository still has the pre-existing 199/9 broad-suite baseline and the independently reproduced L1 channel reliability failure described above.
