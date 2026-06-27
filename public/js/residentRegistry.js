const MAX_RESIDENT_MEMORIES = 80;

export const DEFAULT_RESIDENTS = [
  {
    residentId: 'resident-old-fisherman',
    name: '老渔夫',
    role: '河边见证者',
    type: 'villager',
    homeRegionId: 'flood-village',
    personality: '沉稳、经验丰富、略带神秘',
    dialogueStyle: '说话慢，喜欢用比喻，经常提到水里的声音',
    mood: '担忧',
    attitudeToPlayer: '友善',
    aliases: ['old-fisherman', '老渔夫'],
    longTermGoal: '守住洪水村庄的记忆'
  },
  {
    residentId: 'resident-xiaozhu',
    name: '小烛',
    role: '洪水村庄孩子',
    type: 'child',
    homeRegionId: 'flood-village',
    personality: '天真、活泼、充满想象力',
    dialogueStyle: '说话快，经常问问题，用词简单但富有诗意',
    mood: '好奇',
    attitudeToPlayer: '崇拜',
    aliases: ['child-xiaozhu', '小烛'],
    longTermGoal: '找到一个不会被洪水带走的家'
  },
  {
    residentId: 'resident-miner-ghost',
    name: '矿灯幽灵',
    role: '永夜矿井幽灵',
    type: 'ghost',
    homeRegionId: 'night-mine',
    personality: '忧郁、善良、渴望陪伴',
    dialogueStyle: '断断续续，经常停顿，声音像是从远处传来',
    mood: '孤独',
    attitudeToPlayer: '谨慎',
    aliases: ['miner-ghost', '矿灯幽灵'],
    longTermGoal: '确认矿井里的灯没有全部熄灭'
  },
  {
    residentId: 'resident-beast-tamer',
    name: '驯兽人',
    role: '巨兽研究者',
    type: 'scholar',
    homeRegionId: 'giant-city',
    personality: '理性、温和、博学',
    dialogueStyle: '用词准确，经常引用古籍，说话有条理',
    mood: '焦虑',
    attitudeToPlayer: '尊敬',
    aliases: ['beast-tamer', '驯兽人'],
    longTermGoal: '证明巨兽不是敌人'
  },
  {
    residentId: 'resident-border-poet',
    name: '边境诗人',
    role: '失语战争见证者',
    type: 'artist',
    homeRegionId: 'wordless-war',
    personality: '敏感、理想主义、善于观察',
    dialogueStyle: '富有诗意，经常隐喻，说话像朗诵诗歌',
    mood: '悲伤',
    attitudeToPlayer: '中立',
    aliases: ['border-poet', '边境诗人'],
    longTermGoal: '让两个部落重新听懂彼此'
  },
  {
    residentId: 'resident-memory-keeper',
    name: '守忆人',
    role: '圣树记忆守护者',
    type: 'elder',
    homeRegionId: 'memory-plague',
    personality: '温和、健忘但努力回忆、善良',
    dialogueStyle: '经常停顿回忆，话语中夹杂着过去的记忆碎片',
    mood: '困惑',
    attitudeToPlayer: '友善',
    aliases: ['memory-keeper', '守忆人'],
    longTermGoal: '保住每个被迷雾抹去的名字'
  },
  {
    residentId: 'resident-world-spirit',
    name: '世界之灵',
    role: '裂隙之地意识',
    type: 'spirit',
    homeRegionId: 'final-exam',
    personality: '超然、智慧、略带忧伤',
    dialogueStyle: '声音像风一样轻柔，用词古老而深刻，经常提到时间的流逝',
    mood: '平静',
    attitudeToPlayer: '审视',
    aliases: ['world-spirit', '世界之灵'],
    longTermGoal: '判断造物者是否能与世界共存'
  }
];

