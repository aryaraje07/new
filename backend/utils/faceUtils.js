export const getFaceEmbedding = async (payload) => {
  const raw = payload?.embedding ?? payload;

  if (Array.isArray(raw)) {
    return raw.map(Number).filter((v) => Number.isFinite(v));
  }

  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map(Number).filter((v) => Number.isFinite(v));
      }
    } catch (_err) {
      return [];
    }
  }

  return [];
};

export const compareEmbeddings = (registeredEmbedding, liveEmbedding) => {
  if (!Array.isArray(registeredEmbedding) || !Array.isArray(liveEmbedding)) {
    return 0;
  }

  if (!registeredEmbedding.length || !liveEmbedding.length) {
    return 0;
  }

  const length = Math.min(registeredEmbedding.length, liveEmbedding.length);
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < length; i += 1) {
    const a = Number(registeredEmbedding[i]);
    const b = Number(liveEmbedding[i]);
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue;

    dot += a * b;
    normA += a * a;
    normB += b * b;
  }

  if (!normA || !normB) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};