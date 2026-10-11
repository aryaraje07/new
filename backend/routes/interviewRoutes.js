import express from "express";
import {
  createInterviewSession,
  getInterviewSession,
  saveInterviewAnswer,
  evaluateInterviewSession,
  getUserInterviews,
} from "../controllers/interviewController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/create", protect, createInterviewSession);
router.post("/answer", protect, saveInterviewAnswer);
router.post("/evaluate", protect, evaluateInterviewSession);
router.get("/", protect, getUserInterviews);
router.get("/:id", protect, getInterviewSession);

export default router;
