export class GameplayAdapter {
  toWorldEvent(gameEvent = {}) {
    const unit = gameEvent.unit || gameEvent.payload?.unit || {}
    return {
      type: gameEvent.type || 'unknown_game_event',
      regionId: gameEvent.regionId || gameEvent.levelId || 'unknown',
      actorId: gameEvent.actorId || 'player',
      turn: Number.isFinite(Number(gameEvent.turn)) ? Number(gameEvent.turn) : 0,
      payload: {
        ...gameEvent.payload,
        residentId: gameEvent.payload?.residentId || unit.residentId || null,
        unitName: gameEvent.payload?.unitName || unit.name || null
      },
      importance: Number.isFinite(Number(gameEvent.importance)) ? Number(gameEvent.importance) : 0.6,
      tags: Array.isArray(gameEvent.tags) ? gameEvent.tags : ['gameplay']
    }
  }

  toRegionLevel(region = {}) {
    return {
      id: region.id,
      title: region.title,
      map: region.map,
      units: region.units || [],
      hazard: region.hazard || null,
      win: region.win || 'requiredRescue',
      requiredRescue: region.requiredRescue || 1,
      maxTurns: region.maxTurns || 8,
      creationCharges: region.creationCharges || 3,
      miraclePoints: region.miraclePoints || 6,
      entropyLimit: region.entropyLimit || 7
    }
  }
}
