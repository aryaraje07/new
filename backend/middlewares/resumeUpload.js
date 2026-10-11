const multer = require('multer')

const allowedTypes = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])

const uploadResume = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 0 },
  fileFilter(req, file, callback) {
    const extension = file.originalname.toLowerCase().split('.').pop()
    const validPdf = extension === 'pdf' && ['application/pdf', 'application/octet-stream'].includes(file.mimetype)
    const validDocx = extension === 'docx' && [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/octet-stream',
    ].includes(file.mimetype)
    if (!allowedTypes.has(file.mimetype) && file.mimetype !== 'application/octet-stream') {
      const error = new Error('Only PDF and DOCX resume files are supported.')
      error.status = 400
      return callback(error)
    }
    if (!validPdf && !validDocx) {
      const error = new Error('Use a .pdf or .docx file with a matching file type.')
      error.status = 400
      return callback(error)
    }
    return callback(null, true)
  },
})

module.exports = uploadResume
