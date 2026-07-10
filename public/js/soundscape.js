export const SOUND_MANIFEST = Object.freeze({
  uiSelect: { src: './assets/audio/kenney/ui-select.ogg', volume: 0.16 },
  creationCompile: { src: './assets/audio/kenney/creation-compile.ogg', volume: 0.34 },
  creationPlace: { src: './assets/audio/kenney/creation-place.ogg', volume: 0.4 },
  legendDiscovery: { src: './assets/audio/kenney/legend-discovery.ogg', volume: 0.42 },
  levelWin: { src: './assets/audio/kenney/level-win.ogg', volume: 0.45 },
  levelLoss: { src: './assets/audio/kenney/level-loss.ogg', volume: 0.42 },
  riftPulse: { src: './assets/audio/kenney/rift-pulse.ogg', volume: 0.22 }
})

const SOUND_STORAGE_KEY = 'creatorExamSound'

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value)))
}

export class Soundscape {
  constructor({ audioFactory, storage, now } = {}) {
    this.audioFactory = audioFactory || (src => new globalThis.Audio(src))
    this.storage = storage === undefined ? globalThis.localStorage : storage
    this.now = now || (() => Date.now())
    this.enabled = this.readEnabledPreference()
    this.unlocked = false
    this.lastPlayedAt = new Map()
    this.unlockTarget = null
    this.unlockHandler = null
  }

  readEnabledPreference() {
    try {
      return this.storage?.getItem(SOUND_STORAGE_KEY) !== 'muted'
    } catch (_error) {
      return true
    }
  }

  bindUnlock(target = globalThis.window) {
    if (!target?.addEventListener || this.unlockHandler) return false
    this.unlockTarget = target
    this.unlockHandler = () => this.unlock()
    target.addEventListener('pointerdown', this.unlockHandler, true)
    target.addEventListener('keydown', this.unlockHandler, true)
    return true
  }

  unlock() {
    this.unlocked = true
    if (this.unlockTarget && this.unlockHandler) {
      this.unlockTarget.removeEventListener('pointerdown', this.unlockHandler, true)
      this.unlockTarget.removeEventListener('keydown', this.unlockHandler, true)
    }
    this.unlockTarget = null
    this.unlockHandler = null
    return true
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled)
    try {
      this.storage?.setItem(SOUND_STORAGE_KEY, this.enabled ? 'enabled' : 'muted')
    } catch (_error) {
      // Storage can be unavailable in private or embedded browsing contexts.
    }
    return this.enabled
  }

  toggle() {
    return this.setEnabled(!this.enabled)
  }

  play(name, { volume, playbackRate = 1, cooldownMs = 80 } = {}) {
    const definition = SOUND_MANIFEST[name]
    if (!definition || !this.enabled || !this.unlocked) return false

    const playedAt = this.now()
    if (playedAt - (this.lastPlayedAt.get(name) || 0) < cooldownMs) return false

    try {
      const audio = this.audioFactory(definition.src)
      audio.preload = 'auto'
      audio.volume = clamp(volume ?? definition.volume, 0, 1)
      audio.playbackRate = clamp(playbackRate, 0.5, 2)
      const pending = audio.play()
      pending?.catch?.(() => {})
      this.lastPlayedAt.set(name, playedAt)
      return true
    } catch (_error) {
      return false
    }
  }
}
