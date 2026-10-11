import express from "express";
import {
  generateFacultyOral,
  updateFacultyOral,
  assignFacultyOral,
  getFacultyScheduledExams,
  deleteFacultyExam,
  getSingleFacultyExam
} from "../controllers/facultyOralController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/generate", protect, generateFacultyOral);
router.put("/:id", protect, updateFacultyOral);
router.post("/:id/assign", protect, assignFacultyOral);
router.get("/", protect, getFacultyScheduledExams);
router.delete("/:id", protect, deleteFacultyExam);
router.get("/:id", protect, getSingleFacultyExam);



export default router;
