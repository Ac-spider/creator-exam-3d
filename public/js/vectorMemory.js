// Vector Semantic Memory System
// Local TF-IDF + cosine similarity for narrative memory retrieval
// Inspired by "Memory Systems for Believable NPCs" and NarrativeGenie (AIIDE 2024)

export class VectorMemory {
  constructor(dimension = 50) {
    this.dimension = dimension;
    this.embeddings = []; // { id, text, vector, metadata }
    this.stopWords = new Set(['的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这']);
  }

  // Simple local encoding based on keyword frequency + semantic categories
  encode(text) {
    const vector = new Array(this.dimension).fill(0);

    // Extract keywords
    const words = this.extractKeywords(text);

    // Semantic category mapping (first 20 dimensions)
    const categories = {
      creation: ['造物', '创造', '生成', '编译', '能力', '神器', '奇迹'],
      rescue: ['救援', '拯救', '救下', '保护', '安全', '抵达', '生存'],
      loss: ['失去', '死亡', '牺牲', '消逝', '迷失', '失败', '悲伤'],
      water: ['水', '洪水', '河流', '潮汐', '淹没', '湿润', '冰'],
      dark: ['黑暗', '黑夜', '阴影', '迷雾', '深渊', '恐惧', '未知'],
      beast: ['巨兽', '野兽', '愤怒', '咆哮', '踩踏', '威胁', '危险'],
      war: ['战争', '冲突', '战斗', '和平', '谈判', '使者', '边境'],
      memory: ['记忆', '遗忘', '回忆', '瘟疫', '混乱', '清晰', '模糊'],
      light: ['光', '照明', '明亮', '太阳', '光芒', '驱散', '闪耀'],
      earth: ['大地', '土地', '山脉', '森林', '高山', '平原', '地形'],
      emotion: ['希望', '绝望', '感激', '恐惧', '欣慰', '悲伤', '愤怒'],
      time: ['时间', '回合', '纪元', '历史', '过去', '未来', '现在']
    };

    let dimIndex = 0;
    for (const [category, keywords] of Object.entries(categories)) {
      let score = 0;
      for (const word of words) {
        if (keywords.some(k => word.includes(k) || k.includes(word))) {
          score += 1;
        }
      }
      vector[dimIndex] = Math.min(1, score / 3);
      dimIndex++;
    }

    // Keyword frequency encoding (dimensions 20-40)
    const wordFreq = {};
    for (const word of words) {
      if (!this.stopWords.has(word)) {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      }
    }

    const sortedWords = Object.entries(wordFreq).sort((a, b) => b[1] - a[1]).slice(0, 20);
    for (let i = 0; i < sortedWords.length && dimIndex < 40; i++) {
      vector[dimIndex] = Math.min(1, sortedWords[i][1] / 5);
      dimIndex++;
    }

    // Sentiment polarity (dimension 40)
    const positiveWords = ['希望', '救援', '成功', '胜利', '创造', '光明', '和平', '感激', '欣慰'];
    const negativeWords = ['绝望', '失败', '死亡', '黑暗', '恐惧', '战争', '悲伤', '愤怒', '混乱'];
    let sentiment = 0;
    for (const word of words) {
      if (positiveWords.some(p => word.includes(p))) sentiment += 0.1;
      if (negativeWords.some(n => word.includes(n))) sentiment -= 0.1;
    }
    vector[40] = Math.max(-1, Math.min(1, sentiment));

    // Length normalization (dimension 41)
    vector[41] = Math.min(1, words.length / 50);

    // Action intensity (dimension 42)
    const actionWords = ['救', '杀', '创造', '毁灭', '保护', '攻击', '治愈', '破坏'];
    let actionIntensity = 0;
    for (const word of words) {
      if (actionWords.some(a => word.includes(a))) actionIntensity += 0.2;
    }
    vector[42] = Math.min(1, actionIntensity);

    // L2 normalize
    const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    if (magnitude > 0) {
      for (let i = 0; i < vector.length; i++) {
        vector[i] /= magnitude;
      }
    }

    return vector;
  }

  extractKeywords(text) {
    if (!text) return [];
    // Simple Chinese tokenization by character and 2-grams
    const chars = text.split('');
    const words = [...chars];
    for (let i = 0; i < chars.length - 1; i++) {
      words.push(chars[i] + chars[i + 1]);
    }
    return words.filter(w => w.length >= 1 && !/^\d+$/.test(w));
  }

