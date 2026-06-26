// Social Graph System
// Dwarf Fortress-style NPC relationship network with mood contagion
// Inspired by "AI Design Lessons for Social Modeling at Scale" (AAAI 2021)

export const RELATIONSHIP_TYPES = {
  family: { weight: 3.0, label: '家人', contagious: true },
  friend: { weight: 2.0, label: '朋友', contagious: true },
  rival: { weight: -1.5, label: ' rival', contagious: true },
  mentor: { weight: 2.5, label: '导师', contagious: false },
  debtor: { weight: 1.0, label: ' debtor', contagious: false },
  witness: { weight: 0.5, label: '见证者', contagious: true },
  stranger: { weight: 0, label: '陌生人', contagious: false }
};

export class KnowledgeFragment {
  constructor(data) {
    this.id = data.id || `kf-${Date.now()}-${Math.random()}`;
    this.text = data.text || '';
    this.truth = data.truth !== undefined ? data.truth : 1.0; // 0-1, 1 = 完全真实
    this.source = data.source || 'unknown'; // 原始来源NPC
    this.category = data.category || 'rumor'; // rumor, secret, lore, prophecy
    this.spreadCount = 0; // 传播次数
    this.knownBy = new Set(); // 知道此知识的NPC
    this.verifiedBy = new Set(); // 验证过此知识的NPC
    this.mutations = []; // 传播过程中的变异记录
    this.createdAt = Date.now();
    this.lastSpread = Date.now();
  }

  // 传播时可能发生变异
  mutate(spreaderId) {
    const mutated = new KnowledgeFragment({
      id: this.id, // 保持同一ID以追踪
      text: this.text,
      truth: this.truth,
      source: this.source,
      category: this.category
    });

    // 每次传播真实性衰减
    const decayRate = this.category === 'prophecy' ? 0.05 : 0.15;
    mutated.truth = Math.max(0, this.truth - decayRate * (1 + Math.random() * 0.5));

    // 谣言可能产生文本变异
    if (this.category === 'rumor' && Math.random() < 0.3) {
      mutated.text = this.mutateText(this.text);
      mutated.mutations.push({
        type: 'text_distortion',
        by: spreaderId,
        from: this.text,
        to: mutated.text,
        timestamp: Date.now()
      });
    }

    // 来源模糊化
    if (mutated.spreadCount > 2 && Math.random() < 0.4) {
      mutated.source = 'unknown';
      mutated.mutations.push({
        type: 'source_lost',
        by: spreaderId,
        timestamp: Date.now()
      });
    }

    mutated.spreadCount = this.spreadCount + 1;
    mutated.knownBy = new Set(this.knownBy);
    mutated.knownBy.add(spreaderId);
    mutated.verifiedBy = new Set(this.verifiedBy);
    mutated.mutations = [...this.mutations, ...mutated.mutations];

    return mutated;
  }

  mutateText(text) {
    // 简单的中文文本变异：替换同义词或添加夸张
    const exaggerations = {
      '很多': '无数',
      '一些': '大量',
      '可能': '一定',
      '也许': '必然',
      '听说': '亲眼所见',
      '有人': '所有人',
      '危险': '灭顶之灾',
      '奇怪': '诡异至极',
      '害怕': '恐惧万分',
      '帮助': '拯救'
    };

    let mutated = text;
    for (const [from, to] of Object.entries(exaggerations)) {
      if (mutated.includes(from) && Math.random() < 0.5) {
        mutated = mutated.replace(from, to);
      }
    }

    // 添加情感渲染
    if (Math.random() < 0.3) {
      const embellishments = [
        '...据说如此。',
        '——这是不可否认的事实。',
        '（所有人都知道）',
        '...多么可怕！',
        '（有人在暗中观察）'
      ];
      mutated += embellishments[Math.floor(Math.random() * embellishments.length)];
    }

    return mutated;
  }

  getReliability() {
    const verificationBoost = this.verifiedBy.size * 0.15;
    const spreadPenalty = this.spreadCount * 0.05;
    return Math.min(1, Math.max(0, this.truth + verificationBoost - spreadPenalty));
  }

