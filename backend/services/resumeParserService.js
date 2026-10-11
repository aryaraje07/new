const mammoth = require('mammoth')
const { PDFParse } = require('pdf-parse')
const { parseResumeSections } = require('../utils/resumeSections')

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const MAX_EXTRACTED_CHARACTERS = 500000

async function extractResume(file) {
  const extension = file.originalname?.toLowerCase().split('.').pop()
  const format = extension === 'pdf' && ['application/pdf', 'application/octet-stream'].includes(file.mimetype)
    ? 'pdf'
    : extension === 'docx' && [DOCX_MIME, 'application/octet-stream'].includes(file.mimetype)
      ? 'docx'
      : null
  if (!format) {
    const error = new Error('Only PDF and DOCX resume files are supported.')
    error.status = 400
    throw error
  }

  if (format === 'pdf' && file.buffer.subarray(0, 5).toString() !== '%PDF-') {
    const error = new Error('This file does not contain a valid PDF document.')
    error.status = 400
    throw error
  }
  if (format === 'docx' && (file.buffer[0] !== 0x50 || file.buffer[1] !== 0x4b)) {
    const error = new Error('This file does not contain a valid DOCX document.')
    error.status = 400
    throw error
  }

  let text
  if (format === 'pdf') {
    const parser = new PDFParse({ data: file.buffer })
    try {
      const result = await parser.getText()
      text = result.text
    } catch (cause) {
      const error = new Error(/password|encrypt/i.test(cause.message)
        ? 'This PDF is password-protected. Remove the password and upload it again.'
        : 'This PDF is damaged or could not be read.')
      error.status = 400
      throw error
    } finally {
      await parser.destroy()
    }
  } else {
    try {
      const result = await mammoth.extractRawText({ buffer: file.buffer })
      text = result.value
    } catch {
      const error = new Error('This DOCX file is damaged or could not be read.')
      error.status = 400
      throw error
    }
  }

  const extractedText = typeof text === 'string' ? text.replace(/\u0000/g, '').trim() : ''
  if (!extractedText) {
    const error = new Error(format === 'pdf'
      ? 'No selectable text was found in this PDF. It may be a scanned document; OCR is required before it can be analyzed.'
      : 'No text was found in this DOCX document.')
    error.status = 422
    throw error
  }
  if (extractedText.length > MAX_EXTRACTED_CHARACTERS) {
    const error = new Error('This resume contains too much text to process safely. Upload a shorter document.')
    error.status = 413
    throw error
  }

  return {
    format,
    extractedText,
    sections: parseResumeSections(extractedText),
  }
}

module.exports = { extractResume }
