const Application = require('../models/Application')
const Job = require('../models/Job')
const Resume = require('../models/Resume')
const ResumeAnalysis = require('../models/ResumeAnalysis')
const { analyzeResume } = require('../services/resumeAnalysisService')
const { tailorResumeForJob } = require('../services/resumeTailoringService')
const { createExportBuffer } = require('../services/resumeExportService')
const { assertFreshPassingAnalysis, isEligibleMatchScore } = require('../services/applicationWorkflow')
const { serializeJob } = require('./jobController')
const { normalizeSections } = require('../utils/resumeSections')

const idPattern = /^[a-f\d]{24}$/i

function publicApplication(application, { job, employer } = {}) {
  const result = {
    id: application._id.toString(),
    jobId: (application.jobId?._id || application.jobId).toString(),
    resumeId: application.resumeId?.toString() || null,
    resumeVersionNumber: application.resumeVersionNumber,
    analysisId: application.analysisId?.toString() || null,
    matchScore: application.matchScore,
    workflowState: application.workflowState,
    status: application.status,
    submittedAt: application.submittedAt,
    createdAt: application.createdAt,
    updatedAt: application.updatedAt,
  }
  if (job) result.job = serializeJob(job, employer || job.employerId)
  if (application.submittedResume) {
    result.submittedResume = {
      originalName: application.submittedResume.originalName,
      format: application.submittedResume.format,
      versionNumber: application.submittedResume.versionNumber,
      sections: application.submittedResume.sections,
    }
  }
  result.tailoredResume = application.tailoredResume ? {
    versionNumber: application.tailoredResume.versionNumber,
    sourceAnalysisId: application.tailoredResume.sourceAnalysisId.toString(),
    generatedAt: application.tailoredResume.generatedAt,
    sections: application.tailoredResume.sections,
  } : null
  return result
}

async function findOwnedApplication(applicationId, candidateId) {
  if (!idPattern.test(applicationId)) return null
  return Application.findOne({ _id: applicationId, candidateId })
}

async function createOrResume(req, res, next) {
  try {
    const { jobId, resumeId, restart } = req.body || {}
    if (typeof jobId !== 'string' || !idPattern.test(jobId)) {
      return res.status(400).json({ error: 'Select a valid job opportunity.' })
    }
    const job = await Job.findOne({ _id: jobId, status: 'active', deadline: { $gte: new Date() } })
    if (!job) return res.status(404).json({ error: 'Opportunity not found or no longer accepting applications.' })

    let resume = null
    if (resumeId !== undefined && resumeId !== null) {
      if (typeof resumeId !== 'string' || !idPattern.test(resumeId)) return res.status(400).json({ error: 'Select a valid resume.' })
      resume = await Resume.findOne({ _id: resumeId, owner: req.user._id })
      if (!resume) return res.status(404).json({ error: 'Resume not found.' })
    }

    const existing = await Application.findOne({ candidateId: req.user._id, jobId: job._id })
    if (existing) {
      if (existing.status !== 'draft') {
        return res.json({ application: publicApplication(existing), alreadySubmitted: true })
      }
      if (restart === true) {
        existing.resumeId = resume?._id || null
        existing.resumeVersionNumber = resume?.activeVersionNumber || null
        existing.analysisId = null
        existing.matchScore = null
        existing.confirmedAnalysisId = null
        existing.confirmedResumeVersionNumber = null
        existing.confirmedResumeKind = null
        existing.tailoredResume = null
        existing.workflowState = resume ? 'resume_pending' : 'job_selected'
        await existing.save()
        return res.json({ application: publicApplication(existing) })
      }
      if (resume) {
        existing.resumeId = resume._id
        existing.resumeVersionNumber = resume.activeVersionNumber
        existing.analysisId = null
        existing.matchScore = null
        existing.confirmedAnalysisId = null
        existing.confirmedResumeVersionNumber = null
        existing.confirmedResumeKind = null
        existing.tailoredResume = null
        existing.workflowState = 'resume_pending'
        await existing.save()
      }
      return res.json({ application: publicApplication(existing) })
    }

    const application = await Application.create({
      candidateId: req.user._id,
      employerId: job.employerId,
      jobId: job._id,
      resumeId: resume?._id || null,
      resumeVersionNumber: resume?.activeVersionNumber || null,
      workflowState: resume ? 'resume_pending' : 'job_selected',
    })
    return res.status(201).json({ application: publicApplication(application) })
  } catch (error) {
    console.error('createOrResume error:', error)
    if (error.code === 11000) {
      console.log('Duplicate key error detected, searching for existing application...')
      const application = await Application.findOne({ candidateId: req.user._id, jobId: req.body?.jobId })
      if (application) {
        console.log('Found existing application:', application._id, application.status)
        if (application.status !== 'draft') {
          return res.json({ application: publicApplication(application), alreadySubmitted: true })
        }
        return res.json({ application: publicApplication(application) })
      }
      console.log('No existing application found, this is a spurious duplicate key error')
      console.log('Key pattern:', error.keyPattern)
      console.log('Key value:', error.keyValue)
      return res.status(500).json({ error: 'Database error: Unable to create application. Please try again.' })
    }
    return next(error)
  }
}

