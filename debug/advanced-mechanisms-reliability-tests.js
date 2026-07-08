import { readFileSync } from 'node:fs';
import { buildAdvancedMechanicsViewModel } from '../public/js/advancedMechanicsPresenter.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sourceBlock(source, startToken, endToken) {
  const start = source.indexOf(startToken);
  assert(start !== -1, `missing start token: ${startToken}`);
  const end = source.indexOf(endToken, start + startToken.length);
  assert(end !== -1, `missing end token: ${endToken}`);
  return source.slice(start, end);
}

const gameSource = readFileSync(new URL('../public/js/game.js', import.meta.url), 'utf8');
const presenterSource = readFileSync(new URL('../public/js/advancedMechanicsPresenter.js', import.meta.url), 'utf8');
const socialDemoBlock = sourceBlock(gameSource, '  triggerSocialDemo() {', '  updateMissionDossier() {');
const advancedActionBlock = sourceBlock(gameSource, '  handleAdvancedAction(actionId) {', '  demoCard(ability) {');
const modifiableWorkshopBlock = sourceBlock(gameSource, '  ensureWorkshopModifiableInventory() {', '  triggerWorkshopDemo() {');
const decodeBlock = sourceBlock(gameSource, '  handleDecodeAbyss() {', '  handleCreateCorruption() {');
const abyssPanelBlock = sourceBlock(gameSource, '  renderAbyssPanel() {', '  renderCorruptionPanel() {');

assert(socialDemoBlock.includes('social-demo-witness-a'), 'social demo should seed fallback NPCs when a level has too few NPCs');
assert(socialDemoBlock.includes('this.npcManager.npcs.push(npc)'), 'seeded social demo NPCs should enter the NPC manager');
assert(socialDemoBlock.includes('graph.addNode(npc.id, npc)'), 'seeded social demo NPCs should enter the real social graph');
assert(socialDemoBlock.includes("graph.addEdge(ids[i], ids[i + 1], type"), 'social demo should still use real relationship edges');
assert(socialDemoBlock.includes('graph.recordSocialEvent({'), 'social demo should still record a real social event');
assert(socialDemoBlock.includes('graph.detectCliques({ minStrength: 8, minSize: 3 })'), 'social demo should verify clique formation through SocialGraph');

assert(advancedActionBlock.includes('this.ui.advancedDecodeInput'), 'advanced riddle submit should use the Advanced panel textarea');
assert(gameSource.includes('executeTacticalAction(actionId)'), 'Advanced panel actions should route through tactical resolution');
assert(gameSource.includes('resolveTacticalChain(snapshot)'), 'Chain reaction should have tactical board resolution');
assert(gameSource.includes('resolveTacticalRitual(snapshot)'), 'Ritual forge should have tactical board resolution');
assert(gameSource.includes('resolveTacticalOath(snapshot)'), 'Oathbinding should have tactical board resolution');
assert(gameSource.includes('resolveTacticalEcho(snapshot)'), 'Rift echo should have tactical board resolution');
assert(gameSource.includes('resolveTacticalAbyssOpen()'), 'Cognitive abyss should have tactical board resolution');
assert(gameSource.includes('resolveTacticalCorruption(snapshot)'), 'Verification corruption should have tactical board resolution');
assert(gameSource.includes('resolveTacticalWorkshop(snapshot)'), 'Creator workshop should have tactical board resolution');
assert(gameSource.includes('getIntentPreviewSnapshot(force = false)'), 'Enemy intent previews should be cached as a tactical snapshot');
assert(gameSource.includes('getTacticalInterferenceState()'), 'Tactical room should expose a per-turn AI interference budget');
assert(gameSource.includes('spentInterference'), 'Tactical actions should spend per-turn AI interference instead of being spammable');
assert(gameSource.includes('describeTacticalTarget(snapshot'), 'Tactical cards should describe a concrete unit/tile target');
assert(decodeBlock.includes('this.ui.advancedDecodeInput?.value?.trim()'), 'Abyss decoder should read the Advanced panel textarea');
assert(decodeBlock.includes('this.ui.advancedDecodeInput) this.ui.advancedDecodeInput.value ='), 'successful decode should clear the Advanced panel textarea');
assert(decodeBlock.includes('unit.revealedPath = Math.max'), 'successful decode should change unit path prediction, not only show text');
assert(decodeBlock.includes('this.suppressAbyssAutoRiddle = true'), 'successful decode should not immediately auto-generate another riddle');
assert(abyssPanelBlock.includes('!this.suppressAbyssAutoRiddle'), 'Abyss panel should respect the post-decode auto-generation guard');
assert(advancedActionBlock.includes('this.currentAbyssRiddle || this.cognitiveAbyss?.currentRiddle'), 'Advanced submit should reuse the real pending Abyss riddle');
assert(gameSource.includes('const created = this.oathManager.getAllActiveOaths()[0];'), 'break-oath demo should bootstrap and then break an oath in one click');
assert(advancedActionBlock.includes('this.ensureWorkshopModifiableInventory()'), 'modify-workshop demo should seed a card compatible with range_boost');
assert(advancedActionBlock.includes('this.selectWorkshopModifiableItem()'), 'modify-workshop demo should select the compatible seeded card');
assert(modifiableWorkshopBlock.includes("entry.card?.ability === 'illuminate'"), 'modify-workshop demo should use an illuminate card because range_boost supports it');

