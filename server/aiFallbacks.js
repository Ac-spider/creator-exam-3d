import { buildGroundedResidentDialogueText } from '../public/js/dialogueGrounding.js';

export function fallbackRegionCandidate(input = {}) {
  const hooks = Array.isArray(input.hooks) ? input.hooks : [];
  const residentHook = hooks.find(h => h.type === 'resident_migration' && h.residentId);
  const baseUnits = input.units || [
    { type: 'villager', name: '幸存者甲', x: 3, y: 2, goal: { x: 6, y: 2 } },
    { type: 'villager', name: '幸存者乙', x: 3, y: 3, goal: { x: 6, y: 3 } },
    { type: 'villager', name: '幸存者丙', x: 3, y: 4, goal: { x: 6, y: 4 } }
  ];

  const units = residentHook
    ? baseUnits.map((u, i) =>
        i === 0
          ? { ...u, residentId: residentHook.residentId, name: u.name }
          : u
      )
    : baseUnits;

  return {
    id: input.id || 'fallback-region',
    title: input.title || '未知区域',
    story: input.story || '裂隙刚擦过这里，地上还在冒冷气。',
    objective: input.objective || '把人带出去，别让路被灾切断。',
    maxTurns: 8,
    creationCharges: 3,
    miraclePoints: 6,
    entropyLimit: 7,
    map: input.map || [
      '.......',
      '.......',
      '...V...',
      '.......',
      '.......',
      '.......',
      '.......'
    ],
    units,
    hazard: input.hazard || { type: 'flood', spreadPerTurn: 2 },
    win: input.win || 'requiredRescue',
    requiredRescue: input.requiredRescue || 3,
    connections: input.connections || { from: 'unknown', reason: '上一片地的裂缝通到这里' }
  };
}

export function fallbackResidentDialogue(input = {}) {
  const name = String(input.residentName || '居民').slice(0, 40);
  const memory = String(input.memoryText || '').slice(0, 240);
  const player = String(input.playerText || '').slice(0, 240);
  return {
    text: buildGroundedResidentDialogueText({
      residentName: name,
      memoryText: memory,
      playerText: player,
      currentGoal: input.currentGoal,
      regionId: input.regionId
    }),
    intent: { type: 'speak', confidence: 0.6 },
    memory,
    playerText: player,
    grounded: true
  };
}

export function fallbackRegionEnvelope(input = {}) {
  return {
    region: fallbackRegionCandidate(input),
    generated: true,
    fallback: true,
    source: input.source || 'fallback_no_key',
    playerState: input.playerState || {}
  };
}

export function fallbackResidentDialogueEnvelope(input = {}) {
  return {
    dialogue: fallbackResidentDialogue(input),
    fallback: true,
    source: input.source || 'fallback_no_key'
  };
}

export function fallbackCard(playerText = '') {
  return {
    name: String(playerText || '临时造物').slice(0, 14),
    type: '奇迹',
    ability: 'transform_land',
    tags: ['本地规则'],
    range: 1,
    duration: 2,
    cost: 2,
    stabilityCost: 1,
    description: '云端没回话，先按本地规则做一张保守卡。',
    side_effect: '裂隙轻微上升。',
    specialEffect: { type: 'none', description: '无特殊效果', trigger: 'none' },
    source: 'fallback'
  };
}
