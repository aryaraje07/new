import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import {
  getFacultyOralExams,
  getOralExamStats,
  getAttemptDetails,
} from "../controllers/facultyAnalyticsController.js";

const router = express.Router();

router.get("/oral-exams", protect, getFacultyOralExams);
router.get("/oral-exams/:examId/stats", protect, getOralExamStats);
router.get("/attempt/:attemptId", protect, getAttemptDetails);

export default router;
