import { readFileSync } from 'node:fs';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const gameSource = readFileSync(new URL('../public/js/game.js', import.meta.url), 'utf8');
const endTurnMatches = [...gameSource.matchAll(/^  endTurn\(\) \{/gm)];
assert(endTurnMatches.length === 1, 'browser game should expose exactly one endTurn override');
const start = endTurnMatches[0].index;
const end = gameSource.indexOf('  nextStepToward(unit, goal) {', start);
assert(end !== -1, 'turn reliability test should find the method after endTurn');
const endTurnBlock = gameSource.slice(start, end);

assert(gameSource.includes('this.isResolvingTurn = false'), 'browser game should initialize turn resolution lock');
assert(gameSource.includes('isResolvingTurn: this.isResolvingTurn'), 'debug state should expose turn lock state for browser smoke checks');
assert(gameSource.includes('endTurnDisabled: !!this.ui.endTurnBtn?.disabled'), 'debug state should expose end-turn disabled state');
assert(gameSource.includes("endTurnText: this.ui.endTurnBtn?.textContent || ''"), 'debug state should expose end-turn pending text');
assert(endTurnBlock.includes('setTurnControlsPending(true)'), 'endTurn should mark controls pending before resolving');
assert(endTurnBlock.includes('if (this.isResolvingTurn) return'), 'endTurn should ignore rapid duplicate triggers');
assert(gameSource.includes("this.ui.endTurnBtn.textContent = pending ? '结算中...' : '结束回合'"), 'end-turn button should show pending feedback');
assert(endTurnBlock.includes('releaseTurnResolutionLock()'), 'turn lock should release after the current event turn');
assert(gameSource.includes('TURN_RESOLUTION_LOCK_MS = 300'), 'turn lock should cover browser double-click timing');
assert(gameSource.includes('}, TURN_RESOLUTION_LOCK_MS)'), 'turn lock should release after the cooldown window');

console.log('Turn reliability tests passed.');
