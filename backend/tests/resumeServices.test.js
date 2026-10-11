const test = require('node:test')
const assert = require('node:assert/strict')
const applySuggestions = require('../utils/applySuggestions')
const { calculateResumeScore, RESUME_REVIEW_CRITERIA } = require('../services/resumeScoringService')
const {
  analyzeResume,
  findSkillEvidence,
  getGeminiApiConfig,
  getGeminiResponseSchema,
  getGeminiResponseText,
  getProviderStatus,
} = require('../services/resumeAnalysisService')
const {
  getGrokApiConfig,
  getGrokResponsesEndpoint,
  getGrokResponseOutputText,
} = require('../services/grokApiService')
const { getProviderErrorMessage } = require('../services/providerErrorUtils')
const { tailorResumeForJob, validateTailoredSections } = require('../services/resumeTailoringService')
const { ATS_SECTION_ORDER } = require('../services/resumeExportService')

test('applies exact, non-overlapping suggestions without changing other content', () => {
  const result = applySuggestions(
    { experience: 'Built internal tools. Reduced review time.' },
    [
      { section: 'experience', originalText: 'internal tools', proposedText: 'workflow tools' },
      { section: 'experience', originalText: 'review time', proposedText: 'manual review time' },
    ],
  )

  assert.equal(result.experience, 'Built workflow tools. Reduced manual review time.')
})

test('rejects suggestions whose source text is missing or ambiguous', () => {
  assert.throws(
    () => applySuggestions({ summary: 'A result. A result.' }, [
      { section: 'summary', originalText: 'A result.', proposedText: 'A verified result.' },
    ]),
    { status: 409 },
  )
})

test('rejects overlapping suggestions', () => {
  assert.throws(
    () => applySuggestions({ experience: 'Built a team dashboard.' }, [
      { section: 'experience', originalText: 'team dashboard', proposedText: 'team insights dashboard' },
      { section: 'experience', originalText: 'dashboard', proposedText: 'reporting dashboard' },
    ]),
    { status: 409 },
  )
})

test('calculates a role alignment score using documented factor weights', () => {
  const result = calculateResumeScore(
    [
      { status: 'matched', evidence: 'Supported excerpt' },
      { status: 'partial', evidence: 'Partially supported excerpt' },
      { status: 'not_documented', evidence: '' },
    ],
    { summary: 'Summary', skills: 'Skills', education: '', experience: '', projects: '' },
  )

  assert.equal(result.score, 52)
  assert.deepEqual(result.factors.map(factor => factor.weight), [0.7, 0.2, 0.1])
})

test('calculates a general resume-quality score without labeling it as job alignment', () => {
  const result = calculateResumeScore(
    RESUME_REVIEW_CRITERIA.map((requirement, index) => ({
      requirement,
      status: index < 3 ? 'matched' : 'partial',
      evidence: 'Supported excerpt',
    })),
    { summary: 'Summary', skills: 'Skills', education: '', experience: 'Experience', projects: '' },
    'resume_review',
  )

  assert.equal(result.score, 82)
  assert.match(result.scoreMeaning, /resume-quality estimate/i)
  assert.equal(result.factors[0].name, 'Content quality and clarity')
})

test('uses Grok credentials and supports xAI configuration names', () => {
  assert.deepEqual(getGrokApiConfig({ GROK_API_KEY: 'xai-test-key' }), {
    apiKey: 'xai-test-key',
    model: 'grok-4.7',
    endpoint: 'https://api.x.ai/v1/responses',
  })
  assert.equal(getGrokApiConfig({ XAI_API_KEY: 'xai-test-key', XAI_MODEL: 'grok-custom' }).model, 'grok-custom')
  assert.equal(getGrokApiConfig({
    GROK_API_KEY: 'xai-preferred-key',
    XAI_API_KEY: 'xai-fallback-key',
    GROK_MODEL: 'grok-configured',
    GROK_API_URL: 'https://xai.example/v1',
  }).apiKey, 'xai-preferred-key')
  assert.equal(getGrokApiConfig({
    GROK_API_KEY: 'xai-test-key',
    GROK_API_URL: 'https://xai.example/v1/chat/completions',
  }).endpoint, 'https://xai.example/v1/responses')
  assert.equal(getGrokResponsesEndpoint('https://xai.example/v1/'), 'https://xai.example/v1/responses')
  assert.equal(getGrokResponsesEndpoint('https://xai.example/v1/responses'), 'https://xai.example/v1/responses')
  assert.throws(() => getGrokApiConfig({}), { status: 503 })
  assert.equal(getGrokApiConfig({ GROK_API_KEY: 'provider-key' }).apiKey, 'provider-key')
})

