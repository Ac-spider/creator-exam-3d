const MATERIAL_LABELS = {
  wood: '灵木',
  stone: '岩心',
  water: '源水',
  light: '光尘',
  shadow: '影纹',
  time: '时砂',
  memory: '忆晶',
  chaos: '混沌碎片'
}

const ECHO_LABELS = {
  benevolent: '善意回响',
  malicious: '恶意回响',
  paradoxical: '悖论回响',
  prophetic: '预言回响'
}

const OATH_LABELS = {
  protection: '守护誓约',
  knowledge: '知识誓约',
  vengeance: '复仇誓约',
  sacrifice: '牺牲誓约',
  kinship: '血盟誓约'
}

function materialSummary(materials = {}) {
  const entries = Object.entries(materials)
  if (!entries.length) return '暂无材料'
  return entries
    .map(([type, item]) => `${item.name || MATERIAL_LABELS[type] || type} x${item.count || 0}`)
    .join('、')
}

function cardName(item) {
  return item?.card?.name || item?.name || item?.baseCard?.name || '未命名造物'
}

function echoName(echo) {
  const type = ECHO_LABELS[echo.echoType] || echo.echoType || '未知回响'
  const original = echo.originalCreation?.name || echo.originalCreation?.card?.name || '旧造物'
  return `${type}：${original}`
}

