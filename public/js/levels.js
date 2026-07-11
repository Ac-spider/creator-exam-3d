export const TILE = Object.freeze({
  LAND: 'land',
  WATER: 'water',
  HIGH: 'high',
  VILLAGE: 'village',
  EXIT: 'exit',
  CITY: 'city',
  BORDER: 'border',
  FOREST: 'forest',
  MOUNTAIN: 'mountain',
  DARK: 'dark',
  FOG: 'fog',
  SACRED: 'sacred',
  SWAMP: 'swamp',
  BRIDGE: 'bridge',
  WALL: 'wall',
  FIELD: 'field',
  POISON: 'poison'
});

export const SYMBOL_TO_TILE = Object.freeze({
  '.': TILE.LAND,
  '~': TILE.WATER,
  'H': TILE.HIGH,
  'V': TILE.VILLAGE,
  'E': TILE.EXIT,
  'C': TILE.CITY,
  'B': TILE.BORDER,
  'F': TILE.FOREST,
  'M': TILE.MOUNTAIN,
  'D': TILE.DARK,
  'G': TILE.FOG,
  'S': TILE.SACRED,
  'W': TILE.SWAMP,
  'P': TILE.POISON
});

export const INSPIRATIONS = [
  '造一只透明水桶兽，把村口洪水背到左边河沟',
  '让石头浮在水面上，搭一段临时的桥',
  '种一棵会发光的月亮树，给人指路',
  '在城门前种一圈软花，让巨兽踩进去就慢下来',
  '在边境放一张白桌，让两个使者都朝它走',
  '立一块碑，唱出每个人老家的路名',
  '让风把迷路人的名字吹到圣树入口',
  '起一阵大风，把入口前的雾吹散',
  '给赶路的人系一串疾行铃，让他这回合多跑两步',
  '在地上铺一层路光苔，把藏起来的小径亮出来，人也走得快些',
  '撑开一顶星砂结界，把村庄罩在里头，雨进不来',
  '吹一口霜息花，把河面冻成镜子，人能直接踩过去',
  '让脚下的地隆笋往上拱，把低洼处顶成高地',
  '撒一把速生林的种子，一夜长成密林，挡住兽的去路',
  '在巨兽必经之处埋下缚兽藤，叫它一脚踏空就动弹不得',
  '在两头各开一扇星门，让人一眨眼就跨过半张棋盘',
  '给每个村民撑一把守护伞，洪水来了也浇不透',
  '拧开时漏沙，让巨兽的每一步都慢得像泡在水里',
  '升起一轮日华轮，光照之处毒退病消，人也精神',
];

