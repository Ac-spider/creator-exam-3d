export function buildJournalViewModel(worldSimulation, options = {}) {
  const eventBus = worldSimulation.eventBus
  const futureHooks = worldSimulation.getFutureHooks()
  const residentRegistry = worldSimulation.residentRegistry

  const recentTurnThreshold = options.recentTurnThreshold || 3
  const allEvents = eventBus.events || []
  const currentTurn = options.currentTurn || 0

  const discoveries = []
  const seenRegionIds = new Set()

  for (const event of allEvents) {
    if (event.type === 'resident_action' && event.payload?.type === 'idle') continue
    seenRegionIds.add(event.regionId)

    const isNew = currentTurn - (event.turn || 0) <= recentTurnThreshold
    discoveries.push({
      id: event.id || `discovery-${event.type}-${event.turn || 0}`,
      turn: event.turn || 0,
      regionId: event.regionId,
      type: event.type,
      summary: eventTextFromEvent(event),
      isNew
    })
  }

  const unresolvedTensions = []
  for (const hook of futureHooks) {
    unresolvedTensions.push({
      id: hook.id,
      type: hook.type,
      priority: hook.priority || 0.5,
      summary: hook.summary || '',
      sourceRegionId: hook.sourceRegionId || 'unknown'
    })
  }

  const rumors = []
  for (const resident of residentRegistry.residents?.values() || []) {
    for (const memory of resident.memories || []) {
      if (memory.type === 'resident_dialogue') continue
      const credibility = memory.importance || 0.5
      rumors.push({
        id: memory.id || `rumor-${resident.residentId}-${memory.timestamp || 0}`,
        residentName: resident.name,
        text: memory.text || '',
        turn: memory.turn || 0,
        regionId: memory.regionId || resident.currentRegionId || 'unknown',
        credibility
      })
    }
  }

  const stats = {
    totalDiscoveries: discoveries.length,
    totalRumors: rumors.length,
    totalTensions: unresolvedTensions.length,
    regionsVisited: seenRegionIds.size
  }

  return { discoveries, rumors, unresolvedTensions, stats }
}

function eventTextFromEvent(event) {
  const payload = event.payload || {}
  if (event.type === 'unit_rescued') return `${payload.unitName || '某位居民'}在${event.regionId}被玩家救下`
  if (event.type === 'unit_lost') return `${payload.unitName || '某位居民'}在${event.regionId}失踪或遇难`
  if (event.type === 'creation_placed') return `玩家在${event.regionId}创造了「${payload.creationName || '未命名造物'}」`
  if (event.type === 'region_resolved') return `${event.regionId}的危机被解决`
  if (event.type === 'region_lost') return `${event.regionId}的危机留下了伤痕`
  if (event.type === 'resident_dialogue') return `${payload.residentName || '居民'}在${event.regionId}与玩家对话`
  if (event.type === 'resident_action') return `${payload.residentName || '居民'}在${event.regionId}${payload.type || '行动'}`
  return `${event.regionId}发生了${event.type}`
}
