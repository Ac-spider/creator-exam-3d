import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { WorldSimulation } from '../public/js/worldSimulation.js';
import { ResidentRegistry } from '../public/js/residentRegistry.js';

const rootUrl = new URL('../', import.meta.url);
const rootPath = fileURLToPath(rootUrl);

function readSource(relativePath) {
  return readFileSync(new URL(relativePath, rootUrl), 'utf8');
}

function sourceBlock(source, startToken, endToken) {
  const start = source.indexOf(startToken);
  assert.notEqual(start, -1, `missing start token: ${startToken}`);
  const end = source.indexOf(endToken, start + startToken.length);
  assert.notEqual(end, -1, `missing end token: ${endToken}`);
  return source.slice(start, end);
}

function postJson(baseUrl, path, body) {
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }).then(async response => ({
    status: response.status,
    json: await response.json()
  }));
}

async function waitForHealth(baseUrl) {
  const deadline = Date.now() + 8000;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`server did not become healthy: ${lastError?.message || 'timeout'}`);
}

async function withNoKeyServer(testBody) {
  const port = String(43000 + Math.floor(Math.random() * 1000));
  const child = spawn(process.execPath, ['server.js'], {
    cwd: rootPath,
    env: {
      ...process.env,
      PORT: port,
      AI_API_KEY: ''
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  child.stdout.on('data', () => {});
  child.stderr.on('data', () => {});
  const baseUrl = `http://127.0.0.1:${port}`;
  try {
    await waitForHealth(baseUrl);
    await testBody(baseUrl);
  } finally {
    child.kill();
  }
}

function assertBrowserImportsAndEscapes() {
  const gameSource = readSource('public/js/game.js');
  assert.match(
    gameSource,
    /import\s+\{\s*buildContinuityViewModel\s*\}\s+from\s+['"]\.\/continuityPresenter\.js['"];/,
    'game.js must import buildContinuityViewModel before renderContinuity uses it'
  );

  const continuityBlock = sourceBlock(gameSource, '  renderContinuity() {', '  showExplorationChoices(choices, winMessage) {');
  assert.ok(continuityBlock.includes('escapeHtml(resident.name)'), 'continuity resident name must be escaped');
  assert.ok(continuityBlock.includes('escapeHtml(resident.mood)'), 'continuity resident mood must be escaped');
  assert.ok(continuityBlock.includes('escapeHtml(resident.latestMemory)'), 'continuity resident memory must be escaped');
  assert.ok(continuityBlock.includes('escapeHtml(hook.type)'), 'continuity hook type must be escaped');
  assert.ok(continuityBlock.includes('escapeHtml(hook.summary)'), 'continuity hook summary must be escaped');

  const explorationBlock = sourceBlock(gameSource, '  showExplorationChoices(choices, winMessage) {', '  async handleExplorationChoice(choiceId) {');
  assert.ok(explorationBlock.includes('escapeHtml(vm.id)'), 'exploration choice id must be escaped before HTML insertion');
  assert.ok(explorationBlock.includes('escapeHtml(vm.title)'), 'exploration choice title must be escaped');
  assert.ok(explorationBlock.includes('escapeHtml(vm.description)'), 'exploration choice description must be escaped');
  assert.ok(explorationBlock.includes('escapeHtml(vm.meta)'), 'exploration choice meta must be escaped');
  assert.ok(explorationBlock.includes('escapeHtml(vm.badge)'), 'exploration choice badge must be escaped');

  const narrativeBlock = sourceBlock(gameSource, '  addEnvironmentalNarrative(eventType, context) {', '  async fetchNarrative(type, context) {');
  assert.ok(narrativeBlock.includes('this.addLocalNarrative(eventType, context)'), 'narrative 503/null responses must fall back to local narrative text');
}

function assertWorldTextAndResidents() {
  const worldSource = readSource('public/js/worldSimulation.js');
  assert.doesNotMatch(worldSource, /\?\{event\.regionId\}|\?\{payload\./, 'world event text must not contain broken template placeholders');

  const registry = new ResidentRegistry({ seedDefaults: false });
  const world = new WorldSimulation({ residentRegistry: registry });
  world.recordGameEvent({
    type: 'unit_rescued',
    regionId: 'test-region',
    actorId: 'player',
    payload: {
      residentId: 'resident-generated-001',
      unitName: 'Generated Resident'
    },
    importance: 0.8,
    tags: ['rescue']
  });

  const resident = registry.getResident('resident-generated-001');
  assert.ok(resident, 'unknown resident ids from world events must become durable residents');
  assert.equal(resident.name, 'Generated Resident');
  assert.equal(resident.currentRegionId, 'test-region');
  assert.equal(resident.memories.length, 1);
}

function assertRuleAlphabetMatchesGeneratedRegions() {
  const validatorSource = readSource('public/js/ruleValidator.js');
  for (const symbol of ['~', 'H', 'V', 'E', 'C', 'B', 'F', 'M', 'D', 'G', 'S', 'W', 'P']) {
    assert.ok(validatorSource.includes(`'${symbol}'`), `RuleValidator must accept terrain symbol ${symbol} from levels/server prompts`);
  }
  for (const unitType of ['villager', 'miner', 'beast', 'tribeA', 'tribeB']) {
    assert.ok(validatorSource.includes(`'${unitType}'`), `RuleValidator must accept unit type ${unitType} used by GameEngine/server`);
  }
}

async function assertNoKeyServerFallbacks() {
  await withNoKeyServer(async baseUrl => {
    const creation = await postJson(baseUrl, '/api/compile-creation', { text: 'create a small guiding lantern' });
    assert.equal(creation.status, 200, 'compile-creation must return a playable local card without API key');
    assert.ok(creation.json.ability, 'fallback card must include ability');
    assert.equal(creation.json.source, 'fallback');

    const narrative = await postJson(baseUrl, '/api/narrative', {
      type: 'rescue',
      context: { unitName: 'Ari' },
      worldState: { currentLevel: 'flood-village', rescued: 1, lost: 0, entropy: 2 }
    });
    assert.equal(narrative.status, 200, 'narrative must return local text without API key');
    assert.ok(String(narrative.json.text || '').length >= 20, 'fallback narrative must contain visible story text');
    assert.equal(narrative.json.source, 'fallback_no_key');

    const region = await postJson(baseUrl, '/api/generate-region', {
      playerState: { currentRegionId: 'flood-village' },
      regionCount: 3
    });
    assert.equal(region.status, 200, 'generate-region must return local playable region without API key');
    const regionData = region.json.region || region.json;
    assert.ok(Array.isArray(regionData.map), 'fallback region must include map rows');
    assert.ok(Array.isArray(regionData.units), 'fallback region must include units');
    assert.ok(region.json.source === 'fallback_no_key' || region.json.fallback === true, 'fallback region source should be explicit');
  });
}

assertBrowserImportsAndEscapes();
assertWorldTextAndResidents();
assertRuleAlphabetMatchesGeneratedRegions();
await assertNoKeyServerFallbacks();

console.log('Current-code reality tests passed');
