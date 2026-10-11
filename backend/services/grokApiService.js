const DEFAULT_GROK_MODEL = 'grok-4.7'
const GROK_RESPONSES_URL = 'https://api.x.ai/v1/responses'

function getGrokApiConfig(env = process.env) {
  const apiKey = (env.GROK_API_KEY || env.XAI_API_KEY || '').trim()
  if (!apiKey) {
    const error = new Error('Resume tailoring is not configured. Set GROK_API_KEY (or XAI_API_KEY) in the backend environment.')
    error.status = 503
    throw error
  }
  return {
    apiKey,
    model: env.GROK_MODEL || env.XAI_MODEL || DEFAULT_GROK_MODEL,
    endpoint: getGrokResponsesEndpoint(env.GROK_API_URL || GROK_RESPONSES_URL),
  }
}

function getGrokResponsesEndpoint(configuredEndpoint) {
  const endpoint = configuredEndpoint.replace(/\/+$/, '')
  if (endpoint.endsWith('/responses')) return endpoint
  if (endpoint.endsWith('/chat/completions')) return endpoint.replace(/\/chat\/completions$/, '/responses')
  return `${endpoint}/responses`
}

function getGrokResponseOutputText(response) {
  if (typeof response?.output_text === 'string') return response.output_text
  const message = response?.output?.find(item => item.type === 'message')
  const textPart = message?.content?.find(item => item.type === 'output_text' || item.type === 'text')
  return typeof textPart?.text === 'string' ? textPart.text : ''
}

module.exports = {
  getGrokApiConfig,
  getGrokResponseOutputText,
  getGrokResponsesEndpoint,
}