export function buildAdvancedMechanicsViewModel(state = {}) {
  const workshop = state.workshop || {}
  const ritual = state.ritual || {}
  const oath = state.oath || {}
  const rift = state.rift || {}
  const abyss = state.abyss || {}
  const story = state.story || {}
  const resident = state.resident || {}

  const inventory = workshop.inventory || []
  const workshopCreations = workshop.workshopCreations || []
  const ritualSuggestions = ritual.suggestions || []
  const selectedNpc = oath.selectedNpc || null
  const availableOaths = oath.available || []
  const activeOaths = oath.activeOaths || []
  const activeEchoes = rift.activeEchoes || []
  const entropyRatio = Number(rift.entropyRatio || 0)
  const abyssState = abyss.state || { level: 'dormant', description: '深渊沉睡' }
  const storySummary = story.summary || {}
  const residentActions = resident.actions || []

  const systems = [
    {
      id: 'workshop',
      title: '造物者工坊',
      status: `库存 ${inventory.length} · 材料 ${materialSummary(workshop.materials)}`,
      tone: inventory.length || workshopCreations.length ? 'ready' : 'idle'
    },
    {
      id: 'ritual',
      title: '仪式熔炉',
      status: ritualSuggestions.length
        ? `可执行 ${ritualSuggestions[0].recipe?.name || '未知仪式'}`
        : `需要 2-3 个场上造物（当前 ${ritual.placedCreationCount || 0}）`,
      tone: ritualSuggestions.length ? 'ready' : 'idle'
    },
    {
      id: 'oath',
      title: '言灵誓约',
      status: selectedNpc
        ? `${selectedNpc.name} · 可立誓 ${availableOaths.filter(o => o.canForm !== false).length} · 活跃 ${activeOaths.length}`
        : `先点击一名 NPC · 活跃 ${activeOaths.length}`,
      tone: selectedNpc && availableOaths.length ? 'ready' : activeOaths.length ? 'active' : 'idle'
    },
    {
      id: 'rift',
      title: '裂隙回响',
      status: `裂隙 ${Math.round(entropyRatio * 100)}% · 活跃 ${activeEchoes.length}`,
      tone: entropyRatio >= 0.6 ? 'danger' : activeEchoes.length ? 'active' : 'idle'
    },
    {
      id: 'abyss',
      title: '认知深渊',
      status: `${abyssState.level || 'dormant'} · ${abyss.currentRiddle ? '有待解谜题' : '无待解谜题'}`,
      tone: abyssState.level === 'deep' || abyssState.level === 'apocalyptic' ? 'danger' : abyssState.level === 'approaching' ? 'active' : 'idle'
    },
    {
      id: 'story',
      title: '剧情节拍',
      status: `活跃弧线 ${storySummary.activeArcs || 0} · 已触发 ${storySummary.totalBeats || 0}`,
      tone: storySummary.activeArcs ? 'active' : 'idle'
    },
    {
      id: 'resident-agent',
      title: '居民代理',
      status: residentActions.length
        ? `最近行动 ${residentActions.length} · ${residentActions[residentActions.length - 1]?.type || '观察'}`
        : '等待世界事件',
      tone: residentActions.some(action => action.type !== 'idle') ? 'active' : 'idle'
    }
  ]

  const actions = [
    {
      id: 'dismantle-workshop',
      label: '拆解库存',
      enabled: inventory.length > 0,
      hint: inventory.length ? `拆解 ${cardName(inventory[0])}` : '需要库存造物'
    },
    {
      id: 'modify-workshop',
      label: '改造造物',
      enabled: inventory.length > 0 && Object.keys(workshop.materials || {}).length > 0,
      hint: '消耗材料强化最近造物'
    },
    {
      id: 'fuse-workshop',
      label: '融合造物',
      enabled: inventory.length >= 2 && Object.keys(workshop.materials || {}).length > 0,
      hint: '消耗两个库存造物生成新卡'
    },
    {
      id: 'perform-ritual',
      label: '执行仪式',
      enabled: ritualSuggestions.length > 0,
      hint: ritualSuggestions[0]?.recipe?.name || '需要匹配仪式'
    },
    {
      id: 'form-oath',
      label: '立下誓约',
      enabled: !!selectedNpc && availableOaths.some(o => o.canForm !== false),
      hint: selectedNpc ? `${selectedNpc.name} · ${OATH_LABELS[availableOaths.find(o => o.canForm !== false)?.type] || '誓约'}` : '先点击 NPC',
      oathType: availableOaths.find(o => o.canForm !== false)?.type || 'protection'
    },
    {
      id: 'manifest-echo',
      label: '召出回响',
      enabled: entropyRatio >= 0.6 && (workshop.lastCreation || inventory.length > 0),
      hint: entropyRatio >= 0.6 ? '从旧造物记忆中显现' : '裂隙至少需要 60%'
    },
    {
      id: 'generate-riddle',
      label: '生成谜题',
      enabled: !!abyssState.riddlesAvailable,
      hint: abyss.currentRiddle ? '已有谜题，可重新扰动' : '认知深渊会给出一段待解码文本'
    },
    {
      id: 'submit-riddle',
      label: '提交解码',
      enabled: !!abyss.currentRiddle,
      hint: abyss.currentRiddle ? `尝试 ${abyss.currentRiddle.attempts || 0}/3` : '暂无谜题'
    },
    {
      id: 'advance-story',
      label: '推进剧情',
      enabled: (story.availableBeats || 0) > 0,
      hint: (story.availableBeats || 0) > 0 ? '触发一个剧情节拍' : '等待节奏窗口'
    }
  ]

  const detail = [
    inventory.length ? `工坊库存：${inventory.slice(0, 3).map(cardName).join('、')}` : '工坊库存为空。造物放置后会自动进入库存。',
    ritualSuggestions.length ? `推荐仪式：${ritualSuggestions[0].recipe?.name || '未知仪式'}，风险 ${ritualSuggestions[0].risk || 'low'}` : '场上有 2 个以上造物时可尝试仪式。',
    activeEchoes.length ? `回响：${activeEchoes.slice(0, 2).map(echoName).join('；')}` : '裂隙升高后可以召出旧造物回响。',
    residentActions.length ? `居民代理：${residentActions.slice(-2).map(action => action.payload?.text || action.type).join('；')}` : '居民代理会根据救援、失败和造物记忆调整行动。',
    abyss.currentRiddle ? `谜题：${abyss.currentRiddle.displayed}` : (abyssState.description || '深渊尚未干涉现实。')
  ].join('\n')

  return {
    systems,
    actions,
    detail,
    logs: (state.logs || []).slice(0, 8)
  }
}

export { MATERIAL_LABELS, ECHO_LABELS, OATH_LABELS }
