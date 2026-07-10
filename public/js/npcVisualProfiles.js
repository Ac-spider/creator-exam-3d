const CIVILIAN_PALETTES = Object.freeze([
  { cloth: 0x547f76, trim: 0xd6b66b, pack: 0x41534f, accent: 0xe9d99b },
  { cloth: 0x6c6f9f, trim: 0xd89b73, pack: 0x414765, accent: 0xe8c6a2 },
  { cloth: 0x8b6754, trim: 0x72b29b, pack: 0x4f3b32, accent: 0xd9bc76 },
  { cloth: 0x4f7895, trim: 0xc77b63, pack: 0x344b5c, accent: 0xe1c47a },
  { cloth: 0x71804d, trim: 0xc79a65, pack: 0x465039, accent: 0xe0d28d },
  { cloth: 0x745f83, trim: 0x86b9a3, pack: 0x44394d, accent: 0xd9c0e4 }
])

const MINER_PALETTES = Object.freeze([
  { cloth: 0xb17b3f, trim: 0xf0d28a, pack: 0x513b2b, accent: 0xffe29a },
  { cloth: 0x8b5542, trim: 0xd7a85e, pack: 0x48342d, accent: 0xe8c67a },
  { cloth: 0x5c7180, trim: 0xd6c284, pack: 0x35444c, accent: 0xe8dcaa },
  { cloth: 0x4e7a70, trim: 0xc69259, pack: 0x324b46, accent: 0xd7c17f }
])

const AUTHORED_NPC_VISUALS = Object.freeze({
  '阿粟': { role: '采集者', bodyHeight: 0.94, bodyWidth: 0.94, cloth: 0x667b4f, trim: 0xd2aa61, pack: 0x4a5539, accent: 0xe2d28c, headwear: 'brim', accessory: 'basket', featureSide: -1 },
  '小烛': { role: '提灯孩子', bodyHeight: 0.78, bodyWidth: 0.84, cloth: 0xb56f45, trim: 0xf0cf72, pack: 0x6b4935, accent: 0xffdd78, headwear: 'bun', accessory: 'lantern', featureSide: 1 },
  '木匠': { role: '木匠', bodyHeight: 1.08, bodyWidth: 1.16, cloth: 0x805b43, trim: 0xc98a4e, pack: 0x4e392e, accent: 0xe0b06b, headwear: 'headband', accessory: 'hammer', featureSide: 1 },
  '邮差': { role: '邮差', bodyHeight: 1.10, bodyWidth: 0.88, cloth: 0x4d7192, trim: 0xbf694f, pack: 0x6b4935, accent: 0xe1c071, headwear: 'cap', accessory: 'satchel', featureSide: -1 },

  '矿工甲': { role: '领灯矿工', bodyHeight: 1.02, bodyWidth: 1.00, cloth: 0xb17b3f, trim: 0xf0d28a, pack: 0x513b2b, accent: 0xffe29a, headwear: 'helmet', accessory: 'lamp', featureSide: 1 },
  '矿工乙': { role: '掘进矿工', bodyHeight: 0.92, bodyWidth: 1.14, cloth: 0x8b5542, trim: 0xd7a85e, pack: 0x48342d, accent: 0xe8c67a, headwear: 'visor', accessory: 'pickaxe', featureSide: 1 },
  '矿工丙': { role: '测线矿工', bodyHeight: 1.13, bodyWidth: 0.88, cloth: 0x5c7180, trim: 0xd6c284, pack: 0x35444c, accent: 0xe8dcaa, headwear: 'hood', accessory: 'survey-staff', featureSide: -1 },
  '矿工丁': { role: '背矿工', bodyHeight: 0.86, bodyWidth: 1.08, cloth: 0x4e7a70, trim: 0xc69259, pack: 0x324b46, accent: 0xd7c17f, headwear: 'cap', accessory: 'ore-pack', featureSide: -1 },

  '东岸使者': { role: '东岸旗使', bodyHeight: 1.12, bodyWidth: 0.90, cloth: 0xa45d4b, trim: 0xe0b05d, pack: 0x5a392f, accent: 0xf0c96d, headwear: 'crest', accessory: 'forked-banner', featureSide: 1 },
  '西岸使者': { role: '西岸密使', bodyHeight: 0.93, bodyWidth: 1.08, cloth: 0x536f9d, trim: 0xa9c4e3, pack: 0x37445e, accent: 0xc9d9ed, headwear: 'hood', accessory: 'sealed-scroll', featureSide: -1 },
  '北境使者': { role: '北境信使', bodyHeight: 1.14, bodyWidth: 0.88, cloth: 0x607d91, trim: 0xd5c98d, pack: 0x3b4c55, accent: 0xe7dca5, headwear: 'brim', accessory: 'signal-lantern', featureSide: 1 },
  '南境使者': { role: '南境旗使', bodyHeight: 0.96, bodyWidth: 1.12, cloth: 0x9b6147, trim: 0xd89b65, pack: 0x593b30, accent: 0xe5b477, headwear: 'helmet', accessory: 'broad-banner', featureSide: -1 },

  '南枝': { role: '寻路者', bodyHeight: 1.08, bodyWidth: 0.91, cloth: 0x55775c, trim: 0x9dbb78, pack: 0x384d3f, accent: 0xbfd48e, headwear: 'braid', accessory: 'branch-staff', featureSide: 1 },
  '北声': { role: '听风者', bodyHeight: 1.02, bodyWidth: 1.02, cloth: 0x546b83, trim: 0xa7c3cc, pack: 0x394755, accent: 0xc7dae0, headwear: 'hood', accessory: 'tuning-fork', featureSide: -1 },
  '阿眠': { role: '梦游者', bodyHeight: 0.84, bodyWidth: 0.88, cloth: 0x75658c, trim: 0xc1acd7, pack: 0x483e57, accent: 0xdac9e8, headwear: 'soft-cap', accessory: 'dream-charm', featureSide: 1 },
  '谷雨': { role: '照料者', bodyHeight: 1.00, bodyWidth: 1.06, cloth: 0x627b67, trim: 0xbca66b, pack: 0x405044, accent: 0xd9c786, headwear: 'brim', accessory: 'canteen', featureSide: -1 },
  '织火': { role: '织火者', bodyHeight: 1.06, bodyWidth: 0.94, cloth: 0x874f4e, trim: 0xd28b62, pack: 0x513637, accent: 0xf2ad6f, headwear: 'headband', accessory: 'ember-spool', featureSide: 1 },

  '星砂': { role: '星图记录者', bodyHeight: 1.09, bodyWidth: 0.90, cloth: 0x536b88, trim: 0xb1c6d5, pack: 0x39495b, accent: 0xcfe4ed, headwear: 'crownlet', accessory: 'star-map', featureSide: -1 },
  '青麦': { role: '守粮者', bodyHeight: 0.95, bodyWidth: 1.08, cloth: 0x68784b, trim: 0xc9ae69, pack: 0x465038, accent: 0xdfca7f, headwear: 'brim', accessory: 'grain-basket', featureSide: 1 },
  '砾歌': { role: '听石者', bodyHeight: 1.04, bodyWidth: 1.12, cloth: 0x6c6762, trim: 0xa6a08b, pack: 0x474440, accent: 0xc8bd92, headwear: 'crest', accessory: 'stone-chime', featureSide: -1 }
})