  serialize() {
    return {
      id: this.id,
      text: this.text,
      truth: this.truth,
      source: this.source,
      category: this.category,
      spreadCount: this.spreadCount,
      knownBy: Array.from(this.knownBy),
      verifiedBy: Array.from(this.verifiedBy),
      mutations: this.mutations,
      createdAt: this.createdAt,
      lastSpread: this.lastSpread
    };
  }

  static deserialize(data) {
    const kf = new KnowledgeFragment(data);
    kf.knownBy = new Set(data.knownBy || []);
    kf.verifiedBy = new Set(data.verifiedBy || []);
    return kf;
  }
}

export class Conspiracy {
  constructor(data) {
    this.id = data.id || `con-${Date.now()}-${Math.random()}`;
    this.name = data.name || '未命名阴谋';
    this.members = new Set(data.members || []); // NPC IDs
    this.secret = data.secret || null; // 关联的KnowledgeFragment
    this.goal = data.goal || 'unknown'; // 阴谋目标
    this.progress = 0; // 0-100
    this.discovered = false;
    this.discoveredBy = null;
    this.stages = data.stages || ['密谋', '行动', '高潮', '结局'];
    this.currentStage = 0;
    this.events = []; // 阴谋事件历史
    this.createdAt = Date.now();
  }

  addMember(npcId) {
    this.members.add(npcId);
  }

  advanceStage() {
    if (this.currentStage < this.stages.length - 1) {
      this.currentStage++;
      this.events.push({
        type: 'stage_advance',
        from: this.stages[this.currentStage - 1],
        to: this.stages[this.currentStage],
        timestamp: Date.now()
      });
      return true;
    }
    return false;
  }

  discover(discovererId) {
    this.discovered = true;
    this.discoveredBy = discovererId;
    this.events.push({
      type: 'discovered',
      by: discovererId,
      timestamp: Date.now()
    });
  }

  getDescription() {
    const stage = this.stages[this.currentStage];
    const memberCount = this.members.size;
    return `${this.name}（${stage}阶段）：${memberCount}人参与，进度${this.progress}%`;
  }

  serialize() {
    return {
      id: this.id,
      name: this.name,
      members: Array.from(this.members),
      secret: this.secret?.id || null,
      goal: this.goal,
      progress: this.progress,
      discovered: this.discovered,
      discoveredBy: this.discoveredBy,
      stages: this.stages,
      currentStage: this.currentStage,
      events: this.events,
      createdAt: this.createdAt
    };
  }

  static deserialize(data) {
    return new Conspiracy(data);
  }
}

export class SocialGraph {
  constructor() {
    this.nodes = new Map(); // npcId -> node
    this.edges = new Map(); // "A|B" -> edge
    this.factions = new Map(); // factionId -> { members, reputation }
    this.contagionRadius = 2; // Relationship hops for mood contagion
    this.contagionThreshold = 15; // Minimum emotion intensity to spread
    this.knowledgeFragments = new Map(); // fragmentId -> KnowledgeFragment
    this.conspiracies = new Map(); // conspiracyId -> Conspiracy
    this.knowledgeIndex = new Map(); // npcId -> Set of known fragmentIds
  }

  // Add an NPC to the social graph
  addNode(npcId, npcData) {
    if (this.nodes.has(npcId)) return this.nodes.get(npcId);

    const node = {
      id: npcId,
      name: npcData.name || npcId,
      type: npcData.type || 'unknown',
      mood: npcData.mood || '平静',
      attitude: npcData.attitude || '中立',
      trustLevel: npcData.dynamicTraits?.trustLevel || 50,
      fearLevel: npcData.dynamicTraits?.fearLevel || 30,
      hopeLevel: npcData.dynamicTraits?.hopeLevel || 40,
      faction: npcData.faction || null,
      memory: [],
      grudges: [], // Who they hold grudges against
      bonds: [], // Strong positive relationships
      lastUpdate: Date.now()
    };

    this.nodes.set(npcId, node);

    // Auto-join faction if specified
    if (node.faction) {
      this.joinFaction(npcId, node.faction);
    }

    return node;
  }

