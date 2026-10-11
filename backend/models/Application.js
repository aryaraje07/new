const mongoose = require('mongoose')

const submittedResumeSchema = new mongoose.Schema({
  originalName: { type: String, required: true },
  format: { type: String, enum: ['pdf', 'docx'], required: true },
  versionNumber: { type: Number, required: true },
  sections: { type: mongoose.Schema.Types.Mixed, required: true },
}, { _id: false })

const tailoredResumeSchema = new mongoose.Schema({
  versionNumber: { type: Number, required: true },
  sourceAnalysisId: { type: mongoose.Schema.Types.ObjectId, ref: 'ResumeAnalysis', required: true },
  sections: { type: mongoose.Schema.Types.Mixed, required: true },
  generatedAt: { type: Date, required: true },
}, { _id: false })

const applicationSchema = new mongoose.Schema({
  candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  employerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  resumeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Resume', default: null },
  resumeVersionNumber: { type: Number, default: null },
  analysisId: { type: mongoose.Schema.Types.ObjectId, ref: 'ResumeAnalysis', default: null },
  matchScore: { type: Number, min: 0, max: 100, default: null },
  workflowState: {
    type: String,
    enum: [
      'job_selected',
      'resume_pending',
      'analyzing',
      'ineligible',
      'eligible',
      'final_resume_confirmed',
      'application_submitted',
    ],
    default: 'job_selected',
  },
  status: {
    type: String,
    enum: ['draft', 'submitted', 'under_review', 'shortlisted', 'rejected'],
    default: 'draft',
  },
  confirmedAnalysisId: { type: mongoose.Schema.Types.ObjectId, ref: 'ResumeAnalysis', default: null },
  confirmedResumeVersionNumber: { type: Number, default: null },
  confirmedResumeKind: { type: String, enum: ['original', 'tailored'], default: null },
  tailoredResume: { type: tailoredResumeSchema, default: null },
  submittedResume: { type: submittedResumeSchema, default: null },
  submittedAt: { type: Date, default: null },
}, { timestamps: true })

applicationSchema.index({ candidateId: 1, jobId: 1 }, { unique: true, partialFilterExpression: { candidateId: { $exists: true, $ne: null }, jobId: { $exists: true, $ne: null } } })
applicationSchema.index({ employerId: 1, status: 1, createdAt: -1 })

module.exports = mongoose.model('Application', applicationSchema)