test('detects xAI authentication and quota failures from REST error shapes', () => {
  assert.equal(getProviderStatus({ response: { status: 403 } }), 403)
  assert.equal(getProviderStatus({ cause: { statusCode: 401 } }), 401)
  assert.equal(getProviderStatus(new Error('Server returned unexpected status code - 429')), 429)
  assert.equal(getProviderStatus({ message: 'connection timed out' }), null)
})

test('extracts safe provider error details without leaking the API key', async () => {
  const response = new Response(JSON.stringify({
    error: { message: 'Invalid model; bearer top-secret-key is not authorized' },
  }), { status: 400, headers: { 'Content-Type': 'application/json' } })

  const message = await getProviderErrorMessage(response, 'top-secret-key')
  assert.match(message, /Invalid model/)
  assert.match(message, /not authorized/)
  assert.doesNotMatch(message, /top-secret-key/)

  const plainTextResponse = new Response('Bad request: unsupported parameter xai-test-secret-key', { status: 400 })
  const plainTextMessage = await getProviderErrorMessage(plainTextResponse, 'xai-test-secret-key')
  assert.match(plainTextMessage, /Bad request/)
  assert.doesNotMatch(plainTextMessage, /xai-test-secret-key/)
})

test('configures Gemini credentials and defaults resume analysis to Gemini 3.8 Flash', () => {
  assert.deepEqual(getGeminiApiConfig({ GEMINI_API_KEY: 'gemini-test-key' }), {
    apiKey: 'gemini-test-key',
    model: 'gemini-3.8-flash',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent',
  })
  assert.equal(getGeminiApiConfig({ GEMINI_API_KEY: 'key', GEMINI_MODEL: 'gemini-custom' }).model, 'gemini-custom')
  assert.throws(() => getGeminiApiConfig({}), { status: 503, message: /GEMINI_API_KEY/ })
  assert.equal(getGeminiApiConfig({ GEMINI_API_KEY: 'key' }).apiKey, 'key')
})

test('reads text from Gemini generateContent responses and defines a structured JSON schema', () => {
  assert.equal(getGeminiResponseText({
    candidates: [{ content: { parts: [{ text: '{"ok":' }, { text: 'true}' }] } }],
  }), '{"ok":true}')
  assert.equal(getGeminiResponseText({ candidates: [] }), '')
  const schema = getGeminiResponseSchema()
  assert.equal(schema.type, 'OBJECT')
  assert.deepEqual(schema.required, ['explanation', 'limitations', 'requirements', 'suggestions'])
  assert.deepEqual(schema.properties.requirements.items.properties.status.enum, ['matched', 'partial', 'not_documented'])
  assert.deepEqual(schema.properties.suggestions.items.properties.section.enum, require('../utils/resumeSections').SECTION_NAMES)
})

test('reads text from the xAI Responses API output format', () => {
  assert.equal(getGrokResponseOutputText({ output_text: '{"ok":true}' }), '{"ok":true}')
  assert.equal(getGrokResponseOutputText({
    output: [{
      type: 'message',
      content: [{ type: 'output_text', text: '{"ok":true}' }],
    }],
  }), '{"ok":true}')
  assert.equal(getGrokResponseOutputText({ output: [] }), '')
})