  // Create or update a relationship edge
  addEdge(npcIdA, npcIdB, type = 'stranger', strength = 0) {
    const key = this.edgeKey(npcIdA, npcIdB);
    const typeData = RELATIONSHIP_TYPES[type] || RELATIONSHIP_TYPES.stranger;

    let edge = this.edges.get(key);
    if (!edge) {
      edge = {
        a: npcIdA,
        b: npcIdB,
        type: 'stranger',
        strength: 0,
        history: []
      };
      this.edges.set(key, edge);
    }

    // Update type if more significant
    const currentWeight = RELATIONSHIP_TYPES[edge.type]?.weight || 0;
    if (typeData.weight > currentWeight) {
      edge.type = type;
    }

    // Adjust strength (-50 to +50)
    edge.strength = Math.max(-50, Math.min(50, edge.strength + strength));

    edge.history.push({
      type,
      strength,
      timestamp: Date.now()
    });

    // Trim history
    if (edge.history.length > 20) {
      edge.history = edge.history.slice(-20);
    }

    return edge;
  }

  edgeKey(a, b) {
    return a < b ? `${a}|${b}` : `${b}|${a}`;
  }

  // Get relationship between two NPCs
  getRelationship(npcIdA, npcIdB) {
    const key = this.edgeKey(npcIdA, npcIdB);
    return this.edges.get(key) || { type: 'stranger', strength: 0 };
  }

  // Get all relationships of an NPC
  getRelationships(npcId) {
    const result = [];
    for (const [key, edge] of this.edges) {
      if (edge.a === npcId || edge.b === npcId) {
        const otherId = edge.a === npcId ? edge.b : edge.a;
        const other = this.nodes.get(otherId);
        result.push({
          ...edge,
          otherId,
          otherName: other?.name || otherId
        });
      }
    }
    return result.sort((a, b) => Math.abs(b.strength) - Math.abs(a.strength));
  }

  // Faction management
  joinFaction(npcId, factionId) {
    if (!this.factions.has(factionId)) {
      this.factions.set(factionId, {
        id: factionId,
        name: factionId,
        members: new Set(),
        reputation: 0,
        founded: Date.now()
      });
    }

    const faction = this.factions.get(factionId);
    faction.members.add(npcId);

    const node = this.nodes.get(npcId);
    if (node) {
      node.faction = factionId;
    }

    // Auto-create friend relationships between faction members
    for (const memberId of faction.members) {
      if (memberId !== npcId) {
        this.addEdge(npcId, memberId, 'friend', 10);
      }
    }
  }

  // Mood contagion - spread emotions through social network
  spreadMood(sourceNpcId, emotion, intensity) {
    const visited = new Set([sourceNpcId]);
    const queue = [{ id: sourceNpcId, intensity, hops: 0 }];

    while (queue.length > 0) {
      const current = queue.shift();
      if (current.hops >= this.contagionRadius) continue;

      const relationships = this.getRelationships(current.id);
      for (const rel of relationships) {
        if (visited.has(rel.otherId)) continue;

        const typeData = RELATIONSHIP_TYPES[rel.type];
        if (!typeData || !typeData.contagious) continue;

        // Contagion strength based on relationship type and edge strength
        const contagionFactor = (typeData.weight / 3) * (Math.abs(rel.strength) / 50);
        const newIntensity = current.intensity * contagionFactor * (1 - current.hops * 0.3);

        if (newIntensity > this.contagionThreshold) {
          const targetNode = this.nodes.get(rel.otherId);
          if (targetNode) {
            this.applyMoodInfluence(targetNode, emotion, newIntensity);
            visited.add(rel.otherId);
            queue.push({ id: rel.otherId, intensity: newIntensity, hops: current.hops + 1 });
          }
        }
      }
    }
  }