const emptyModel = buildAdvancedMechanicsViewModel({
  workshop: { inventory: [], materials: {}, workshopCreations: [] },
  ritual: { suggestions: [], placedCreationCount: 0 },
  oath: { selectedNpc: null, available: [], activeOaths: [] },
  rift: { entropyRatio: 0, activeEchoes: [] },
  abyss: { state: { level: 'dormant', description: 'quiet' }, currentRiddle: null },
  story: { summary: {}, availableBeats: 0 },
  resident: { actions: [] },
  social: {},
  legacy: { total: 0, returned: [], canAdvance: true }
});

for (const id of ['dismantle-workshop', 'modify-workshop', 'fuse-workshop', 'perform-ritual', 'form-oath', 'break-oath', 'advance-story']) {
  const action = emptyModel.actions.find(item => item.id === id);
  assert(action?.enabled === true, `${id} should stay clickable because its handler seeds demo prerequisites`);
}

assert(presenterSource.includes("id: 'submit-riddle'"), 'Advanced presenter should expose riddle submit action');

const tacticalMechanisms = [
  '敌方意图预览',
  '连锁反应',
  '仪式熔炉',
  '言灵誓约',
  '裂隙回响',
  '认知深渊',
  '验证腐化',
  '造物者工坊'
];
const tacticalModel = buildAdvancedMechanicsViewModel({
  tactical: {
    director: { title: 'AI 考核者', text: '先看箭头，再打破一条规则。' },
    threatLine: '最高压力：测试单位 · 冲锋',
    budget: { limit: 2, spent: 1, remaining: 1 },
    options: tacticalMechanisms.map((mechanism, index) => ({
      id: `tactical-${index}`,
      mechanism,
      label: mechanism,
      impact: '改写下一步意图',
      forecast: '会改变棋盘状态',
      target: `测试单位「冲锋」(1,1) → (${index + 1},2)`,
      cost: index % 2 ? { miracle: 1, interference: 1 } : { entropy: 1, interference: 2 },
      interference: index % 2 ? 1 : 2,
      budgetLabel: 'AI干涉 1/2，打出后剩 0',
      risk: '有代价',
      enabled: true
    }))
  },
  intent: { previewCount: 3, highThreatCount: 1, narrative: '测试意图' }
});

assert(tacticalModel.actions.length === 8, 'Tactical model should expose 8 mechanism cards instead of a demo button pile');
for (const mechanism of tacticalMechanisms) {
  const action = tacticalModel.actions.find(item => item.mechanism === mechanism);
  assert(action, `${mechanism} should be present as a tactical action`);
  assert(action.hint.includes('代价：') && action.hint.includes('风险：'), `${mechanism} should expose cost and risk`);
  assert(action.hint.includes('目标：') && action.hint.includes('AI干涉'), `${mechanism} should expose target and interference budget`);
}
assert(tacticalModel.director.text.includes('箭头'), 'Tactical director brief should be visible in the presenter model');
assert(tacticalModel.detail.includes('AI干涉：1/2'), 'Tactical detail should show remaining per-turn interference');

console.log('Advanced mechanisms reliability tests passed.');
