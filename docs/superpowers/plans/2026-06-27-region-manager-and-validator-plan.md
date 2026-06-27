# Region Manager And Validator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate or select follow-up regions from `futureHooks`, validate them as playable 7x7 tactical regions, and load them through the existing game loop.

**Architecture:** Add `RuleValidator` as a pure local gate and `RegionManager` as the world-level region planner. AI output remains a candidate only; `RuleValidator` decides whether a candidate can become game state.

**Tech Stack:** Native ES Modules, existing `WorldSimulation`, `EventBus`, `ResidentRegistry`, `GameEngine`, Node.js tests, fake AI candidate provider for all automated tests.

---

## File Structure

- Create `public/js/ruleValidator.js`: validate map shape, terrain symbols, units, goals, residents, reachability, and difficulty bounds.
- Create `public/js/regionManager.js`: convert future hooks into candidate region requests, call injected provider, validate, repair or use fallback, store world graph.
- Modify `public/js/gameEngine.js`: add `loadRegion(regionData)` for validated generated regions.
- Modify `public/js/worldSimulation.js`: own `RegionManager` or expose hooks needed by it.
- Modify `debug/test-suite.js`: unit, integration, and browser-entry contract tests.
- Create `debug/region-scenarios.js`: long scenario from completed region to generated next region.

## Testing Strategy

The tests must prove that an AI candidate cannot enter the game unless it is playable. They must include invalid outputs that look plausible as text but break gameplay: wrong map size, unknown terrain, unreachable goals, unknown resident IDs, duplicate resident definitions, impossible rescue count, and missing exits.

### Task 1: Add RuleValidator

**Files:**
- Create: `public/js/ruleValidator.js`
- Modify: `debug/test-suite.js`

- [ ] **Step 1: Write failing validation tests**

Add this to `debug/test-suite.js`:

```js
runner.test('RuleValidator - 应拒绝不可玩的AI区域候选', async () => {
  const { RuleValidator } = await import('../public/js/ruleValidator.js');
  const validator = new RuleValidator();

  const badRegion = {
    id: 'bad-region',
    title: '坏区域',
    map: ['WWWWWWW', 'WWWWWWW'],
    units: [{ type: 'villager', name: '甲', x: 0, y: 0, goal: { x: 6, y: 6 } }],
    hazard: { type: 'flood', spreadPerTurn: 2 },
    win: 'requiredRescue',
    requiredRescue: 1,
    residentIds: ['resident-xiaozhu']
  };

  const result = validator.validateRegion(badRegion);
  runner.assertFalse(result.ok, '错误尺寸地图必须被拒绝');
  runner.assert(result.errors.some(error => error.code === 'map_size'), '应报告map_size错误');
});

runner.test('RuleValidator - 应接受可加载的7x7区域', async () => {
  const { RuleValidator } = await import('../public/js/ruleValidator.js');
  const validator = new RuleValidator();

  const region = {
    id: 'highland-refuge',
    title: '高地避难所',
    map: ['.......', '..W....', '..W....', '.......', '...M...', '.......', '.......'],
    units: [{ type: 'villager', name: '小烛', x: 0, y: 0, goal: { x: 6, y: 6 }, residentId: 'resident-xiaozhu' }],
    hazard: { type: 'flood', spreadPerTurn: 1 },
    win: 'requiredRescue',
    requiredRescue: 1,
    residentIds: ['resident-xiaozhu'],
    connections: { from: 'flood-village', reason: 'resident_migration' }
  };

  const result = validator.validateRegion(region);
  runner.assertTrue(result.ok, `区域应通过验证: ${result.errors.map(error => error.code).join(',')}`);
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
node debug/test-suite.js
```

Expected: FAIL because `public/js/ruleValidator.js` does not exist.

- [ ] **Step 3: Implement `RuleValidator`**

Create `public/js/ruleValidator.js`:

