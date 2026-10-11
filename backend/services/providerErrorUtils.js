async function getProviderErrorMessage(response, apiKey) {
  try {
    const rawBody = await response.text()
    let body
    try {
      body = JSON.parse(rawBody)
    } catch {
      body = null
    }
    const providerError = body?.error
    const message = typeof providerError === 'string'
      ? providerError
      : providerError?.message || providerError?.detail || body?.detail || body?.message
    const candidate = typeof message === 'string' ? message : rawBody
    if (!candidate.trim()) return ''
    return candidate
      .replaceAll(apiKey, '[REDACTED]')
      .replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]')
      .replace(/\b(?:sk|xai|gsk)-[A-Za-z0-9_-]{10,}\b/gi, '[REDACTED]')
      .replace(/\s+/g, ' ')
      .slice(0, 300)
  } catch {
    return ''
  }
}

module.exports = { getProviderErrorMessage }
