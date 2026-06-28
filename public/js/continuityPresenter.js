export function buildContinuityViewModel(worldSimulation, options = {}) {
  const currentRegionId = options.currentRegionId || 'unknown';
  const residents = worldSimulation.residentRegistry.getResidentsForRegion(currentRegionId).map(resident => ({
    residentId: resident.residentId,
    name: resident.name,
    mood: resident.mood,
    currentGoal: resident.currentGoal,
    memoryCount: resident.memories.length,
    latestMemory: resident.memories[resident.memories.length - 1]?.text || '暂无关键记忆'
  }));

  const futureHooks = worldSimulation.getFutureHooks(currentRegionId).map(hook => ({
    id: hook.id,
    type: hook.type,
    priority: hook.priority || 0,
    summary: hook.summary || hook.type,
    residentId: hook.residentId || null,
    sourceRegionId: hook.sourceRegionId || currentRegionId
  })).sort((a, b) => b.priority - a.priority);

  const events = worldSimulation.eventBus.recent(20);
  return {
    currentRegionId,
    residents,
    futureHooks,
    eventSummary: {
      totalEvents: worldSimulation.eventBus.events.length,
      recent: events.map(event => ({
        id: event.id,
        type: event.type,
        regionId: event.regionId,
        turn: event.turn
      }))
    }
  };
}
