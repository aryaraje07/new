function isEligibleMatchScore(score) {
  return Number.isFinite(score) && score > 70
}

function assertFreshPassingAnalysis({ analysis, application, resume, job }) {
  if (!analysis
    || analysis.owner.toString() !== application.candidateId.toString()
    || analysis.resume.toString() !== resume._id.toString()
    || analysis.versionNumber !== application.resumeVersionNumber
    || analysis.versionNumber !== resume.activeVersionNumber
    || analysis.outdated
    || analysis.target.type !== 'opportunity'
    || analysis.target.opportunityId?.toString() !== application.jobId.toString()
    || !job
    || analysis.target.opportunityUpdatedAt?.getTime() !== job.updatedAt?.getTime()
    || !isEligibleMatchScore(analysis.score)) {
    const error = new Error('A current analysis scoring above 70% for this exact job and resume version is required.')
    error.status = 409
    throw error
  }
}

module.exports = { assertFreshPassingAnalysis, isEligibleMatchScore }
