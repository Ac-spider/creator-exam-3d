# Continuity UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make emergent continuity visible to the player: who remembers what, which prior event caused the current region, and which unresolved hooks can shape future regions.

**Architecture:** Add pure presenter functions first, then wire them into `game.js` and `index.html`. UI reads from `WorldSimulation` and `MemoryStore`; it does not create long-term facts.

**Tech Stack:** Native ES Modules, DOM in `public/index.html`, styles in `public/styles.css`, browser code in `public/js/game.js`, pure formatting module in `public/js/continuityPresenter.js`, Node tests in `debug/test-suite.js`.

---

## File Structure

- Create `public/js/continuityPresenter.js`: pure functions that transform world snapshots into display rows.
- Modify `public/index.html`: add continuity panel containers.
- Modify `public/styles.css`: style compact world-continuity panels.
- Modify `public/js/game.js`: render continuity state after world events, level load, save load, and generated region selection.
- Modify `debug/test-suite.js`: presenter unit tests and browser contract tests.

## Testing Strategy

The UI must be testable without a browser by putting formatting logic into `continuityPresenter.js`. Browser tests in this repo can start as static contract checks; later they can be upgraded to an actual browser smoke test. The important invariant is that UI displays derived facts only and never mutates `WorldSimulation` directly.

### Task 1: Add Pure Continuity Presenter

**Files:**
- Create: `public/js/continuityPresenter.js`
- Modify: `debug/test-suite.js`

- [ ] **Step 1: Write failing presenter tests**

Add this to `debug/test-suite.js`:

```js
runner.test('ContinuityPresenter - 应格式化居民记忆和futureHooks', async () => {
  const { buildContinuityViewModel } = await import('../public/js/continuityPresenter.js');
  const { WorldSimulation } = await import('../public/js/worldSimulation.js');

  const world = new WorldSimulation();
  world.recordGameEvent({
    type: 'unit_rescued',
    regionId: 'flood-village',
    actorId: 'player',
    turn: 2,
    payload: { residentId: 'resident-xiaozhu', unitName: '小烛' },
    importance: 0.9,
    tags: ['rescue', 'resident']
  });

  const model = buildContinuityViewModel(world, { currentRegionId: 'flood-village' });

  runner.assert(model.residents.some(row => row.residentId === 'resident-xiaozhu'), '应显示小烛');
  runner.assert(model.futureHooks.some(row => row.type === 'resident_migration'), '应显示迁移钩子');
  runner.assert(model.eventSummary.totalEvents >= 1, '应显示事件总数');
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
node debug/test-suite.js
```

Expected: FAIL because `public/js/continuityPresenter.js` does not exist.

- [ ] **Step 3: Implement presenter**

Create `public/js/continuityPresenter.js`:

```js
export function buildContinuityViewModel(worldSimulation, options = {}) {
  const currentRegionId = options.currentRegionId || 'unknown';
  const residents = worldSimulation.residentRegistry.getResidentsForRegion(currentRegionId).map(resident => ({
    residentId: resident.residentId,
    name: resident.name,
    mood: resident.mood,
    currentGoal: resident.currentGoal,
    memoryCount: resident.memories.length,
    latestMemory: resident.memories[resident.memories.length - 1]?.text || '暂无关键记忆'
  }));

  const futureHooks = worldSimulation.getFutureHooks(currentRegionId).map(hook => ({
    id: hook.id,
    type: hook.type,
    priority: hook.priority || 0,
    summary: hook.summary || hook.type,
    residentId: hook.residentId || null,
    sourceRegionId: hook.sourceRegionId || currentRegionId
  })).sort((a, b) => b.priority - a.priority);

  const events = worldSimulation.eventBus.recent(20);
  return {
    currentRegionId,
    residents,
    futureHooks,
    eventSummary: {
      totalEvents: worldSimulation.eventBus.events.length,
      recent: events.map(event => ({
        id: event.id,
        type: event.type,
        regionId: event.regionId,
        turn: event.turn
      }))
    }
  };
}
```

- [ ] **Step 4: Run tests**

```bash
node debug/test-suite.js
```

Expected: presenter test passes and existing tests pass.

- [ ] **Step 5: Commit**

```bash
git add public/js/continuityPresenter.js debug/test-suite.js
git commit -m "feat: add continuity view model"
```

### Task 2: Add DOM Containers And Render Contract

**Files:**
- Modify: `public/index.html`
- Modify: `public/styles.css`
- Modify: `debug/test-suite.js`

- [ ] **Step 1: Write static DOM contract test**

Add this to `debug/test-suite.js`:

```js
runner.test('Continuity UI - DOM应包含连续性面板挂载点', async () => {
  const fs = await import('node:fs');
  const html = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  const css = fs.readFileSync(new URL('../public/styles.css', import.meta.url), 'utf8');

  runner.assert(html.includes('continuity-panel'), 'index.html应包含continuity-panel');
  runner.assert(html.includes('continuity-residents'), 'index.html应包含居民记忆列表');
  runner.assert(html.includes('continuity-hooks'), 'index.html应包含futureHook列表');
  runner.assert(css.includes('.continuity-panel'), 'styles.css应包含连续性面板样式');
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
node debug/test-suite.js
```

Expected: FAIL until DOM and CSS are added.

- [ ] **Step 3: Add HTML panel**

In `public/index.html`, add this inside the right panel below the current unit/status sections:

