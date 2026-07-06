/**
 * 居民代理系统 (Resident Agent System)
 * 负责根据世界事件驱动居民产生行动
 */

export const RESIDENT_ACTION_TYPES = [
  'speak',
  'request_help',
  'move_region',
  'assist_unit',
  'spread_knowledge',
  'withdraw',
  'idle'
]

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0))
}

function makeAction(resident, type, event, context) {
  const turn = context?.turn ?? 0
  const regionId = context?.regionId || resident.currentRegionId || 'unknown'
  const textMap = {
    speak: `${resident.name}想要和玩家说话`,
    request_help: `${resident.name}请求帮助`,
    move_region: `${resident.name}打算离开当前区域`,
    assist_unit: `${resident.name}准备协助其他单位`,
    spread_knowledge: `${resident.name}想要传播所知`,
    withdraw: `${resident.name}选择撤退`,
    idle: `${resident.name}保持观望`
  }
  const text = textMap[type] || textMap.idle
  const reason = event
    ? `因事件 ${event.type} 触发 ${type}`
    : `默认行为 ${type}`
  return {
    id: `action-${resident.residentId}-${turn}-${Date.now()}`,
    type,
    residentId: resident.residentId,
    regionId,
    turn,
    payload: {
      residentName: resident.name,
      mood: resident.mood,
      currentGoal: resident.currentGoal,
      text
    },
    reason
  }
}

export class ResidentAgentSystem {
  constructor(options = {}) {
    if (!options.residentRegistry) {
      throw new Error('ResidentAgentSystem requires options.residentRegistry')
    }
    this.residentRegistry = options.residentRegistry
    this.recentEventsByResident = new Map()
  }

  observeEvent(event, options = {}) {
    const recordMemory = options.recordMemory !== false
    const payload = event?.payload || {}
    const residentIds = new Set()
    if (payload.residentId) residentIds.add(payload.residentId)
    if (Array.isArray(payload.residentIds)) {
      for (const id of payload.residentIds) residentIds.add(id)
    }

    for (const residentId of residentIds) {
      if (recordMemory) {
        this.residentRegistry.recordMemory(residentId, {
          type: event.type,
          text: eventText(event),
          regionId: event.regionId,
          importance: event.importance || 0.5
        })
      }

      const events = this.recentEventsByResident.get(residentId) || []
      events.push(event)
      if (events.length > 10) events.shift()
      this.recentEventsByResident.set(residentId, events)

      const resident = this.residentRegistry.getResident(residentId)
      if (resident) {
        this.updateResidentState(resident, event)
      }
    }
  }

  updateResidentState(resident, event) {
    if (!resident || !event) return
    switch (event.type) {
      case 'unit_rescued':
        resident.mood = '希望'
        resident.attitudeToPlayer = '友善'
        resident.currentGoal = '向玩家表达感谢并寻找安全区域'
        break
      case 'unit_lost':
        resident.mood = '悲伤'
        resident.currentGoal = '寻找失踪者留下的线索'
        break
      case 'region_lost':
        resident.mood = '恐惧'
        resident.currentGoal = '离开危险区域'
        break
    }
  }

  tickResident(residentId, context) {
    const resident = this.residentRegistry.getResident(residentId)
    if (!resident) return null
    const events = this.recentEventsByResident.get(residentId) || []
    const latestEvent = events.length > 0 ? events[events.length - 1] : null
    const type = this.chooseActionType(resident, latestEvent)
    return makeAction(resident, type, latestEvent, context)
  }

  tickRegion(regionId, context) {
    const residents = this.residentRegistry.getResidentsForRegion(regionId)
    const actions = []
    for (const resident of residents) {
      const action = this.tickResident(resident.residentId, context)
      if (action) actions.push(action)
    }
    return actions
  }

  chooseActionType(resident, event) {
    if (!event) return 'idle'
    switch (event.type) {
      case 'unit_rescued':
        return 'speak'
      case 'unit_lost':
        return 'request_help'
      case 'region_lost':
        return 'move_region'
      default:
        return 'idle'
    }
  }

  serialize() {
    const recentEventsByResident = []
    for (const [residentId, events] of this.recentEventsByResident.entries()) {
      recentEventsByResident.push({ residentId, events: [...events] })
    }
    return {
      version: 1,
      recentEventsByResident
    }
  }

  deserialize(data = {}) {
    this.recentEventsByResident.clear()
    for (const entry of data.recentEventsByResident || []) {
      if (entry.residentId && Array.isArray(entry.events)) {
        this.recentEventsByResident.set(entry.residentId, [...entry.events])
      }
    }
  }
}

function eventText(event) {
  const payload = event?.payload || {}
  if (event.type === 'unit_rescued') return `${payload.unitName || '某位居民'}在${event.regionId}被玩家救下`
  if (event.type === 'unit_lost') return `${payload.unitName || '某位居民'}在${event.regionId}失踪或遇难`
  if (event.type === 'creation_placed') return `玩家在${event.regionId}创造了「${payload.creationName || '未命名造物'}」`
  if (event.type === 'region_resolved') return `${event.regionId}的危机被解决`
  if (event.type === 'region_lost') return `${event.regionId}的危机留下了伤痕`
  return `${event.regionId}发生了${event.type}`
}
