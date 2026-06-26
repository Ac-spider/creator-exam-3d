// Oathbinding System
// NPC oath and betrayal mechanics inspired by Cultist Simulator's cult management
// and Wildermyth's relationship dynamics
// Players forge oaths with NPCs that grant powerful bonuses but carry betrayal risks

import { SocialGraph } from './socialGraph.js';

// Oath types with different benefits and risks
export const OATH_TYPES = {
  protection: {
    name: '守护誓约',
    description: '以生命守护对方，获得护盾与预警能力',
    playerBenefit: { type: 'shield', value: 1, description: '被守护单位免疫一次伤害' },
    npcBenefit: { type: 'trust_boost', value: 20, description: 'NPC信任度大幅提升' },
    betrayalCost: { type: 'reputation', value: -30, description: '声誉严重受损' },
    betrayalRisk: 0.15, // Base betrayal chance
    duration: -1 // Permanent until broken
  },
  knowledge: {
    name: '知识誓约',
    description: '共享秘密知识，解锁隐藏信息与非法卡牌',
    playerBenefit: { type: 'secret_knowledge', value: 1, description: '解锁一个秘密知识碎片' },
    npcBenefit: { type: 'insight', value: 1, description: 'NPC获得洞察能力' },
    betrayalCost: { type: 'knowledge_loss', value: 1, description: '失去所有相关知识' },
    betrayalRisk: 0.25,
    duration: -1
  },
  vengeance: {
    name: '复仇誓约',
    description: '共同对抗敌人，伤害共享但仇恨连锁',
    playerBenefit: { type: 'damage_share', value: 0.5, description: '与NPC分摊50%伤害' },
    npcBenefit: { type: 'anger_boost', value: 15, description: 'NPC怒气提升，攻击增强' },
    betrayalCost: { type: 'grudge_chain', value: 1, description: '触发怨恨连锁' },
    betrayalRisk: 0.35,
    duration: 5 // Limited duration
  },
  sacrifice: {
    name: '牺牲誓约',
    description: '以一方牺牲换取另一方强大力量',
    playerBenefit: { type: 'power_surge', value: 2, description: '下回合造物效果翻倍' },
    npcBenefit: { type: 'immortal', value: 1, description: 'NPC本回合无敌' },
    betrayalCost: { type: 'death', value: 1, description: 'NPC立即死亡' },
    betrayalRisk: 0.45,
    duration: 1 // Single turn
  },
  kinship: {
    name: '血盟誓约',
    description: '最深刻的羁绊，能力共享但命运相连',
    playerBenefit: { type: 'ability_share', value: 1, description: '可使用NPC特殊能力' },
    npcBenefit: { type: 'resilience', value: 1, description: 'NPC获得韧性，不易死亡' },
    betrayalCost: { type: 'soul_wound', value: 1, description: '灵魂创伤，永久属性下降' },
    betrayalRisk: 0.1,
    duration: -1
  }
};

// Betrayal trigger conditions
export const BETRAYAL_TRIGGERS = {
  player_harm: { weight: 2.0, description: '玩家伤害NPC或其亲友' },
  oath_broken: { weight: 3.0, description: '玩家打破其他誓约' },
  faction_conflict: { weight: 1.5, description: '派系冲突' },
  entropy_high: { weight: 1.0, description: '高裂隙值环境' },
  rival_influence: { weight: 1.5, description: '敌对NPC影响' },
  knowledge_theft: { weight: 2.5, description: '窃取NPC知识' }
};

export class Oath {
  constructor(data) {
    this.id = data.id || `oath-${Date.now()}-${Math.random()}`;
    this.type = data.type || 'protection';
    this.npcId = data.npcId || null;
    this.npcName = data.npcName || '未知';
    this.playerId = data.playerId || 'player';
    this.createdAt = data.createdAt || Date.now();
    this.expiresAt = data.expiresAt || null;
    this.status = data.status || 'active'; // active, broken, fulfilled, betrayed
    this.betrayalRisk = data.betrayalRisk || 0;
    this.trustLevel = data.trustLevel || 50;
    this.benefits = data.benefits || [];
    this.history = data.history || [];
    this.betrayalTriggers = data.betrayalTriggers || [];
  }

