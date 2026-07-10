import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  AUTHORED_NPC_VISUAL_NAMES,
  npcVisualSignature,
  resolveNpcVisualProfile
} from '../public/js/npcVisualProfiles.js'

const AUTHORED_PEOPLE = [
  ['阿粟', 'villager'], ['小烛', 'villager'], ['木匠', 'villager'], ['邮差', 'villager'],
  ['矿工甲', 'miner'], ['矿工乙', 'miner'], ['矿工丙', 'miner'], ['矿工丁', 'miner'],
  ['东岸使者', 'tribeA'], ['西岸使者', 'tribeB'],
  ['南枝', 'villager'], ['北声', 'villager'], ['阿眠', 'villager'], ['谷雨', 'villager'], ['织火', 'villager'],
  ['星砂', 'villager'], ['青麦', 'villager'], ['砾歌', 'villager'],
  ['北境使者', 'tribeA'], ['南境使者', 'tribeB']
]

assert.deepEqual(
  new Set(AUTHORED_NPC_VISUAL_NAMES),
  new Set(AUTHORED_PEOPLE.map(([name]) => name)),
  'visual manifest should cover every authored human unit across the six levels'
)

const profiles = AUTHORED_PEOPLE.map(([name, type]) => resolveNpcVisualProfile({ name, type }))
assert.ok(profiles.every(profile => profile.authored), 'authored level NPCs should never fall back to anonymous visuals')
assert.equal(
  new Set(profiles.map(npcVisualSignature)).size,
  AUTHORED_PEOPLE.length,
  'every authored NPC should have a distinct silhouette/palette/accessory signature'
)

const firstLevelProfiles = AUTHORED_PEOPLE.slice(0, 4).map(([name, type]) => resolveNpcVisualProfile({ name, type }))
assert.equal(new Set(firstLevelProfiles.map(profile => profile.headwear)).size, 4, 'first-level NPCs should have four different head silhouettes')
assert.equal(new Set(firstLevelProfiles.map(profile => profile.accessory)).size, 4, 'first-level NPCs should carry four different identifying props')
assert.equal(new Set(firstLevelProfiles.map(profile => profile.bodyHeight)).size, 4, 'first-level NPCs should not share one body height')

const generatedA = resolveNpcVisualProfile({ residentId: 'future-resident-a', type: 'villager' })
const generatedARepeat = resolveNpcVisualProfile({ residentId: 'future-resident-a', type: 'villager' })
const generatedARenamed = resolveNpcVisualProfile({ residentId: 'future-resident-a', name: '后来改名的人', type: 'villager' })
const generatedB = resolveNpcVisualProfile({ residentId: 'future-resident-b', type: 'villager' })
assert.deepEqual(generatedA, generatedARepeat, 'a generated resident should keep a stable cross-level appearance')
assert.deepEqual(generatedA, generatedARenamed, 'residentId should preserve appearance even if a generated resident changes display name')
assert.notEqual(npcVisualSignature(generatedA), npcVisualSignature(generatedB), 'different generated residents should normally receive different visual signatures')
assert.ok(generatedA.bodyHeight >= 0.76 && generatedA.bodyHeight <= 1.16, 'generated height should remain board-readable')
assert.ok(generatedA.bodyWidth >= 0.82 && generatedA.bodyWidth <= 1.18, 'generated width should remain board-readable')

const gameSource = readFileSync(new URL('../public/js/game.js', import.meta.url), 'utf8')
for (const contract of [
  "import { resolveNpcVisualProfile } from './npcVisualProfiles.js'",
  "visualStyle: 'voxel-character-v2'",
  'addPersonHeadwear(group, profile)',
  'addPersonAccessory(group, profile)',
  "profile.accessory === 'forked-banner'",
  "profile.accessory === 'signal-lantern'"
]) {
  assert.ok(gameSource.includes(contract), `renderer should include NPC visual contract: ${contract}`)
}

console.log(`NPC visual profile tests passed (${profiles.length} authored identities).`)
