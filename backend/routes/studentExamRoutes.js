import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { authorizeRoles } from "../middlewares/roleMiddleware.js";

import {
  getScheduledExamsForStudent,
  startScheduledExam,
  submitScheduledExam,
  getScheduledExamResult,
} from "../controllers/studentExamController.js";

const router = express.Router();

router.get(
  "/scheduled",
  protect,
  authorizeRoles("student", "learner"),
  getScheduledExamsForStudent
);

router.post(
  "/scheduled/:examId/start",
  protect,
  authorizeRoles("student", "learner"),
  startScheduledExam
);

router.post(
  "/attempts/:attemptId/submit",
  protect,
  authorizeRoles("student", "learner"),
  submitScheduledExam
);

router.get(
  "/attempts/:attemptId/result",
  protect,
  authorizeRoles("student", "learner"),
  getScheduledExamResult
);

export default router;