  // Check if oath is expired
  isExpired() {
    if (this.expiresAt === null) return false;
    return Date.now() > this.expiresAt;
  }

  // Record an event in oath history
  recordEvent(eventType, details = {}) {
    this.history.push({
      type: eventType,
      details,
      timestamp: Date.now()
    });

    // Update trust based on event
    if (eventType === 'player_help') {
      this.trustLevel = Math.min(100, this.trustLevel + 5);
    } else if (eventType === 'player_harm') {
      this.trustLevel = Math.max(0, this.trustLevel - 15);
      this.betrayalTriggers.push('player_harm');
    } else if (eventType === 'oath_broken_by_player') {
      this.trustLevel = Math.max(0, this.trustLevel - 25);
      this.betrayalTriggers.push('oath_broken');
    }
  }

  // Calculate current betrayal probability
  calculateBetrayalChance(socialGraph = null) {
    const oathType = OATH_TYPES[this.type];
    let baseRisk = oathType.betrayalRisk;

    // Trust modifier: low trust increases betrayal
    const trustModifier = (50 - this.trustLevel) / 100;
    baseRisk += trustModifier * 0.3;

    // Trigger modifiers
    for (const trigger of this.betrayalTriggers) {
      const triggerData = BETRAYAL_TRIGGERS[trigger];
      if (triggerData) {
        baseRisk += triggerData.weight * 0.1;
      }
    }

    // Social graph modifier: check NPC's grudges and bonds
    if (socialGraph && this.npcId) {
      const node = socialGraph.nodes.get(this.npcId);
      if (node) {
        // Grudges increase betrayal
        if (node.grudges && node.grudges.length > 0) {
          baseRisk += node.grudges.length * 0.05;
        }
        // Fear increases betrayal
        if (node.fearLevel > 60) {
          baseRisk += (node.fearLevel - 60) / 100;
        }
        // Hope decreases betrayal
        if (node.hopeLevel > 60) {
          baseRisk -= (node.hopeLevel - 60) / 200;
        }
      }
    }

    return Math.max(0, Math.min(0.95, baseRisk));
  }

  // Break the oath (player-initiated)
  breakOath(breaker = 'player') {
    this.status = 'broken';
    this.recordEvent('broken', { breaker });

    const oathType = OATH_TYPES[this.type];
    const consequences = [];

    if (breaker === 'player') {
      consequences.push({
        type: 'reputation_loss',
        value: -20,
        description: '你主动打破了誓约，声誉受损'
      });
      consequences.push({
        type: 'npc_anger',
        value: 30,
        description: `${this.npcName} 对你感到愤怒`
      });
    } else {
      consequences.push({
        type: 'betrayal',
        value: 1,
        description: `${this.npcName} 背叛了誓约`
      });
    }

    return {
      oath: this,
      consequences,
      oathType
    };
  }

  // Fulfill the oath (natural completion)
  fulfill() {
    this.status = 'fulfilled';
    this.recordEvent('fulfilled');

    return {
      oath: this,
      rewards: [{
        type: 'reputation_gain',
        value: 15,
        description: '誓约圆满完成，声誉提升'
      }]
    };
  }

  // Trigger betrayal
  betray(socialGraph = null) {
    this.status = 'betrayed';
    this.recordEvent('betrayed');

    const oathType = OATH_TYPES[this.type];
    const consequences = [];

    // Apply betrayal cost
    const cost = oathType.betrayalCost;
    consequences.push({
      type: cost.type,
      value: cost.value,
      description: cost.description
    });

    // Additional consequences based on oath type
    if (this.type === 'vengeance') {
      consequences.push({
        type: 'grudge_chain',
        value: 1,
        description: '怨恨连锁触发，相关NPC态度恶化'
      });
    } else if (this.type === 'knowledge') {
      consequences.push({
        type: 'knowledge_spread',
        value: 1,
        description: '秘密知识被泄露给敌对势力'
      });
    } else if (this.type === 'kinship') {
      consequences.push({
        type: 'soul_wound',
        value: 1,
        description: '灵魂创伤，永久属性下降'
      });
    }

    // Update social graph if available
    if (socialGraph && this.npcId) {
      socialGraph.recordSocialEvent({
        type: 'betrayal',
        actor: this.npcId,
        target: this.playerId,
        impact: 'negative'
      });

      // Add grudge
      const node = socialGraph.nodes.get(this.npcId);
      if (node) {
        node.grudges.push({
          against: this.playerId,
          reason: 'oath_betrayal',
          intensity: 80,
          timestamp: Date.now()
        });
      }
    }

    return {
      oath: this,
      consequences,
      oathType
    };
  }

