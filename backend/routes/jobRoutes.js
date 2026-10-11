const express = require('express')
const jobController = require('../controllers/jobController')
const authenticate = require('../middlewares/authenticate')
const requireRole = require('../middlewares/requireRole')

const router = express.Router()

router.get('/', jobController.listPublicJobs)
router.get('/saved', authenticate, requireRole('candidate'), jobController.listSavedJobs)
router.put('/:jobId/save', authenticate, requireRole('candidate'), jobController.saveJob)
router.delete('/:jobId/save', authenticate, requireRole('candidate'), jobController.unsaveJob)
router.get('/mine', authenticate, (req, res, next) => {
  if (req.user.role !== 'employer') return res.status(403).json({ error: 'Only employer accounts can access their job postings.' })
  return jobController.listEmployerJobs(req, res, next)
})
router.get('/:jobId', jobController.getPublicJob)
router.post('/', authenticate, (req, res, next) => {
  if (req.user.role !== 'employer') return res.status(403).json({ error: 'Only employer accounts can post jobs.' })
  return jobController.createJob(req, res, next)
})

module.exports = router
