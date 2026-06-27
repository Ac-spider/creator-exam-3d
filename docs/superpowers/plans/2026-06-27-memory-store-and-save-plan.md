# Memory Store And Save Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a schema-versioned long-term storage layer so world events, residents, future hooks, generated regions, and existing player memory survive reloads safely.

**Architecture:** Add `MemoryStore` as a wrapper around storage and serialization. Existing systems keep owning their domain state, but `MemoryStore` coordinates save/load snapshots, migrations, corruption handling, and testable storage adapters.

**Tech Stack:** Native ES Modules, browser `localStorage`, in-memory storage adapter for Node tests, existing `AIMemory`, `WorldSimulation`, `RegionManager`, `PersistentWorld`, and `debug/test-suite.js`.

---

## File Structure

- Create `public/js/memoryStore.js`: storage adapter, schema version, save/load, migrations, corruption fallback.
- Modify `public/js/worldSimulation.js`: expose full snapshot shape required by `MemoryStore`.
- Modify `public/js/game.js`: load world snapshot on startup and save after canonical world events.
- Modify `debug/test-suite.js`: storage, migration, corruption, and long-flow tests.
- Modify `debug/world-sim-scenarios.js`: include save/load checkpoint after region one.

## Testing Strategy

Storage tests must use an injected in-memory adapter. They must not depend on real browser `localStorage`, and they must verify both successful migration and failure behavior. The key proof is a two-region story where a resident memory and future hook survive a save/reload before the next region is generated.

### Task 1: Add MemoryStore With In-Memory Adapter

**Files:**
- Create: `public/js/memoryStore.js`
- Modify: `debug/test-suite.js`

- [ ] **Step 1: Write failing storage tests**

Add this to `debug/test-suite.js`:

```js
runner.test('MemoryStore - 应保存并恢复完整世界快照', async () => {
  const { MemoryStore, createMemoryStorage } = await import('../public/js/memoryStore.js');
  const { WorldSimulation } = await import('../public/js/worldSimulation.js');

  const storage = createMemoryStorage();
  const store = new MemoryStore({ storage });
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

  store.saveWorld(world);
  const reloaded = new WorldSimulation();
  store.loadWorld(reloaded);

  runner.assert(reloaded.eventBus.query({ type: 'unit_rescued' }).length === 1, '事件流应恢复');
  runner.assert(reloaded.getFutureHooks('flood-village').some(hook => hook.type === 'resident_migration'), 'futureHook应恢复');
  runner.assert(reloaded.residentRegistry.getResident('resident-xiaozhu').memories.length > 0, '居民记忆应恢复');
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
node debug/test-suite.js
```

Expected: FAIL because `public/js/memoryStore.js` does not exist.

- [ ] **Step 3: Implement `MemoryStore`**

Create `public/js/memoryStore.js`:

```js
export const WORLD_STORAGE_KEY = 'creator_exam_world_state';
export const WORLD_SCHEMA_VERSION = 1;

export function createMemoryStorage(initial = {}) {
  const data = { ...initial };
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
    },
    setItem(key, value) {
      data[key] = String(value);
    },
    removeItem(key) {
      delete data[key];
    },
    dump() {
      return { ...data };
    }
  };
}

function defaultStorage() {
  if (typeof localStorage === 'undefined' || localStorage === null) return createMemoryStorage();
  return localStorage;
}

export class MemoryStore {
  constructor(options = {}) {
    this.storage = options.storage || defaultStorage();
    this.key = options.key || WORLD_STORAGE_KEY;
    this.lastError = null;
  }

  saveWorld(worldSimulation) {
    const snapshot = {
      version: WORLD_SCHEMA_VERSION,
      savedAt: Date.now(),
      worldSimulation: worldSimulation.serialize()
    };
    this.storage.setItem(this.key, JSON.stringify(snapshot));
    return snapshot;
  }

  loadWorld(worldSimulation) {
    const raw = this.storage.getItem(this.key);
    if (!raw) return false;
    try {
      const snapshot = JSON.parse(raw);
      const migrated = this.migrate(snapshot);
      worldSimulation.deserialize(migrated.worldSimulation || {});
      this.lastError = null;
      return true;
    } catch (error) {
      this.lastError = { code: 'load_failed', message: error.message };
      return false;
    }
  }

  migrate(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') throw new Error('snapshot must be an object');
    if (snapshot.version === WORLD_SCHEMA_VERSION) return snapshot;
    if (!snapshot.version && snapshot.worldSimulation) {
      return { version: WORLD_SCHEMA_VERSION, savedAt: Date.now(), worldSimulation: snapshot.worldSimulation };
    }
    throw new Error(`unsupported world schema version: ${snapshot.version}`);
  }
}
```

- [ ] **Step 4: Run tests**

```bash
node debug/test-suite.js
```

Expected: MemoryStore test passes and existing tests pass.

- [ ] **Step 5: Commit**

```bash
git add public/js/memoryStore.js debug/test-suite.js
git commit -m "feat: add world memory store"
```

### Task 2: Add Migration And Corruption Tests

**Files:**
- Modify: `public/js/memoryStore.js`
- Modify: `debug/test-suite.js`

- [ ] **Step 1: Write failing migration/corruption tests**

