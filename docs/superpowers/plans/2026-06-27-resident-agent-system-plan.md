# Resident Agent System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade persistent residents from passive records into deterministic agents that observe events, remember, update mood/goals, and emit bounded actions.

**Architecture:** Add `ResidentAgentSystem` above `ResidentRegistry` and below `WorldSimulation`. `ResidentRegistry` remains the source of identity and long-term resident facts; `ResidentAgentSystem` owns the observe-memory-goal-action loop; `NPCManager` remains a current-region projection adapter.

**Tech Stack:** Native ES Modules, existing `EventBus`, `ResidentRegistry`, `WorldSimulation`, `NPCManager`, Node.js test runner in `debug/test-suite.js`, focused scenario script in `debug/world-sim-scenarios.js`.

---

## File Structure

- Create `public/js/residentAgentSystem.js`: resident observation, memory retrieval, mood updates, goal updates, bounded action selection, serialization.
- Modify `public/js/worldSimulation.js`: instantiate `ResidentAgentSystem`, route canonical events into it, emit resulting resident action events.
- Modify `public/js/npcManager.js`: accept resident projections so current-region NPCs can display persistent identity and memory.
- Modify `debug/test-suite.js`: add unit and integration tests.
- Create `debug/world-sim-scenarios.js`: deterministic two-region continuity scenario.

## Testing Strategy

The tests must prove that the same resident can observe a Phase 1 event, change state, act legally, survive serialization, and appear in a later region with memory. Tests must not only call `ResidentAgentSystem` directly; at least one test must route through `DebugGame -> onWorldEvent -> WorldSimulation -> ResidentAgentSystem`.

### Task 1: ResidentAgentSystem Core Loop

**Files:**
- Create: `public/js/residentAgentSystem.js`
- Modify: `debug/test-suite.js`

- [ ] **Step 1: Write the failing unit test**

Add this near the Phase 1 world-simulation tests in `debug/test-suite.js`:

```js
runner.test('ResidentAgentSystem - 居民应观察事件并产生合法行动', async () => {
  const { ResidentRegistry } = await import('../public/js/residentRegistry.js');
  const { ResidentAgentSystem, RESIDENT_ACTION_TYPES } = await import('../public/js/residentAgentSystem.js');

  const registry = new ResidentRegistry();
  const agents = new ResidentAgentSystem({ residentRegistry: registry });
  const event = {
    id: 'event-rescue-xiaozhu',
    type: 'unit_rescued',
    regionId: 'flood-village',
    actorId: 'player',
    turn: 4,
    payload: { residentId: 'resident-xiaozhu', unitName: '小烛' },
    importance: 0.9,
    tags: ['rescue', 'resident']
  };

  agents.observeEvent(event);
  const action = agents.tickResident('resident-xiaozhu', { regionId: 'flood-village', turn: 5 });
  const resident = registry.getResident('resident-xiaozhu');

  runner.assert(resident.memories.some(memory => memory.type === 'unit_rescued'), '居民应记录观察到的救援事件');
  runner.assert(RESIDENT_ACTION_TYPES.includes(action.type), '行动类型必须来自白名单');
  runner.assertEqual(action.residentId, 'resident-xiaozhu', '行动应保留稳定residentId');
  runner.assert(action.reason.includes('unit_rescued'), '行动原因应引用触发事件类型');
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
node debug/test-suite.js
```

Expected: FAIL because `public/js/residentAgentSystem.js` does not exist.

- [ ] **Step 3: Implement the minimal module**

Create `public/js/residentAgentSystem.js`:

