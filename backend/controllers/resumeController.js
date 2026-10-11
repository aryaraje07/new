const mongoose = require('mongoose')
const { Readable } = require('node:stream')
const Resume = require('../models/Resume')
const ResumeAnalysis = require('../models/ResumeAnalysis')
const Job = require('../models/Job')
const cloudinaryService = require('../services/cloudinaryService')
const { extractResume } = require('../services/resumeParserService')
const { analyzeResume, resumeReviewDescription } = require('../services/resumeAnalysisService')
const { createAndStoreExport } = require('../services/resumeExportService')
const applySuggestions = require('../utils/applySuggestions')
const { normalizeSections } = require('../utils/resumeSections')

const objectIdPattern = /^[a-f\d]{24}$/i
const sectionNames = ['contactInformation', 'summary', 'education', 'skills', 'experience', 'projects', 'certifications', 'achievements', 'other']

function validId(value) {
  return typeof value === 'string' && objectIdPattern.test(value)
}

function publicResume(resume, { includeContent = false } = {}) {
  const activeVersion = resume.versions.find(item => item.versionNumber === resume.activeVersionNumber)
  return {
    id: resume._id.toString(),
    originalFile: {
      originalName: resume.originalFile.originalName,
      format: resume.originalFile.format,
      size: resume.originalFile.size,
    },
    activeVersionNumber: resume.activeVersionNumber,
    versions: resume.versions.map(version => ({
      versionNumber: version.versionNumber,
      label: version.label,
      createdAt: version.createdAt,
    })),
    createdAt: resume.createdAt,
    updatedAt: resume.updatedAt,
    ...(includeContent ? {
      extractedText: resume.extractedText,
      originalSections: resume.originalSections,
      activeVersion: activeVersion ? {
        versionNumber: activeVersion.versionNumber,
        label: activeVersion.label,
        sections: activeVersion.sections,
      } : null,
    } : {}),
  }
}

function publicAnalysis(analysis) {
  return {
    id: analysis._id.toString(),
    resumeId: analysis.resume.toString(),
    versionNumber: analysis.versionNumber,
    target: analysis.target,
    score: analysis.score,
    scoreMeaning: analysis.scoreMeaning,
    factors: analysis.factors,
    matchedRequirements: analysis.matchedRequirements,
    missingRequirements: analysis.missingRequirements,
    explanation: analysis.explanation,
    limitations: analysis.limitations,
    suggestions: analysis.suggestions,
    outdated: analysis.outdated,
    createdAt: analysis.createdAt,
  }
}

function findResume(resumeId, ownerId, options = {}) {
  if (!validId(resumeId)) {
    const error = new Error('Resume not found.')
    error.status = 404
    throw error
  }
  return Resume.findOne({ _id: resumeId, owner: ownerId }, null, options)
}

function findAnalysis(analysisId, ownerId) {
  if (!validId(analysisId)) {
    const error = new Error('Analysis not found.')
    error.status = 404
    throw error
  }
  return ResumeAnalysis.findOne({ _id: analysisId, owner: ownerId })
}

function toPlainSections(sections) {
  return normalizeSections(sections?.toObject ? sections.toObject() : sections)
}

function selectSuggestions(analysis, suggestionIds) {
  if (!Array.isArray(suggestionIds) || suggestionIds.length === 0 || suggestionIds.length > 20) {
    const error = new Error('Select between 1 and 20 suggestions to preview.')
    error.status = 400
    throw error
  }
  if (new Set(suggestionIds).size !== suggestionIds.length) {
    const error = new Error('A suggestion cannot be selected more than once.')
    error.status = 400
    throw error
  }

  const selected = suggestionIds.map(id => analysis.suggestions.find(item => item.suggestionId === id))
  if (selected.some(item => !item)) {
    const error = new Error('One or more selected suggestions do not belong to this analysis.')
    error.status = 404
    throw error
  }
  if (selected.some(item => ['accepted', 'rejected'].includes(item.status))) {
    const error = new Error('Accepted or rejected suggestions cannot be applied again.')
    error.status = 409
    throw error
  }
  return selected
}