async function getApplication(req, res, next) {
  try {
    const application = await findOwnedApplication(req.params.applicationId, req.user._id)
    if (!application) return res.status(404).json({ error: 'Application not found.' })
    const job = await Job.findById(application.jobId).populate('employerId', 'profile.organizationName profile.website profile.industry')
    return res.json({ application: publicApplication(application, { job, employer: job?.employerId }) })
  } catch (error) {
    return next(error)
  }
}

async function selectResume(req, res, next) {
  try {
    const application = await findOwnedApplication(req.params.applicationId, req.user._id)
    if (!application) return res.status(404).json({ error: 'Application not found.' })
    if (application.status !== 'draft') return res.status(409).json({ error: 'A submitted application cannot change its resume.' })
    if (typeof req.body?.resumeId !== 'string' || !idPattern.test(req.body.resumeId)) {
      return res.status(400).json({ error: 'Select a valid resume.' })
    }
    const resume = await Resume.findOne({ _id: req.body.resumeId, owner: req.user._id })
    if (!resume) return res.status(404).json({ error: 'Resume not found.' })

    application.resumeId = resume._id
    application.resumeVersionNumber = resume.activeVersionNumber
    application.analysisId = null
    application.matchScore = null
    application.confirmedAnalysisId = null
    application.confirmedResumeVersionNumber = null
    application.confirmedResumeKind = null
    application.tailoredResume = null
    application.workflowState = 'resume_pending'
    await application.save()
    return res.json({ application: publicApplication(application) })
  } catch (error) {
    return next(error)
  }
}

async function analyzeApplication(req, res, next) {
  try {
    const application = await findOwnedApplication(req.params.applicationId, req.user._id)
    if (!application) return res.status(404).json({ error: 'Application not found.' })
    if (application.status !== 'draft') return res.status(409).json({ error: 'A submitted application cannot be reanalyzed.' })
    const feedback = req.body?.feedback === undefined ? '' : req.body.feedback
    if (typeof feedback !== 'string' || feedback.length > 1000) {
      return res.status(400).json({ error: 'Revision feedback must be no more than 1,000 characters.' })
    }

    const [job, resume] = await Promise.all([
      Job.findOne({ _id: application.jobId, status: 'active', deadline: { $gte: new Date() } }),
      Resume.findOne({ _id: application.resumeId, owner: req.user._id }),
    ])
    if (!job) return res.status(404).json({ error: 'Opportunity not found or no longer accepting applications.' })
    if (!resume) return res.status(404).json({ error: 'Choose a saved resume before analyzing.' })
    const version = resume.versions.find(item => item.versionNumber === resume.activeVersionNumber)
    if (!version) return res.status(409).json({ error: 'The active resume version is unavailable.' })

    application.analysisId = null
    application.matchScore = null
    application.confirmedAnalysisId = null
    application.workflowState = 'analyzing'
    application.confirmedResumeVersionNumber = null
    application.confirmedResumeKind = null
    application.tailoredResume = null
    await application.save()

    const sections = normalizeSections(version.sections?.toObject ? version.sections.toObject() : version.sections)
    const sourceText = version.versionNumber === 1
      ? resume.extractedText
      : Object.values(sections).filter(Boolean).join('\n')
    const analysisResult = await analyzeResume({
      extractedText: sourceText,
      sections,
      target: {
        type: 'opportunity',
        opportunityId: job._id,
        opportunityUpdatedAt: job.updatedAt,
        title: job.title,
        description: job.description,
        requiredSkills: job.requiredSkills,
      },
      feedback: feedback.trim(),
    })
    const analysis = await ResumeAnalysis.create({
      owner: req.user._id,
      resume: resume._id,
      versionNumber: version.versionNumber,
      ...analysisResult,
    })

    application.resumeVersionNumber = version.versionNumber
    application.analysisId = analysis._id
    application.matchScore = analysis.score
    application.confirmedAnalysisId = null
    application.confirmedResumeVersionNumber = null
    application.workflowState = isEligibleMatchScore(analysis.score) ? 'eligible' : 'ineligible'
    await application.save()
    return res.status(201).json({
      application: publicApplication(application),
      analysis: {
        id: analysis._id.toString(),
        score: analysis.score,
        scoreMeaning: analysis.scoreMeaning,
        factors: analysis.factors,
        matchedRequirements: analysis.matchedRequirements,
        missingRequirements: analysis.missingRequirements,
        explanation: analysis.explanation,
        limitations: analysis.limitations,
        suggestions: analysis.suggestions,
        versionNumber: analysis.versionNumber,
        target: analysis.target,
      },
      eligible: isEligibleMatchScore(analysis.score),
    })
  } catch (error) {
    application.workflowState = 'resume_pending'
    await application.save()
    return next(error)
  }
}

