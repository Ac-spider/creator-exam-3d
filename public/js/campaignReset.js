export const CAMPAIGN_STORAGE_KEYS = Object.freeze([
  'creator_exam_memory',
  'creator_exam_world_state',
  'creatorExamNightWatchContext',
  'creatorExamNightWatchResult',
  'creatorExamAirCombatContext',
  'creatorExamAirCombatResult',
  'creatorExamFinaleReturnState',
  'creatorExamTimelineEnding:v1'
])

function removeKeys(storage, keys) {
  const removed = []
  for (const key of keys) {
    try {
      storage?.removeItem?.(key)
      removed.push(key)
    } catch (_error) {}
  }
  return removed
}

export function clearCampaignProgress(storage, sessionStorage, levelIds = []) {
  const sessionKeys = [
    'creatorExamPrologueSeen',
    ...levelIds.map(levelId => `creatorExamChapterSeen:${levelId}:v1`)
  ]
  return {
    storage: removeKeys(storage, CAMPAIGN_STORAGE_KEYS),
    session: removeKeys(sessionStorage, sessionKeys)
  }
}
