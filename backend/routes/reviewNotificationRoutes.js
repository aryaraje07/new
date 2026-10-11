import express from 'express'
import { protect } from '../middlewares/authMiddleware.js'
import {
  getMyReviewNotifications,
  markReviewNotificationRead,
} from '../controllers/reviewNotificationController.js'

const router = express.Router()

router.get('/my', protect, getMyReviewNotifications)
router.patch('/:id/read', protect, markReviewNotificationRead)

export default router