//faceMatchService.js

export const cosineSimilarity = (a, b) => {
  let dot = 0,
    magA = 0,
    magB = 0

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    magA += a[i] * a[i]
    magB += b[i] * b[i]
  }

  return dot / (Math.sqrt(magA) * Math.sqrt(magB))
}

export const isFaceMatch = (stored, live) => {
  if (!stored?.length || !live?.length) return true
  return cosineSimilarity(stored, live) >= 0.85
}