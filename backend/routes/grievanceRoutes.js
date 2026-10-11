import express from "express";
import {
  // Student
  submitGrievance,
  submitFollowUpAnswers,
  getStudentGrievances,
  getGrievanceDetails,
  sendStudentMessage,
  verifyResolution,
  getGrievanceChat,
  // Faculty
  getFacultyGrievances,
  markGrievanceSolved,
  sendFacultyMessage,
  uploadResolutionFile,
  // Parent
  getParentEscalatedGrievances,
} from "../controllers/grievanceController.js";
import { protect } from "../middlewares/authMiddleware.js";
import { authorizeRoles } from "../middlewares/roleMiddleware.js";
import { uploadExamFile } from "../middlewares/uploadMiddleware.js";

const router = express.Router();

/**
 * GRIEVANCE ROUTES - ORDER MATTERS!
 * More specific routes MUST come before dynamic routes
 */

/**
 * STATIC ROUTES (no path parameters)
 */

// POST: Submit new grievance
router.post(
  "/submit",
  protect,
  authorizeRoles("student"),
  submitGrievance
);

/**
 * STUDENT ROUTES (specific paths before dynamic parameters)
 */

// GET: List all student's grievances
router.get(
  "/student/list",
  protect,
  authorizeRoles("student"),
  getStudentGrievances
);

/**
 * FACULTY ROUTES (specific paths before dynamic parameters)
 */

// GET: List grievances assigned to faculty
router.get(
  "/faculty/list",
  protect,
  authorizeRoles("faculty"),
  getFacultyGrievances
);

/**
 * PARENT ROUTES (specific paths before dynamic parameters)
 */

// GET: Get escalated grievances
router.get(
  "/parent/escalated",
  protect,
  authorizeRoles("parent"),
  getParentEscalatedGrievances
);

/**
 * DYNAMIC ROUTES (with path parameters) - MUST come after static routes
 */

// POST: Submit answers to follow-up questions
router.post(
  "/:grievanceId/answers",
  protect,
  authorizeRoles("student"),
  submitFollowUpAnswers
);

// GET: Get specific grievance details
router.get(
  "/:grievanceId/details",
  protect,
  authorizeRoles("student", "faculty"),
  getGrievanceDetails
);

// POST: Send message from student
router.post(
  "/:grievanceId/chat",
  protect,
  authorizeRoles("student"),
  uploadExamFile.single("file"),
  sendStudentMessage
);

// POST: Student uploads file
router.post(
  "/:grievanceId/upload",
  protect,
  authorizeRoles("student"),
  uploadExamFile.single("file"),
  sendStudentMessage
);

// POST: Verify if grievance is resolved
router.post(
  "/:grievanceId/verification",
  protect,
  authorizeRoles("student"),
  verifyResolution
);

// GET: Get chat messages for grievance
router.get(
  "/:grievanceId/chat",
  protect,
  authorizeRoles("student", "faculty"),
  getGrievanceChat
);

// POST: Mark grievance as solved
router.post(
  "/:grievanceId/mark-solved",
  protect,
  authorizeRoles("faculty"),
  markGrievanceSolved
);

// POST: Send message from faculty
router.post(
  "/:grievanceId/faculty-message",
  protect,
  authorizeRoles("faculty"),
  uploadExamFile.single("file"),
  sendFacultyMessage
);

// POST: Upload resolution file
router.post(
  "/:grievanceId/upload-resolution",
  protect,
  authorizeRoles("faculty"),
  uploadExamFile.single("file"),
  uploadResolutionFile
);

export default router;
