# AI Open World Roadmap And Test Strategy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Define the execution order and testing standard for turning the current 7x7 level game into a persistent AI co-authored open world.

**Architecture:** Keep `GameEngine` as the current-region tactical simulator. Build open-world behavior through `WorldSimulation`, persistent residents, validated region generation, schema-versioned memory, continuity UI, and AI reliability layers.

**Tech Stack:** Native ES Modules, Node.js, browser JavaScript, existing `debug/test-suite.js`, optional focused scenario scripts under `debug/`, no new npm dependencies unless a later plan explicitly adds one.

---

## Current Verdict

The project does not need a full rewrite. Phase 1 created the right outer shell: `EventBus`, `ResidentRegistry`, `WorldSimulation`, and canonical `GameEngine` world events. The next work should extend that shell, not push long-term resident logic into `GameEngine` or let AI text directly mutate game state.

The main engineering risk is not lack of ideas. The main risk is false confidence from tests that only touch isolated modules while the real browser/debug gameplay path bypasses the new systems. The previous Phase 1 review already exposed this exact failure mode, so every later phase must include integration tests that exercise the same path the player uses.

## Required Testing Standard

Every later implementation plan must include these test categories:

- Unit tests for pure rules and state transitions.
- Integration tests through `DebugGame`, not only through direct method calls.
- Browser-entry contract checks for `public/js/game.js` whenever browser overrides exist.
- Serialization round-trip tests for any state that must survive a run or reload.
- Long scenario tests that simulate at least two connected regions when a feature claims cross-region continuity.
- Negative tests for invalid AI output, invalid resident actions, bad storage, and unreachable maps.
- Deterministic tests for random behavior by injecting seeded functions or temporarily controlling randomness in the test body.

## Phase Order

1. Resident Agent System: persistent residents observe events, remember, change mood/goals, and produce bounded local actions.
2. Region Manager And Rule Validator: turn `futureHooks` into validated 7x7 regions that can be loaded by the existing game loop.
3. Memory Store And Save Migration: unify long-term world state behind schema-versioned storage and migration.
4. Continuity UI: expose who remembers what, which event caused which region, and which hooks remain unresolved.
5. AI Budget And Reliability: add provider abstraction, budgets, retries, caching, timeouts, and local fallbacks before increasing AI usage.

## Cross-Phase Test Matrix

| Failure Mode | Required Test |
| --- | --- |
| New module works but real gameplay does not emit events | `DebugGame` integration test calls player-facing methods such as `createAndPlace`, `rescueUnit`, `winLevel`, `failLevel` |
| Browser overrides bypass base engine helpers | Static contract test reads `public/js/game.js` and checks it calls shared helper methods |
| NPC memory only lasts one level | Two-region scenario serializes and reloads the same resident before the second interaction |
| AI output creates impossible game state | `RuleValidator` rejects bad maps, unknown terrain, unreachable goals, duplicate resident definitions |
| Random tests pass or fail by luck | Test injects deterministic random source or pins `Math.random` inside `try/finally` |
| Save/load hides state ownership bugs | Storage round-trip compares `EventBus`, residents, hooks, and current world graph after reload |
| AI outage breaks gameplay | Fake AI provider throws, endpoint returns local fallback and records fallback reason |

## Plan Files

- `docs/superpowers/plans/2026-06-27-resident-agent-system-plan.md`
- `docs/superpowers/plans/2026-06-27-region-manager-and-validator-plan.md`
- `docs/superpowers/plans/2026-06-27-memory-store-and-save-plan.md`
- `docs/superpowers/plans/2026-06-27-continuity-ui-plan.md`
- `docs/superpowers/plans/2026-06-27-ai-budget-and-reliability-plan.md`

## Execution Gate

Before starting any phase:

```bash
npm run check
node debug/test-suite.js
git status --short
```

Expected:

- Syntax check passes.
- Test suite passes.
- Worktree state is understood before edits begin.

After finishing any phase:

```bash
npm run check
node debug/test-suite.js
```

If that phase introduces a focused scenario script, also run the script named in that plan.

## Definition Of Done For Future Phases

- Every new production behavior has a test that was observed failing before implementation.
- Every new persistent object has a serialize/deserialize test.
- Every AI-facing feature has a fake-provider test and a local fallback test.
- Every browser override that shadows `GameEngine` behavior has a contract test.
- Every cross-region claim is proven by a two-region or longer scenario.
- No test relies on live network calls, wall-clock timing, or uncontrolled randomness.