  applyMoodInfluence(node, emotion, intensity) {
    const moodMap = {
      '恐惧': () => { node.fearLevel = Math.min(100, node.fearLevel + intensity * 0.5); },
      '希望': () => { node.hopeLevel = Math.min(100, node.hopeLevel + intensity * 0.5); },
      '愤怒': () => { node.trustLevel = Math.max(0, node.trustLevel - intensity * 0.3); },
      '悲伤': () => { node.hopeLevel = Math.max(0, node.hopeLevel - intensity * 0.3); },
      '欣慰': () => { node.trustLevel = Math.min(100, node.trustLevel + intensity * 0.3); },
      '感激': () => { node.trustLevel = Math.min(100, node.trustLevel + intensity * 0.5); }
    };

    const effect = moodMap[emotion];
    if (effect) effect();

    node.memory.push({
      type: 'mood_contagion',
      emotion,
      intensity,
      timestamp: Date.now()
    });

    // Trim memory
    if (node.memory.length > 30) {
      node.memory = node.memory.slice(-30);
    }
  }

  // Record an event that affects relationships
  recordSocialEvent(event) {
    const { type, actor, target, witnesses = [], impact } = event;

    // Update actor-target relationship
    if (actor && target && actor !== target) {
      const strengthChange = impact === 'positive' ? 15 : impact === 'negative' ? -15 : 5;
      this.addEdge(actor, target, type === 'rescue' ? 'friend' : 'witness', strengthChange);
    }

    // Witnesses form opinions
    for (const witnessId of witnesses) {
      if (witnessId === actor || witnessId === target) continue;
      this.addEdge(witnessId, actor, 'witness', impact === 'positive' ? 5 : -5);
      if (target) {
        this.addEdge(witnessId, target, 'witness', impact === 'positive' ? 3 : -3);
      }
    }

    // Spread mood from affected parties
    if (impact === 'negative') {
      if (actor) this.spreadMood(actor, '悲伤', 20);
      if (target) this.spreadMood(target, '恐惧', 25);
    } else if (impact === 'positive') {
      if (actor) this.spreadMood(actor, '欣慰', 20);
      if (target) this.spreadMood(target, '感激', 25);
    }

    // Check for grudge formation
    if (impact === 'negative' && target) {
      const targetNode = this.nodes.get(target);
      if (targetNode && targetNode.fearLevel > 70) {
        targetNode.grudges.push({
          against: actor,
          reason: type,
          intensity: targetNode.fearLevel,
          timestamp: Date.now()
        });
      }
    }

    // Check for bond formation
    if (impact === 'positive' && target) {
      const targetNode = this.nodes.get(target);
      if (targetNode && targetNode.trustLevel > 70) {
        targetNode.bonds.push({
          with: actor,
          reason: type,
          intensity: targetNode.trustLevel,
          timestamp: Date.now()
        });
      }
    }
  }

  // Get social summary for an NPC
  getSocialSummary(npcId) {
    const node = this.nodes.get(npcId);
    if (!node) return null;

    const relationships = this.getRelationships(npcId);
    const friends = relationships.filter(r => r.strength > 10);
    const enemies = relationships.filter(r => r.strength < -10);
    const faction = node.faction ? this.factions.get(node.faction) : null;

    return {
      name: node.name,
      mood: node.mood,
      attitude: node.attitude,
      trustLevel: node.trustLevel,
      fearLevel: node.fearLevel,
      hopeLevel: node.hopeLevel,
      faction: faction?.name || null,
      friendCount: friends.length,
      enemyCount: enemies.length,
      grudges: node.grudges.length,
      bonds: node.bonds.length,
      topRelationships: relationships.slice(0, 5)
    };
  }

  // Get network-wide statistics
  getNetworkStats() {
    const totalNodes = this.nodes.size;
    const totalEdges = this.edges.size;
    const factions = Array.from(this.factions.values()).map(f => ({
      name: f.name,
      memberCount: f.members.size,
      reputation: f.reputation
    }));

    let totalStrength = 0;
    for (const edge of this.edges.values()) {
      totalStrength += edge.strength;
    }

    return {
      totalNodes,
      totalEdges,
      averageRelationshipStrength: totalEdges > 0 ? totalStrength / totalEdges : 0,
      factions,
      isolatedNodes: Array.from(this.nodes.values()).filter(n =>
        !Array.from(this.edges.values()).some(e => e.a === n.id || e.b === n.id)
      ).length
    };
  }