test('tailors a resume through xAI Responses API and validates structured JSON output', async t => {
  const previousKey = process.env.GROK_API_KEY
  const previousModel = process.env.GROK_MODEL
  process.env.GROK_API_KEY = 'xai-test-key'
  process.env.GROK_MODEL = 'grok-4.7'
  t.after(() => {
    if (previousKey === undefined) delete process.env.GROK_API_KEY
    else process.env.GROK_API_KEY = previousKey
    if (previousModel === undefined) delete process.env.GROK_MODEL
    else process.env.GROK_MODEL = previousModel
  })

  const sourceText = 'Developer Alex. Node.js developer since 2024.'
  const sections = {
    contactInformation: 'Alex',
    summary: 'Developer',
    education: '',
    skills: 'Node.js',
    experience: 'Node.js developer since 2024.',
    projects: '',
    certifications: '',
    achievements: '',
    other: '',
  }
  const tailored = { ...sections, summary: 'Node.js developer.' }
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, 'https://api.x.ai/v1/responses')
    const request = JSON.parse(options.body)
    assert.equal(request.model, 'grok-4.7')
    assert.equal(request.store, false)
    assert.deepEqual(request.text.format, { type: 'json_object' })
    assert.match(request.instructions, /Never invent/)
    return new Response(JSON.stringify({
      output: [{
        type: 'message',
        content: [{ type: 'output_text', text: JSON.stringify(tailored) }],
      }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  })

  assert.deepEqual(await tailorResumeForJob({
    sourceText,
    sections,
    job: { title: 'Backend Developer', description: 'Build APIs', requiredSkills: ['Node.js'] },
  }), tailored)
})

test('sends resume analysis to Gemini and validates its structured response', async t => {
  const previousKey = process.env.GEMINI_API_KEY
  const previousModel = process.env.GEMINI_MODEL
  process.env.GEMINI_API_KEY = 'gemini-test-key'
  process.env.GEMINI_MODEL = 'gemini-test-model'
  t.after(() => {
    if (previousKey === undefined) delete process.env.GEMINI_API_KEY
    else process.env.GEMINI_API_KEY = previousKey
    if (previousModel === undefined) delete process.env.GEMINI_MODEL
    else process.env.GEMINI_MODEL = previousModel
  })

  const evidence = 'Led project delivery.'
  const mockResult = {
    explanation: 'The resume gives a concise overview of documented experience.',
    limitations: [],
    requirements: RESUME_REVIEW_CRITERIA.map(requirement => ({ requirement, status: 'matched', evidence })),
    suggestions: [{
      section: 'experience',
      originalText: evidence,
      proposedText: 'Led end-to-end project delivery.',
      reason: 'Clarify the scope of the documented work.',
      relevantRequirement: RESUME_REVIEW_CRITERIA[2],
      evidence,
      verificationNote: 'Confirm the wording accurately reflects your role.',
    }],
  }
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-test-model:generateContent')
    assert.equal(options.headers['x-goog-api-key'], 'gemini-test-key')
    assert.equal(options.headers.Authorization, undefined)
    const request = JSON.parse(options.body)
    assert.equal(request.generationConfig.responseMimeType, 'application/json')
    assert.equal(request.generationConfig.responseSchema.type, 'OBJECT')
    assert.equal(request.generationConfig.maxOutputTokens, 6000)
    assert.match(request.systemInstruction.parts[0].text, /JSON object/)
    assert.match(request.contents[0].parts[0].text, /Full extracted resume text/)
    return new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: JSON.stringify(mockResult) }] } }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  })

  const result = await analyzeResume({
    extractedText: evidence,
    sections: { experience: evidence },
    target: { type: 'resume_review', title: 'Resume Quality Review', description: 'General review', requiredSkills: [] },
  })

  assert.equal(result.target.type, 'resume_review')
  assert.equal(result.suggestions[0].proposedText, 'Led end-to-end project delivery.')
})