const FALLBACK_HEADWEAR = Object.freeze(['cap', 'hood', 'headband', 'brim', 'bun', 'braid'])
const FALLBACK_ACCESSORIES = Object.freeze(['satchel', 'lantern', 'basket', 'staff', 'scroll', 'canteen'])

function stableHash(value) {
  let hash = 2166136261
  for (const character of String(value || 'resident')) {
    hash ^= character.codePointAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

export function resolveNpcVisualProfile(unit = {}) {
  const authored = AUTHORED_NPC_VISUALS[unit.name]
  const identity = String(authored ? unit.name : unit.residentId || unit.id || unit.name || unit.type || 'resident')
  const hash = stableHash(identity)
  const isMiner = unit.type === 'miner'
  const palettes = isMiner ? MINER_PALETTES : CIVILIAN_PALETTES
  const palette = palettes[hash % palettes.length]
  const fallback = {
    role: isMiner ? '矿井居民' : '流动居民',
    bodyHeight: 0.88 + ((hash >>> 4) % 25) / 100,
    bodyWidth: 0.88 + ((hash >>> 9) % 25) / 100,
    ...palette,
    headwear: isMiner ? 'helmet' : FALLBACK_HEADWEAR[(hash >>> 14) % FALLBACK_HEADWEAR.length],
    accessory: isMiner ? 'pickaxe' : FALLBACK_ACCESSORIES[(hash >>> 19) % FALLBACK_ACCESSORIES.length],
    featureSide: hash % 2 === 0 ? -1 : 1
  }
  const source = { ...fallback, ...(authored || {}) }
  return {
    id: authored ? `authored:${identity}` : `generated:${hash.toString(16)}`,
    role: source.role,
    bodyHeight: clamp(source.bodyHeight, 0.76, 1.16),
    bodyWidth: clamp(source.bodyWidth, 0.82, 1.18),
    cloth: source.cloth,
    trim: source.trim,
    pack: source.pack,
    accent: source.accent,
    skin: source.skin || 0xd9ad87,
    headwear: source.headwear,
    accessory: source.accessory,
    featureSide: source.featureSide < 0 ? -1 : 1,
    authored: Boolean(authored)
  }
}

export function npcVisualSignature(profile) {
  return [
    profile.bodyHeight.toFixed(2),
    profile.bodyWidth.toFixed(2),
    profile.cloth.toString(16),
    profile.headwear,
    profile.accessory,
    profile.featureSide
  ].join(':')
}

export const AUTHORED_NPC_VISUAL_NAMES = Object.freeze(Object.keys(AUTHORED_NPC_VISUALS))
