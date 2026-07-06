import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { compileCreation } from '../public/js/aiClient.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch (_error) {
    throw new Error(`Expected JSON from ${url}, got ${text.slice(0, 120)}`);
  }
  return { response, json };
}

async function waitForServer(baseUrl) {
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    try {
      const { response } = await fetchJson(`${baseUrl}/health`);
      if (response.ok) return;
    } catch (_error) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  throw new Error('server did not become healthy');
}

async function withServer(options, testBody) {
  const port = options.port;
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = spawn('node', ['server.js'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PORT: String(port), AI_BUDGET_MAX_CALLS: '2', ...options.env }
  });

  let stderr = '';
  child.stderr.on('data', chunk => {
    stderr += String(chunk);
  });

  try {
    await waitForServer(baseUrl);
    await testBody(baseUrl);
  } finally {
    child.kill();
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  assert(!stderr.includes('UnhandledPromiseRejection'), 'server must not emit unhandled promise rejections');
}

async function withFakeProvider(handler, testBody) {
  const server = createServer(handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  try {
    await testBody(`http://127.0.0.1:${port}/v1`);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

async function testClientTimeoutFallback() {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = (_url, options = {}) => new Promise((_resolve, reject) => {
      options.signal?.addEventListener('abort', () => {
        const error = new Error('aborted');
        error.name = 'AbortError';
        reject(error);
      }, { once: true });
    });

    const started = Date.now();
    const card = await compileCreation('add two move actions to nearby NPCs', { compileTimeoutMs: 5 });
    assert(Date.now() - started < 500, 'stalled compile should return promptly');
    assert(card.source === 'local', 'stalled compile should use local fallback');
    assert(card.fallbackReason === 'timeout', 'stalled compile should expose timeout reason');
    assert(Boolean(card.fallbackMessage), 'stalled compile should expose fallback message');
    assert(card.ability === 'haste', 'fallback card should still compile the player prompt');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function testServerNoKeyReason() {
  await withServer({
    port: 3211,
    env: { AI_API_KEY: '' }
  }, async (baseUrl) => {
    const card = await fetchJson(`${baseUrl}/api/compile-creation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'add two move actions to nearby NPCs', context: {} })
    });
    assert(card.response.status === 200, 'missing key should still return a playable card');
    assert(card.json.source === 'fallback', 'missing key fallback source should be explicit');
    assert(card.json.fallbackReason === 'no_key', 'missing key fallback reason should be explicit');
    assert(Boolean(card.json.fallbackMessage), 'missing key fallback should include a player-visible message');
  });
}

async function testServerProviderFailureFallback() {
  await withFakeProvider((_req, res) => {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'upstream_down' }));
  }, async (providerBaseUrl) => {
    await withServer({
      port: 3212,
      env: {
        AI_API_KEY: 'test-key',
        AI_BASE_URL: providerBaseUrl,
        AI_RETRIES: '0',
        AI_TIMEOUT_MS: '1000'
      }
    }, async (baseUrl) => {
      const card = await fetchJson(`${baseUrl}/api/compile-creation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'a bridge made of failed starlight', context: {} })
      });
      assert(card.response.status === 200, 'upstream failure should still return a playable card');
      assert(card.json.source === 'fallback', 'upstream failure fallback source should be explicit');
      assert(card.json.fallbackReason === 'provider_failed', 'upstream failure reason should be explicit');
      assert(Boolean(card.json.fallbackMessage), 'upstream failure should include a player-visible message');
    });
  });
}

await testClientTimeoutFallback();
await testServerNoKeyReason();
await testServerProviderFailureFallback();

console.log('Compile reliability tests passed.');
