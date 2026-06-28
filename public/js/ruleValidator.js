const ALLOWED_TERRAIN = new Set(['.', '~', 'H', 'V', 'E', 'C', 'B', 'F', 'M', 'D', 'G', 'S', 'W', 'P']);
const ALLOWED_UNIT_TYPES = new Set(['villager', 'miner', 'beast', 'tribeA', 'tribeB']);

function addError(errors, code, message) {
  errors.push({ code, message });
}

function inBounds(x, y) {
  return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && x < 7 && y >= 0 && y < 7;
}

function isPassable(symbol) {
  return symbol !== '~' && symbol !== 'M';
}

function shortestPathDistance(region, unit) {
  const map = region.map.map(row => String(row).split(''));
  const queue = [{ x: unit.x, y: unit.y, distance: 0 }];
  const seen = new Set([`${unit.x},${unit.y}`]);
  while (queue.length > 0) {
    const current = queue.shift();
    if (current.x === unit.goal.x && current.y === unit.goal.y) return current.distance;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = current.x + dx;
      const ny = current.y + dy;
      const key = `${nx},${ny}`;
      if (!inBounds(nx, ny) || seen.has(key) || !isPassable(map[ny][nx])) continue;
      seen.add(key);
      queue.push({ x: nx, y: ny, distance: current.distance + 1 });
    }
  }
  return Infinity;
}

export class RuleValidator {
  validateRegion(region) {
    const errors = [];
    if (!region || typeof region !== 'object') addError(errors, 'region_missing', 'region must be an object');
    if (!region?.id) addError(errors, 'id_missing', 'region id is required');
    if (!Array.isArray(region?.map) || region.map.length !== 7 || region.map.some(row => String(row).length !== 7)) {
      addError(errors, 'map_size', 'map must be 7 rows of 7 symbols');
    }

    if (Array.isArray(region?.map)) {
      for (let y = 0; y < region.map.length; y++) {
        const row = String(region.map[y]);
        for (let x = 0; x < row.length; x++) {
          if (!ALLOWED_TERRAIN.has(row[x])) addError(errors, 'terrain_symbol', `invalid terrain ${row[x]} at ${x},${y}`);
        }
      }
    }

    const units = Array.isArray(region?.units) ? region.units : [];
    if (units.length === 0) addError(errors, 'units_missing', 'region needs at least one unit');
    for (const unit of units) {
      if (!ALLOWED_UNIT_TYPES.has(unit.type)) addError(errors, 'unit_type', `invalid unit type ${unit.type}`);
      if (!inBounds(unit.x, unit.y)) addError(errors, 'unit_position', `invalid unit position for ${unit.name}`);
      if (unit.goal && !inBounds(unit.goal.x, unit.goal.y)) addError(errors, 'unit_goal', `invalid goal for ${unit.name}`);
      if (unit.residentId && !String(unit.residentId).startsWith('resident-')) addError(errors, 'resident_id', `invalid residentId ${unit.residentId}`);
    }

    if (region.win === 'requiredRescue' && Number(region.requiredRescue || 0) > units.filter(unit => unit.type === 'villager').length) {
      addError(errors, 'required_rescue', 'requiredRescue cannot exceed villager count');
    }

    if (errors.length === 0) this.validateReachability(region, errors);
    return { ok: errors.length === 0, errors };
  }

  validateReachability(region, errors) {
    const map = region.map.map(row => String(row).split(''));
    for (const unit of region.units || []) {
      if (!unit.goal || !inBounds(unit.x, unit.y) || !inBounds(unit.goal.x, unit.goal.y)) continue;
      const queue = [{ x: unit.x, y: unit.y }];
      const seen = new Set([`${unit.x},${unit.y}`]);
      let reached = false;
      while (queue.length > 0) {
        const current = queue.shift();
        if (current.x === unit.goal.x && current.y === unit.goal.y) {
          reached = true;
          break;
        }
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = current.x + dx;
          const ny = current.y + dy;
          const key = `${nx},${ny}`;
          if (!inBounds(nx, ny) || seen.has(key) || !isPassable(map[ny][nx])) continue;
          seen.add(key);
          queue.push({ x: nx, y: ny });
        }
      }
      if (!reached) addError(errors, 'unreachable_goal', `${unit.name || unit.type} cannot reach goal`);
    }
  }

  simulateRegionViability(region, options = {}) {
    const structural = this.validateRegion(region);
    const errors = [...structural.errors];
    const maxTurns = Number.isFinite(Number(options.maxTurns))
      ? Number(options.maxTurns)
      : Number(region?.maxTurns || 8);
    const villagerUnits = (region?.units || []).filter(unit => unit.type === 'villager' && unit.goal);
    const distances = villagerUnits.map(unit => shortestPathDistance(region, unit));
    const reachableDistances = distances.filter(distance => Number.isFinite(distance));
    const shortestRescueDistance = reachableDistances.length ? Math.min(...reachableDistances) : Infinity;
    const requiredRescue = Number(region?.requiredRescue || 0);

    if (structural.ok && requiredRescue > 0 && reachableDistances.length < requiredRescue) {
      addError(errors, 'rescue_count', 'not enough reachable villagers for requiredRescue');
    }

    if (structural.ok && requiredRescue > 0 && shortestRescueDistance > maxTurns) {
      addError(errors, 'rescue_timing', `shortest rescue distance ${shortestRescueDistance} exceeds maxTurns ${maxTurns}`);
    }

    if (structural.ok && region?.hazard?.spreadPerTurn > 3) {
      addError(errors, 'hazard_pressure', 'hazard spreadPerTurn cannot exceed 3 for generated regions');
    }

    return {
      ok: errors.length === 0,
      errors,
      metrics: {
        maxTurns,
        requiredRescue,
        reachableVillagers: reachableDistances.length,
        shortestRescueDistance
      }
    };
  }
}