```js
export const RESIDENT_ACTION_TYPES = [
  'speak',
  'request_help',
  'move_region',
  'assist_unit',
  'spread_knowledge',
  'withdraw',
  'idle'
];

function clamp01(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0.5;
  return Math.max(0, Math.min(1, number));
}

function makeAction(resident, type, event, context = {}) {
  return {
    id: `resident-action-${resident.residentId}-${context.turn || 0}-${type}`,
    type,
    residentId: resident.residentId,
    regionId: context.regionId || resident.currentRegionId,
    turn: Number.isFinite(Number(context.turn)) ? Number(context.turn) : 0,
    payload: {
      residentName: resident.name,
      mood: resident.mood,
      currentGoal: resident.currentGoal,
      text: event ? `${resident.name}记得${event.type}，因此选择${type}` : `${resident.name}保持观察`
    },
    reason: event ? `recent_event:${event.type}` : 'no_relevant_event'
  };
}

export class ResidentAgentSystem {
  constructor(options = {}) {
    this.residentRegistry = options.residentRegistry;
    if (!this.residentRegistry) throw new Error('ResidentAgentSystem requires residentRegistry');
    this.recentEventsByResident = new Map();
  }

  observeEvent(event) {
    const residentIds = new Set();
    if (event.payload?.residentId) residentIds.add(event.payload.residentId);
    for (const id of event.payload?.residentIds || []) residentIds.add(id);
    for (const residentId of residentIds) {
      const resident = this.residentRegistry.getResident(residentId);
      if (!resident) continue;
      this.residentRegistry.recordMemory(residentId, {
        type: event.type,
        text: `${resident.name}观察到${event.type}`,
        regionId: event.regionId,
        importance: clamp01(event.importance)
      });
      if (!this.recentEventsByResident.has(residentId)) this.recentEventsByResident.set(residentId, []);
      this.recentEventsByResident.get(residentId).push(event);
      this.recentEventsByResident.set(residentId, this.recentEventsByResident.get(residentId).slice(-10));
      this.updateResidentState(resident, event);
    }
  }

  updateResidentState(resident, event) {
    if (event.type === 'unit_rescued') {
      resident.mood = '希望';
      resident.attitudeToPlayer = '友善';
      resident.currentGoal = '向玩家表达感谢并寻找安全区域';
    } else if (event.type === 'unit_lost') {
      resident.mood = '悲伤';
      resident.currentGoal = '寻找失踪者留下的线索';
    } else if (event.type === 'region_lost') {
      resident.mood = '恐惧';
      resident.currentGoal = '离开危险区域';
    }
  }

  tickResident(residentId, context = {}) {
    const resident = this.residentRegistry.getResident(residentId);
    if (!resident) return null;
    const events = this.recentEventsByResident.get(resident.residentId) || [];
    const latest = events[events.length - 1] || null;

    if (latest?.type === 'unit_rescued') return makeAction(resident, 'speak', latest, context);
    if (latest?.type === 'unit_lost') return makeAction(resident, 'request_help', latest, context);
    if (latest?.type === 'region_lost') return makeAction(resident, 'move_region', latest, context);
    return makeAction(resident, 'idle', latest, context);
  }

  tickRegion(regionId, context = {}) {
    return this.residentRegistry.getResidentsForRegion(regionId)
      .map(resident => this.tickResident(resident.residentId, { ...context, regionId }))
      .filter(Boolean);
  }

  serialize() {
    return {
      version: 1,
      recentEventsByResident: Array.from(this.recentEventsByResident.entries())
    };
  }

  deserialize(data = {}) {
    this.recentEventsByResident = new Map(Array.isArray(data.recentEventsByResident) ? data.recentEventsByResident : []);
  }
}
```

- [ ] **Step 4: Run tests**

```bash
node debug/test-suite.js
```

Expected: the new unit test passes and existing tests pass.

- [ ] **Step 5: Commit**

```bash
git add public/js/residentAgentSystem.js debug/test-suite.js
git commit -m "feat: add resident agent core loop"
```

### Task 2: Integrate ResidentAgentSystem With WorldSimulation

**Files:**
- Modify: `public/js/worldSimulation.js`
- Modify: `debug/test-suite.js`

- [ ] **Step 1: Write the failing integration test**

Add this to `debug/test-suite.js`:

```js
runner.test('WorldSimulation - 居民行动应由真实世界事件驱动', async () => {
  const { WorldSimulation } = await import('../public/js/worldSimulation.js');
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

  const actions = world.tickResidents('flood-village', { turn: 4 });
  const actionEvents = world.eventBus.query({ type: 'resident_action' });

  runner.assert(actions.some(action => action.residentId === 'resident-xiaozhu'), '小烛应产生居民行动');
  runner.assert(actionEvents.some(event => event.payload.residentId === 'resident-xiaozhu'), '居民行动应进入EventBus');
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
node debug/test-suite.js
```

Expected: FAIL because `WorldSimulation.tickResidents` is missing.

- [ ] **Step 3: Wire `ResidentAgentSystem` into `WorldSimulation`**

In `public/js/worldSimulation.js`, import the agent system:

```js
import { ResidentAgentSystem } from './residentAgentSystem.js';
```

In the constructor, after `this.residentRegistry`:

```js
this.residentAgentSystem = options.residentAgentSystem || new ResidentAgentSystem({
  residentRegistry: this.residentRegistry
});
```

In `recordGameEvent`, after `this.updateResidentMemories(event);`:

```js
this.residentAgentSystem.observeEvent(event);
```

Add this method:

```js
tickResidents(regionId, context = {}) {
  const actions = this.residentAgentSystem.tickRegion(regionId, context);
  for (const action of actions) {
    this.eventBus.emit({
      type: 'resident_action',
      regionId: action.regionId,
      actorId: action.residentId,
      turn: action.turn,
      payload: action,
      importance: action.type === 'idle' ? 0.2 : 0.6,
      tags: ['resident', action.type]
    });
  }
  return actions;
}
```

Update `serialize`:

```js
residentAgentSystem: this.residentAgentSystem.serialize(),
```

Update `deserialize`:

```js
this.residentAgentSystem.deserialize(data.residentAgentSystem || {});
```

- [ ] **Step 4: Run tests**

```bash
node debug/test-suite.js
```

Expected: integration test passes and existing tests pass.

- [ ] **Step 5: Commit**

