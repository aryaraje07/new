import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import {
  getExamAttempts,
  getAttemptDetails,
  getAllFacultyAttempts,
} from "../controllers/facultyQuizReviewController.js";

const router = express.Router();

// Get all attempts for a specific exam
router.get("/exam-attempts/:examId", protect, getExamAttempts);

// Get detailed attempt by ID
router.get("/attempt-details/:attemptId", protect, getAttemptDetails);

// Get all attempts across all faculty's exams
router.get("/all-attempts", protect, getAllFacultyAttempts);

export default router;