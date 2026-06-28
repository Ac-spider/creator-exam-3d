// 世界经济和管理决策系统
// 让玩家感受到管理一个开放世界的重量

export const PRESSURE_CATEGORIES = ['safety', 'resources', 'morale', 'reputation', 'threat']

const EVENT_PRESSURE_EFFECTS = {
  unit_lost: { safety: -5, morale: -3 },
  unit_rescued: { morale: +3, reputation: +2 },
  creation_placed: { resources: -1 },
  region_resolved: { safety: +3, reputation: +5, morale: +2 },
  region_lost: { safety: -8, morale: -5, reputation: -4 },
  resident_dialogue: { morale: +1 },
  resident_action: { morale: +1 },
  entropy_scar: { threat: +3, safety: -2 },
  missing_person: { safety: -3, morale: -2 },
  pressure_critical: { reputation: -2 }
}

export class WorldEconomySystem {
  constructor(options = {}) {
    this.eventBus = options.eventBus || null
    this.pressures = new Map()
    for (const category of PRESSURE_CATEGORIES) {
      this.pressures.set(category, { value: 50, trend: 0 })
    }
    this.decisions = []
    this.budget = {
      available: 0,
      spent: 0,
      incomePerTurn: 10
    }
  }

  getPressure(category) {
    const entry = this.pressures.get(category)
    return entry ? entry.value : 0
  }

  setPressure(category, value) {
    const clamped = Math.max(0, Math.min(100, value))
    const entry = this.pressures.get(category)
    if (entry) {
      entry.value = clamped
    } else {
      this.pressures.set(category, { value: clamped, trend: 0 })
    }
    return clamped
  }

  updatePressure(category, delta) {
    const current = this.getPressure(category)
    return this.setPressure(category, current + delta)
  }

  recordDecision(decision) {
    const record = {
      id: decision.id || `decision-${Date.now()}-${this.decisions.length}`,
      type: decision.type || 'generic',
      description: decision.description || '',
      costs: decision.costs || {},
      effects: decision.effects || {},
      turn: decision.turn || 0
    }
    this.decisions.push(record)

    // 应用决策效果到压力
    for (const [category, delta] of Object.entries(record.effects)) {
      if (PRESSURE_CATEGORIES.includes(category)) {
        this.updatePressure(category, delta)
      }
    }

    // 应用决策成本到预算
    if (record.costs.budget) {
      this.budget.spent += record.costs.budget
      this.budget.available = Math.max(0, this.budget.available - record.costs.budget)
    }

    return record
  }

  tick(turn, worldEvents = []) {
    // 根据世界事件自动调整压力
    for (const event of worldEvents) {
      const effects = EVENT_PRESSURE_EFFECTS[event.type]
      if (effects) {
        for (const [category, delta] of Object.entries(effects)) {
          this.updatePressure(category, delta)
        }
      }
    }

    // 根据趋势更新压力值
    for (const [category, entry] of this.pressures) {
      if (entry.trend !== 0) {
        this.setPressure(category, entry.value + entry.trend)
      }
    }

    // 增加预算
    this.budget.available += this.budget.incomePerTurn

    // 检查临界压力
    for (const [category, entry] of this.pressures) {
      if (entry.value >= 100) {
        if (this.eventBus) {
          this.eventBus.emit({
            type: 'pressure_critical',
            category,
            value: entry.value,
            turn,
            importance: 0.9,
            tags: ['pressure', 'critical']
          })
        }
      }
    }
  }

  getSummary() {
    const pressureSummary = {}
    for (const [category, entry] of this.pressures) {
      pressureSummary[category] = {
        value: entry.value,
        trend: entry.trend,
        status: this.getPressureStatus(entry.value)
      }
    }
    return {
      pressures: pressureSummary,
      budget: { ...this.budget },
      decisionCount: this.decisions.length,
      latestDecisions: this.decisions.slice(-5)
    }
  }

  getPressureStatus(value) {
    if (value >= 90) return 'critical'
    if (value >= 70) return 'high'
    if (value >= 40) return 'moderate'
    return 'low'
  }

  serialize() {
    return {
      version: 1,
      pressures: Array.from(this.pressures.entries()).map(([category, entry]) => ({
        category,
        value: entry.value,
        trend: entry.trend
      })),
      decisions: this.decisions,
      budget: { ...this.budget }
    }
  }

  deserialize(data = {}) {
    if (data.pressures) {
      this.pressures = new Map()
      for (const item of data.pressures) {
        this.pressures.set(item.category, {
          value: item.value ?? 50,
          trend: item.trend ?? 0
        })
      }
    }
    this.decisions = Array.isArray(data.decisions) ? data.decisions : []
    if (data.budget) {
      this.budget = {
        available: data.budget.available ?? 0,
        spent: data.budget.spent ?? 0,
        incomePerTurn: data.budget.incomePerTurn ?? 10
      }
    }
  }
}
