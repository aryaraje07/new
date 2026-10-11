const multer = require('multer')

function resumeUploadErrorHandler(error, req, res, next) {
  if (Number.isInteger(error.status) && error.status >= 400 && error.status < 500) {
    return res.status(error.status).json({ error: error.message })
  }
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'Resume files must be 5 MB or smaller.' })
    }
    return res.status(400).json({ error: 'Upload one PDF or DOCX resume file.' })
  }
  return next(error)
}

module.exports = resumeUploadErrorHandler