export const LEVELS = [
  {
    id: 'flood-village',
    title: '第 1 关：洪水村庄',
    shortTitle: '洪水村庄',
    story: '雨下了三天，河堤从西边裂开。水已经进村，村民得在屋顶被淹前挪到东边高地。你不能直接搬人，只能动地形。',
    objective: '7 回合内救下至少 4 名居民，其中得有邮差。',
    maxTurns: 7,
    creationCharges: 3,
    miraclePoints: 5,
    entropyLimit: 7,
    requiredRescue: 4,
    map: [
      '~~~~...',
      '~~..~~.',
      '~..V..H',
      '~~.V~~H',
      '~~.V..H',
      '~~~~...',
      '~.~~~.~'
    ],
    units: [
      { type: 'villager', name: '阿粟', x: 3, y: 2, goal: { x: 6, y: 3 } },
      { type: 'villager', name: '小烛', x: 3, y: 3, goal: { x: 6, y: 3 } },
      { type: 'villager', name: '木匠', x: 3, y: 4, goal: { x: 6, y: 3 } },
      { type: 'villager', name: '邮差', x: 2, y: 2, goal: { x: 6, y: 3 } }
    ],
    hazard: { type: 'flood', spreadPerTurn: 4, source: 'left', spreadIntoUnits: true },
    win: 'requiredRescue',
    tips: ['吸水、造桥、挡水、引路，这些造物都管用。', '水上不了高地，但会把路断了。']
  },
  {
    id: 'night-mine',
    title: '第 2 关：永夜矿井',
    shortTitle: '永夜矿井',
    story: '矿灯一盏接一盏灭了。矿工只记得出口在东北，黑暗正顺着轨道往外爬。',
    objective: '8 回合内，至少 3 名矿工摸到出口。',
    maxTurns: 8,
    creationCharges: 3,
    miraclePoints: 7,
    entropyLimit: 7,
    requiredRescue: 3,
    map: [
      'E..D..D',
      '..DDD..',
      '.DDD...',
      '..M.M..',
      '..V...D',
      '...V..D',
      '..V..DD'
    ],
    units: [
      { type: 'miner', name: '矿工甲', x: 2, y: 4, goal: { x: 0, y: 0 } },
      { type: 'miner', name: '矿工乙', x: 3, y: 5, goal: { x: 0, y: 0 } },
      { type: 'miner', name: '矿工丙', x: 2, y: 6, goal: { x: 0, y: 0 } },
      { type: 'miner', name: '矿工丁', x: 4, y: 5, goal: { x: 0, y: 0 } }
    ],
    hazard: { type: 'darkness', spreadPerTurn: 2 },
    win: 'requiredRescue',
    tips: ['点灯、引路、净化、改地形，这些造物都能帮上矿工。', '矿工一进黑暗就找不着北。']
  },
  {
    id: 'giant-city',
    title: '第 3 关：巨兽困城',
    shortTitle: '巨兽困城',
    story: '古水巨兽正往城门挪。不能杀，它背上的水养着整条河。要么拦住它，要么让它先停下来。',
    objective: '撑过 15 回合：城不能叫巨兽踩进，它的怒气不能涨到 5。',
    maxTurns: 15,
    creationCharges: 3,
    miraclePoints: 6,
    entropyLimit: 7,
    map: [
      '...FF..',
      '.M..F..',
      '..M.F..',
      'W.....C',
      '..M.M..',
      '.FF.F..',
      'FF..V..'
    ],
    units: [
      { type: 'beast', name: '古水巨兽', x: 0, y: 3, goal: { x: 6, y: 3 }, anger: 0 }
    ],
    hazard: { type: 'beast' },
    win: 'survive',
    beastAngerLimit: 5,
    tips: ['安抚、拖延、挡路、引开，这些造物都管用。', '把路全堵死，巨兽反而更躁。']
  },
  {
    id: 'wordless-war',
    title: '第 4 关：失语战争',
    shortTitle: '失语战争',
    story: '两个部落都说对方偷了星火。没人肯先低头，雾又把边境盖住了，战争值正在往上跳。',
    objective: '8 回合结束时，战争值压到 8 以下，还得让两名使者在边境碰头。',
    maxTurns: 8,
    creationCharges: 3,
    miraclePoints: 7,
    entropyLimit: 7,
    map: [
      '..FV..B',
      '.MG.FB.',
      '.MGGBG.',
      'VGGBGGV',
      '.GBGGGG',
      '.B.VMM.',
      'B.FFM..'
    ],
    units: [
      { type: 'tribeA', name: '东岸使者', x: 0, y: 0, goal: { x: 3, y: 3 } },
      { type: 'tribeB', name: '西岸使者', x: 6, y: 6, goal: { x: 3, y: 3 } }
    ],
    hazard: { type: 'war', warMeter: 1, warLimit: 8 },
    win: 'peace',
    tips: ['安抚、翻译、唤记忆、引路，这几样是关键。', '雾一上来，使者就分不清该往哪走。']
  },
  {
    id: 'memory-plague',
    title: '第 5 关：记忆瘟疫',
    shortTitle: '记忆瘟疫',
    story: '村民开始忘路，连家门朝哪边都说不清。圣树还记得他们的名字，大雾正在把路擦掉。',
    objective: '10 回合内让至少 4 名村民抵达圣树。',
    maxTurns: 10,
    creationCharges: 4,
    miraclePoints: 8,
    entropyLimit: 8,
    requiredRescue: 4,
    memoryChaos: true,
    map: [
      '...S...',
      '..G.G..',
      '.G.W.G.',
      'G..G..G',
      '.G.W.G.',
      '..V.V..',
      '.V...V.'
    ],
    units: [
      { type: 'villager', name: '南枝', x: 2, y: 6, goal: { x: 3, y: 0 }, confused: false },
      { type: 'villager', name: '北声', x: 4, y: 6, goal: { x: 3, y: 0 }, confused: false },
      { type: 'villager', name: '阿眠', x: 0, y: 6, goal: { x: 3, y: 0 }, confused: false },
      { type: 'villager', name: '谷雨', x: 6, y: 6, goal: { x: 3, y: 0 }, confused: false },
      { type: 'villager', name: '织火', x: 3, y: 6, goal: { x: 3, y: 0 }, confused: false }
    ],
    hazard: { type: 'fog', spreadPerTurn: 4 },
    win: 'requiredRescue',
    tips: ['记忆信标、引路、净化、点灯，这几样很要紧。', '迷了路的人，会瞎走。']
  },
  {
    id: 'final-exam',
    title: '终考：第七天之前',
    shortTitle: '第七天之前',
    story: '洪水、永夜和失语一起压了回来。棋盘上没有空闲回合，每一次造物都得落在要害处。',
    objective: '8 回合内：救下 3 名居民，守住城，战争值压到 9 以下。',
    maxTurns: 8,
    creationCharges: 5,
    miraclePoints: 10,
    entropyLimit: 8,
    requiredRescue: 3,
    map: [
      '~~D.M.C',
      '~DDDM..',
      '..GGBDD',
      'F.V.B..',
      'FWV.BF.',
      '..VDB..',
      '~~~DB..'
    ],
    units: [
      { type: 'villager', name: '星砂', x: 2, y: 3, goal: { x: 6, y: 0 } },
      { type: 'villager', name: '青麦', x: 2, y: 4, goal: { x: 6, y: 0 } },
      { type: 'villager', name: '砾歌', x: 2, y: 5, goal: { x: 6, y: 0 } },
      { type: 'beast', name: '裂隙兽', x: 1, y: 4, goal: { x: 6, y: 0 }, anger: 0, hazardPhase: true  },
      { type: 'tribeA', name: '北境使者', x: 0, y: 2, goal: { x: 4, y: 2 } },
      { type: 'tribeB', name: '南境使者', x: 6, y: 4, goal: { x: 4, y: 2 } }
    ],
    hazard: { type: 'mixed', spreadPerTurn: 2, warMeter: 2, warLimit: 9 },
    win: 'final',
    beastAngerLimit: 5,
    tips: ['终考得几样造物一起上，光治一种灾不够。', '裂隙一高，就直接输了。']
  }
];

export function cloneLevel(level) {
  return JSON.parse(JSON.stringify(level));
}
