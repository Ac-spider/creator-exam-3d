import { AIGateway } from '../server/aiGateway.js'
import { fallbackRegionCandidate, fallbackResidentDialogue } from '../server/aiFallbacks.js'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function testCacheHit() {
  let calls = 0
  const gateway = new AIGateway({
    budget: { maxCalls: 10, remainingCalls: 10 },
    provider: async () => {
      calls++
      return { ok: true, json: { value: 'cached' } }
    }
  })

  const first = await gateway.requestJson({ kind: 'region', cacheKey: 'same', fallback: { value: 'fallback' } })
  const second = await gateway.requestJson({ kind: 'region', cacheKey: 'same', fallback: { value: 'fallback' } })

  assert(first.data.value === 'cached', 'first call should use provider')
  assert(second.data.value === 'cached', 'second call should reuse cache')
  assert(calls === 1, 'provider should be called once for same cacheKey')
}

async function testBudgetFallback() {
  let calls = 0
  const gateway = new AIGateway({
    budget: { maxCalls: 0, remainingCalls: 0 },
    provider: async () => {
      calls++
      return { ok: true, json: { value: 'provider' } }
    }
  })

  const result = await gateway.requestJson({ kind: 'dialogue', cacheKey: 'budget', fallback: { value: 'fallback' } })
  assert(result.data.value === 'fallback', 'budget exhaustion should return fallback')
  assert(result.source === 'fallback_budget', 'source should record budget fallback')
  assert(calls === 0, 'provider should not be called when budget is exhausted')
}

async function testInvalidJsonFallback() {
  const gateway = new AIGateway({
    budget: { maxCalls: 10, remainingCalls: 10 },
    provider: async () => ({ ok: true, json: null })
  })

  const result = await gateway.requestJson({ kind: 'region', cacheKey: 'invalid', fallback: { value: 'fallback' } })
  assert(result.data.value === 'fallback', 'invalid provider result should return fallback')
  assert(result.source === 'fallback', 'source should record fallback')
}

async function testRetryThenSuccess() {
  let calls = 0
  const gateway = new AIGateway({
    retries: 1,
    budget: { maxCalls: 10, remainingCalls: 10 },
    provider: async () => {
      calls++
      if (calls === 1) throw new Error('temporary')
      return { ok: true, json: { value: 'ok' } }
    }
  })

  const result = await gateway.requestJson({ kind: 'region', cacheKey: 'retry', fallback: { value: 'fallback' } })
  assert(result.data.value === 'ok', 'retry should recover from one temporary failure')
  assert(calls === 2, 'provider should be called exactly twice')
}

async function testTimeoutFallback() {
  let aborted = false
  const gateway = new AIGateway({
    timeoutMs: 5,
    budget: { maxCalls: 10, remainingCalls: 10 },
    provider: async (request) => new Promise(resolve => {
      request.signal?.addEventListener('abort', () => {
        aborted = true
      }, { once: true })
      setTimeout(() => resolve({ ok: true, json: { value: 'late' } }), 50)
    })
  })

  const result = await gateway.requestJson({ kind: 'dialogue', cacheKey: 'timeout', fallback: { value: 'fallback' } })
  assert(result.data.value === 'fallback', 'timeout should return fallback')
  assert(result.error === 'timeout', 'timeout should be recorded as the fallback reason')
  assert(aborted, 'timeout should abort the provider signal')
}

function testFallbackPayloads() {
  const region = fallbackRegionCandidate({
    sourceRegionId: 'flood-village',
    hooks: [{ type: 'resident_migration', residentId: 'resident-xiaozhu' }]
  })
  assert(region.map.length === 7, 'fallback region must be 7 rows')
  assert(region.units.some(unit => unit.residentId === 'resident-xiaozhu'), 'fallback region should preserve resident hook')

  const dialogue = fallbackResidentDialogue({
    residentName: '小烛',
    memoryText: '曾在洪水村庄被救下'
  })
  assert(dialogue.text.includes('小烛'), 'fallback dialogue should include resident name')
  assert(dialogue.intent.type === 'speak', 'fallback dialogue intent should be bounded')
}

function testGatewayStats() {
  const gateway = new AIGateway({ budget: { maxCalls: 3, remainingCalls: 3 } })
  const stats = gateway.getStats()
  assert(stats.totalCalls === 0, 'stats should expose totalCalls')
  assert(stats.remainingCalls === 3, 'stats should expose remainingCalls')
}

await testCacheHit()
await testBudgetFallback()
await testInvalidJsonFallback()
await testRetryThenSuccess()
await testTimeoutFallback()
testFallbackPayloads()
testGatewayStats()
console.log('AI reliability tests passed.')
