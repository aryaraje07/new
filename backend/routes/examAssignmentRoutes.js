import express from "express";
import { authorizeRoles } from "../middlewares/roleMiddleware.js";
import { protect } from "../middlewares/authMiddleware.js";
import { assignStudentsToExam } from "../controllers/examAssignmentController.js";

const router = express.Router();

router.post(
  "/exams/:examId/assign",
  protect,
  authorizeRoles("faculty"),
  assignStudentsToExam
);

export default router;