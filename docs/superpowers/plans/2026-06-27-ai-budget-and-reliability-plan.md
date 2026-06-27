# AI Budget And Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make AI calls safe enough for open-world generation by adding budgets, cache keys, retries, timeouts, provider injection, and deterministic local fallbacks.

**Architecture:** Extract AI request behavior behind testable gateways. Game systems request candidates and explanations; local validators and fallback generators decide what enters game state.

**Tech Stack:** Node.js server, native `fetch`, existing `server.js` endpoints, browser `aiClient.js`, fake providers in tests, no live network calls in automated verification.

---

## File Structure

- Create `server/aiGateway.js`: provider interface, timeout, retry, cache, budget accounting, JSON parsing.
- Create `server/aiFallbacks.js`: local fallback payloads for creation, narrative, region, resident intent, and dialogue.
- Modify `server.js`: route AI endpoint calls through `AIGateway`.
- Modify `public/js/aiClient.js`: preserve local fallback and expose response source metadata when available.
- Create `debug/ai-reliability-tests.js`: focused gateway tests that do not start the HTTP server.
- Modify `debug/syntax-check.js`: include the new `server/` folder.

## Testing Strategy

Every test uses fake providers. No test may call a live AI API. The tests must prove that expensive or unreliable behavior is bounded: one cache hit does not call the provider twice, budget exhaustion returns fallback, timeout returns fallback, invalid JSON returns fallback, and retry count is capped.

### Task 1: Extract AIGateway With Fake Provider Tests

**Files:**
- Create: `server/aiGateway.js`
- Create: `debug/ai-reliability-tests.js`
- Modify: `debug/syntax-check.js`

- [ ] **Step 1: Write failing gateway tests**

Create `debug/ai-reliability-tests.js`:

```js
import { AIGateway } from '../server/aiGateway.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function testCacheHit() {
  let calls = 0;
  const gateway = new AIGateway({
    budget: { maxCalls: 10 },
    provider: async () => {
      calls++;
      return { ok: true, json: { value: 'cached' } };
    }
  });

  const first = await gateway.requestJson({ kind: 'region', cacheKey: 'same', fallback: { value: 'fallback' } });
  const second = await gateway.requestJson({ kind: 'region', cacheKey: 'same', fallback: { value: 'fallback' } });

  assert(first.data.value === 'cached', 'first call should use provider');
  assert(second.data.value === 'cached', 'second call should reuse cache');
  assert(calls === 1, 'provider should be called once for same cacheKey');
}

async function testBudgetFallback() {
  let calls = 0;
  const gateway = new AIGateway({
    budget: { maxCalls: 0 },
    provider: async () => {
      calls++;
      return { ok: true, json: { value: 'provider' } };
    }
  });

  const result = await gateway.requestJson({ kind: 'dialogue', cacheKey: 'budget', fallback: { value: 'fallback' } });
  assert(result.data.value === 'fallback', 'budget exhaustion should return fallback');
  assert(result.source === 'fallback_budget', 'source should record budget fallback');
  assert(calls === 0, 'provider should not be called when budget is exhausted');
}

async function testInvalidJsonFallback() {
  const gateway = new AIGateway({
    budget: { maxCalls: 10 },
    provider: async () => ({ ok: true, json: null })
  });

  const result = await gateway.requestJson({ kind: 'region', cacheKey: 'invalid', fallback: { value: 'fallback' } });
  assert(result.data.value === 'fallback', 'invalid provider result should return fallback');
  assert(result.source === 'fallback_invalid', 'source should record invalid fallback');
}

await testCacheHit();
await testBudgetFallback();
await testInvalidJsonFallback();
console.log('AI reliability tests passed.');
```

- [ ] **Step 2: Run test to verify it fails**

```bash
node debug/ai-reliability-tests.js
```

Expected: FAIL because `server/aiGateway.js` does not exist.

- [ ] **Step 3: Implement `AIGateway`**

Create `server/aiGateway.js`:

```js
export class AIGateway {
  constructor(options = {}) {
    this.provider = options.provider || (async () => ({ ok: false, json: null }));
    this.budget = {
      maxCalls: Number.isFinite(options.budget?.maxCalls) ? options.budget.maxCalls : 20,
      usedCalls: 0
    };
    this.cache = new Map();
  }

  canCall() {
    return this.budget.usedCalls < this.budget.maxCalls;
  }

  async requestJson(request) {
    const cacheKey = request.cacheKey || `${request.kind}:${JSON.stringify(request.messages || request.input || {})}`;
    if (this.cache.has(cacheKey)) {
      return { source: 'cache', data: this.cache.get(cacheKey) };
    }

    if (!this.canCall()) {
      return { source: 'fallback_budget', data: request.fallback };
    }

    this.budget.usedCalls++;
    try {
      const response = await this.provider(request);
      if (!response?.ok || !response.json || typeof response.json !== 'object') {
        return { source: 'fallback_invalid', data: request.fallback };
      }
      this.cache.set(cacheKey, response.json);
      return { source: 'provider', data: response.json };
    } catch (error) {
      return { source: 'fallback_error', data: { ...request.fallback, error: error.message } };
    }
  }
}
```