test('returns sanitized Gemini 400 details and logs the provider request ID', async t => {
  const previousKey = process.env.GEMINI_API_KEY
  const previousModel = process.env.GEMINI_MODEL
  process.env.GEMINI_API_KEY = 'gemini-test-key'
  process.env.GEMINI_MODEL = 'invalid-model'
  t.after(() => {
    if (previousKey === undefined) delete process.env.GEMINI_API_KEY
    else process.env.GEMINI_API_KEY = previousKey
    if (previousModel === undefined) delete process.env.GEMINI_MODEL
    else process.env.GEMINI_MODEL = previousModel
  })

  let diagnostic
  t.mock.method(console, 'error', (...args) => { diagnostic = args })
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({
    error: { message: 'Model `invalid-model` is not found.' },
  }), { status: 400, headers: { 'Content-Type': 'application/json', 'x-goog-request-id': 'request-test-123' } }))

  await assert.rejects(analyzeResume({
    extractedText: 'Resume evidence.',
    sections: { experience: 'Resume evidence.' },
    target: { type: 'resume_review', title: 'Resume review', description: 'General review', requiredSkills: [] },
  }), {
    status: 503,
    message: /Gemini rejected the analysis request: Model `invalid-model` is not found/,
  })

  assert.equal(diagnostic[0], 'Gemini resume analysis failed:')
  assert.equal(diagnostic[1].status, 400)
  assert.equal(diagnostic[1].model, 'invalid-model')
  assert.match(diagnostic[1].providerMessage, /not found/)
  assert.equal(diagnostic[1].providerRequestId, 'request-test-123')
  assert.match(diagnostic[1].providerContentType, /application\/json/)
})

test('gives an actionable message when Gemini rejects the API key', async t => {
  const previousKey = process.env.GEMINI_API_KEY
  const previousModel = process.env.GEMINI_MODEL
  process.env.GEMINI_API_KEY = 'gemini-test-key'
  process.env.GEMINI_MODEL = 'gemini-3.8-flash'
  t.after(() => {
    if (previousKey === undefined) delete process.env.GEMINI_API_KEY
    else process.env.GEMINI_API_KEY = previousKey
    if (previousModel === undefined) delete process.env.GEMINI_MODEL
    else process.env.GEMINI_MODEL = previousModel
  })

  t.mock.method(console, 'error', () => {})
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({
    error: { message: 'API key not valid. Please pass a valid API key.' },
  }), { status: 400, headers: { 'Content-Type': 'application/json' } }))

  await assert.rejects(analyzeResume({
    extractedText: 'Resume evidence.',
    sections: { experience: 'Resume evidence.' },
    target: { type: 'resume_review', title: 'Resume review', description: 'General review', requiredSkills: [] },
  }), {
    status: 503,
    message: /Gemini rejected GEMINI_API_KEY.*Google AI Studio/,
  })
})
test('validates generated ATS resume sections and blocks unsupported numbers and job skills', () => {
  const valid = {
    contactInformation: 'Alex Candidate | alex@example.com',
    summary: 'Backend developer.',
    skills: 'Node.js, MongoDB',
    experience: 'Built services from 2022 to 2024.',
    education: 'B.Tech',
    projects: '',
    certifications: '',
    achievements: '',
    other: '',
  }
  const source = 'Alex Candidate | alex@example.com Backend developer. Node.js MongoDB Built services from 2022 to 2024. B.Tech'
  assert.deepEqual(validateTailoredSections(valid, source, ['Node.js', 'MongoDB']), valid)
  assert.throws(
    () => validateTailoredSections({ ...valid, experience: 'Built services from 2025 to 2026.' }, source),
    /number not supported/i,
  )
  assert.throws(
    () => validateTailoredSections({ ...valid, skills: 'Node.js, Kubernetes' }, source, ['Kubernetes']),
    /unsupported evidence/i,
  )
  assert.deepEqual(ATS_SECTION_ORDER.slice(0, 6), [
    'contactInformation', 'summary', 'skills', 'experience', 'projects', 'education',
  ])
})

test('matches required skills only as complete phrases in resume evidence', () => {
  assert.match(findSkillEvidence('Built Node.js APIs for internal tools.', 'Node.js'), /Node\.js/)
  assert.equal(findSkillEvidence('Experienced with PostgreSQL.', 'SQL'), '')
  assert.equal(findSkillEvidence('Used C++ and React.', 'C++'), 'Used C++ and React.')
})
