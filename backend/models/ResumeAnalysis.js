const mongoose = require('mongoose')

const requirementSchema = new mongoose.Schema({
  requirement: { type: String, required: true, maxlength: 300 },
  status: { type: String, enum: ['matched', 'partial', 'not_documented'], required: true },
  evidence: { type: String, maxlength: 1000, default: '' },
}, { _id: false })

const suggestionSchema = new mongoose.Schema({
  suggestionId: { type: String, required: true },
  section: {
    type: String,
    enum: ['contactInformation', 'summary', 'education', 'skills', 'experience', 'projects', 'certifications', 'achievements', 'other'],
    required: true,
  },
  originalText: { type: String, required: true, maxlength: 3000 },
  proposedText: { type: String, required: true, maxlength: 3000 },
  reason: { type: String, required: true, maxlength: 1000 },
  relevantRequirement: { type: String, maxlength: 300, default: '' },
  evidence: { type: String, required: true, maxlength: 1000 },
  verificationNote: { type: String, maxlength: 500, default: '' },
  status: { type: String, enum: ['pending', 'edited', 'accepted', 'rejected'], default: 'pending' },
}, { _id: false })

const factorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  score: { type: Number, required: true, min: 0, max: 100 },
  weight: { type: Number, required: true, min: 0, max: 1 },
  explanation: { type: String, required: true, maxlength: 500 },
}, { _id: false })

const analysisSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  resume: { type: mongoose.Schema.Types.ObjectId, ref: 'Resume', required: true, index: true },
  versionNumber: { type: Number, required: true },
  target: {
    type: { type: String, enum: ['custom', 'opportunity', 'resume_review'], required: true },
    opportunityId: { type: mongoose.Schema.Types.ObjectId, default: null },
    opportunityUpdatedAt: { type: Date, default: null },
    title: { type: String, required: true, maxlength: 160 },
    description: { type: String, required: true, maxlength: 20000 },
    requiredSkills: { type: [String], default: [] },
  },
  score: { type: Number, required: true, min: 0, max: 100 },
  scoreMeaning: { type: String, required: true, maxlength: 500 },
  factors: { type: [factorSchema], required: true },
  matchedRequirements: { type: [requirementSchema], default: [] },
  missingRequirements: { type: [requirementSchema], default: [] },
  explanation: { type: String, required: true, maxlength: 2000 },
  limitations: { type: [String], default: [] },
  suggestions: { type: [suggestionSchema], default: [] },
  outdated: { type: Boolean, default: false },
}, { timestamps: true })

analysisSchema.index({ owner: 1, resume: 1, createdAt: -1 })

module.exports = mongoose.model('ResumeAnalysis', analysisSchema)
