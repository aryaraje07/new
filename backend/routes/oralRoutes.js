import express from "express";
import {
  createOralSession,
  getOralSession,
  saveUserAnswer,
  evaluateOralSession,
  getUserOralSessions,
  getStudentScheduledExams
} from "../controllers/oralController.js";
import {protect} from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/create", protect, createOralSession);
router.post("/answer", protect, saveUserAnswer);
router.post("/evaluate", protect, evaluateOralSession);
router.get("/student/oral/scheduled", protect, getStudentScheduledExams);
router.get("/learner/oral/scheduled", protect, getStudentScheduledExams);
router.get("/", protect, getUserOralSessions);
router.get("/:id", protect, getOralSession);


export default router;
