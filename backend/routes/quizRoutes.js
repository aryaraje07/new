// routes/quizRoutes.js
import express from "express";
import { protect } from "../middlewares/authMiddleware.js";

import { generateQuiz } from "../controllers/quizController.js";
import {
  startAttempt,
  addWarning,
  submitAttempt,
} from "../controllers/quizAttemptController.js";

const router = express.Router();

// AI quiz generation
router.post("/generate", protect, generateQuiz);

// quiz attempt lifecycle
router.post("/attempt/start", protect, startAttempt);
router.patch("/attempt/warning", protect, addWarning);
router.patch("/submit", protect, submitAttempt);

export default router;