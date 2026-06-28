import { RuleValidator } from './ruleValidator.js'

function fallbackRegion(sourceRegionId, hooks = []) {
  const residentHook = hooks.find(hook => hook.residentId)
  return {
    id: `fallback-${sourceRegionId || 'unknown'}-${Date.now()}`,
    title: '临时避难所',
    map: ['.......', '..W....', '..W....', '.......', '...M...', '.......', '.......'],
    units: [{
      type: 'villager',
      name: residentHook?.residentId === 'resident-xiaozhu' ? '小烛' : '幸存者',
      x: 0,
      y: 0,
      goal: { x: 6, y: 6 },
      residentId: residentHook?.residentId || null
    }],
    hazard: { type: 'flood', spreadPerTurn: 1 },
    win: 'requiredRescue',
    requiredRescue: 1,
    residentIds: residentHook?.residentId ? [residentHook.residentId] : [],
    connections: { from: sourceRegionId, reason: hooks.map(hook => hook.type).join(',') || 'fallback' },
    generation: { source: 'fallback' }
  }
}

export class RegionManager {
  constructor(options = {}) {
    this.validator = options.validator || new RuleValidator()
    this.candidateProvider = options.candidateProvider || (async input => fallbackRegion(input.sourceRegionId, input.hooks))
    this.regions = new Map()
  }

  async generateNextRegion(input = {}) {
    const hooks = Array.isArray(input.hooks) ? input.hooks : []
    let candidate = null
    try {
      candidate = await this.candidateProvider({
        sourceRegionId: input.sourceRegionId || 'unknown',
        hooks,
        worldSummary: input.worldSummary || {}
      })
    } catch (_error) {
      candidate = null
    }

    const validation = this.validator.validateRegion(candidate)
    const region = validation.ok ? {
      ...candidate,
      generation: { source: candidate.generation?.source || 'candidate', validation }
    } : fallbackRegion(input.sourceRegionId, hooks)

    this.regions.set(region.id, region)
    return region
  }

  getRegion(regionId) {
    return this.regions.get(regionId) || null
  }

  serialize() {
    return { version: 1, regions: Array.from(this.regions.entries()) }
  }

  deserialize(data = {}) {
    this.regions = new Map(Array.isArray(data.regions) ? data.regions : [])
  }
}