```bash
git add public/js/worldSimulation.js debug/test-suite.js
git commit -m "feat: drive resident actions from world events"
```

### Task 3: Preserve Resident Identity In Current-Region NPC Projection

**Files:**
- Modify: `public/js/npcManager.js`
- Modify: `debug/test-suite.js`

- [ ] **Step 1: Write the failing projection test**

Add this to `debug/test-suite.js`:

```js
runner.test('NPCManager - 当前区域NPC投影应保留residentId和长期记忆', async () => {
  const { NPCManager } = await import('../public/js/npcManager.js');
  const { ResidentRegistry } = await import('../public/js/residentRegistry.js');
  const { LEVELS } = await import('../public/js/levels.js');

  const registry = new ResidentRegistry();
  registry.recordMemory('resident-xiaozhu', {
    type: 'unit_rescued',
    text: '小烛记得自己在洪水村庄被救下',
    regionId: 'flood-village',
    importance: 0.9
  });

  const manager = new NPCManager(LEVELS[0], {
    residentProjections: [registry.projectForRegion('resident-xiaozhu', 'flood-village')]
  });

  const xiaozhu = manager.getNPC('resident-xiaozhu');
  runner.assert(xiaozhu, '应能用residentId查到NPC');
  runner.assertEqual(xiaozhu.residentId, 'resident-xiaozhu', 'NPC投影应保留residentId');
  runner.assert(xiaozhu.memories.some(memory => memory.text.includes('被救下')), 'NPC投影应带入长期记忆');
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
node debug/test-suite.js
```

Expected: FAIL because `NPCManager` does not accept `residentProjections`.

- [ ] **Step 3: Add projection support**

Change the constructor signature in `public/js/npcManager.js`:

```js
constructor(level, options = {}) {
  this.level = level;
  this.residentProjections = options.residentProjections || [];
  this.npcs = this.mergeResidentProjections(this.initializeNPCs());
```

Add this method before `initSocialGraph`:

```js
mergeResidentProjections(npcs) {
  const merged = [...npcs];
  for (const projection of this.residentProjections) {
    const existing = merged.find(npc => npc.id === projection.id || npc.name === projection.name || npc.residentId === projection.residentId);
    const projectedNpc = {
      ...projection,
      id: projection.residentId,
      residentId: projection.residentId,
      attitude: projection.attitude || projection.attitudeToPlayer || '中立',
      memories: Array.isArray(projection.memories) ? projection.memories : [],
      dynamicTraits: projection.dynamicTraits || {}
    };
    if (existing) Object.assign(existing, projectedNpc);
    else merged.push(projectedNpc);
  }
  return merged;
}
```

Update `getNPC`:

```js
return this.npcs.find(n => n.id === npcId || n.name === npcId || n.residentId === npcId);
```

- [ ] **Step 4: Run tests**

```bash
node debug/test-suite.js
```

Expected: projection test passes and existing NPC tests pass.

- [ ] **Step 5: Commit**

```bash
git add public/js/npcManager.js debug/test-suite.js
git commit -m "feat: project persistent residents into npc manager"
```

### Task 4: Add Two-Region Continuity Scenario

**Files:**
- Create: `debug/world-sim-scenarios.js`
- Modify: `debug/test-suite.js` only if shared helpers are needed

- [ ] **Step 1: Create the scenario script**

Create `debug/world-sim-scenarios.js`:

```js
import { WorldSimulation } from '../public/js/worldSimulation.js';

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

world.tickResidents('flood-village', { turn: 4 });

const saved = world.serialize();
const reloaded = new WorldSimulation();
reloaded.deserialize(saved);
reloaded.residentRegistry.moveResident('resident-xiaozhu', 'highland-refuge');

const actions = reloaded.tickResidents('highland-refuge', { turn: 1 });
const projection = reloaded.residentRegistry.projectForRegion('resident-xiaozhu', 'highland-refuge');

assert(projection.residentId === 'resident-xiaozhu', 'residentId must survive reload and region move');
assert(projection.memories.some(memory => memory.type === 'unit_rescued'), 'resident memory must survive reload');
assert(actions.some(action => action.residentId === 'resident-xiaozhu'), 'resident must act in the second region');

console.log('World simulation scenario passed.');
```

- [ ] **Step 2: Run scenario**

```bash
node debug/world-sim-scenarios.js
```

Expected: prints `World simulation scenario passed.`

- [ ] **Step 3: Run full verification**

```bash
npm run check
node debug/test-suite.js
node debug/world-sim-scenarios.js
```

Expected: all commands pass.

- [ ] **Step 4: Commit**

```bash
git add debug/world-sim-scenarios.js
git commit -m "test: add resident continuity scenario"
```

## Phase Acceptance

- The same `residentId` survives event observation, serialization, reload, migration, and second-region action.
- Resident actions are always from `RESIDENT_ACTION_TYPES`.
- `NPCManager` can display persistent residents without owning long-term facts.
- No live AI calls are required for this phase.

