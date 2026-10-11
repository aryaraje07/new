import express from "express";
import {
  startFacultyExam,
  submitFacultyAnswer,
  evaluateFacultyExam,
   getFacultyResult, 
   getStudentFacultyAttempts   
} from "../controllers/facultyOralStudentController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/:id/start", protect, startFacultyExam);
router.post("/answer", protect, submitFacultyAnswer);
router.post("/evaluate", protect, evaluateFacultyExam);
router.get("/result/:id", protect, getFacultyResult);
router.get("/attempts", protect, getStudentFacultyAttempts);

export default router;