  serialize() {
    return {
      id: this.id,
      type: this.type,
      npcId: this.npcId,
      npcName: this.npcName,
      playerId: this.playerId,
      createdAt: this.createdAt,
      expiresAt: this.expiresAt,
      status: this.status,
      betrayalRisk: this.betrayalRisk,
      trustLevel: this.trustLevel,
      benefits: this.benefits,
      history: this.history,
      betrayalTriggers: this.betrayalTriggers
    };
  }

  static deserialize(data) {
    return new Oath(data);
  }
}

export class OathManager {
  constructor() {
    this.oaths = new Map(); // oathId -> Oath
    this.npcOaths = new Map(); // npcId -> Set of oathIds
    this.betrayalHistory = [];
    this.fulfilledOaths = [];
    this.reputation = 50; // 0-100, player reputation
    this.grudgeChains = []; // Active grudge chains
  }

  // Create a new oath with an NPC
  createOath(type, npcId, npcName, socialGraph = null) {
    const oathType = OATH_TYPES[type];
    if (!oathType) {
      return { success: false, error: '未知的誓约类型' };
    }

    // Check if already has active oath with this NPC
    const existing = this.getActiveOathsForNPC(npcId);
    if (existing.length > 0) {
      return { success: false, error: '与该NPC已有活跃誓约' };
    }

    // Calculate expiration
    let expiresAt = null;
    if (oathType.duration > 0) {
      expiresAt = Date.now() + oathType.duration * 60000; // minutes to ms
    }

    // Calculate initial betrayal risk based on NPC traits
    let initialRisk = oathType.betrayalRisk;
    if (socialGraph) {
      const node = socialGraph.nodes.get(npcId);
      if (node) {
        // Lower trust = higher risk
        initialRisk += (50 - (node.trustLevel || 50)) / 200;
        // Higher fear = higher risk
        initialRisk += ((node.fearLevel || 30) - 30) / 200;
      }
    }

    const oath = new Oath({
      type,
      npcId,
      npcName,
      expiresAt,
      betrayalRisk: initialRisk,
      trustLevel: socialGraph?.nodes.get(npcId)?.trustLevel || 50
    });

    this.oaths.set(oath.id, oath);

    if (!this.npcOaths.has(npcId)) {
      this.npcOaths.set(npcId, new Set());
    }
    this.npcOaths.get(npcId).add(oath.id);

    // Update social graph
    if (socialGraph) {
      socialGraph.recordSocialEvent({
        type: 'oath_formed',
        actor: 'player',
        target: npcId,
        impact: 'positive'
      });

      // Add bond
      const node = socialGraph.nodes.get(npcId);
      if (node) {
        node.bonds.push({
          with: 'player',
          reason: 'oath',
          intensity: 60,
          timestamp: Date.now()
        });
      }
    }

    return {
      success: true,
      oath,
      benefits: [oathType.playerBenefit, oathType.npcBenefit]
    };
  }

  // Get all active oaths for an NPC
  getActiveOathsForNPC(npcId) {
    const oathIds = this.npcOaths.get(npcId);
    if (!oathIds) return [];

    return Array.from(oathIds)
      .map(id => this.oaths.get(id))
      .filter(o => o && o.status === 'active' && !o.isExpired());
  }

  // Get all active oaths
  getAllActiveOaths() {
    return Array.from(this.oaths.values()).filter(o => o.status === 'active' && !o.isExpired());
  }

