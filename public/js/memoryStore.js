export const WORLD_STORAGE_KEY = 'creator_exam_world_state';
export const WORLD_SCHEMA_VERSION = 2;

export function createMemoryStorage(initial = {}) {
  const data = { ...initial };
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
    },
    setItem(key, value) {
      data[key] = String(value);
    },
    removeItem(key) {
      delete data[key];
    },
    dump() {
      return { ...data };
    }
  };
}

function defaultStorage() {
  if (typeof localStorage === 'undefined' || localStorage === null) return createMemoryStorage();
  return localStorage;
}

export class MemoryStore {
  constructor(options = {}) {
    this.storage = options.storage || defaultStorage();
    this.key = options.key || WORLD_STORAGE_KEY;
    this.lastError = null;
  }

  saveWorld(worldSimulation) {
    const snapshot = {
      version: WORLD_SCHEMA_VERSION,
      savedAt: Date.now(),
      worldSimulation: worldSimulation.serialize()
    };
    this.storage.setItem(this.key, JSON.stringify(snapshot));
    return snapshot;
  }

  loadWorld(worldSimulation) {
    const raw = this.storage.getItem(this.key);
    if (!raw) return false;
    try {
      const snapshot = JSON.parse(raw);
      const migrated = this.migrate(snapshot);
      worldSimulation.deserialize(migrated.worldSimulation || {});
      this.lastError = null;
      return true;
    } catch (error) {
      this.lastError = { code: 'load_failed', message: error.message };
      return false;
    }
  }

  migrate(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') throw new Error('snapshot must be an object');
    if (snapshot.version === WORLD_SCHEMA_VERSION) return snapshot;

    // Version 1 → 2: add residentAgentSystem if missing
    if (snapshot.version === 1) {
      const migrated = {
        ...snapshot,
        version: 2,
        worldSimulation: {
          ...snapshot.worldSimulation,
          residentAgentSystem: snapshot.worldSimulation?.residentAgentSystem || { version: 1, recentEventsByResident: [] }
        }
      };
      return migrated;
    }

    // Legacy (no version) migration
    if (!snapshot.version && snapshot.worldSimulation) {
      return { version: WORLD_SCHEMA_VERSION, savedAt: Date.now(), worldSimulation: snapshot.worldSimulation };
    }

    throw new Error(`unsupported world schema version: ${snapshot.version}`);
  }
}
