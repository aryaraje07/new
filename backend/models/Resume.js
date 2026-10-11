const mongoose = require('mongoose')

const resumeVersionSchema = new mongoose.Schema({
  versionNumber: { type: Number, required: true },
  label: { type: String, required: true, maxlength: 120 },
  sections: { type: mongoose.Schema.Types.Mixed, required: true },
  createdByAnalysis: { type: mongoose.Schema.Types.ObjectId, ref: 'ResumeAnalysis', default: null },
  createdAt: { type: Date, default: Date.now },
}, { _id: false })

const resumeExportSchema = new mongoose.Schema({
  versionNumber: { type: Number, required: true },
  format: { type: String, enum: ['pdf', 'docx'], required: true },
  publicId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
}, { _id: true })

const resumeSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  originalFile: {
    originalName: { type: String, required: true, maxlength: 255 },
    format: { type: String, enum: ['pdf', 'docx'], required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    publicId: { type: String, required: true },
  },
  extractedText: { type: String, required: true, maxlength: 1000000 },
  originalSections: { type: mongoose.Schema.Types.Mixed, required: true },
  versions: { type: [resumeVersionSchema], required: true },
  activeVersionNumber: { type: Number, required: true, default: 1 },
  exports: { type: [resumeExportSchema], default: [] },
}, { timestamps: true })

resumeSchema.index({ owner: 1, updatedAt: -1 })

module.exports = mongoose.model('Resume', resumeSchema)
