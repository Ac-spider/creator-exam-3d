function freezeInstances(instances) {
  return Object.freeze(instances.map(instance => Object.freeze({
    position: Object.freeze([...instance.position]),
    rotation: Object.freeze([...(instance.rotation || [0, 0, 0])]),
    scale: Object.freeze([...(instance.scale || [1, 1, 1])])
  })))
}

function presentation(background, model, instances) {
  return Object.freeze({
    background,
    model,
    instances: freezeInstances(instances)
  })
}

export const LEVEL_PRESENTATION_ASSETS = Object.freeze({
  'flood-village': presentation(
    '/assets/art/backgrounds/level-01-flood-village.webp',
    '/assets/models/kenney-nature/village-tent.glb',
    [
      { position: [-7.2, -0.15, -2.8], rotation: [0, 0.72, 0], scale: [1.28, 1.28, 1.28] },
      { position: [7.25, -0.15, 2.6], rotation: [0, -2.28, 0], scale: [1.18, 1.18, 1.18] }
    ]
  ),
  'night-mine': presentation(
    '/assets/art/backgrounds/level-02-night-mine.webp',
    '/assets/models/kenney-nature/mine-cave.glb',
    [
      { position: [0, -0.18, -7.7], rotation: [0, Math.PI, 0], scale: [1.38, 1.38, 1.38] }
    ]
  ),
  'giant-city': presentation(
    '/assets/art/backgrounds/level-03-giant-city.webp',
    '/assets/models/kenney-nature/forest-pine.glb',
    [
      { position: [-7.15, -0.2, -2.5], rotation: [0, 0.38, 0], scale: [1.36, 1.36, 1.36] },
      { position: [7.2, -0.2, 1.75], rotation: [0, -0.45, 0], scale: [1.18, 1.18, 1.18] },
      { position: [-2.3, -0.2, -7.25], rotation: [0, 1.08, 0], scale: [1.05, 1.05, 1.05] }
    ]
  ),
  'wordless-war': presentation(
    '/assets/art/backgrounds/level-04-wordless-war.webp',
    '/assets/models/kenney-nature/border-gate.glb',
    [
      { position: [0, -0.18, -7.55], rotation: [0, Math.PI, 0], scale: [1.15, 1.15, 1.15] }
    ]
  ),
  'memory-plague': presentation(
    '/assets/art/backgrounds/level-05-memory-plague.webp',
    '/assets/models/kenney-nature/sacred-oak.glb',
    [
      { position: [0, -0.2, -7.65], rotation: [0, -0.28, 0], scale: [1.48, 1.48, 1.48] }
    ]
  ),
  'final-exam': presentation(
    '/assets/art/backgrounds/level-06-final-exam.webp',
    '/assets/models/kenney-nature/rift-ring.glb',
    [
      { position: [0, 0.15, -7.5], rotation: [0, Math.PI, 0], scale: [1.72, 1.72, 1.72] }
    ]
  )
})

export class LevelPresentationLoader {
  constructor({ loadTexture, loadModel, manifest = LEVEL_PRESENTATION_ASSETS }) {
    if (typeof loadTexture !== 'function' || typeof loadModel !== 'function') {
      throw new TypeError('LevelPresentationLoader requires texture and model loaders')
    }
    this.loadTexture = loadTexture
    this.loadModel = loadModel
    this.manifest = manifest
    this.textureCache = new Map()
    this.modelCache = new Map()
    this.activeLevelId = null
    this.requestId = 0
  }

  apply(levelId, handlers = {}) {
    const entry = this.manifest[levelId]
    this.activeLevelId = levelId
    const requestId = ++this.requestId
    if (!entry) return Promise.resolve([])

    const load = (kind, url, cache, loader, onReady) => this.loadCached(cache, url, loader)
      .then(asset => {
        if (this.isCurrent(levelId, requestId)) onReady?.(asset, entry)
        return asset
      })
      .catch(error => {
        if (this.isCurrent(levelId, requestId)) handlers.onError?.(kind, error, entry)
        return null
      })

    return Promise.all([
      load('background', entry.background, this.textureCache, this.loadTexture, handlers.onBackground),
      load('model', entry.model, this.modelCache, this.loadModel, handlers.onModel)
    ])
  }

  isCurrent(levelId, requestId) {
    return this.activeLevelId === levelId && this.requestId === requestId
  }

  loadCached(cache, url, loader) {
    if (!cache.has(url)) {
      let request
      try {
        request = Promise.resolve(loader(url))
      } catch (error) {
        request = Promise.reject(error)
      }
      cache.set(url, request)
      request.catch(() => {
        if (cache.get(url) === request) cache.delete(url)
      })
    }
    return cache.get(url)
  }
}
