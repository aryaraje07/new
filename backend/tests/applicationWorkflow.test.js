const test = require('node:test')
const assert = require('node:assert/strict')
const { assertFreshPassingAnalysis, isEligibleMatchScore } = require('../services/applicationWorkflow')

test('requires a score strictly above 70 percent', () => {
  assert.equal(isEligibleMatchScore(71), true)
  assert.equal(isEligibleMatchScore(70), false)
  assert.equal(isEligibleMatchScore(69), false)
  assert.equal(isEligibleMatchScore(Number.NaN), false)
})

test('blocks ineligible and stale analyses from application confirmation', () => {
  const base = {
    owner: 'candidate-1',
    resume: 'resume-1',
    versionNumber: 2,
    outdated: false,
    target: { type: 'opportunity', opportunityId: 'job-1', opportunityUpdatedAt: new Date(1000) },
    score: 71,
  }
  const application = {
    candidateId: 'candidate-1',
    resumeVersionNumber: 2,
    jobId: 'job-1',
  }
  const resume = { _id: 'resume-1', activeVersionNumber: 2 }
  const job = { updatedAt: new Date(1000) }

  assert.doesNotThrow(() => assertFreshPassingAnalysis({ analysis: base, application, resume, job }))
  assert.throws(
    () => assertFreshPassingAnalysis({ analysis: { ...base, score: 70 }, application, resume, job }),
    { status: 409 },
  )
  assert.throws(
    () => assertFreshPassingAnalysis({ analysis: { ...base, versionNumber: 1 }, application, resume, job }),
    { status: 409 },
  )
  assert.throws(
    () => assertFreshPassingAnalysis({ analysis: { ...base, target: { ...base.target, opportunityId: 'job-2' } }, application, resume, job }),
    { status: 409 },
  )
  assert.throws(
    () => assertFreshPassingAnalysis({ analysis: base, application, resume, job: { updatedAt: new Date(2000) } }),
    { status: 409 },
  )
})
