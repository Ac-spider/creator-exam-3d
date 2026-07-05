export function getKnownRegionIdsFromProgress({
  levels = [],
  levelIndex = -1,
  currentRegionId = '',
  selectedExplorationPath = []
} = {}) {
  const ids = new Set()

  if (Number.isInteger(levelIndex) && levelIndex >= 0) {
    for (let i = 0; i <= levelIndex && i < levels.length; i++) {
      if (levels[i]?.id) ids.add(levels[i].id)
    }
  }

  if (currentRegionId) ids.add(currentRegionId)

  for (const entry of selectedExplorationPath || []) {
    if (entry?.sourceRegionId) ids.add(entry.sourceRegionId)
    if (entry?.targetRegionId) ids.add(entry.targetRegionId)
    if (entry?.regionId) ids.add(entry.regionId)
  }

  return [...ids]
}

export function buildKnownWorldFacts(worldSimulation, options = {}) {
  const knownRegionIds = toSet(options.knownRegionIds)
  const currentRegionId = options.currentRegionId || ''
  const limit = Number.isFinite(options.limit) ? options.limit : 8
  const canRevealRegion = (regionId) => {
    if (!knownRegionIds.size) return true
    if (!regionId) return true
    return knownRegionIds.has(regionId)
  }

  const events = (worldSimulation?.eventBus?.events || [])
    .filter(event => canRevealRegion(event.regionId))
    .slice(-limit)
    .map(event => ({
      type: event.type,
      regionId: event.regionId || currentRegionId,
      actorId: event.actorId || '',
      turn: event.turn || 0,
      payload: sanitizeFactPayload(event.payload)
    }))

  const futureHooks = (worldSimulation?.getFutureHooks?.(currentRegionId) || [])
    .filter(hook => canRevealRegion(hook.sourceRegionId || currentRegionId))
    .slice(0, limit)
    .map(hook => ({
      id: hook.id,
      sourceRegionId: hook.sourceRegionId || currentRegionId,
      type: hook.type,
      description: hook.description || hook.summary || ''
    }))

  return {
    knownRegionIds: [...knownRegionIds],
    recentEvents: events,
    futureHooks
  }
}

export function filterKnownNarrativeMemories(memorySystem, options = {}) {
  const knownRegionIds = toSet(options.knownRegionIds)
  const knownLevelTitles = toSet(options.knownLevelTitles)
  const currentLevelId = options.currentLevelId || ''
  const currentLevelTitle = options.currentLevelTitle || ''
  const limit = Number.isFinite(options.limit) ? options.limit : 6

  const canRevealLevel = (level) => {
    if (!level) return true
    return knownRegionIds.has(level) || knownLevelTitles.has(level) || level === currentLevelId || level === currentLevelTitle
  }

  return (memorySystem?.worldState?.narrativeMemory || [])
    .filter(memory => canRevealLevel(memory.level))
    .slice(-limit)
    .map(memory => ({
      type: memory.type,
      level: memory.level || currentLevelId,
      content: typeof memory.content === 'string' ? memory.content : JSON.stringify(memory.content)
    }))
}

function toSet(values) {
  if (values instanceof Set) return new Set([...values].filter(Boolean))
  return new Set((Array.isArray(values) ? values : []).filter(Boolean))
}

function sanitizeFactPayload(payload = {}) {
  if (!payload || typeof payload !== 'object') return {}
  const result = {}
  for (const key of ['result', 'unitName', 'creationName', 'ability', 'terrain', 'message']) {
    if (payload[key] !== undefined) result[key] = payload[key]
  }
  return result
}