```html
<section id="continuity-panel" class="continuity-panel">
  <div class="panel-title">世界连续性</div>
  <div class="continuity-block">
    <h3>居民记忆</h3>
    <div id="continuity-residents" class="continuity-list"></div>
  </div>
  <div class="continuity-block">
    <h3>未解决线索</h3>
    <div id="continuity-hooks" class="continuity-list"></div>
  </div>
</section>
```

- [ ] **Step 4: Add CSS**

In `public/styles.css`, add:

```css
.continuity-panel {
  margin-top: 16px;
  padding: 14px;
  border: 1px solid rgba(223, 202, 146, 0.28);
  border-radius: 16px;
  background:
    linear-gradient(145deg, rgba(48, 37, 26, 0.78), rgba(19, 29, 34, 0.72)),
    radial-gradient(circle at top right, rgba(230, 169, 82, 0.18), transparent 42%);
}

.continuity-block + .continuity-block {
  margin-top: 12px;
}

.continuity-block h3 {
  margin: 0 0 8px;
  font-size: 12px;
  letter-spacing: 0.12em;
  color: #dfca92;
}

.continuity-list {
  display: grid;
  gap: 8px;
}

.continuity-item {
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.06);
  color: #f4ead1;
  font-size: 12px;
  line-height: 1.45;
}
```

- [ ] **Step 5: Run tests**

```bash
node debug/test-suite.js
```

Expected: DOM contract test passes.

- [ ] **Step 6: Commit**

```bash
git add public/index.html public/styles.css debug/test-suite.js
git commit -m "feat: add continuity panel shell"
```

### Task 3: Wire Presenter Into Browser Game

**Files:**
- Modify: `public/js/game.js`
- Modify: `debug/test-suite.js`

- [ ] **Step 1: Write static browser render contract test**

Add this to `debug/test-suite.js`:

```js
runner.test('Continuity UI - game.js应通过Presenter渲染而不直接改世界状态', async () => {
  const fs = await import('node:fs');
  const source = fs.readFileSync(new URL('../public/js/game.js', import.meta.url), 'utf8');

  runner.assert(source.includes('buildContinuityViewModel'), 'game.js应使用continuityPresenter');
  runner.assert(source.includes('renderContinuity'), 'game.js应有renderContinuity方法');
  runner.assert(source.includes('continuityResidents'), 'game.js应绑定居民记忆容器');
  runner.assert(source.includes('continuityHooks'), 'game.js应绑定futureHook容器');
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
node debug/test-suite.js
```

Expected: FAIL until `game.js` is wired.

- [ ] **Step 3: Import presenter and bind DOM**

At the top of `public/js/game.js`:

```js
import { buildContinuityViewModel } from './continuityPresenter.js';
```

In `bindUI`, add:

```js
continuityResidents: document.getElementById('continuity-residents'),
continuityHooks: document.getElementById('continuity-hooks')
```

- [ ] **Step 4: Add render method**

Add this method in `CreatorExam3D`:

```js
renderContinuity() {
  if (!this.worldSimulation || !this.ui?.continuityResidents || !this.ui?.continuityHooks) return;
  const model = buildContinuityViewModel(this.worldSimulation, {
    currentRegionId: this.level?.id || 'unknown'
  });

  this.ui.continuityResidents.innerHTML = model.residents.map(resident => `
    <div class="continuity-item">
      <strong>${resident.name}</strong> · ${resident.mood}<br>
      ${resident.latestMemory}
    </div>
  `).join('') || '<div class="continuity-item">暂无居民记忆</div>';

  this.ui.continuityHooks.innerHTML = model.futureHooks.map(hook => `
    <div class="continuity-item">
      <strong>${hook.type}</strong><br>
      ${hook.summary}
    </div>
  `).join('') || '<div class="continuity-item">暂无未解决线索</div>';
}
```

Call `this.renderContinuity();` after level load, after world event save, and after modal choices that change region.

- [ ] **Step 5: Run tests**

```bash
npm run check
node debug/test-suite.js
```

Expected: syntax check and tests pass.

- [ ] **Step 6: Commit**

```bash
git add public/js/game.js debug/test-suite.js
git commit -m "feat: render continuity panel"
```

### Task 4: Add UI Perception Scenario

**Files:**
- Modify: `debug/world-sim-scenarios.js`

- [ ] **Step 1: Add presenter assertion to scenario**

Extend `debug/world-sim-scenarios.js`:

```js
import { buildContinuityViewModel } from '../public/js/continuityPresenter.js';

const model = buildContinuityViewModel(restoredWorld, { currentRegionId: 'highland-refuge' });
assert(model.residents.some(row => row.residentId === 'resident-xiaozhu'), 'continuity UI model must show moved resident');
assert(model.residents.some(row => row.latestMemory.includes('unit_rescued') || row.memoryCount > 0), 'continuity UI model must expose prior memory');
```

- [ ] **Step 2: Run verification**

```bash
npm run check
node debug/test-suite.js
node debug/world-sim-scenarios.js
```

Expected: all commands pass.

- [ ] **Step 3: Commit**

```bash
git add debug/world-sim-scenarios.js
git commit -m "test: cover continuity ui model in scenario"
```

## Phase Acceptance

- The player can see resident memories and unresolved hooks.
- UI uses a pure presenter tested in Node.
- Browser code renders derived data only; it does not mutate world facts.
- Scenario proves continuity data exists after save/reload and region migration.

