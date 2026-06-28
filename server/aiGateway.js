export class AIGateway {
  constructor(options = {}) {
    this.budget = options.budget || { maxCalls: 20, remainingCalls: 20 };
    this.retries = options.retries || 1;
    this.timeoutMs = options.timeoutMs || 12000;
    this.provider = options.provider || null;
    this.cache = new Map();
    this.stats = {
      totalCalls: 0,
      successCalls: 0,
      fallbackCalls: 0,
      remainingCalls: this.budget.maxCalls
    };
  }

  getStats() {
    return {
      totalCalls: this.stats.totalCalls,
      successCalls: this.stats.successCalls,
      fallbackCalls: this.stats.fallbackCalls,
      remainingCalls: this.stats.remainingCalls
    };
  }

  async requestJson(request) {
    if (this.stats.remainingCalls <= 0) {
      return { data: request.fallback, fromCache: false, budgetExceeded: true };
    }

    const cacheKey = request.cacheKey || JSON.stringify(request.messages);
    if (this.cache.has(cacheKey)) {
      return { data: this.cache.get(cacheKey), fromCache: true };
    }

    this.stats.totalCalls++;
    this.stats.remainingCalls--;

    let lastError = null;
    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        const result = await this._callProvider(request);
        if (result.ok && result.json) {
          this.stats.successCalls++;
          this.cache.set(cacheKey, result.json);
          return { data: result.json, fromCache: false };
        }
        if (result.reason === 'missing_key') {
          break;
        }
      } catch (error) {
        lastError = error;
      }
    }

    this.stats.fallbackCalls++;
    return { data: request.fallback, fromCache: false, error: lastError?.message || 'provider_failed' };
  }

  async _callProvider(request) {
    if (!this.provider) {
      return { ok: false, json: null, reason: 'no_provider' };
    }
    return await this.provider(request);
  }
}