- [ ] **Step 4: Include `server/` in syntax check**

In `debug/syntax-check.js`, extend roots:

```js
const roots = ['server.js', 'server', 'public/js', 'debug'];
```

- [ ] **Step 5: Run tests**

```bash
npm run check
node debug/ai-reliability-tests.js
node debug/test-suite.js
```

Expected: all commands pass.

- [ ] **Step 6: Commit**

```bash
git add server/aiGateway.js debug/ai-reliability-tests.js debug/syntax-check.js
git commit -m "feat: add ai gateway reliability tests"
```

### Task 2: Add Timeout And Retry Behavior

**Files:**
- Modify: `server/aiGateway.js`
- Modify: `debug/ai-reliability-tests.js`

- [ ] **Step 1: Add failing timeout/retry tests**

Append to `debug/ai-reliability-tests.js`:

```js
async function testRetryThenSuccess() {
  let calls = 0;
  const gateway = new AIGateway({
    retries: 1,
    budget: { maxCalls: 10 },
    provider: async () => {
      calls++;
      if (calls === 1) throw new Error('temporary');
      return { ok: true, json: { value: 'ok' } };
    }
  });

  const result = await gateway.requestJson({ kind: 'region', cacheKey: 'retry', fallback: { value: 'fallback' } });
  assert(result.data.value === 'ok', 'retry should recover from one temporary failure');
  assert(calls === 2, 'provider should be called exactly twice');
}

async function testTimeoutFallback() {
  const gateway = new AIGateway({
    timeoutMs: 5,
    budget: { maxCalls: 10 },
    provider: async () => new Promise(resolve => setTimeout(() => resolve({ ok: true, json: { value: 'late' } }), 50))
  });

  const result = await gateway.requestJson({ kind: 'dialogue', cacheKey: 'timeout', fallback: { value: 'fallback' } });
  assert(result.data.value === 'fallback', 'timeout should return fallback');
  assert(result.source === 'fallback_timeout', 'source should record timeout fallback');
}

await testRetryThenSuccess();
await testTimeoutFallback();
```

- [ ] **Step 2: Run test to verify it fails**

```bash
node debug/ai-reliability-tests.js
```

Expected: FAIL because retry and timeout are not implemented.

- [ ] **Step 3: Implement timeout and retry**

In `AIGateway` constructor:

```js
this.retries = Number.isFinite(options.retries) ? Math.max(0, options.retries) : 0;
this.timeoutMs = Number.isFinite(options.timeoutMs) ? Math.max(1, options.timeoutMs) : 12000;
```

Add helper method:

```js
withTimeout(promise) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('ai_timeout')), this.timeoutMs))
  ]);
}
```

Replace the single provider call in `requestJson` with:

```js
let lastError = null;
for (let attempt = 0; attempt <= this.retries; attempt++) {
  try {
    const response = await this.withTimeout(this.provider(request));
    if (!response?.ok || !response.json || typeof response.json !== 'object') {
      return { source: 'fallback_invalid', data: request.fallback };
    }
    this.cache.set(cacheKey, response.json);
    return { source: attempt > 0 ? 'provider_retry' : 'provider', data: response.json };
  } catch (error) {
    lastError = error;
    if (error.message === 'ai_timeout') {
      return { source: 'fallback_timeout', data: request.fallback };
    }
  }
}
return { source: 'fallback_error', data: { ...request.fallback, error: lastError?.message || 'ai_error' } };
```

- [ ] **Step 4: Run tests**

```bash
npm run check
node debug/ai-reliability-tests.js
node debug/test-suite.js
```

Expected: all commands pass.

- [ ] **Step 5: Commit**

```bash
git add server/aiGateway.js debug/ai-reliability-tests.js
git commit -m "feat: add ai timeout and retry policy"
```

### Task 3: Add Fallback Payloads And Server Endpoint Integration

**Files:**
- Create: `server/aiFallbacks.js`
- Modify: `server.js`
- Modify: `debug/ai-reliability-tests.js`

- [ ] **Step 1: Add fallback tests**

Append to `debug/ai-reliability-tests.js`:

```js
import { fallbackRegionCandidate, fallbackResidentDialogue } from '../server/aiFallbacks.js';

function testFallbackPayloads() {
  const region = fallbackRegionCandidate({
    sourceRegionId: 'flood-village',
    hooks: [{ type: 'resident_migration', residentId: 'resident-xiaozhu' }]
  });
  assert(region.map.length === 7, 'fallback region must be 7 rows');
  assert(region.units.some(unit => unit.residentId === 'resident-xiaozhu'), 'fallback region should preserve resident hook');

  const dialogue = fallbackResidentDialogue({
    residentName: '小烛',
    memoryText: '曾在洪水村庄被救下'
  });
  assert(dialogue.text.includes('小烛'), 'fallback dialogue should include resident name');
  assert(dialogue.intent.type === 'speak', 'fallback dialogue intent should be bounded');
}

testFallbackPayloads();
```