  // Check for betrayal triggers (call each turn or after significant events)
  checkBetrayals(socialGraph = null) {
    const results = [];

    for (const oath of this.getAllActiveOaths()) {
      const betrayalChance = oath.calculateBetrayalChance(socialGraph);

      if (Math.random() < betrayalChance) {
        const result = oath.betray(socialGraph);
        this.betrayalHistory.push({
          oathId: oath.id,
          npcId: oath.npcId,
          npcName: oath.npcName,
          type: oath.type,
          timestamp: Date.now()
        });

        // Apply reputation damage
        this.reputation = Math.max(0, this.reputation - 10);

        results.push(result);
      }
    }

    return results;
  }

  // Player breaks an oath
  playerBreakOath(oathId) {
    const oath = this.oaths.get(oathId);
    if (!oath) return { success: false, error: '誓约不存在' };
    if (oath.status !== 'active') return { success: false, error: '誓约已不活跃' };

    const result = oath.breakOath('player');

    // Apply reputation damage
    this.reputation = Math.max(0, this.reputation - 15);

    // Update other oaths (breaking one oath affects others)
    for (const otherOath of this.getAllActiveOaths()) {
      if (otherOath.id !== oathId) {
        otherOath.recordEvent('oath_broken_by_player');
      }
    }

    return { success: true, ...result };
  }

  // Fulfill an oath
  fulfillOath(oathId) {
    const oath = this.oaths.get(oathId);
    if (!oath) return { success: false, error: '誓约不存在' };

    const result = oath.fulfill();
    this.fulfilledOaths.push(oath);

    // Reputation boost
    this.reputation = Math.min(100, this.reputation + 10);

    return { success: true, ...result };
  }

  // Get oath benefits for current game state
  getActiveBenefits() {
    const benefits = [];
    for (const oath of this.getAllActiveOaths()) {
      const oathType = OATH_TYPES[oath.type];
      if (oathType) {
        benefits.push({
          oathId: oath.id,
          npcId: oath.npcId,
          npcName: oath.npcName,
          type: oathType.playerBenefit.type,
          value: oathType.playerBenefit.value,
          description: oathType.playerBenefit.description
        });
      }
    }
    return benefits;
  }

  // Apply betrayal consequences to game state
  applyBetrayalConsequences(consequences, gameState = {}) {
    const effects = [];

    for (const consequence of consequences) {
      switch (consequence.type) {
        case 'reputation':
          this.reputation = Math.max(0, Math.min(100, this.reputation + consequence.value));
          effects.push({ type: 'reputation', value: consequence.value });
          break;
        case 'knowledge_loss':
          if (gameState.knowledgeFragments) {
            const lost = gameState.knowledgeFragments.splice(0, 1);
            effects.push({ type: 'knowledge_loss', value: lost.length });
          }
          break;
        case 'grudge_chain':
          this.grudgeChains.push({
            startedAt: Date.now(),
            active: true
          });
          effects.push({ type: 'grudge_chain', value: 1 });
          break;
        case 'death':
          effects.push({ type: 'npc_death', value: 1 });
          break;
        case 'soul_wound':
          effects.push({ type: 'soul_wound', value: 1, permanent: true });
          break;
        default:
          effects.push({ type: consequence.type, value: consequence.value });
      }
    }

    return effects;
  }

  // Get grudge chain effects on NPCs
  getGrudgeChainEffects() {
    const activeChains = this.grudgeChains.filter(g => g.active);
    if (activeChains.length === 0) return [];

    return activeChains.map(chain => ({
      type: 'grudge_chain',
      description: '怨恨连锁中，相关NPC态度恶化',
      duration: 'permanent_until_resolved'
    }));
  }

  // Resolve a grudge chain (through player action)
  resolveGrudgeChain(index) {
    if (index >= 0 && index < this.grudgeChains.length) {
      this.grudgeChains[index].active = false;
      this.grudgeChains[index].resolvedAt = Date.now();
      return { success: true, message: '怨恨连锁已化解' };
    }
    return { success: false, error: '无效的连锁索引' };
  }

