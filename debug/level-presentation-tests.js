import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import {
  LEVEL_PRESENTATION_ASSETS,
  LevelPresentationLoader
} from '../public/js/levelPresentation.js'

const LEVEL_IDS = [
  'flood-village',
  'night-mine',
  'giant-city',
  'wordless-war',
  'memory-plague',
  'final-exam'
]

const EXPECTED_MODELS = {
  'flood-village': 'village-tent.glb',
  'night-mine': 'mine-cave.glb',
  'giant-city': 'forest-pine.glb',
  'wordless-war': 'border-gate.glb',
  'memory-plague': 'sacred-oak.glb',
  'final-exam': 'rift-ring.glb'
}

function deferred() {
  let resolve
  let reject
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

assert.deepEqual(Object.keys(LEVEL_PRESENTATION_ASSETS), LEVEL_IDS, 'presentation manifest should cover exactly the six authored levels')

for (const [index, levelId] of LEVEL_IDS.entries()) {
  const presentation = LEVEL_PRESENTATION_ASSETS[levelId]
  assert.equal(
    presentation.background,
    `/assets/art/backgrounds/level-0${index + 1}-${levelId}.webp`,
    `${levelId} should use its own generated image-2 backplate`
  )
  assert.ok(presentation.model.endsWith(EXPECTED_MODELS[levelId]), `${levelId} should use its selected Kenney model`)
  assert.ok(existsSync(new URL(`../public${presentation.model}`, import.meta.url)), `${levelId} public model should exist locally`)
  assert.ok(existsSync(new URL(`../public${presentation.background}`, import.meta.url)), `${levelId} generated backplate should exist locally`)
  assert.ok(presentation.instances.length > 0, `${levelId} should place at least one public model`)
  for (const instance of presentation.instances) {
    assert.equal(instance.position.length, 3, `${levelId} model position should be a vec3`)
    assert.equal(instance.scale.length, 3, `${levelId} model scale should be a vec3`)
    assert.equal(instance.rotation.length, 3, `${levelId} model rotation should be a vec3`)
    assert.ok(
      Math.abs(instance.position[0]) >= 6.8 || Math.abs(instance.position[2]) >= 6.8,
      `${levelId} public model anchor should stay outside the 7x7 board`
    )
  }
}

const textureRequests = []
const modelRequests = []
const assetLoader = new LevelPresentationLoader({
  loadTexture: (url) => {
    const request = deferred()
    textureRequests.push({ url, ...request })
    return request.promise
  },
  loadModel: (url) => {
    const request = deferred()
    modelRequests.push({ url, ...request })
    return request.promise
  }
})

const applied = []
const floodLoad = assetLoader.apply('flood-village', {
  onBackground: (_texture, entry) => applied.push(`background:${entry.background}`),
  onModel: (_model, entry) => applied.push(`model:${entry.model}`)
})
const duplicateFloodLoad = assetLoader.apply('flood-village', {
  onBackground: (_texture, entry) => applied.push(`background-duplicate:${entry.background}`),
  onModel: (_model, entry) => applied.push(`model-duplicate:${entry.model}`)
})

assert.equal(textureRequests.length, 1, 'duplicate level activation should reuse the in-flight texture request')
assert.equal(modelRequests.length, 1, 'duplicate level activation should reuse the in-flight model request')

const mineLoad = assetLoader.apply('night-mine', {
  onBackground: () => applied.push('background:night-mine'),
  onModel: () => applied.push('model:night-mine')
})
assert.equal(textureRequests.length, 2, 'a different level should request its own texture')
assert.equal(modelRequests.length, 2, 'a different level should request its own model')

textureRequests[0].resolve({ id: 'stale-flood-texture' })
modelRequests[0].resolve({ id: 'stale-flood-model' })
await Promise.all([floodLoad, duplicateFloodLoad])
assert.deepEqual(applied, [], 'late assets from a previous level must not overwrite the current presentation')

textureRequests[1].resolve({ id: 'mine-texture' })
modelRequests[1].resolve({ id: 'mine-model' })
await mineLoad
assert.deepEqual(applied.sort(), ['background:night-mine', 'model:night-mine'], 'current level assets should apply after loading')

const retryRequests = []
const retryLoader = new LevelPresentationLoader({
  loadTexture: () => {
    const request = deferred()
    retryRequests.push(request)
    return request.promise
  },
  loadModel: async () => ({ id: 'model' })
})
const failedAttempt = retryLoader.apply('giant-city')
retryRequests[0].reject(new Error('temporary texture failure'))
await failedAttempt
const retryAttempt = retryLoader.apply('giant-city')
assert.equal(retryRequests.length, 2, 'failed resources should leave the cache so a later level activation can retry')
retryRequests[1].resolve({ id: 'recovered-texture' })
await retryAttempt

const gameSource = readFileSync(new URL('../public/js/game.js', import.meta.url), 'utf8')
const serverSource = readFileSync(new URL('../server.js', import.meta.url), 'utf8')

assert.ok(gameSource.includes("import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'"), 'browser renderer should import GLTFLoader')
assert.ok(gameSource.includes('texture.colorSpace = THREE.SRGBColorSpace'), 'generated backplates should be decoded in sRGB')
assert.ok(gameSource.includes('root.userData.decorative = true'), 'public model roots should be marked decorative')
assert.ok(gameSource.includes('object.userData.decorative = true'), 'public model descendants should be marked decorative')
assert.ok(gameSource.includes('this.levelPresentationLoader.apply(levelId'), 'level changes should use the guarded presentation loader')
assert.ok(gameSource.includes('delete this.environmentGroup.userData.backgroundAsset'), 'level clearing should remove stale background metadata before fallback')
assert.ok(!gameSource.includes('this.presentationTextureCache.clear()'), 'presentation textures should remain cached across level changes')
assert.ok(serverSource.includes("'.glb': 'model/gltf-binary'"), 'server MIME table must include binary glTF')
assert.ok(serverSource.includes("'.webp': 'image/webp'"), 'server MIME table must retain WebP')

console.log('Level presentation tests passed.')
