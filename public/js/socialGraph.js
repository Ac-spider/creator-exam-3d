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

export class SocialGraph {
  constructor() {
    this.nodes = new Map(); // npcId -> node
    this.edges = new Map(); // "A|B" -> edge
    this.factions = new Map(); // factionId -> { members, reputation }
    this.contagionRadius = 2; // Relationship hops for mood contagion
    this.contagionThreshold = 15; // Minimum emotion intensity to spread
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

  // Serialize for save/load
  serialize() {
    return {
      nodes: Array.from(this.nodes.entries()),
      edges: Array.from(this.edges.entries()),
      factions: Array.from(this.factions.entries()).map(([id, f]) => [id, {
        ...f,
        members: Array.from(f.members)
      }])
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
  }
}

// Export singleton
export const socialGraph = new SocialGraph();
