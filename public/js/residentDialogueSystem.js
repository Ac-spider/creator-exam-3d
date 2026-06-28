export const RESIDENT_DIALOGUE_INTENTS = [
  'speak',
  'request_help',
  'move_region',
  'assist_unit',
  'spread_knowledge',
  'withdraw',
  'idle'
]

function clamp01(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return 0.6
  return Math.max(0, Math.min(1, number))
}

function latestMemory(resident = {}) {
  const memories = Array.isArray(resident.memories) ? resident.memories : []
  return memories
    .slice()
    .sort((a, b) => Number(b.importance || 0) - Number(a.importance || 0))[0] || null
}

function safeText(value, length) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, length)
}

export class ResidentDialogueSystem {
  buildContext(input = {}) {
    const resident = input.resident || {}
    const memory = latestMemory(resident)
    return {
      residentId: resident.residentId || 'resident-unknown',
      residentName: safeText(resident.name || 'Resident', 40),
      mood: safeText(resident.mood || 'neutral', 40),
      attitudeToPlayer: safeText(resident.attitudeToPlayer || 'neutral', 40),
      currentGoal: safeText(resident.currentGoal || 'observe the region', 120),
      memoryText: safeText(memory?.text || 'no clear memory yet', 220),
      playerText: safeText(input.playerText || '', 240),
      regionId: safeText(input.regionId || resident.currentRegionId || 'unknown', 80)
    }
  }

  generateLocalDialogue(input = {}) {
    const context = this.buildContext(input)
    const playerQuestion = context.playerText ? `You asked: "${context.playerText}". ` : ''
    const text = `${context.residentName} remembers ${context.memoryText}. ${playerQuestion}They now want to ${context.currentGoal}.`
    return {
      text,
      intent: {
        type: context.memoryText.includes('lost') ? 'request_help' : 'speak',
        confidence: 0.65
      },
      source: 'local'
    }
  }

  sanitizeCandidate(candidate = {}, input = {}) {
    const local = this.generateLocalDialogue(input)
    const text = safeText(candidate.text || candidate.dialogue?.text || '', 360)
    const rawIntent = candidate.intent || candidate.dialogue?.intent || {}
    const type = RESIDENT_DIALOGUE_INTENTS.includes(rawIntent.type) ? rawIntent.type : 'speak'
    return {
      text: text || local.text,
      intent: {
        type,
        confidence: clamp01(rawIntent.confidence)
      },
      source: candidate.source || 'sanitized'
    }
  }
}