async function tailorApplicationResume(req, res, next) {
  try {
    const application = await findOwnedApplication(req.params.applicationId, req.user._id)
    if (!application) return res.status(404).json({ error: 'Application not found.' })
    if (application.status !== 'draft') return res.status(409).json({ error: 'A submitted application cannot be changed.' })

    const [analysis, resume, job] = await Promise.all([
      ResumeAnalysis.findOne({ _id: application.analysisId, owner: req.user._id }),
      Resume.findOne({ _id: application.resumeId, owner: req.user._id }),
      Job.findOne({ _id: application.jobId, status: 'active', deadline: { $gte: new Date() } })
        .populate('employerId', 'profile.organizationName'),
    ])
    if (!resume) return res.status(404).json({ error: 'Resume not found.' })
    if (!job) return res.status(404).json({ error: 'Opportunity not found or no longer accepting applications.' })
    assertFreshPassingAnalysis({ analysis, application, resume, job })

    const sourceVersion = resume.versions.find(item => item.versionNumber === analysis.versionNumber)
    if (!sourceVersion) return res.status(409).json({ error: 'The analyzed resume version is no longer available.' })
    const sections = normalizeSections(sourceVersion.sections?.toObject ? sourceVersion.sections.toObject() : sourceVersion.sections)
    const sourceText = sourceVersion.versionNumber === 1
      ? resume.extractedText
      : Object.values(sections).filter(Boolean).join('\n')
    const tailoredSections = await tailorResumeForJob({
      sourceText,
      sections,
      job: {
        title: job.title,
        employerName: job.employerId?.profile?.organizationName,
        description: job.description,
        requiredSkills: job.requiredSkills,
      },
    })

    const versionNumber = resume.versions.reduce((max, version) => Math.max(max, version.versionNumber), 0) + 1
    if (versionNumber > 100) return res.status(409).json({ error: 'This resume has reached the 100-version limit.' })
    const generatedAt = new Date()
    resume.versions.push({
      versionNumber,
      label: `Tailored for ${job.title}`.slice(0, 120),
      sections: tailoredSections,
      createdByAnalysis: analysis._id,
      createdAt: generatedAt,
    })
    await resume.save()

    application.tailoredResume = {
      versionNumber,
      sourceAnalysisId: analysis._id,
      sections: tailoredSections,
      generatedAt,
    }
    application.confirmedAnalysisId = null
    application.confirmedResumeVersionNumber = null
    application.confirmedResumeKind = null
    application.workflowState = 'eligible'
    await application.save()

    return res.status(201).json({
      application: publicApplication(application),
      tailoredResume: application.tailoredResume,
    })
  } catch (error) {
    return next(error)
  }
}

