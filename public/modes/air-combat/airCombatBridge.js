(function () {
  const CONTEXT_KEY = 'creatorExamAirCombatContext';
  const RESULT_KEY = 'creatorExamAirCombatResult';

  const BOSS_ROUTE = [
    {
      id: 'flood-echo',
      title: '洪水残响',
      memory: '第一天留下的水声还在天顶翻涌。',
      color: '#72d6bd',
      hp: 360,
      pattern: 'fan',
      lines: [
        '你曾把洪水举向天空，现在天空把它还给你。',
        '潮线不是水，是所有来不及撤离的脚步声。'
      ]
    },
    {
      id: 'fog-beacon',
      title: '迷雾航标',
      memory: '雾里所有被点亮的路标正在互相质问。',
      color: '#d8c58a',
      hp: 420,
      pattern: 'wall',
      lines: [
        '你给过他们方向，也给了迷雾模仿方向的机会。',
        '航标亮起时，别相信第一条路。'
      ]
    },
    {
      id: 'war-echo',
      title: '战争回声',
      memory: '两族战争被压缩成一枚会瞄准的弹。',
      color: '#f87171',
      hp: 500,
      pattern: 'aimed',
      lines: [
        '和平不是停火，是有人愿意替下一发子弹转向。',
        '所有没有说完的争辩，都变成了弹道。'
      ]
    },
    {
      id: 'beast-shadow',
      title: '巨兽阴影',
      memory: '巨兽的脚印漂浮在云层背面。',
      color: '#b8c2d6',
      hp: 580,
      pattern: 'spiral',
      lines: [
        '你驯服过影子，但影子仍记得牙齿。',
        '别让它靠近居民回声。'
      ]
    },
    {
      id: 'resident-oath',
      title: '居民誓约',
      memory: '被救下的人把名字刻进了机翼内侧。',
      color: '#f0a6ca',
      hp: 650,
      pattern: 'ring',
      lines: [
        '他们不是载荷，他们是你仍能转弯的理由。',
        '每个名字都在替你挡一次坠落。'
      ]
    },
    {
      id: 'final-order',
      title: '终考秩序',
      memory: '第六关的答案正在检查自己是否成立。',
      color: '#8bd3ff',
      hp: 760,
      pattern: 'mixed',
      lines: [
        '秩序从来不是静止，它只是崩塌前还愿意排队。',
        '第七天不收草稿，只收你真正守住的世界。'
      ]
    }
  ];

  const WEAPON_MAP = {
    absorb_water: {
      name: '鲸潮护盾',
      description: '吸收部分弹幕并在造物脉冲中转化为护盾。',
      color: '#72d6bd',
      kind: 'shield'
    },
    illuminate: {
      name: '月树光束',
      description: '直线穿透弹，造物脉冲会清出一条光路。',
      color: '#d8c58a',
      kind: 'beam'
    },
    memory_beacon: {
      name: '记忆星矛',
      description: '高频双发弹，击败 Boss 后留下居民通讯。',
      color: '#b8c2d6',
      kind: 'spear'
    },
    dream_link: {
      name: '梦桥僚机',
      description: '复制移动轨迹的回声火力，造物脉冲短暂增援。',
      color: '#f0a6ca',
      kind: 'wing'
    },
    force_field: {
      name: '誓约护盾',
      description: '较稳的护盾载体，适合熵值较高的空域。',
      color: '#8bd3ff',
      kind: 'shield'
    },
    block: {
      name: '秩序重炮',
      description: '低频重弹，造物脉冲震碎近身敌弹。',
      color: '#f87171',
      kind: 'cannon'
    }
  };

  function parseJson(value) {
    try { return JSON.parse(value); } catch (_error) { return null; }
  }

  function loadContext() {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get('context');
    if (fromQuery) {
      const decoded = parseJson(decodeURIComponent(fromQuery));
      if (decoded) return decoded;
    }
    try {
      return parseJson(localStorage.getItem(CONTEXT_KEY) || '') || {};
    } catch (_error) {
      return {};
    }
  }

  const context = loadContext();

  function residentsCount(value = context.rescuedResidents) {
    if (Array.isArray(value)) return value.length;
    const count = Number(value);
    return Number.isFinite(count) ? Math.max(0, count) : 0;
  }

  function lostCount(value = context.lostResidents) {
    if (Array.isArray(value)) return value.length;
    const count = Number(value);
    return Number.isFinite(count) ? Math.max(0, count) : 0;
  }

  function creations() {
    return Array.isArray(context.recentCreations) ? context.recentCreations : [];
  }

  function creationName(item) {
    return typeof item === 'string' ? item : item?.name || item?.creationName || '未命名造物';
  }

  function creationAbility(item) {
    return item && typeof item === 'object' ? item.ability || item.card?.ability || '' : '';
  }

  function primaryCreation() {
    return creations().find(item => WEAPON_MAP[creationAbility(item)]) || creations()[0] || null;
  }

  function weaponLoadout() {
    const creation = primaryCreation();
    const ability = creationAbility(creation);
    const fallback = {
      name: '裂隙光矛',
      description: '由白天残留的创造力压缩成的稳定直射武器。',
      color: '#72d6bd',
      kind: 'spear'
    };
    const weapon = WEAPON_MAP[ability] || fallback;
    return {
      ...weapon,
      sourceCreation: creationName(creation || '白天留下的造物'),
      ability: ability || 'unknown'
    };
  }

  function route() {
    const entropy = Number(context.entropy || 0);
    const pressure = Math.max(0, Math.min(3, Math.floor(entropy / 3)));
    return BOSS_ROUTE.map((boss, index) => ({
      ...boss,
      hp: boss.hp + pressure * 55 + index * 20,
      stage: index + 1
    }));
  }

  function fallbackBrief() {
    const names = creations().map(creationName).filter(Boolean).slice(0, 2).join('、') || '白天留下的造物';
    const rescued = residentsCount();
    return `第六关和长夜之后，${names}被压缩为空域载体。${rescued}名居民的回声在通讯里等待第七天清算。`;
  }

  function difficulty() {
    const entropy = Number(context.entropy || 0);
    const defense = context.towerDefenseResult || {};
    const defenseRelief = defense.victory ? 0.85 : 1.12;
    return {
      enemyRate: Math.max(0.72, Math.min(1.35, (0.9 + entropy * 0.035) * defenseRelief)),
      bulletRate: Math.max(0.8, Math.min(1.45, 0.95 + entropy * 0.04 + lostCount() * 0.04)),
      playerHp: Math.max(70, 110 + residentsCount() * 4 - lostCount() * 6 + (defense.victory ? 12 : -8)),
      allyWings: Math.min(3, Math.floor(residentsCount() / 2))
    };
  }

  function cleanNarrative(text, max = 170) {
    return String(text || '').replace(/\s+/g, ' ').trim().slice(0, max);
  }

  function worldState(extra = {}) {
    return {
      currentLevel: context.regionId || 'final-exam',
      currentLevelTitle: context.regionTitle || '第七天裂隙空域',
      entropy: Number(context.entropy || 0),
      rescued: residentsCount(),
      lost: lostCount(),
      recentCreations: creations().map(creationName).filter(Boolean).slice(-5),
      towerDefenseResult: context.towerDefenseResult || null,
      playerStyle: context.playerStyle || '未知',
      ...extra
    };
  }

  async function requestAirCombatText(eventType, fallbackText, extraContext = {}) {
    if (typeof fetch !== 'function') return '';
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), 6500) : null;
    const weapon = weaponLoadout();
    try {
      const response = await fetch('/api/narrative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller?.signal,
        body: JSON.stringify({
          type: 'event',
          playerInput: fallbackText,
          context: {
            eventType,
            characters: Array.isArray(context.rescuedResidents) ? context.rescuedResidents.slice(0, 5) : [],
            location: context.regionTitle || '第七天裂隙空域',
            result: '第七天裂隙空域正在把地面考核记忆清算成 Boss 航线。',
            weapon: weapon.name,
            weaponSource: weapon.sourceCreation,
            ...extraContext
          },
          worldState: worldState(extraContext.worldState || {})
        })
      });
      if (!response.ok) return '';
      const data = await response.json();
      return cleanNarrative(data?.text || data?.narrative || '');
    } catch (_error) {
      return '';
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  function lineFor(event, boss = null) {
    const weapon = weaponLoadout();
    if (event === 'weapon') return `${weapon.name}发生副作用：${weapon.description}`;
    if (event === 'near') return '裂隙残影贴近机翼，通讯里有人短促地吸了一口气。';
    if (event === 'victory') return '第七天没有被消灭，它只是终于愿意让世界继续。';
    if (event === 'defeat') return '空域载体坠回裂隙，世界还需要下一次清算。';
    if (event === 'boss-defeated' && boss) return `${boss.title}被清算，${boss.memory}`;
    if (boss) return boss.lines[Math.min(boss.lines.length - 1, Math.floor(Math.random() * boss.lines.length))];
    return fallbackBrief();
  }

  function syncChrome() {
    document.title = '第七天裂隙空域 - 造物者考核3D';
    const brief = document.getElementById('airspace-brief');
    const loadout = document.getElementById('airspace-loadout');
    const weapon = weaponLoadout();
    const fallback = fallbackBrief();
    if (brief) {
      brief.textContent = fallback;
      requestAirCombatText('airspace_brief', fallback, {
        route: route().map(boss => `${boss.stage}.${boss.title}`).join(' / '),
        weapon: weapon.name
      }).then(text => {
        if (text && brief.textContent === fallback) brief.textContent = text;
      });
    }
    if (loadout) {
      loadout.innerHTML = `
        <div><strong>${weapon.name}</strong> 来自「${weapon.sourceCreation}」</div>
        <div>${weapon.description}</div>
        <div>航线：6 段 Boss 清算 · 熵值 ${Number(context.entropy || 0)}</div>
      `;
    }
  }

  function publishResult(result) {
    const payload = {
      id: result.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      mode: 'rift_airspace',
      day: 7,
      regionId: context.regionId || 'final-exam',
      outcome: result.outcome || 'defeat',
      score: Math.max(0, Math.round(result.score || 0)),
      clearedLayers: result.clearedLayers || 0,
      bossDefeated: result.bossDefeated || [],
      damageTaken: Math.max(0, Math.round(result.damageTaken || 0)),
      creationOverload: result.creationOverload || 0,
      rescuedEchoes: result.rescuedEchoes || 0,
      endingModifier: result.endingModifier || (result.outcome === 'victory' ? 'airspace_cleansed' : 'airspace_scarred'),
      weapon: weaponLoadout(),
      notableMoment: result.notableMoment || lineFor(result.outcome === 'victory' ? 'victory' : 'defeat')
    };
    try { localStorage.setItem(RESULT_KEY, JSON.stringify(payload)); } catch (_error) {}
    try {
      if (window.opener && window.opener !== window) {
        window.opener.postMessage({ type: 'creator_exam_air_combat_result', result: payload }, window.location.origin);
      }
    } catch (_error) {}
    return payload;
  }

  function returnToMain() {
    try {
      if (window.opener && window.opener !== window) {
        window.opener.focus();
        window.close();
        return;
      }
    } catch (_error) {}
    window.location.href = '../../index.html';
  }

  window.AirCombatBridge = {
    context,
    route,
    difficulty,
    weaponLoadout,
    lineFor,
    requestAirCombatText,
    syncChrome,
    publishResult,
    returnToMain,
    keys: { context: CONTEXT_KEY, result: RESULT_KEY }
  };

  syncChrome();
})();