async function uploadResume(req, res, next) {
  if (!req.file) return res.status(400).json({ error: 'Choose a PDF or DOCX resume file to upload.' })

  let uploadedAsset
  try {
    const parsed = await extractResume(req.file)
    uploadedAsset = await cloudinaryService.uploadBuffer(req.file.buffer, {
      ownerId: req.user._id.toString(),
      format: parsed.format,
      folder: 'rozgarlink/resumes',
    })

    const safeName = req.file.originalname.replace(/[\\/\r\n"]/g, '_').slice(0, 255) || `resume.${parsed.format}`
    const resume = await Resume.create({
      owner: req.user._id,
      originalFile: {
        originalName: safeName,
        format: parsed.format,
        mimeType: req.file.mimetype,
        size: req.file.size,
        publicId: uploadedAsset.publicId,
      },
      extractedText: parsed.extractedText,
      originalSections: parsed.sections,
      versions: [{ versionNumber: 1, label: 'Original', sections: parsed.sections }],
      activeVersionNumber: 1,
    })

    return res.status(201).json({ resume: publicResume(resume, { includeContent: true }) })
  } catch (error) {
    if (uploadedAsset) {
      try {
        await cloudinaryService.deleteAsset(uploadedAsset.publicId)
      } catch (cleanupError) {
        console.error('Resume upload cleanup failed:', cleanupError.message)
      }
    }
    return next(error)
  }
}

async function listResumes(req, res, next) {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1)
    const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 20))
    const [resumes, total] = await Promise.all([
      Resume.find({ owner: req.user._id }).sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(limit),
      Resume.countDocuments({ owner: req.user._id }),
    ])
    return res.json({ resumes: resumes.map(resume => publicResume(resume)), page, limit, total })
  } catch (error) {
    return next(error)
  }
}

async function getResume(req, res, next) {
  try {
    const resume = await findResume(req.params.resumeId, req.user._id)
    if (!resume) return res.status(404).json({ error: 'Resume not found.' })
    return res.json({ resume: publicResume(resume, { includeContent: true }) })
  } catch (error) {
    return next(error)
  }
}

async function downloadResume(req, res, next) {
  try {
    const resume = await findResume(req.params.resumeId, req.user._id)
    if (!resume) return res.status(404).json({ error: 'Resume not found.' })
    const response = await cloudinaryService.downloadPrivateAsset(resume.originalFile.publicId, resume.originalFile.format)
    res.setHeader('Content-Type', resume.originalFile.mimeType)
    res.attachment(resume.originalFile.originalName)
    res.setHeader('Cache-Control', 'private, no-store')
    return Readable.fromWeb(response.body).pipe(res)
  } catch (error) {
    return next(error)
  }
}

async function deleteResume(req, res, next) {
  try {
    const resume = await findResume(req.params.resumeId, req.user._id)
    if (!resume) return res.status(404).json({ error: 'Resume not found.' })
    await Promise.all([
      cloudinaryService.deleteAsset(resume.originalFile.publicId),
      ...resume.exports.map(item => cloudinaryService.deleteAsset(item.publicId)),
    ])
    await ResumeAnalysis.deleteMany({ resume: resume._id, owner: req.user._id })
    await resume.deleteOne()
    return res.json({ message: 'Resume and its analyses were deleted.' })
  } catch (error) {
    return next(error)
  }
}

async function listAnalyses(req, res, next) {
  try {
    const resume = await findResume(req.params.resumeId, req.user._id)
    if (!resume) return res.status(404).json({ error: 'Resume not found.' })
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1)
    const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 20))
    const [analyses, total] = await Promise.all([
      ResumeAnalysis.find({ resume: resume._id, owner: req.user._id }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      ResumeAnalysis.countDocuments({ resume: resume._id, owner: req.user._id }),
    ])
    return res.json({ analyses: analyses.map(publicAnalysis), page, limit, total })
  } catch (error) {
    return next(error)
  }
}

