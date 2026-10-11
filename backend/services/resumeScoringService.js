const REQUIREMENT_WEIGHT = 0.7
const EVIDENCE_WEIGHT = 0.2
const STRUCTURE_WEIGHT = 0.1
const CORE_SECTIONS = ['summary', 'skills', 'education', 'experience', 'projects']
const RESUME_REVIEW_CRITERIA = [
  'Professional summary is clear and focused',
  'Skills are relevant and easy to scan',
  'Experience communicates actions and outcomes',
  'Projects and education are clearly organized',
  'Writing is concise, consistent, and readable',
]

function calculateResumeScore(requirements, sections, targetType = 'custom') {
  const totalRequirements = requirements.length
  const matchedPoints = requirements.reduce((total, requirement) => {
    if (requirement.status === 'matched') return total + 1
    if (requirement.status === 'partial') return total + 0.5
    return total
  }, 0)
  const evidencePoints = requirements.filter(requirement => (
    ['matched', 'partial'].includes(requirement.status) && requirement.evidence
  )).length
  const presentSections = CORE_SECTIONS.filter(section => sections[section]?.trim()).length

  const requirementScore = totalRequirements ? Math.round(100 * matchedPoints / totalRequirements) : 0
  const evidenceScore = totalRequirements ? Math.round(100 * evidencePoints / totalRequirements) : 0
  const structureScore = Math.round(100 * presentSections / CORE_SECTIONS.length)
  const score = Math.round(
    requirementScore * REQUIREMENT_WEIGHT
    + evidenceScore * EVIDENCE_WEIGHT
    + structureScore * STRUCTURE_WEIGHT,
  )

  const isResumeReview = targetType === 'resume_review'
  return {
    score,
    scoreMeaning: isResumeReview
      ? 'A resume-quality estimate based on content clarity, supporting evidence, and section completeness. This is not an ATS score or hiring prediction.'
      : 'Resume-to-role alignment based on documented requirements and resume evidence. This is not hiring probability or official job eligibility.',
    factors: [
      {
        name: isResumeReview ? 'Content quality and clarity' : 'Documented requirement coverage',
        score: requirementScore,
        weight: REQUIREMENT_WEIGHT,
        explanation: isResumeReview
          ? 'Rates the resume against a consistent rubric for summary, skills, experience, organization, and readability.'
          : 'Matched requirements count fully; partially supported requirements count halfway.',
      },
      {
        name: isResumeReview ? 'Specific, verifiable content' : 'Supporting resume evidence',
        score: evidenceScore,
        weight: EVIDENCE_WEIGHT,
        explanation: isResumeReview
          ? 'Checks whether review findings can be grounded in exact text from the uploaded resume.'
          : 'Counts matched or partial requirements backed by a source excerpt.',
      },
      {
        name: 'Resume section completeness',
        score: structureScore,
        weight: STRUCTURE_WEIGHT,
        explanation: 'Checks for a summary, skills, education, experience and project sections.',
      },
    ],
  }
}

module.exports = { calculateResumeScore, RESUME_REVIEW_CRITERIA }