```js
const ALLOWED_TERRAIN = new Set(['.', 'W', 'M', 'F', 'R', 'D', 'B', 'S', 'C']);
const ALLOWED_UNIT_TYPES = new Set(['villager', 'messenger', 'beast']);

function addError(errors, code, message) {
  errors.push({ code, message });
}

function inBounds(x, y) {
  return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && x < 7 && y >= 0 && y < 7;
}

function isPassable(symbol) {
  return symbol !== 'W' && symbol !== 'M';
}

export class RuleValidator {
  validateRegion(region) {
    const errors = [];
    if (!region || typeof region !== 'object') addError(errors, 'region_missing', 'region must be an object');
    if (!region?.id) addError(errors, 'id_missing', 'region id is required');
    if (!Array.isArray(region?.map) || region.map.length !== 7 || region.map.some(row => String(row).length !== 7)) {
      addError(errors, 'map_size', 'map must be 7 rows of 7 symbols');
    }

    if (Array.isArray(region?.map)) {
      for (let y = 0; y < region.map.length; y++) {
        const row = String(region.map[y]);
        for (let x = 0; x < row.length; x++) {
          if (!ALLOWED_TERRAIN.has(row[x])) addError(errors, 'terrain_symbol', `invalid terrain ${row[x]} at ${x},${y}`);
        }
      }
    }

    const units = Array.isArray(region?.units) ? region.units : [];
    if (units.length === 0) addError(errors, 'units_missing', 'region needs at least one unit');
    for (const unit of units) {
      if (!ALLOWED_UNIT_TYPES.has(unit.type)) addError(errors, 'unit_type', `invalid unit type ${unit.type}`);
      if (!inBounds(unit.x, unit.y)) addError(errors, 'unit_position', `invalid unit position for ${unit.name}`);
      if (unit.goal && !inBounds(unit.goal.x, unit.goal.y)) addError(errors, 'unit_goal', `invalid goal for ${unit.name}`);
      if (unit.residentId && !String(unit.residentId).startsWith('resident-')) addError(errors, 'resident_id', `invalid residentId ${unit.residentId}`);
    }

    if (region.win === 'requiredRescue' && Number(region.requiredRescue || 0) > units.filter(unit => unit.type === 'villager').length) {
      addError(errors, 'required_rescue', 'requiredRescue cannot exceed villager count');
    }

    if (errors.length === 0) this.validateReachability(region, errors);
    return { ok: errors.length === 0, errors };
  }

  validateReachability(region, errors) {
    const map = region.map.map(row => String(row).split(''));
    for (const unit of region.units || []) {
      if (!unit.goal || !inBounds(unit.x, unit.y) || !inBounds(unit.goal.x, unit.goal.y)) continue;
      const queue = [{ x: unit.x, y: unit.y }];
      const seen = new Set([`${unit.x},${unit.y}`]);
      let reached = false;
      while (queue.length > 0) {
        const current = queue.shift();
        if (current.x === unit.goal.x && current.y === unit.goal.y) {
          reached = true;
          break;
        }
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = current.x + dx;
          const ny = current.y + dy;
          const key = `${nx},${ny}`;
          if (!inBounds(nx, ny) || seen.has(key) || !isPassable(map[ny][nx])) continue;
          seen.add(key);
          queue.push({ x: nx, y: ny });
        }
      }
      if (!reached) addError(errors, 'unreachable_goal', `${unit.name || unit.type} cannot reach goal`);
    }
  }
}
```

- [ ] **Step 4: Run tests**

```bash
node debug/test-suite.js
```

Expected: validator tests pass and existing tests pass.

- [ ] **Step 5: Commit**

```bash
git add public/js/ruleValidator.js debug/test-suite.js
git commit -m "feat: validate generated regions"
```

### Task 2: Add RegionManager With Fake Provider Tests

**Files:**
- Create: `public/js/regionManager.js`
- Modify: `debug/test-suite.js`

- [ ] **Step 1: Write failing RegionManager tests**

Add this to `debug/test-suite.js`:

```js
runner.test('RegionManager - 应从futureHook生成并验证后续区域', async () => {
  const { RegionManager } = await import('../public/js/regionManager.js');

  const manager = new RegionManager({
    candidateProvider: async () => ({
      id: 'highland-refuge',
      title: '高地避难所',
      map: ['.......', '.......', '..W....', '..W....', '.......', '.......', '.......'],
      units: [{ type: 'villager', name: '小烛', x: 0, y: 0, goal: { x: 6, y: 6 }, residentId: 'resident-xiaozhu' }],
      hazard: { type: 'flood', spreadPerTurn: 1 },
      win: 'requiredRescue',
      requiredRescue: 1,
      residentIds: ['resident-xiaozhu']
    })
  });

  const region = await manager.generateNextRegion({
    sourceRegionId: 'flood-village',
    hooks: [{ type: 'resident_migration', residentId: 'resident-xiaozhu', priority: 0.8 }]
  });

  runner.assertEqual(region.id, 'highland-refuge', '应返回验证后的候选区域');
  runner.assert(region.units.some(unit => unit.residentId === 'resident-xiaozhu'), '后续区域应引用迁移居民');
});

runner.test('RegionManager - AI候选非法时应使用本地兜底区域', async () => {
  const { RegionManager } = await import('../public/js/regionManager.js');
  const manager = new RegionManager({
    candidateProvider: async () => ({ id: 'bad', title: 'bad', map: ['....'], units: [] })
  });

  const region = await manager.generateNextRegion({
    sourceRegionId: 'flood-village',
    hooks: [{ type: 'entropy_scar', creationName: '裂隙塔', priority: 0.9 }]
  });

  runner.assert(region.id.startsWith('fallback-'), '非法候选应降级为fallback区域');
  runner.assertEqual(region.map.length, 7, 'fallback区域必须是7x7');
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
node debug/test-suite.js
```