async function createAnalysis(req, res, next) {
  try {
    const resume = await findResume(req.params.resumeId, req.user._id)
    if (!resume) return res.status(404).json({ error: 'Resume not found.' })

    const targetInput = req.body?.target
    let target
    if (targetInput?.type === 'resume_review') {
      target = {
        type: 'resume_review',
        title: 'Resume Quality Review',
        description: resumeReviewDescription,
        requiredSkills: [],
      }
    } else if (targetInput?.type === 'opportunity' || targetInput?.opportunityId) {
      if (!validId(targetInput?.opportunityId)) return res.status(400).json({ error: 'Select a valid job opportunity to analyze.' })
      const job = await Job.findOne({
        _id: targetInput.opportunityId,
        status: 'active',
        deadline: { $gte: new Date() },
      })
      if (!job) return res.status(404).json({ error: 'Opportunity not found or no longer accepting applications.' })
      target = {
        type: 'opportunity',
        opportunityId: job._id,
        opportunityUpdatedAt: job.updatedAt,
        title: job.title,
        description: job.description,
        requiredSkills: job.requiredSkills,
      }
    } else {
      if (targetInput?.type !== 'custom'
        || typeof targetInput.title !== 'string'
        || targetInput.title.trim().length < 2
        || targetInput.title.trim().length > 160
        || typeof targetInput.description !== 'string'
        || targetInput.description.trim().length < 50
        || targetInput.description.trim().length > 16000) {
        return res.status(400).json({ error: 'Provide a custom role title and a job description between 50 and 16,000 characters.' })
      }
      target = {
        type: 'custom',
        title: targetInput.title.trim(),
        description: targetInput.description.trim(),
        requiredSkills: [],
      }
    }

    const versionNumber = Number(req.body.versionNumber || resume.activeVersionNumber)
    const version = resume.versions.find(item => item.versionNumber === versionNumber)
    if (!version) return res.status(404).json({ error: 'Resume version not found.' })

    const sections = toPlainSections(version.sections)
    const sourceText = version.versionNumber === 1
      ? resume.extractedText
      : Object.values(sections).filter(Boolean).join('\n')
    const analysisResult = await analyzeResume({
      extractedText: sourceText,
      sections,
      target,
    })
    const analysis = await ResumeAnalysis.create({
      owner: req.user._id,
      resume: resume._id,
      versionNumber,
      ...analysisResult,
      outdated: versionNumber !== resume.activeVersionNumber,
    })
    return res.status(201).json({ analysis: publicAnalysis(analysis) })
  } catch (error) {
    return next(error)
  }
}

async function getAnalysis(req, res, next) {
  try {
    const analysis = await findAnalysis(req.params.analysisId, req.user._id)
    if (!analysis) return res.status(404).json({ error: 'Analysis not found.' })
    const resume = await findResume(analysis.resume.toString(), req.user._id)
    if (!resume) return res.status(404).json({ error: 'Resume not found.' })
    return res.json({ analysis: publicAnalysis(analysis) })
  } catch (error) {
    return next(error)
  }
}

async function updateSuggestion(req, res, next) {
  try {
    const analysis = await findAnalysis(req.params.analysisId, req.user._id)
    if (!analysis) return res.status(404).json({ error: 'Analysis not found.' })
    const resume = await findResume(analysis.resume.toString(), req.user._id)
    if (!resume) return res.status(404).json({ error: 'Resume not found.' })
    if (analysis.versionNumber !== resume.activeVersionNumber) {
      return res.status(409).json({ error: 'This analysis is outdated. Reanalyze the active resume version before editing suggestions.' })
    }
    const suggestion = analysis.suggestions.find(item => item.suggestionId === req.params.suggestionId)
    if (!suggestion) return res.status(404).json({ error: 'Suggestion not found.' })
    if (['accepted', 'rejected'].includes(suggestion.status)) {
      return res.status(409).json({ error: 'This suggestion has already been finalized.' })
    }

    if (req.body?.action === 'reject') {
      suggestion.status = 'rejected'
    } else if (req.body?.action === 'edit') {
      const proposedText = req.body.proposedText
      if (typeof proposedText !== 'string' || !proposedText.trim() || proposedText.trim().length > 3000) {
        return res.status(400).json({ error: 'The edited suggestion must contain between 1 and 3,000 characters.' })
      }
      const source = `${resume.extractedText}\n${Object.values(toPlainSections(resume.originalSections)).join('\n')}`
      const numbers = proposedText.match(/\b\d+(?:[.,]\d+)?%?\b/g) || []
      if (numbers.some(number => !source.includes(number))) {
        return res.status(400).json({ error: 'Edited text includes a number that is not supported by the original resume.' })
      }
      suggestion.proposedText = proposedText.trim()
      suggestion.status = 'edited'
    } else {
      return res.status(400).json({ error: 'Choose either edit or reject for this suggestion.' })
    }

    await analysis.save()
    return res.json({ analysis: publicAnalysis(analysis) })
  } catch (error) {
    return next(error)
  }
}

