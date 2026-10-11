import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import {
  getFacultyScheduledQuizzes,
  getQuizStats,
  getQuizAttemptDetails,
} from "../controllers/facultyQuizAnalyticsController.js";

const router = express.Router();

router.get("/scheduled-quizzes", protect, getFacultyScheduledQuizzes);
router.get("/scheduled-quizzes/:examId/stats", protect, getQuizStats);
router.get("/quiz-attempt/:attemptId", protect, getQuizAttemptDetails);

export default router;