Add this to `debug/test-suite.js`:

```js
runner.test('MemoryStore - 应迁移旧快照并拒绝损坏存档', async () => {
  const { MemoryStore, createMemoryStorage, WORLD_STORAGE_KEY } = await import('../public/js/memoryStore.js');
  const { WorldSimulation } = await import('../public/js/worldSimulation.js');

  const oldSnapshot = {
    worldSimulation: {
      version: 1,
      eventBus: { version: 1, events: [], maxEvents: 500 },
      residentRegistry: { version: 1, residents: [] },
      futureHooks: []
    }
  };
  const storage = createMemoryStorage({ [WORLD_STORAGE_KEY]: JSON.stringify(oldSnapshot) });
  const store = new MemoryStore({ storage });
  const migratedWorld = new WorldSimulation();

  runner.assertTrue(store.loadWorld(migratedWorld), '无version但结构正确的旧快照应迁移');

  storage.setItem(WORLD_STORAGE_KEY, '{broken-json');
  const brokenWorld = new WorldSimulation();
  runner.assertFalse(store.loadWorld(brokenWorld), '损坏JSON不应加载成功');
  runner.assertEqual(store.lastError.code, 'load_failed', '应记录加载失败原因');
});
```

- [ ] **Step 2: Run test to verify failure**

```bash
node debug/test-suite.js
```

Expected: old snapshot may pass, broken JSON behavior must be verified. If the test already passes, add an assertion that `lastError.message.length > 0` and rerun to ensure it still tests the failure branch.

- [ ] **Step 3: Harden corruption behavior**

In `loadWorld`, after setting `lastError`, add:

```js
return false;
```

If this line already exists, no production change is required; keep the test because it proves the behavior.

- [ ] **Step 4: Run tests**

```bash
node debug/test-suite.js
```

Expected: migration/corruption test passes.

- [ ] **Step 5: Commit**

```bash
git add public/js/memoryStore.js debug/test-suite.js
git commit -m "test: cover memory store migration failures"
```

### Task 3: Wire MemoryStore Into Browser World Events

**Files:**
- Modify: `public/js/game.js`
- Modify: `debug/test-suite.js`

- [ ] **Step 1: Write browser contract test**

Add this to `debug/test-suite.js`:

```js
runner.test('浏览器入口 - 世界事件后应触发MemoryStore保存', async () => {
  const fs = await import('node:fs');
  const source = fs.readFileSync(new URL('../public/js/game.js', import.meta.url), 'utf8');

  runner.assert(source.includes('MemoryStore'), 'game.js应导入MemoryStore');
  runner.assert(source.includes('saveWorld('), 'game.js应在世界事件后保存WorldSimulation');
  runner.assert(source.includes('loadWorld('), 'game.js启动时应加载WorldSimulation');
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
node debug/test-suite.js
```

Expected: FAIL until browser path imports and calls `MemoryStore`.

- [ ] **Step 3: Add browser integration**

At the top of `public/js/game.js`:

```js
import { WorldSimulation } from './worldSimulation.js';
import { MemoryStore } from './memoryStore.js';
```

In `CreatorExam3D` constructor before `super` cannot access `this`, so pass an event hook after initialization:

```js
this.worldSimulation = new WorldSimulation();
this.memoryStore = new MemoryStore();
this.memoryStore.loadWorld(this.worldSimulation);
this.hooks.onWorldEvent = event => {
  this.worldSimulation.recordGameEvent(event);
  this.memoryStore.saveWorld(this.worldSimulation);
};
```

If the constructor currently passes `onWorldEvent` into `super`, keep a single event path and do not register two handlers.

- [ ] **Step 4: Run tests**

```bash
npm run check
node debug/test-suite.js
```

Expected: syntax check and tests pass.

- [ ] **Step 5: Commit**

```bash
git add public/js/game.js debug/test-suite.js
git commit -m "feat: persist world simulation in browser"
```

### Task 4: Add Save/Reload Long Scenario

**Files:**
- Modify: `debug/world-sim-scenarios.js`

- [ ] **Step 1: Add save/reload checkpoint**

Extend `debug/world-sim-scenarios.js`:

```js
import { MemoryStore, createMemoryStorage } from '../public/js/memoryStore.js';

const storage = createMemoryStorage();
const store = new MemoryStore({ storage });
store.saveWorld(world);

const restoredWorld = new WorldSimulation();
const loaded = store.loadWorld(restoredWorld);
assert(loaded, 'world must load from MemoryStore');
assert(restoredWorld.getFutureHooks('flood-village').length > 0, 'future hooks must survive MemoryStore reload');
```

- [ ] **Step 2: Run scenario and full verification**

```bash
npm run check
node debug/test-suite.js
node debug/world-sim-scenarios.js
```

Expected: all commands pass.

- [ ] **Step 3: Commit**

```bash
git add debug/world-sim-scenarios.js
git commit -m "test: cover world save reload scenario"
```

## Phase Acceptance

- World state persists through `MemoryStore`, not scattered ad hoc storage calls.
- Corrupt storage never crashes startup.
- Old world snapshots with missing version migrate to the current schema.
- Browser world events save the world after entering `WorldSimulation`.
- Long scenario proves a resident memory and future hook survive reload.

