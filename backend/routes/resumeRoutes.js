const express = require('express')
const resumeController = require('../controllers/resumeController')
const authenticate = require('../middlewares/authenticate')
const analysisRateLimiter = require('../middlewares/analysisRateLimiter')
const requireRole = require('../middlewares/requireRole')
const resumeUpload = require('../middlewares/resumeUpload')
const resumeUploadErrorHandler = require('../middlewares/resumeUploadErrorHandler')

const router = express.Router()

router.use(authenticate, requireRole('candidate'))

router.get('/', resumeController.listResumes)
router.post('/', resumeUpload.single('resume'), resumeUploadErrorHandler, resumeController.uploadResume)
router.post('/:resumeId/analyses', analysisRateLimiter, resumeController.createAnalysis)
router.get('/:resumeId/analyses', resumeController.listAnalyses)
router.get('/:resumeId/exports/:exportId/download', resumeController.downloadExport)
router.post('/:resumeId/versions/:versionNumber/export', resumeController.exportVersion)
router.post('/:resumeId/versions/:versionNumber/restore', resumeController.restoreVersion)
router.post('/:resumeId/drafts', resumeController.saveDraft)
router.get('/:resumeId/download', resumeController.downloadResume)
router.delete('/:resumeId', resumeController.deleteResume)
router.get('/:resumeId', resumeController.getResume)

router.get('/analyses/:analysisId', resumeController.getAnalysis)
router.patch('/analyses/:analysisId/suggestions/:suggestionId', resumeController.updateSuggestion)
router.post('/analyses/:analysisId/preview', resumeController.previewSuggestions)
router.post('/analyses/:analysisId/apply', resumeController.applySelectedSuggestions)

module.exports = router
