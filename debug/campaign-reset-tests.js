import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { LEVELS } from '../public/js/levels.js'
import { CAMPAIGN_STORAGE_KEYS, clearCampaignProgress } from '../public/js/campaignReset.js'
import { createMemoryStorage } from '../public/js/memoryStore.js'

const namedSaveKey = 'creator_exam_world_slot:main'
const tutorialKey = 'creatorExamTutorialCampaign:v1'
const tutorialChoiceKey = 'creatorExamTutorialChoice:v1'
const soundKey = 'creatorExamSound'
const storage = createMemoryStorage({
  ...Object.fromEntries(CAMPAIGN_STORAGE_KEYS.map(key => [key, `value:${key}`])),
  [namedSaveKey]: 'named-save',
  [tutorialKey]: 'tutorial-progress',
  [tutorialChoiceKey]: 'free',
  [soundKey]: 'muted'
})
const session = createMemoryStorage({
  creatorExamPrologueSeen: '1',
  ...Object.fromEntries(LEVELS.map(level => [`creatorExamChapterSeen:${level.id}:v1`, '1'])),
  unrelatedSessionKey: 'keep'
})

const removed = clearCampaignProgress(storage, session, LEVELS.map(level => level.id))
for (const key of CAMPAIGN_STORAGE_KEYS) {
  assert.equal(storage.getItem(key), null, `${key} should be cleared by a full campaign reset`)
}
assert.equal(storage.getItem(namedSaveKey), 'named-save', 'full campaign reset must preserve named saves')
assert.equal(storage.getItem(tutorialKey), 'tutorial-progress', 'free-play reset must preserve paused tutorial progress')
assert.equal(storage.getItem(tutorialChoiceKey), 'free', 'free-play reset must preserve the selected play mode')
assert.equal(storage.getItem(soundKey), 'muted', 'full campaign reset must preserve sound settings')
assert.equal(session.getItem('creatorExamPrologueSeen'), null, 'full reset should replay the prologue')
for (const level of LEVELS) {
  assert.equal(session.getItem(`creatorExamChapterSeen:${level.id}:v1`), null, `full reset should replay ${level.id} chapter intro`)
}
assert.equal(session.getItem('unrelatedSessionKey'), 'keep', 'full reset must preserve unrelated session state')
assert.equal(removed.storage.length, CAMPAIGN_STORAGE_KEYS.length, 'reset should report every campaign storage key')

const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8')
const game = readFileSync(new URL('../public/js/game.js', import.meta.url), 'utf8')
for (const id of ['restart-btn', 'restart-confirm-btn', 'restart-all-btn', 'restart-cancel-btn']) {
  assert.ok(html.includes(`id="${id}"`), `global restart UI should expose #${id}`)
}
assert.ok(html.includes('重新开始本关') && html.includes('从第一关重新开始'), 'global restart dialog should distinguish both reset scopes')
assert.ok(game.includes('resetAllProgress(options = {})'), 'main game should expose a full campaign reset')
assert.ok(game.includes('clearCampaignProgress(localStorage, sessionStorage'), 'full reset should clear only declared active campaign keys')
assert.ok(game.includes("target.search = ''") && game.includes('window.location.replace(target.toString())'), 'full reset should remove debug chapter overrides before returning to level one')

console.log('Campaign reset tests passed: global actions, active progress cleanup, named save preservation')