  // Generate ASCII visualization of local network
  visualizeLocalNetwork(centerNpcId, radius = 2) {
    const lines = [];
    const center = this.nodes.get(centerNpcId);
    if (!center) return 'NPC not found';

    lines.push(`=== ${center.name} 的社会关系网 ===`);
    lines.push(`情绪: ${center.mood} | 信任: ${center.trustLevel} | 恐惧: ${center.fearLevel} | 希望: ${center.hopeLevel}`);
    lines.push('');

    const relationships = this.getRelationships(centerNpcId);
    if (relationships.length === 0) {
      lines.push('  (暂无社会关系)');
    } else {
      for (const rel of relationships) {
        const symbol = rel.strength > 20 ? '❤' : rel.strength > 0 ? '◆' : rel.strength > -20 ? '◇' : '✖';
        const typeLabel = RELATIONSHIP_TYPES[rel.type]?.label || rel.type;
        lines.push(`  ${symbol} ${rel.otherName} [${typeLabel}] ${rel.strength > 0 ? '+' : ''}${rel.strength}`);
      }
    }

    if (center.grudges.length > 0) {
      lines.push('');
      lines.push('  怨恨:');
      for (const grudge of center.grudges) {
        const against = this.nodes.get(grudge.against);
        lines.push(`    ✖ ${against?.name || grudge.against} (${grudge.reason})`);
      }
    }

    if (center.bonds.length > 0) {
      lines.push('');
      lines.push('  羁绊:');
      for (const bond of center.bonds) {
        const with_ = this.nodes.get(bond.with);
        lines.push(`    ❤ ${with_?.name || bond.with} (${bond.reason})`);
      }
    }

    return lines.join('\n');
  }

  // ========== 秘密知识经济系统 ==========

  // 创建知识碎片
  createKnowledgeFragment(data) {
    const fragment = new KnowledgeFragment(data);
    this.knowledgeFragments.set(fragment.id, fragment);
    if (data.source) {
      fragment.knownBy.add(data.source);
      this.indexKnowledge(data.source, fragment.id);
    }
    return fragment;
  }

  // 为NPC索引知识
  indexKnowledge(npcId, fragmentId) {
    if (!this.knowledgeIndex.has(npcId)) {
      this.knowledgeIndex.set(npcId, new Set());
    }
    this.knowledgeIndex.get(npcId).add(fragmentId);
  }

  // 传播知识（信息传播）
  spreadKnowledge(fragmentId, fromNpcId, toNpcId) {
    const fragment = this.knowledgeFragments.get(fragmentId);
    if (!fragment) return null;

    // 检查传播者是否知道此知识
    if (!fragment.knownBy.has(fromNpcId)) return null;

    // 检查关系是否足够强以传播信息
    const rel = this.getRelationship(fromNpcId, toNpcId);
    const trustThreshold = fragment.category === 'secret' ? 30 : 0;
    if (rel.strength < trustThreshold) return null;

    // 变异传播
    const mutated = fragment.mutate(toNpcId);
    mutated.lastSpread = Date.now();

    // 更新知识库
    this.knowledgeFragments.set(fragmentId, mutated);
    this.indexKnowledge(toNpcId, fragmentId);

    // 记录到NPC记忆
    const toNode = this.nodes.get(toNpcId);
    if (toNode) {
      toNode.memory.push({
        type: 'knowledge_received',
        from: fromNpcId,
        fragmentId,
        reliability: mutated.getReliability(),
        timestamp: Date.now()
      });
    }

    // 检查是否触发阴谋形成
    this.checkConspiracyFormation(fragmentId);

    return mutated;
  }

