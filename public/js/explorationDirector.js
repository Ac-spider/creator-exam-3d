function slug(value) {
  return String(value || 'unknown')
    .toLowerCase()
    .replace(/[^a-z0-9一-龥]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'unknown';
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function riskForHook(hook) {
  if (hook.type === 'entropy_scar' || hook.type === 'region_aftermath') return 'high';
  if (hook.type === 'missing_person') return 'medium';
  return 'medium';
}

function promiseForHook(hook) {
  if (hook.type === 'resident_migration') return 'resident_memory';
  if (hook.type === 'entropy_scar') return 'world_consequence';
  if (hook.type === 'missing_person') return 'rescue_thread';
  if (hook.type === 'region_aftermath') return 'aftermath';
  return 'unknown_thread';
}

function titleForHook(hook, residentsById) {
  if (hook.type === 'resident_migration') {
    const resident = residentsById.get(hook.residentId);
    return `跟随${resident?.name || '幸存者'}的足迹`;
  }
  if (hook.type === 'entropy_scar') return `追踪「${hook.creationName || '未知造物'}」的裂痕`;
  if (hook.type === 'missing_person') return `搜寻${hook.residentName || '失踪者'}的下落`;
  if (hook.type === 'region_aftermath') return '进入灾后区域';
  return `调查${hook.type}`;
}

export class ExplorationDirector {
  buildChoices(input = {}) {
    const sourceRegionId = input.sourceRegionId || 'unknown';
    const hooks = Array.isArray(input.hooks) ? [...input.hooks] : [];
    const residents = Array.isArray(input.residents) ? input.residents : [];
    const residentsById = new Map(residents.map(resident => [resident.residentId, resident]));
    const count = Math.max(1, Math.min(3, Number(input.count || 3)));

    const choices = hooks
      .sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0))
      .slice(0, count)
      .map(hook => this.choiceFromHook(sourceRegionId, hook, residentsById));

    if (choices.length === 0) {
      choices.push(this.fallbackChoice(sourceRegionId, input.outcome || 'unknown'));
    }

    return choices;
  }

  choiceFromHook(sourceRegionId, hook, residentsById) {
    const residentIds = unique([hook.residentId]);
    const sourceHookIds = unique([hook.id]);
    const sourceEventIds = unique([hook.sourceEventId]);
    const title = titleForHook(hook, residentsById);
    return {
      id: `choice-${slug(sourceRegionId)}-${slug(hook.type)}-${slug(hook.residentId || hook.creationName || hook.id)}`,
      title,
      description: hook.summary || `${title} because of ${hook.type}`,
      sourceRegionId,
      sourceHookIds,
      sourceEventIds,
      residentIds,
      hookTypes: unique([hook.type]),
      risk: riskForHook(hook),
      promise: promiseForHook(hook),
      priority: Number.isFinite(Number(hook.priority)) ? Number(hook.priority) : 0.5,
      status: 'available'
    };
  }

  fallbackChoice(sourceRegionId, outcome) {
    return {
      id: `choice-${slug(sourceRegionId)}-fallback-${slug(outcome)}`,
      title: outcome === 'lost' ? '撤退到安全边缘' : '探索静谧之路',
      description: outcome === 'lost'
        ? '失败区域留下了一条更安全的退路，适合幸存者撤离。'
        : '没有紧迫的线索，世界在你面前展开一条安静的道路。',
      sourceRegionId,
      sourceHookIds: [],
      sourceEventIds: [],
      residentIds: [],
      hookTypes: ['fallback'],
      risk: outcome === 'lost' ? 'low' : 'medium',
      promise: 'fallback_path',
      priority: 0.2,
      status: 'available'
    };
  }

  buildRegionRequest(choice, worldSummary = {}) {
    return {
      sourceRegionId: choice.sourceRegionId,
      hooks: choice.hookTypes.map((type, index) => ({
        id: choice.sourceHookIds[index] || `${choice.id}-hook-${index}`,
        type,
        residentId: choice.residentIds[index] || null,
        priority: choice.priority,
        summary: choice.description
      })),
      worldSummary: {
        ...worldSummary,
        selectedChoiceId: choice.id,
        selectedChoiceTitle: choice.title,
        selectedChoicePromise: choice.promise
      }
    };
  }
}
