import { WorldSimulation } from '../public/js/worldSimulation.js';
import { RegionManager } from '../public/js/regionManager.js';
import { RuleValidator } from '../public/js/ruleValidator.js';
import { DebugGame } from './debugGame.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const world = new WorldSimulation();
world.recordGameEvent({
  type: 'unit_rescued',
  regionId: 'flood-village',
  actorId: 'player',
  turn: 3,
  payload: { residentId: 'resident-xiaozhu', unitName: '小烛' },
  importance: 0.9,
  tags: ['rescue', 'resident']
});

const manager = new RegionManager({
  validator: new RuleValidator(),
  candidateProvider: async () => ({
    id: 'scenario-highland-refuge',
    title: '高地避难所',
    map: ['.......', '.......', '..W....', '..W....', '.......', '.......', '.......'],
    units: [{ type: 'villager', name: '小烛', x: 0, y: 0, goal: { x: 6, y: 6 }, residentId: 'resident-xiaozhu' }],
    hazard: { type: 'flood', spreadPerTurn: 1 },
    win: 'requiredRescue',
    requiredRescue: 1
  })
});

const region = await manager.generateNextRegion({
  sourceRegionId: 'flood-village',
  hooks: world.getFutureHooks('flood-village')
});

const game = new DebugGame();
game.loadRegion(region);
game.endTurn();

assert(game.level.id === 'scenario-highland-refuge', 'generated region must load');
assert(game.units.some(unit => unit.residentId === 'resident-xiaozhu'), 'resident unit must survive region generation');
console.log('Region scenario passed.');
