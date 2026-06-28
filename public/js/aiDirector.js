export const STORY_BEAT_TYPES = [
  'inciting_incident',
  'rising_action',
  'climax',
  'falling_action',
  'resolution',
  'twist',
  'character_moment',
  'world_reveal'
];

export class AIDirector {
  constructor(options = {}) {
    this.worldSimulation = options.worldSimulation;
    this.storyArcs = new Map();
    this.beatHistory = [];
    this.pacing = {
      minTurnsBetweenBeats: 3,
      maxBeatsPerRegion: 4,
      entropyThreshold: 5
    };
    this.narrativeProvider = options.narrativeProvider || null;
  }

  registerArc(arcId, config = {}) {
    this.storyArcs.set(arcId, {
      id: arcId,
      title: config.title || '未命名弧线',
      beats: config.beats || [],
      currentBeatIndex: 0,
      status: 'active',
      priority: config.priority || 0.5,
      triggerRegionId: config.triggerRegionId || null,
      requiredTags: config.requiredTags || []
    });
  }

  evaluateBeats(regionId, context = {}) {
    const beats = [];
    const turn = context.turn || 0;
    const entropy = context.entropy || 0;
    const recentBeats = this.beatHistory.filter(b => b.regionId === regionId);

    // Pacing gate
    if (recentBeats.length >= this.pacing.maxBeatsPerRegion) return beats;
    const lastBeat = recentBeats[recentBeats.length - 1];
    if (lastBeat && (turn - lastBeat.turn) < this.pacing.minTurnsBetweenBeats) return beats;

    for (const [arcId, arc] of this.storyArcs) {
      if (arc.status !== 'active') continue;
      if (arc.triggerRegionId && arc.triggerRegionId !== regionId) continue;

      const nextBeat = arc.beats[arc.currentBeatIndex];
      if (!nextBeat) continue;

      // Check entropy threshold for tension beats
      if (nextBeat.type === 'climax' && entropy < this.pacing.entropyThreshold) continue;

      beats.push({
        arcId,
        beatId: nextBeat.id,
        type: nextBeat.type,
        priority: arc.priority * (nextBeat.priority || 1),
        payload: nextBeat.payload || {}
      });
    }

    return beats.sort((a, b) => b.priority - a.priority);
  }

  async resolveBeat(beat, context = {}) {
    this.beatHistory.push({
      beatId: beat.beatId,
      arcId: beat.arcId,
      type: beat.type,
      regionId: context.regionId || 'unknown',
      turn: context.turn || 0,
      resolvedAt: Date.now()
    });

    // Advance arc
    const arc = this.storyArcs.get(beat.arcId);
    if (arc) {
      arc.currentBeatIndex += 1;
      if (arc.currentBeatIndex >= arc.beats.length) {
        arc.status = 'completed';
      }
    }

    // Generate narrative
    if (this.narrativeProvider) {
      try {
        const narrative = await this.narrativeProvider({
          type: beat.type,
          context: { ...context, beat }
        });
        return { ...beat, narrative, source: 'ai' };
      } catch (_error) {
        // Fall through to local
      }
    }

    // Local fallback narrative
    return {
      ...beat,
      narrative: this.generateLocalNarrative(beat, context),
      source: 'local'
    };
  }

  generateLocalNarrative(beat, context) {
    const templates = {
      inciting_incident: '事态在' + (context.regionId || '此地') + '发生了意想不到的转变...',
      rising_action: '紧张局势正在升级，每一步都充满风险。',
      climax: '危机达到顶点，一切悬于一线。',
      falling_action: '风暴逐渐平息，但余波仍在蔓延。',
      resolution: '这一段落终于画上了句号，新的篇章即将开启。',
      twist: '一个出乎意料的转折改变了所有人的命运。',
      character_moment: '某个角色的真实面目在这一刻显露无遗。',
      world_reveal: '世界的秘密正在缓缓揭开...'
    };
    return templates[beat.type] || '故事继续展开...';
  }

  getActiveArcs() {
    return Array.from(this.storyArcs.values()).filter(arc => arc.status === 'active');
  }

  getArcSummary() {
    return {
      activeArcs: this.getActiveArcs().length,
      completedArcs: Array.from(this.storyArcs.values()).filter(arc => arc.status === 'completed').length,
      totalBeats: this.beatHistory.length,
      recentBeats: this.beatHistory.slice(-5)
    };
  }

  serialize() {
    return {
      version: 1,
      storyArcs: Array.from(this.storyArcs.entries()),
      beatHistory: this.beatHistory,
      pacing: this.pacing
    };
  }

  deserialize(data = {}) {
    this.storyArcs = new Map();
    if (Array.isArray(data.storyArcs)) {
      for (const [key, value] of data.storyArcs) {
        this.storyArcs.set(key, {
          id: value.id || key,
          title: value.title || '未命名弧线',
          beats: value.beats || [],
          currentBeatIndex: value.currentBeatIndex || 0,
          status: value.status || 'active',
          priority: value.priority || 0.5,
          triggerRegionId: value.triggerRegionId || null,
          requiredTags: value.requiredTags || []
        });
      }
    }
    this.beatHistory = Array.isArray(data.beatHistory) ? data.beatHistory : [];
    if (data.pacing) this.pacing = { ...this.pacing, ...data.pacing };
  }
}