async function downloadTailoredResume(req, res, next) {
  try {
    const application = await findOwnedApplication(req.params.applicationId, req.user._id)
    if (!application) return res.status(404).json({ error: 'Application not found.' })
    const format = req.query.format
    if (!['pdf', 'docx'].includes(format)) return res.status(400).json({ error: 'Choose PDF or DOCX as the download format.' })
    const tailored = application.tailoredResume
    if (!tailored) return res.status(404).json({ error: 'Generate a tailored resume before downloading.' })

    const buffer = await createExportBuffer(tailored.sections, format)
    res.setHeader('Content-Type', format === 'pdf'
      ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    res.attachment(`resume-${tailored.versionNumber}-ats.${format}`)
    res.setHeader('Cache-Control', 'private, no-store')
    return res.send(buffer)
  } catch (error) {
    return next(error)
  }
}

async function confirmFinalResume(req, res, next) {
  try {
    const application = await findOwnedApplication(req.params.applicationId, req.user._id)
    if (!application) return res.status(404).json({ error: 'Application not found.' })
    if (application.status !== 'draft') return res.status(409).json({ error: 'This application has already been submitted.' })
    const resumeKind = req.body?.resumeKind === undefined ? 'original' : req.body.resumeKind
    if (!['original', 'tailored'].includes(resumeKind)) return res.status(400).json({ error: 'Choose the original or tailored resume.' })

    const [analysis, resume, job] = await Promise.all([
      ResumeAnalysis.findOne({ _id: application.analysisId, owner: req.user._id }),
      Resume.findOne({ _id: application.resumeId, owner: req.user._id }),
      Job.findOne({ _id: application.jobId, status: 'active', deadline: { $gte: new Date() } }),
    ])
    if (!resume) return res.status(404).json({ error: 'Resume not found.' })
    if (!job) return res.status(404).json({ error: 'Opportunity not found or no longer accepting applications.' })
    assertFreshPassingAnalysis({ analysis, application, resume, job })
    if (resumeKind === 'tailored'
      && (!application.tailoredResume
        || application.tailoredResume.sourceAnalysisId.toString() !== analysis._id.toString()
        || !resume.versions.some(version => version.versionNumber === application.tailoredResume.versionNumber))) {
      return res.status(409).json({ error: 'Generate a tailored resume from the current passing analysis before confirming it.' })
    }

    application.confirmedAnalysisId = analysis._id
    application.confirmedResumeVersionNumber = analysis.versionNumber
    application.confirmedResumeKind = resumeKind
    application.workflowState = 'final_resume_confirmed'
    await application.save()
    return res.json({ application: publicApplication(application) })
  } catch (error) {
    return next(error)
  }
}

async function submitApplication(req, res, next) {
  try {
    const application = await findOwnedApplication(req.params.applicationId, req.user._id)
    if (!application) return res.status(404).json({ error: 'Application not found.' })
    if (application.status !== 'draft') {
      const job = await Job.findById(application.jobId).populate('employerId', 'profile.organizationName profile.website profile.industry')
      return res.json({ application: publicApplication(application, { job, employer: job?.employerId }), alreadySubmitted: true })
    }
    if (application.workflowState !== 'final_resume_confirmed'
      || !application.confirmedAnalysisId
      || application.confirmedResumeVersionNumber !== application.resumeVersionNumber
      || !['original', 'tailored'].includes(application.confirmedResumeKind)) {
      return res.status(409).json({ error: 'Confirm a current passing resume analysis before submitting.' })
    }

    const [job, resume, analysis] = await Promise.all([
      Job.findOne({ _id: application.jobId, status: 'active', deadline: { $gte: new Date() } })
        .populate('employerId', 'profile.organizationName profile.website profile.industry'),
      Resume.findOne({ _id: application.resumeId, owner: req.user._id }),
      ResumeAnalysis.findOne({ _id: application.confirmedAnalysisId, owner: req.user._id }),
    ])
    if (!job) return res.status(404).json({ error: 'Opportunity not found or no longer accepting applications.' })
    if (!resume) return res.status(404).json({ error: 'Resume not found.' })
    assertFreshPassingAnalysis({ analysis, application, resume, job })
    if (analysis._id.toString() !== application.confirmedAnalysisId.toString()) {
      return res.status(409).json({ error: 'The confirmed analysis no longer matches this application. Reanalyze and confirm again.' })
    }
    const version = resume.versions.find(item => item.versionNumber === application.confirmedResumeVersionNumber)
    if (!version) return res.status(409).json({ error: 'The confirmed resume version is no longer available.' })
    const submittedVersion = application.confirmedResumeKind === 'tailored'
      ? resume.versions.find(item => item.versionNumber === application.tailoredResume?.versionNumber)
      : version
    if (!submittedVersion
      || (application.confirmedResumeKind === 'tailored'
        && application.tailoredResume.sourceAnalysisId.toString() !== analysis._id.toString())) {
      return res.status(409).json({ error: 'The confirmed tailored resume is no longer available. Generate and review it again.' })
    }

    const submittedAt = new Date()
    const result = await Application.updateOne(
      {
        _id: application._id,
        candidateId: req.user._id,
        status: 'draft',
        workflowState: 'final_resume_confirmed',
        confirmedAnalysisId: analysis._id,
        confirmedResumeVersionNumber: version.versionNumber,
        confirmedResumeKind: application.confirmedResumeKind,
      },
      {
        $set: {
          status: 'submitted',
          workflowState: 'application_submitted',
          submittedAt,
          submittedResume: {
            originalName: application.confirmedResumeKind === 'tailored'
              ? `Tailored resume for ${job.title}`.slice(0, 255)
              : resume.originalFile.originalName,
            format: resume.originalFile.format,
            versionNumber: submittedVersion.versionNumber,
            sections: normalizeSections(submittedVersion.sections?.toObject ? submittedVersion.sections.toObject() : submittedVersion.sections),
          },
        },
      },
    )
    if (result.modifiedCount !== 1) {
      const current = await Application.findOne({ _id: application._id, candidateId: req.user._id })
      if (current?.status === 'submitted') return res.json({ application: publicApplication(current), alreadySubmitted: true })
      return res.status(409).json({ error: 'Application state changed. Review and confirm your resume again.' })
    }

    const submitted = await Application.findById(application._id)
    return res.status(201).json({
      application: publicApplication(submitted, { job, employer: job.employerId }),
      alreadySubmitted: false,
    })
  } catch (error) {
    return next(error)
  }
}

async function listCandidateApplications(req, res, next) {
  try {
    const applications = await Application.find({ candidateId: req.user._id, status: { $ne: 'draft' } })
      .sort({ submittedAt: -1, createdAt: -1 })
      .populate({
        path: 'jobId',
        populate: { path: 'employerId', select: 'profile.organizationName profile.website profile.industry' },
      })
    return res.json({
      applications: applications.map(application => publicApplication(application, {
        job: application.jobId,
        employer: application.jobId?.employerId,
      })),
    })
  } catch (error) {
    return next(error)
  }
}

async function listEmployerApplications(req, res, next) {
  try {
    const applications = await Application.find({ employerId: req.user._id, status: { $ne: 'draft' } })
      .sort({ submittedAt: -1 })
      .populate('candidateId', 'fullName email profile.location profile.highestEducation')
      .populate('jobId', 'title department')
      .populate('resumeId', 'originalFile')
    return res.json({
      applications: applications.map(application => ({
        id: application._id.toString(),
        status: application.status,
        submittedAt: application.submittedAt,
        matchScore: application.matchScore,
        job: application.jobId ? { id: application.jobId._id.toString(), title: application.jobId.title } : null,
        candidate: application.candidateId ? {
          id: application.candidateId._id.toString(),
          fullName: application.candidateId.fullName,
          email: application.candidateId.email,
          location: application.candidateId.profile?.location || '',
          education: application.candidateId.profile?.highestEducation || '',
        } : null,
        resume: application.submittedResume ? {
          originalName: application.submittedResume.originalName,
          versionNumber: application.submittedResume.versionNumber,
          sections: application.submittedResume.sections,
        } : null,
      })),
    })
  } catch (error) {
    return next(error)
  }
}

module.exports = {
  analyzeApplication,
  confirmFinalResume,
  createOrResume,
  downloadTailoredResume,
  getApplication,
  listCandidateApplications,
  listEmployerApplications,
  selectResume,
  submitApplication,
  tailorApplicationResume,
}