- [ ] **Step 2: Run test to verify it fails**

```bash
node debug/ai-reliability-tests.js
```

Expected: FAIL because `server/aiFallbacks.js` does not exist.

- [ ] **Step 3: Implement fallback module**

Create `server/aiFallbacks.js`:

```js
export function fallbackRegionCandidate(input = {}) {
  const hook = (input.hooks || []).find(item => item.residentId) || {};
  return {
    id: `fallback-${input.sourceRegionId || 'region'}-${Date.now()}`,
    title: '余波避难所',
    map: ['.......', '..W....', '..W....', '.......', '...M...', '.......', '.......'],
    units: [{
      type: 'villager',
      name: hook.residentId === 'resident-xiaozhu' ? '小烛' : '幸存者',
      x: 0,
      y: 0,
      goal: { x: 6, y: 6 },
      residentId: hook.residentId || null
    }],
    hazard: { type: 'flood', spreadPerTurn: 1 },
    win: 'requiredRescue',
    requiredRescue: 1,
    residentIds: hook.residentId ? [hook.residentId] : []
  };
}

export function fallbackResidentDialogue(input = {}) {
  const name = input.residentName || '居民';
  const memory = input.memoryText || '还在整理自己的记忆';
  return {
    text: `${name}低声说：我记得，${memory}。`,
    intent: {
      type: 'speak',
      confidence: 0.6
    }
  };
}
```

- [ ] **Step 4: Route server endpoints through gateway**

In `server.js`, import:

```js
import { AIGateway } from './server/aiGateway.js';
import { fallbackRegionCandidate, fallbackResidentDialogue } from './server/aiFallbacks.js';
```

Instantiate a gateway near configuration:

```js
const aiGateway = new AIGateway({
  retries: 1,
  timeoutMs: 12000,
  budget: { maxCalls: Number(process.env.AI_MAX_CALLS || 40) },
  provider: async request => {
    const response = await fetch(`${AI_BASE_URL}/chat/completions`, request.fetchOptions);
    if (!response.ok) return { ok: false, json: null };
    return { ok: true, json: await response.json() };
  }
});
```

When wiring endpoint handlers, use `aiGateway.requestJson` with endpoint-specific `fallback`. Preserve current local fallback behavior for creation compilation until a separate refactor covers it.

- [ ] **Step 5: Run verification**

```bash
npm run check
node debug/ai-reliability-tests.js
node debug/test-suite.js
```

Expected: all commands pass.

- [ ] **Step 6: Commit**

```bash
git add server/aiFallbacks.js server.js debug/ai-reliability-tests.js
git commit -m "feat: add ai fallbacks and gateway integration"
```

### Task 4: Add Budget Visibility To Health Endpoint

**Files:**
- Modify: `server/aiGateway.js`
- Modify: `server.js`
- Modify: `debug/ai-reliability-tests.js`

- [ ] **Step 1: Add stats test**

Append to `debug/ai-reliability-tests.js`:

```js
function testGatewayStats() {
  const gateway = new AIGateway({ budget: { maxCalls: 3 } });
  const stats = gateway.getStats();
  assert(stats.maxCalls === 3, 'stats should expose maxCalls');
  assert(stats.usedCalls === 0, 'stats should expose usedCalls');
  assert(stats.cacheEntries === 0, 'stats should expose cache size');
}

testGatewayStats();
```

- [ ] **Step 2: Run test to verify it fails**

```bash
node debug/ai-reliability-tests.js
```

Expected: FAIL because `getStats` is missing.

- [ ] **Step 3: Implement stats**

In `server/aiGateway.js`:

```js
getStats() {
  return {
    maxCalls: this.budget.maxCalls,
    usedCalls: this.budget.usedCalls,
    remainingCalls: Math.max(0, this.budget.maxCalls - this.budget.usedCalls),
    cacheEntries: this.cache.size
  };
}
```

In `/health` response in `server.js`, include:

```js
aiBudget: aiGateway.getStats()
```

- [ ] **Step 4: Run verification**

```bash
npm run check
node debug/ai-reliability-tests.js
node debug/test-suite.js
```

Expected: all commands pass.

- [ ] **Step 5: Commit**

```bash
git add server/aiGateway.js server.js debug/ai-reliability-tests.js
git commit -m "feat: expose ai budget stats"
```

## Phase Acceptance

- AI tests never hit the network.
- Cache, budget exhaustion, invalid payload, timeout, retry, and fallback payloads are all tested.
- Server health reports budget state.
- Game logic still validates AI candidates locally before they become world facts.
- No per-turn unbounded AI calls are introduced.

