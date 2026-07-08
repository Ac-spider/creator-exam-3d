import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const files = [
  'public/index.html',
  'public/wiki.html',
  'public/js/levels.js',
  'public/js/advancedMechanicsPresenter.js',
  'public/js/aiClient.js',
  'public/js/game.js',
  'public/js/oathbinding.js',
  'public/js/ritualForge.js',
  'public/js/storyteller.js',
  'public/modes/tower-defense/index.html',
  'public/modes/tower-defense/towerBridge.js',
  'server.js',
  'server/aiFallbacks.js'
]

const bannedPhrases = [
  '前所未有',
  '震撼体验',
  '希望之光',
  '世界见证',
  '你是不一样的那个',
  '在这个充满',
  '你将体验',
  '演示工坊',
  '叙事演示',
  '传说演示',
  '世界连续性',
  '世界传说',
  '世界编年史',
  'AI Storyteller',
  '系统抽取',
  '规则系统不会接受',
  '强大效果',
  '强大力量',
  '体验最佳',
  '具有独立人格的AI角色',
  'Local fallback',
  'A local rule-safe creation'
]

for (const file of files) {
  const text = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')
  for (const phrase of bannedPhrases) {
    const offendingLine = text
      .split(/\r?\n/)
      .find(line => line.includes(phrase) && !/不要写|避免|禁止|不许/.test(line))
    assert.ok(!offendingLine, `${file} should not contain template/dev copy: ${phrase}`)
  }
}

console.log('Copy tone tests passed.')