  // 自动传播（模拟NPC之间的 gossip）
  autoSpreadKnowledge(fragmentId, maxSpreads = 3) {
    const fragment = this.knowledgeFragments.get(fragmentId);
    if (!fragment) return [];

    const spreadLog = [];
    let spreads = 0;

    for (const knowerId of fragment.knownBy) {
      if (spreads >= maxSpreads) break;

      const relationships = this.getRelationships(knowerId);
      for (const rel of relationships) {
        if (spreads >= maxSpreads) break;
        if (fragment.knownBy.has(rel.otherId)) continue;

        // 传播概率基于关系强度
        const spreadChance = Math.abs(rel.strength) / 100;
        if (Math.random() < spreadChance) {
          const result = this.spreadKnowledge(fragmentId, knowerId, rel.otherId);
          if (result) {
            spreadLog.push({
              from: knowerId,
              to: rel.otherId,
              reliability: result.getReliability()
            });
            spreads++;
          }
        }
      }
    }

    return spreadLog;
  }

  // 验证知识（通过调查或见证）
  verifyKnowledge(fragmentId, verifierId, evidence = null) {
    const fragment = this.knowledgeFragments.get(fragmentId);
    if (!fragment) return null;

    // 验证者必须知道此知识
    if (!fragment.knownBy.has(verifierId)) return null;

    // 验证提升真实性
    let verificationStrength = 0.2;
    if (evidence) verificationStrength += 0.3;

    fragment.truth = Math.min(1, fragment.truth + verificationStrength);
    fragment.verifiedBy.add(verifierId);

    // 记录验证
    const verifier = this.nodes.get(verifierId);
    if (verifier) {
      verifier.memory.push({
        type: 'knowledge_verified',
        fragmentId,
        truth: fragment.truth,
        timestamp: Date.now()
      });
    }

    return fragment;
  }

  // 检查阴谋形成
  checkConspiracyFormation(fragmentId) {
    const fragment = this.knowledgeFragments.get(fragmentId);
    if (!fragment || fragment.category !== 'secret') return null;

    // 如果2+ NPC知道秘密且有朋友/导师关系，可能形成阴谋
    const knowers = Array.from(fragment.knownBy);
    if (knowers.length < 2) return null;

    // 检查关系网络
    for (let i = 0; i < knowers.length; i++) {
      for (let j = i + 1; j < knowers.length; j++) {
        const rel = this.getRelationship(knowers[i], knowers[j]);
        if (rel.type === 'friend' || rel.type === 'mentor') {
          // 检查是否已存在相关阴谋
          for (const con of this.conspiracies.values()) {
            if (con.secret?.id === fragmentId) return con;
          }

          // 创建新阴谋
          const conspiracy = new Conspiracy({
            name: `关于"${fragment.text.substring(0, 20)}..."的密谋`,
            members: [knowers[i], knowers[j]],
            secret: fragment,
            goal: 'protect_secret'
          });

          this.conspiracies.set(conspiracy.id, conspiracy);

          // 记录到参与者记忆
          for (const memberId of conspiracy.members) {
            const node = this.nodes.get(memberId);
            if (node) {
              node.memory.push({
                type: 'conspiracy_formed',
                conspiracyId: conspiracy.id,
                timestamp: Date.now()
              });
            }
          }

          return conspiracy;
        }
      }
    }

    return null;
  }

  // 推进阴谋
  advanceConspiracy(conspiracyId) {
    const conspiracy = this.conspiracies.get(conspiracyId);
    if (!conspiracy) return null;

    const advanced = conspiracy.advanceStage();
    if (advanced) {
      conspiracy.progress += 25;

      // 如果到达结局阶段，可能被发现
      if (conspiracy.currentStage === conspiracy.stages.length - 1) {
        const discoveryChance = 0.3 + (conspiracy.members.size * 0.1);
        if (Math.random() < discoveryChance) {
          // 被随机NPC发现
          const allNpcs = Array.from(this.nodes.keys());
          const outsider = allNpcs.find(id => !conspiracy.members.has(id));
          if (outsider) {
            conspiracy.discover(outsider);
          }
        }
      }
    }

    return conspiracy;
  }