  // Get oath statistics
  getStats() {
    const allOaths = Array.from(this.oaths.values());
    const active = allOaths.filter(o => o.status === 'active').length;
    const broken = allOaths.filter(o => o.status === 'broken').length;
    const fulfilled = allOaths.filter(o => o.status === 'fulfilled').length;
    const betrayed = allOaths.filter(o => o.status === 'betrayed').length;

    return {
      total: allOaths.length,
      active,
      broken,
      fulfilled,
      betrayed,
      betrayalRate: allOaths.length > 0 ? betrayed / allOaths.length : 0,
      reputation: this.reputation,
      grudgeChains: this.grudgeChains.filter(g => g.active).length,
      activeBenefits: this.getActiveBenefits().length
    };
  }

  // Get available oath types for an NPC
  getAvailableOathTypes(npcId, socialGraph = null) {
    const activeOaths = this.getActiveOathsForNPC(npcId);
    if (activeOaths.length > 0) return []; // Already has oath

    const available = [];
    for (const [type, data] of Object.entries(OATH_TYPES)) {
      // Check prerequisites based on social graph
      let canForm = true;
      if (socialGraph) {
        const node = socialGraph.nodes.get(npcId);
        if (node) {
          // Trust requirement
          if (data.betrayalRisk < 0.2 && node.trustLevel < 60) canForm = false;
          // Fear restriction for vengeance
          if (type === 'vengeance' && node.fearLevel < 40) canForm = false;
        }
      }

      available.push({
        type,
        ...data,
        canForm
      });
    }

    return available;
  }

  // Generate CLI visualization
  visualizeOaths() {
    const lines = [];
    const stats = this.getStats();

    lines.push('=== 言灵誓约 ===');
    lines.push(`声誉: ${this.reputation}/100 | 活跃誓约: ${stats.active} | 背叛: ${stats.betrayed}`);
    lines.push('');

    const activeOaths = this.getAllActiveOaths();
    if (activeOaths.length > 0) {
      lines.push('--- 活跃誓约 ---');
      for (const oath of activeOaths) {
        const oathType = OATH_TYPES[oath.type];
        const risk = oath.calculateBetrayalChance();
        const riskSymbol = risk > 0.5 ? '☠' : risk > 0.3 ? '!' : risk > 0.15 ? '?' : '·';
        lines.push(`  ${riskSymbol} ${oathType.name} — ${oath.npcName} (信任:${oath.trustLevel} 背叛风险:${(risk * 100).toFixed(0)}%)`);
        lines.push(`     玩家收益: ${oathType.playerBenefit.description}`);
      }
      lines.push('');
    }

    if (this.betrayalHistory.length > 0) {
      lines.push('--- 背叛历史 ---');
      for (const betrayal of this.betrayalHistory.slice(-3)) {
        lines.push(`  ✖ ${betrayal.npcName} 背叛了${OATH_TYPES[betrayal.type]?.name || betrayal.type}`);
      }
      lines.push('');
    }

    if (this.grudgeChains.filter(g => g.active).length > 0) {
      lines.push('--- 怨恨连锁 ---');
      lines.push(`  活跃连锁: ${this.grudgeChains.filter(g => g.active).length} (需化解)`);
    }

    return lines.join('\n');
  }

  // Serialize
  serialize() {
    return {
      oaths: Array.from(this.oaths.entries()).map(([id, o]) => [id, o.serialize()]),
      npcOaths: Array.from(this.npcOaths.entries()).map(([id, set]) => [id, Array.from(set)]),
      betrayalHistory: this.betrayalHistory,
      fulfilledOaths: this.fulfilledOaths.map(o => o.serialize()),
      reputation: this.reputation,
      grudgeChains: this.grudgeChains
    };
  }

  deserialize(data) {
    if (!data) return;
    this.oaths = new Map(
      (data.oaths || []).map(([id, o]) => [id, Oath.deserialize(o)])
    );
    this.npcOaths = new Map(
      (data.npcOaths || []).map(([id, arr]) => [id, new Set(arr)])
    );
    this.betrayalHistory = data.betrayalHistory || [];
    this.fulfilledOaths = (data.fulfilledOaths || []).map(o => Oath.deserialize(o));
    this.reputation = data.reputation || 50;
    this.grudgeChains = data.grudgeChains || [];
  }
}

// Export singleton
export const oathManager = new OathManager();
