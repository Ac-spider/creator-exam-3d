import { WorldSimulation } from '../public/js/worldSimulation.js'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const world = new WorldSimulation()

world.recordGameEvent({
  type: 'unit_rescued',
  regionId: 'flood-village',
  actorId: 'player',
  turn: 3,
  payload: { residentId: 'resident-xiaozhu', unitName: '小烛' },
  importance: 0.9,
  tags: ['rescue', 'resident']
})

world.tickResidents('flood-village', { turn: 4 })

const saved = world.serialize()
const reloaded = new WorldSimulation()
reloaded.deserialize(saved)
reloaded.residentRegistry.moveResident('resident-xiaozhu', 'highland-refuge')

const actions = reloaded.tickResidents('highland-refuge', { turn: 1 })
const projection = reloaded.residentRegistry.projectForRegion('resident-xiaozhu', 'highland-refuge')

assert(projection.residentId === 'resident-xiaozhu', 'residentId must survive reload and region move')
assert(projection.memories.some(memory => memory.type === 'unit_rescued'), 'resident memory must survive reload')
assert(actions.some(action => action.residentId === 'resident-xiaozhu'), 'resident must act in the second region')

console.log('World simulation scenario passed.')