async function previewSuggestions(req, res, next) {
  try {
    const analysis = await findAnalysis(req.params.analysisId, req.user._id)
    if (!analysis) return res.status(404).json({ error: 'Analysis not found.' })
    const resume = await findResume(analysis.resume.toString(), req.user._id)
    if (!resume) return res.status(404).json({ error: 'Resume not found.' })
    if (analysis.versionNumber !== resume.activeVersionNumber) {
      return res.status(409).json({ error: 'This analysis is outdated. Reanalyze the active resume version before previewing suggestions.' })
    }
    const selected = selectSuggestions(analysis, req.body?.suggestionIds)
    const version = resume.versions.find(item => item.versionNumber === resume.activeVersionNumber)
    if (!version) return res.status(404).json({ error: 'Active resume version not found.' })
    const sections = applySuggestions(toPlainSections(version.sections), selected)
    return res.json({
      sections,
      selectedSuggestionIds: selected.map(item => item.suggestionId),
      currentVersionNumber: version.versionNumber,
      analysisOutdated: analysis.versionNumber !== version.versionNumber,
    })
  } catch (error) {
    return next(error)
  }
}

async function applySelectedSuggestions(req, res, next) {
  const session = await mongoose.startSession()
  try {
    let responsePayload
    await session.withTransaction(async () => {
      const analysis = await ResumeAnalysis.findOne({ _id: req.params.analysisId, owner: req.user._id }).session(session)
      if (!analysis) {
        const error = new Error('Analysis not found.')
        error.status = 404
        throw error
      }
      const resume = await Resume.findOne({ _id: analysis.resume, owner: req.user._id }).session(session)
      if (!resume) {
        const error = new Error('Resume not found.')
        error.status = 404
        throw error
      }
      const selected = selectSuggestions(analysis, req.body?.suggestionIds)
      const activeVersion = resume.versions.find(item => item.versionNumber === resume.activeVersionNumber)
      if (!activeVersion) {
        const error = new Error('Active resume version not found.')
        error.status = 409
        throw error
      }
      if (analysis.versionNumber !== activeVersion.versionNumber) {
        const error = new Error('This analysis is outdated. Reanalyze the active resume version before applying suggestions.')
        error.status = 409
        throw error
      }
      const sections = applySuggestions(toPlainSections(activeVersion.sections), selected)
      const nextVersionNumber = resume.versions.reduce((max, item) => Math.max(max, item.versionNumber), 0) + 1
      if (nextVersionNumber > 100) {
        const error = new Error('This resume has reached the 100-version limit.')
        error.status = 409
        throw error
      }

      resume.versions.push({
        versionNumber: nextVersionNumber,
        label: `AI-assisted draft ${nextVersionNumber - 1}`,
        sections,
        createdByAnalysis: analysis._id,
      })
      resume.activeVersionNumber = nextVersionNumber
      selected.forEach(item => { item.status = 'accepted' })
      await resume.save({ session })
      analysis.outdated = true
      await analysis.save({ session })
      await ResumeAnalysis.updateMany(
        { resume: resume._id, owner: req.user._id, _id: { $ne: analysis._id } },
        { $set: { outdated: true } },
        { session },
      )

      responsePayload = {
        resume: publicResume(resume, { includeContent: true }),
        analysis: publicAnalysis(analysis),
      }
    })
    return res.json(responsePayload)
  } catch (error) {
    return next(error)
  } finally {
    await session.endSession()
  }
}

async function saveDraft(req, res, next) {
  try {
    const resume = await findResume(req.params.resumeId, req.user._id)
    if (!resume) return res.status(404).json({ error: 'Resume not found.' })
    if (!req.body?.sections || typeof req.body.sections !== 'object' || Array.isArray(req.body.sections)) {
      return res.status(400).json({ error: 'Provide the resume sections to save.' })
    }
    if (Object.keys(req.body.sections).some(key => !sectionNames.includes(key))) {
      return res.status(400).json({ error: 'The draft contains an unsupported section.' })
    }
    if (Object.values(req.body.sections).some(value => typeof value !== 'string' || value.length > 20000)) {
      return res.status(400).json({ error: 'Each resume section must contain no more than 20,000 characters.' })
    }

    const sections = normalizeSections(req.body.sections)
    const nextVersionNumber = resume.versions.reduce((max, item) => Math.max(max, item.versionNumber), 0) + 1
    if (nextVersionNumber > 100) return res.status(409).json({ error: 'This resume has reached the 100-version limit.' })
    resume.versions.push({ versionNumber: nextVersionNumber, label: `Edited draft ${nextVersionNumber - 1}`, sections })
    resume.activeVersionNumber = nextVersionNumber
    await resume.save()
    await ResumeAnalysis.updateMany({ resume: resume._id, owner: req.user._id }, { $set: { outdated: true } })
    return res.status(201).json({ resume: publicResume(resume, { includeContent: true }) })
  } catch (error) {
    return next(error)
  }
}