  // 获取NPC知道的知识
  getKnownKnowledge(npcId) {
    const fragmentIds = this.knowledgeIndex.get(npcId);
    if (!fragmentIds) return [];

    return Array.from(fragmentIds).map(id => this.knowledgeFragments.get(id)).filter(Boolean);
  }

  // 获取知识网络统计
  getKnowledgeStats() {
    const fragments = Array.from(this.knowledgeFragments.values());
    const conspiracies = Array.from(this.conspiracies.values());

    const categoryCounts = {};
    for (const f of fragments) {
      categoryCounts[f.category] = (categoryCounts[f.category] || 0) + 1;
    }

    return {
      totalFragments: fragments.length,
      categoryDistribution: categoryCounts,
      averageTruth: fragments.length > 0
        ? fragments.reduce((sum, f) => sum + f.truth, 0) / fragments.length
        : 0,
      totalConspiracies: conspiracies.length,
      discoveredConspiracies: conspiracies.filter(c => c.discovered).length,
      activeConspiracies: conspiracies.filter(c => !c.discovered).length
    };
  }

  // 生成知识传播报告（CLI可视化）
  visualizeKnowledgeNetwork() {
    const lines = [];
    lines.push('=== 知识传播网络 ===');
    lines.push('');

    for (const fragment of this.knowledgeFragments.values()) {
      const reliability = fragment.getReliability();
      const symbol = reliability > 0.7 ? '✓' : reliability > 0.4 ? '?' : '✗';
      lines.push(`${symbol} [${fragment.category}] ${fragment.text.substring(0, 30)}...`);
      lines.push(`   真实性: ${(fragment.truth * 100).toFixed(0)}% | 可靠性: ${(reliability * 100).toFixed(0)}% | 传播: ${fragment.spreadCount}次`);
      lines.push(`   知晓者: ${Array.from(fragment.knownBy).join(', ')}`);
      if (fragment.mutations.length > 0) {
        lines.push(`   变异: ${fragment.mutations.length}次`);
      }
      lines.push('');
    }

    if (this.conspiracies.size > 0) {
      lines.push('--- 阴谋 ---');
      for (const con of this.conspiracies.values()) {
        const status = con.discovered ? '已暴露' : '隐秘中';
        lines.push(`${con.name} [${status}]`);
        lines.push(`   成员: ${Array.from(con.members).join(', ')} | 阶段: ${con.stages[con.currentStage]} | 进度: ${con.progress}%`);
      }
    }

    return lines.join('\n');
  }
  // Serialize for save/load
  serialize() {
    return {
      nodes: Array.from(this.nodes.entries()),
      edges: Array.from(this.edges.entries()),
      factions: Array.from(this.factions.entries()).map(([id, f]) => [id, {
        ...f,
        members: Array.from(f.members)
      }]),
      knowledgeFragments: Array.from(this.knowledgeFragments.entries()).map(([id, f]) => [id, f.serialize()]),
      conspiracies: Array.from(this.conspiracies.entries()).map(([id, c]) => [id, c.serialize()]),
      knowledgeIndex: Array.from(this.knowledgeIndex.entries()).map(([id, set]) => [id, Array.from(set)])
    };
  }

  deserialize(data) {
    if (!data) return;
    this.nodes = new Map(data.nodes || []);
    this.edges = new Map(data.edges || []);
    this.factions = new Map(
      (data.factions || []).map(([id, f]) => [id, {
        ...f,
        members: new Set(f.members || [])
      }])
    );
    this.knowledgeFragments = new Map(
      (data.knowledgeFragments || []).map(([id, f]) => [id, KnowledgeFragment.deserialize(f)])
    );
    this.conspiracies = new Map(
      (data.conspiracies || []).map(([id, c]) => [id, Conspiracy.deserialize(c)])
    );
    this.knowledgeIndex = new Map(
      (data.knowledgeIndex || []).map(([id, arr]) => [id, new Set(arr)])
    );
  }
}

// Export singleton
export const socialGraph = new SocialGraph();
