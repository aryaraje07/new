const { Document, HeadingLevel, Packer, Paragraph, TextRun } = require('docx')
const PDFDocument = require('pdfkit')
const cloudinaryService = require('./cloudinaryService')
const sectionTitles = {
  contactInformation: 'Contact information',
  summary: 'Professional summary',
  education: 'Education',
  skills: 'Skills',
  experience: 'Work experience',
  projects: 'Projects',
  certifications: 'Certifications',
  achievements: 'Achievements',
  other: 'Additional information',
}
const ATS_SECTION_ORDER = ['contactInformation', 'summary', 'skills', 'experience', 'projects', 'education', 'certifications', 'achievements', 'other']

function resumeParagraphs(sections, { docx = false } = {}) {
  const content = []
  for (const section of ATS_SECTION_ORDER) {
    const value = typeof sections?.[section] === 'string' ? sections[section].trim() : ''
    if (!value) continue
    if (docx) {
      content.push(new Paragraph({ text: sectionTitles[section], heading: HeadingLevel.HEADING_1 }))
      for (const line of value.split(/\r?\n/)) {
        const normalizedLine = line.trim()
        if (!normalizedLine) continue
        const isBullet = /^[-*•]\s+/.test(normalizedLine)
        content.push(new Paragraph({
          children: [new TextRun(isBullet ? normalizedLine.replace(/^[-*•]\s+/, '') : normalizedLine)],
          ...(isBullet ? { bullet: { indent: 360 } } : {}),
        }))
      }
    }
  }
  return content
}

async function createExportBuffer(sections, format) {
  if (format === 'docx') {
    const children = [
      new Paragraph({ text: 'Resume', heading: HeadingLevel.TITLE }),
      ...resumeParagraphs(sections, { docx: true }),
    ]
    return Packer.toBuffer(new Document({ sections: [{ children }] }))
  }

  if (format !== 'pdf') {
    const error = new Error('Choose PDF or DOCX as the export format.')
    error.status = 400
    throw error
  }

  const document = new PDFDocument({ size: 'A4', margin: 52 })
  const chunks = []
  document.on('data', chunk => chunks.push(chunk))
  const finished = new Promise((resolve, reject) => {
    document.on('end', () => resolve(Buffer.concat(chunks)))
    document.on('error', reject)
  })

  document.fontSize(22).fillColor('#17365D').text('Resume', { continued: false })
  document.moveDown()
  for (const section of ATS_SECTION_ORDER) {
    const value = typeof sections?.[section] === 'string' ? sections[section].trim() : ''
    if (!value) continue
    document.fontSize(13).fillColor('#2457A7').text(sectionTitles[section])
    document.moveDown(0.35)
    const lines = value.split(/\r?\n/).map(line => line.trim()).filter(Boolean)
    for (const line of lines) {
      document.fontSize(10).fillColor('#263445').text(/^[-*•]\s+/.test(line) ? `- ${line.replace(/^[-*•]\s+/, '')}` : line, { lineGap: 3 })
    }
    document.moveDown()
  }
  document.end()
  return finished
}

async function createAndStoreExport({ ownerId, versionNumber, sections, format }) {
  const buffer = await createExportBuffer(sections, format)
  const asset = await cloudinaryService.uploadBuffer(buffer, {
    ownerId,
    format,
    folder: 'rozgarlink/exports',
  })
  return { ...asset, format, versionNumber, createdAt: new Date() }
}

module.exports = { ATS_SECTION_ORDER, createAndStoreExport, createExportBuffer }