  // Add a memory to the vector store
  addMemory(text, metadata = {}) {
    const id = `mem-${Date.now()}-${Math.random()}`;
    const vector = this.encode(text);

    const memory = {
      id,
      text,
      vector,
      metadata: {
        timestamp: Date.now(),
        turn: metadata.turn || 0,
        level: metadata.level || 'unknown',
        type: metadata.type || 'general',
        ...metadata
      }
    };

    this.embeddings.push(memory);

    // Keep only last 1000 memories
    if (this.embeddings.length > 1000) {
      this.embeddings = this.embeddings.slice(-1000);
    }

    return memory;
  }

  // Query similar memories using cosine similarity
  query(queryText, topK = 5) {
    const queryVector = this.encode(queryText);

    const results = this.embeddings.map(emb => ({
      ...emb,
      similarity: this.cosineSimilarity(queryVector, emb.vector)
    }));

    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK)
      .filter(r => r.similarity > 0.3); // Minimum similarity threshold
  }

  // Find memories related to a specific theme
  queryByTheme(theme, topK = 5) {
    const themeVectors = {
      sacrifice: ['牺牲', '失去', '死亡', '拯救', '代价'],
      hope: ['希望', '光明', '救援', '成功', '未来'],
      despair: ['绝望', '黑暗', '失败', '恐惧', '毁灭'],
      creation: ['造物', '创造', '奇迹', '生成', '能力'],
      war: ['战争', '冲突', '和平', '战斗', '使者']
    };

    const keywords = themeVectors[theme] || [theme];
    const queryText = keywords.join(' ');
    return this.query(queryText, topK);
  }

  // Find narrative arcs - sequences of related memories
  findNarrativeArcs(minLength = 3) {
    const arcs = [];
    const visited = new Set();

    for (const emb of this.embeddings) {
      if (visited.has(emb.id)) continue;

      // Find chain of related memories
      const arc = [emb];
      visited.add(emb.id);

      let current = emb;
      for (let i = 0; i < 10; i++) { // Max chain length
        const related = this.embeddings
          .filter(e => !visited.has(e.id))
          .map(e => ({
            ...e,
            similarity: this.cosineSimilarity(current.vector, e.vector)
          }))
          .filter(e => e.similarity > 0.5)
          .sort((a, b) => b.similarity - a.similarity);

        if (related.length === 0) break;

        const next = related[0];
        arc.push(next);
        visited.add(next.id);
        current = next;
      }

      if (arc.length >= minLength) {
        arcs.push({
          memories: arc,
          theme: this.inferTheme(arc),
          coherence: arc.reduce((sum, m, i) => {
            if (i === 0) return 0;
            return sum + this.cosineSimilarity(arc[i - 1].vector, m.vector);
          }, 0) / (arc.length - 1)
        });
      }
    }

    return arcs.sort((a, b) => b.coherence - a.coherence);
  }

  inferTheme(arc) {
    const text = arc.map(m => m.text).join(' ');
    const themes = ['sacrifice', 'hope', 'despair', 'creation', 'war'];
    let bestTheme = 'general';
    let bestScore = 0;

    for (const theme of themes) {
      const result = this.queryByTheme(theme, 1);
      if (result.length > 0 && result[0].similarity > bestScore) {
        bestScore = result[0].similarity;
        bestTheme = theme;
      }
    }

    return bestTheme;
  }

  cosineSimilarity(a, b) {
    let dotProduct = 0;
    let magA = 0;
    let magB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }
    if (magA === 0 || magB === 0) return 0;
    return dotProduct / (Math.sqrt(magA) * Math.sqrt(magB));
  }

  // Generate narrative summary from memories
  generateNarrativeSummary() {
    const arcs = this.findNarrativeArcs(2);
    if (arcs.length === 0) return '故事刚刚开始...';

    const topArc = arcs[0];
    const summaries = topArc.memories.map(m => m.text).slice(0, 3);

    return {
      theme: topArc.theme,
      coherence: topArc.coherence,
      summary: summaries.join('；'),
      memoryCount: this.embeddings.length
    };
  }

  // Get memory statistics
  getStats() {
    const typeCounts = {};
    for (const emb of this.embeddings) {
      const type = emb.metadata.type;
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    }

    return {
      totalMemories: this.embeddings.length,
      typeDistribution: typeCounts,
      averageVectorMagnitude: this.embeddings.reduce((sum, e) => {
        const mag = Math.sqrt(e.vector.reduce((s, v) => s + v * v, 0));
        return sum + mag;
      }, 0) / (this.embeddings.length || 1)
    };
  }

  // Serialize for save/load
  serialize() {
    return {
      dimension: this.dimension,
      embeddings: this.embeddings
    };
  }

  deserialize(data) {
    if (!data) return;
    this.dimension = data.dimension || 50;
    this.embeddings = data.embeddings || [];
  }
}

// Export singleton
export const vectorMemory = new VectorMemory();