Expected: FAIL because `public/js/regionManager.js` does not exist.

- [ ] **Step 3: Implement `RegionManager`**

Create `public/js/regionManager.js`:

```js
import { RuleValidator } from './ruleValidator.js';

function fallbackRegion(sourceRegionId, hooks = []) {
  const residentHook = hooks.find(hook => hook.residentId);
  return {
    id: `fallback-${sourceRegionId || 'unknown'}-${Date.now()}`,
    title: '临时避难所',
    map: ['.......', '..W....', '..W....', '.......', '...M...', '.......', '.......'],
    units: [{
      type: 'villager',
      name: residentHook?.residentId === 'resident-xiaozhu' ? '小烛' : '幸存者',
      x: 0,
      y: 0,
      goal: { x: 6, y: 6 },
      residentId: residentHook?.residentId || null
    }],
    hazard: { type: 'flood', spreadPerTurn: 1 },
    win: 'requiredRescue',
    requiredRescue: 1,
    residentIds: residentHook?.residentId ? [residentHook.residentId] : [],
    connections: { from: sourceRegionId, reason: hooks.map(hook => hook.type).join(',') || 'fallback' },
    generation: { source: 'fallback' }
  };
}

export class RegionManager {
  constructor(options = {}) {
    this.validator = options.validator || new RuleValidator();
    this.candidateProvider = options.candidateProvider || (async input => fallbackRegion(input.sourceRegionId, input.hooks));
    this.regions = new Map();
  }

  async generateNextRegion(input = {}) {
    const hooks = Array.isArray(input.hooks) ? input.hooks : [];
    let candidate = null;
    try {
      candidate = await this.candidateProvider({
        sourceRegionId: input.sourceRegionId || 'unknown',
        hooks,
        worldSummary: input.worldSummary || {}
      });
    } catch (_error) {
      candidate = null;
    }

    const validation = this.validator.validateRegion(candidate);
    const region = validation.ok ? {
      ...candidate,
      generation: { source: candidate.generation?.source || 'candidate', validation }
    } : fallbackRegion(input.sourceRegionId, hooks);

    this.regions.set(region.id, region);
    return region;
  }

  getRegion(regionId) {
    return this.regions.get(regionId) || null;
  }

  serialize() {
    return { version: 1, regions: Array.from(this.regions.entries()) };
  }

  deserialize(data = {}) {
    this.regions = new Map(Array.isArray(data.regions) ? data.regions : []);
  }
}
```

- [ ] **Step 4: Run tests**

```bash
node debug/test-suite.js
```

Expected: RegionManager tests pass and existing tests pass.

- [ ] **Step 5: Commit**

```bash
git add public/js/regionManager.js debug/test-suite.js
git commit -m "feat: generate validated follow-up regions"
```

### Task 3: Load Generated Region Through GameEngine

**Files:**
- Modify: `public/js/gameEngine.js`
- Modify: `debug/test-suite.js`

- [ ] **Step 1: Write failing load test**

Add this to `debug/test-suite.js`:

```js
runner.test('GameEngine - 应能加载验证后的生成区域并运行一回合', () => {
  const game = new DebugGame();
  const region = {
    id: 'generated-test-region',
    title: '生成测试区域',
    story: '从世界钩子生成的区域',
    objective: '救出小烛',
    map: ['.......', '.......', '..W....', '..W....', '.......', '.......', '.......'],
    units: [{ type: 'villager', name: '小烛', x: 0, y: 0, goal: { x: 6, y: 6 }, residentId: 'resident-xiaozhu' }],
    hazard: { type: 'flood', spreadPerTurn: 1 },
    win: 'requiredRescue',
    requiredRescue: 1,
    maxTurns: 12,
    charges: 3,
    miraclePoints: 6
  };

  game.loadRegion(region);
  runner.assertEqual(game.level.id, 'generated-test-region', '应加载生成区域');
  runner.assert(game.units.some(unit => unit.residentId === 'resident-xiaozhu'), '单位应保留residentId');
  game.endTurn();
  runner.assert(game.turn >= 2, '生成区域应能运行回合');
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
node debug/test-suite.js
```

