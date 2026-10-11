const express = require('express')
const applicationController = require('../controllers/applicationController')
const authenticate = require('../middlewares/authenticate')
const analysisRateLimiter = require('../middlewares/analysisRateLimiter')
const requireRole = require('../middlewares/requireRole')

const router = express.Router()

router.use(authenticate)
router.get('/employer', requireRole('employer'), applicationController.listEmployerApplications)
router.get('/mine', requireRole('candidate'), applicationController.listCandidateApplications)
router.post('/', requireRole('candidate'), applicationController.createOrResume)
router.get('/:applicationId', requireRole('candidate'), applicationController.getApplication)
router.put('/:applicationId/resume', requireRole('candidate'), applicationController.selectResume)
router.post('/:applicationId/analyze', requireRole('candidate'), analysisRateLimiter, applicationController.analyzeApplication)
router.post('/:applicationId/tailor', requireRole('candidate'), analysisRateLimiter, applicationController.tailorApplicationResume)
router.get('/:applicationId/tailored-resume/download', requireRole('candidate'), applicationController.downloadTailoredResume)
router.post('/:applicationId/confirm', requireRole('candidate'), applicationController.confirmFinalResume)
router.post('/:applicationId/submit', requireRole('candidate'), applicationController.submitApplication)

module.exports = router
