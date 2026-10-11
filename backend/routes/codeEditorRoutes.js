import express from 'express'
import { protect } from '../middlewares/authMiddleware.js'
import { authorizeRoles } from '../middlewares/roleMiddleware.js'
import {
  startCodingTest,
  getCodingTest,
  submitCode,
  endCodingTest,
  getCodingTestResults,
  getCodingTestAnalysis,
  getCodeTemplate
} from '../controllers/codeEditorController.js'

const router = express.Router()

// All routes require authentication and student role
router.use(protect)
router.use(authorizeRoles('student'))

// Start a new coding test
router.post('/start', startCodingTest)

// Get coding test details
router.get('/test/:testId', getCodingTest)

// Submit code for evaluation
router.post('/submit', submitCode)

// End coding test and get analysis
router.post('/end', endCodingTest)

// Get coding test results history
router.get('/results', getCodingTestResults)

// Get detailed analysis
router.get('/analysis/:resultId', getCodingTestAnalysis)

// Get code template
router.get('/template/:language', getCodeTemplate)

export default router