Expected: FAIL because `GameEngine.loadRegion` is missing.

- [ ] **Step 3: Implement `loadRegion`**

In `public/js/gameEngine.js`, add a method near `loadLevel` or `reset`:

```js
loadRegion(regionData) {
  if (!regionData?.id || !Array.isArray(regionData.map)) {
    throw new Error('loadRegion requires validated region data');
  }
  this.level = {
    ...regionData,
    map: regionData.map.map(row => String(row)),
    units: (regionData.units || []).map(unit => ({
      ...unit,
      goal: unit.goal ? { ...unit.goal } : undefined
    }))
  };
  this.levelIndex = -1;
  this.reset();
  return this.level;
}
```

- [ ] **Step 4: Run tests**

```bash
node debug/test-suite.js
```

Expected: generated-region load test passes and existing tests pass.

- [ ] **Step 5: Commit**

```bash
git add public/js/gameEngine.js debug/test-suite.js
git commit -m "feat: load validated generated regions"
```

### Task 4: Add Region Scenario And Browser Contract

**Files:**
- Create: `debug/region-scenarios.js`
- Modify: `debug/test-suite.js`

- [ ] **Step 1: Add browser-entry contract test**

Add this to `debug/test-suite.js`:

```js
runner.test('浏览器入口 - 后续区域选择不得绕过RegionManager和loadRegion', async () => {
  const fs = await import('node:fs');
  const source = fs.readFileSync(new URL('../public/js/game.js', import.meta.url), 'utf8');

  runner.assert(source.includes('RegionManager') || source.includes('loadRegion('), 'game.js必须通过RegionManager或loadRegion接入后续区域');
  runner.assert(source.includes('recordGameEvent') || source.includes('onWorldEvent'), 'game.js必须保留世界事件流');
});
```

This test may fail until the UI phase wires the browser path. If Phase 3 only supports debug loading, keep this test in a skipped branch by wrapping it in a documented `if (false)` is not allowed. Instead implement the minimal browser import and method call in the next step.

- [ ] **Step 2: Add scenario script**

Create `debug/region-scenarios.js`:

```js
import { WorldSimulation } from '../public/js/worldSimulation.js';
import { RegionManager } from '../public/js/regionManager.js';
import { RuleValidator } from '../public/js/ruleValidator.js';
import { DebugGame } from './debugGame.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const world = new WorldSimulation();
world.recordGameEvent({
  type: 'unit_rescued',
  regionId: 'flood-village',
  actorId: 'player',
  turn: 3,
  payload: { residentId: 'resident-xiaozhu', unitName: '小烛' },
  importance: 0.9,
  tags: ['rescue', 'resident']
});

const manager = new RegionManager({
  validator: new RuleValidator(),
  candidateProvider: async () => ({
    id: 'scenario-highland-refuge',
    title: '高地避难所',
    map: ['.......', '.......', '..W....', '..W....', '.......', '.......', '.......'],
    units: [{ type: 'villager', name: '小烛', x: 0, y: 0, goal: { x: 6, y: 6 }, residentId: 'resident-xiaozhu' }],
    hazard: { type: 'flood', spreadPerTurn: 1 },
    win: 'requiredRescue',
    requiredRescue: 1
  })
});

const region = await manager.generateNextRegion({
  sourceRegionId: 'flood-village',
  hooks: world.getFutureHooks('flood-village')
});

const game = new DebugGame();
game.loadRegion(region);
game.endTurn();

assert(game.level.id === 'scenario-highland-refuge', 'generated region must load');
assert(game.units.some(unit => unit.residentId === 'resident-xiaozhu'), 'resident unit must survive region generation');
console.log('Region scenario passed.');
```

- [ ] **Step 3: Run verification**

```bash
npm run check
node debug/test-suite.js
node debug/region-scenarios.js
```

Expected: all commands pass.

- [ ] **Step 4: Commit**

```bash
git add debug/region-scenarios.js debug/test-suite.js
git commit -m "test: cover generated region scenario"
```

## Phase Acceptance

- Invalid AI region candidates never enter `GameEngine`.
- Generated regions can be loaded and advanced by one turn in `DebugGame`.
- At least one future hook produces a resident-linked next region.
- The browser entry has a contract test that prevents bypassing world events and region loading.