function cloneResident(resident) {
  return {
    residentId: resident.residentId,
    name: resident.name,
    role: resident.role,
    type: resident.type,
    homeRegionId: resident.homeRegionId,
    currentRegionId: resident.currentRegionId || resident.homeRegionId,
    personality: resident.personality,
    dialogueStyle: resident.dialogueStyle,
    mood: resident.mood || '平静',
    attitudeToPlayer: resident.attitudeToPlayer || '中立',
    longTermGoal: resident.longTermGoal || '在裂隙之地生存',
    currentGoal: resident.currentGoal || resident.longTermGoal || '观察世界变化',
    aliases: Array.isArray(resident.aliases) ? [...resident.aliases] : [],
    relationships: resident.relationships ? { ...resident.relationships } : {},
    memories: Array.isArray(resident.memories) ? resident.memories.map(memory => ({ ...memory })) : [],
    flags: resident.flags ? { ...resident.flags } : {}
  };
}

export class ResidentRegistry {
  constructor(options = {}) {
    this.residents = new Map();
    this.aliasIndex = new Map();
    if (options.seedDefaults !== false) {
      for (const resident of DEFAULT_RESIDENTS) this.registerResident(resident);
    }
  }

  registerResident(profile) {
    if (!profile?.residentId) {
      throw new Error('ResidentRegistry.registerResident requires residentId');
    }
    const resident = cloneResident(profile);
    this.residents.set(resident.residentId, resident);
    this.indexResident(resident);
    return resident;
  }

  indexResident(resident) {
    this.aliasIndex.set(resident.residentId, resident.residentId);
    this.aliasIndex.set(resident.name, resident.residentId);
    for (const alias of resident.aliases || []) {
      this.aliasIndex.set(alias, resident.residentId);
    }
  }

  resolveId(idOrAlias) {
    return this.aliasIndex.get(idOrAlias) || idOrAlias;
  }

  getResident(idOrAlias) {
    const residentId = this.resolveId(idOrAlias);
    return this.residents.get(residentId) || null;
  }

  getResidentsForRegion(regionId) {
    return Array.from(this.residents.values()).filter(resident =>
      resident.homeRegionId === regionId || resident.currentRegionId === regionId
    );
  }

  recordMemory(idOrAlias, memory) {
    const resident = this.getResident(idOrAlias);
    if (!resident) return null;
    const entry = {
      id: memory.id || `memory-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      type: memory.type || 'event',
      text: String(memory.text || ''),
      regionId: memory.regionId || resident.currentRegionId,
      timestamp: Number.isFinite(memory.timestamp) ? memory.timestamp : Date.now(),
      importance: Number.isFinite(memory.importance) ? Math.max(0, Math.min(1, memory.importance)) : 0.5
    };
    resident.memories.push(entry);
    if (resident.memories.length > MAX_RESIDENT_MEMORIES) {
      resident.memories = resident.memories.slice(-MAX_RESIDENT_MEMORIES);
    }
    return entry;
  }

  moveResident(idOrAlias, regionId) {
    const resident = this.getResident(idOrAlias);
    if (!resident) return null;
    resident.currentRegionId = regionId;
    return resident;
  }

  projectForRegion(idOrAlias, regionId) {
    const resident = this.getResident(idOrAlias);
    if (!resident) return null;
    return {
      id: resident.aliases[0] || resident.residentId,
      residentId: resident.residentId,
      name: resident.name,
      type: resident.type,
      location: regionId === resident.homeRegionId ? '故乡附近' : '旅途中',
      mood: resident.mood,
      attitude: resident.attitudeToPlayer,
      personality: resident.personality,
      dialogueStyle: resident.dialogueStyle,
      longTermGoal: resident.longTermGoal,
      currentGoal: resident.currentGoal,
      memories: resident.memories.slice(-20).map(memory => ({ ...memory })),
      dynamicTraits: {
        trustLevel: resident.attitudeToPlayer === '友善' || resident.attitudeToPlayer === '崇拜' ? 70 : 50,
        fearLevel: resident.mood === '恐惧' || resident.mood === '悲伤' ? 60 : 30,
        hopeLevel: resident.mood === '希望' || resident.mood === '好奇' ? 70 : 45
      }
    };
  }

  serialize() {
    return {
      version: 1,
      residents: Array.from(this.residents.values()).map(cloneResident)
    };
  }

  deserialize(data = {}) {
    this.residents.clear();
    this.aliasIndex.clear();
    for (const resident of data.residents || []) {
      this.registerResident(resident);
    }
  }
}