async function restoreVersion(req, res, next) {
  try {
    const resume = await findResume(req.params.resumeId, req.user._id)
    if (!resume) return res.status(404).json({ error: 'Resume not found.' })
    const requestedNumber = Number(req.params.versionNumber)
    const previous = resume.versions.find(item => item.versionNumber === requestedNumber)
    if (!Number.isInteger(requestedNumber) || !previous) return res.status(404).json({ error: 'Resume version not found.' })
    const nextVersionNumber = resume.versions.reduce((max, item) => Math.max(max, item.versionNumber), 0) + 1
    if (nextVersionNumber > 100) return res.status(409).json({ error: 'This resume has reached the 100-version limit.' })
    resume.versions.push({
      versionNumber: nextVersionNumber,
      label: `Restored from version ${requestedNumber}`,
      sections: toPlainSections(previous.sections),
    })
    resume.activeVersionNumber = nextVersionNumber
    await resume.save()
    await ResumeAnalysis.updateMany({ resume: resume._id, owner: req.user._id }, { $set: { outdated: true } })
    return res.status(201).json({ resume: publicResume(resume, { includeContent: true }) })
  } catch (error) {
    return next(error)
  }
}

async function exportVersion(req, res, next) {
  let exportedAsset
  try {
    const resume = await findResume(req.params.resumeId, req.user._id)
    if (!resume) return res.status(404).json({ error: 'Resume not found.' })
    const versionNumber = Number(req.params.versionNumber)
    const version = resume.versions.find(item => item.versionNumber === versionNumber)
    if (!Number.isInteger(versionNumber) || !version) return res.status(404).json({ error: 'Resume version not found.' })
    const format = req.body?.format
    if (!['pdf', 'docx'].includes(format)) return res.status(400).json({ error: 'Choose PDF or DOCX as the export format.' })

    exportedAsset = await createAndStoreExport({
      ownerId: req.user._id.toString(),
      versionNumber,
      sections: toPlainSections(version.sections),
      format,
    })
    resume.exports.push(exportedAsset)
    await resume.save()
    const savedExport = resume.exports[resume.exports.length - 1]
    return res.status(201).json({
      export: {
        id: savedExport._id.toString(),
        versionNumber,
        format,
        createdAt: savedExport.createdAt,
        downloadEndpoint: `/resumes/${resume._id}/exports/${savedExport._id}/download`,
      },
    })
  } catch (error) {
    if (exportedAsset) {
      try {
        await cloudinaryService.deleteAsset(exportedAsset.publicId)
      } catch (cleanupError) {
        console.error('Resume export cleanup failed:', cleanupError.message)
      }
    }
    return next(error)
  }
}

async function downloadExport(req, res, next) {
  try {
    const resume = await findResume(req.params.resumeId, req.user._id)
    if (!resume) return res.status(404).json({ error: 'Resume not found.' })
    const exported = resume.exports.id(req.params.exportId)
    if (!exported) return res.status(404).json({ error: 'Resume export not found.' })
    const response = await cloudinaryService.downloadPrivateAsset(exported.publicId, exported.format)
    res.setHeader('Content-Type', exported.format === 'pdf'
      ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    res.attachment(`rozgarlink-resume-v${exported.versionNumber}.${exported.format}`)
    res.setHeader('Cache-Control', 'private, no-store')
    return Readable.fromWeb(response.body).pipe(res)
  } catch (error) {
    return next(error)
  }
}

module.exports = {
  applySelectedSuggestions,
  createAnalysis,
  deleteResume,
  downloadExport,
  downloadResume,
  exportVersion,
  getAnalysis,
  getResume,
  listAnalyses,
  listResumes,
  previewSuggestions,
  restoreVersion,
  saveDraft,
  updateSuggestion,
  uploadResume,
}
