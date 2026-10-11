import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { authorizeRoles } from "../middlewares/roleMiddleware.js";
import { getQuizResult, listStudentQuizAttempts } from "../controllers/quizResultController.js";

const router = express.Router();

// List all finalized attempts for current student - MUST COME FIRST
router.get(
  "/list",
  protect,
  authorizeRoles("student", "learner"),
  listStudentQuizAttempts
);

// Student can view own quiz result - MUST COME AFTER /list
router.get(
  "/:attemptId",
  protect,
  authorizeRoles("student", "learner"),
  getQuizResult
);

export default router;