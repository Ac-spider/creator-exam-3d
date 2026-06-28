import { EventBus } from './eventBus.js';
import { ResidentRegistry } from './residentRegistry.js';

function hookId(type, eventId) {
  return `hook-${type}-${eventId}`;
}

function eventText(event) {
  const payload = event.payload || {};
  if (event.type === 'unit_rescued') return `${payload.unitName || '某位居民'}在${event.regionId}被玩家救下`;
  if (event.type === 'unit_lost') return `${payload.unitName || '某位居民'}在${event.regionId}失踪或遇难`;
  if (event.type === 'creation_placed') return `玩家在${event.regionId}创造了「${payload.creationName || '未命名造物'}」`;
  if (event.type === 'region_resolved') return `${event.regionId}的危机被解决`;
  if (event.type === 'region_lost') return `${event.regionId}的危机留下了伤痕`;
  return `${event.regionId}发生了${event.type}`;
}

export class WorldSimulation {
  constructor(options = {}) {
    this.eventBus = options.eventBus || new EventBus();
    this.residentRegistry = options.residentRegistry || new ResidentRegistry();
    this.futureHooks = new Map();
  }

  recordGameEvent(rawEvent) {
    const event = this.eventBus.emit(rawEvent);
    this.ensureResidentFromEvent(event);
    this.updateResidentMemories(event);
    for (const hook of this.deriveFutureHooks(event)) {
      this.addFutureHook(event.regionId, hook);
    }
    return event;
  }

  ensureResidentFromEvent(event) {
    const payload = event.payload || {};
    if (!payload.residentId) return null;
    const resident = this.residentRegistry.upsertResident({
      residentId: payload.residentId,
      name: payload.unitName || payload.residentName || payload.residentId,
      currentRegionId: event.regionId,
      homeRegionId: event.regionId,
      mood: event.type === 'unit_lost' ? 'grieving' : 'alert',
      currentGoal: event.type === 'unit_lost'
        ? 'leave a trace for whoever can still help'
        : 'decide whether to trust the player again'
    });
    return resident;
  }

  updateResidentMemories(event) {
    const residentIds = new Set();
    if (event.payload?.residentId) residentIds.add(event.payload.residentId);
    for (const target of event.payload?.residentIds || []) residentIds.add(target);
    for (const target of event.payload?.targets || []) residentIds.add(target);

    for (const residentId of residentIds) {
      this.residentRegistry.recordMemory(residentId, {
        type: event.type,
        text: eventText(event),
        regionId: event.regionId,
        importance: event.importance
      });
    }
  }

  deriveFutureHooks(event) {
    const hooks = [];
    const payload = event.payload || {};

    if (event.type === 'unit_rescued' && payload.residentId) {
      hooks.push({
        id: hookId('resident_migration', event.id),
        type: 'resident_migration',
        sourceEventId: event.id,
        sourceRegionId: event.regionId,
        residentId: payload.residentId,
        summary: `${payload.unitName || '被救居民'}可能在后续区域再次出现`,
        priority: 0.8
      });
    }

    if (event.type === 'unit_lost') {
      hooks.push({
        id: hookId('missing_person', event.id),
        type: 'missing_person',
        sourceEventId: event.id,
        sourceRegionId: event.regionId,
        residentName: payload.unitName || '未知居民',
        summary: `${payload.unitName || '某人'}的失踪会留下遗物、传闻或关系后果`,
        priority: 0.7
      });
    }

    if (event.type === 'creation_placed' && Number(payload.entropyDelta || 0) > 0) {
      hooks.push({
        id: hookId('entropy_scar', event.id),
        type: 'entropy_scar',
        sourceEventId: event.id,
        sourceRegionId: event.regionId,
        creationName: payload.creationName || '未命名造物',
        ability: payload.ability || 'unknown',
        summary: `「${payload.creationName || '未命名造物'}」留下的裂隙可能污染未来区域`,
        priority: Math.min(1, 0.4 + Number(payload.entropyDelta || 0) * 0.2)
      });
    }

    if (event.type === 'region_lost') {
      hooks.push({
        id: hookId('region_aftermath', event.id),
        type: 'region_aftermath',
        sourceEventId: event.id,
        sourceRegionId: event.regionId,
        summary: `${event.regionId}失败后的后果会影响附近区域`,
        priority: 0.9
      });
    }

    return hooks;
  }

  addFutureHook(regionId, hook) {
    if (!this.futureHooks.has(regionId)) this.futureHooks.set(regionId, []);
    const hooks = this.futureHooks.get(regionId);
    if (!hooks.some(existing => existing.id === hook.id)) hooks.push(hook);
  }

  getFutureHooks(regionId = null) {
    if (regionId) return [...(this.futureHooks.get(regionId) || [])];
    return Array.from(this.futureHooks.values()).flat();
  }

  serialize() {
    return {
      version: 1,
      eventBus: this.eventBus.serialize(),
      residentRegistry: this.residentRegistry.serialize(),
      futureHooks: Array.from(this.futureHooks.entries())
    };
  }

  deserialize(data = {}) {
    this.eventBus.deserialize(data.eventBus || {});
    this.residentRegistry.deserialize(data.residentRegistry || {});
    this.futureHooks = new Map(Array.isArray(data.futureHooks) ? data.futureHooks : []);
  }
}
