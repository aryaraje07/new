import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { authorizeRoles } from "../middlewares/roleMiddleware.js";
import {
  getStudentMaterials,
  downloadStudentMaterial,
  generateStudentMaterialQuiz,
} from "../controllers/studentMaterial.js";
import ExamAttempt from "../models/ExamAttempt.js";
import Exam from "../models/Exam.js";
import { getStudentDashboard } from '../controllers/learnerController.js'
import User from "../models/User.js";
import {
  getCurrentCompetencies,
  getRequiredCompetencies,
  getSkillGaps,
  getCompetencyOverview,
  regenerateCompetencyProfile,
  getComprehensiveProfile,
} from "../controllers/competencyController.js";
import {
  getMyLearningMemory,
  getMyRecallConcepts,
  getRecallQuestionForCompetency,
  getCompetencyMemoryDetail,
} from "../controllers/learningMemoryController.js";

const router = express.Router();

router.get("/competencies", protect, getCurrentCompetencies);
router.get("/competencies/required", protect, getRequiredCompetencies);
router.get("/skill-gaps", protect, getSkillGaps);
router.get("/competencies/overview", protect, getCompetencyOverview);
router.post("/competencies/regenerate-profile", protect, regenerateCompetencyProfile);
router.get("/competencies/comprehensive", protect, getComprehensiveProfile);

import Semester from "../models/Semester.js";


// Face verification (STUDENT ONLY)
router.put(
  "/face-verify",
  protect,
  authorizeRoles("learner", "student"),
  async (req, res) => {
    req.user.faceVerified = true;
    await req.user.save();

    res.json({ success: true, message: "Face verified successfully" });
  }
);

router.post(
  "/face-register",
  protect,
  authorizeRoles("learner", "student"),
  async (req, res) => {
    const { embedding } = req.body;

    if (!embedding || !Array.isArray(embedding)) {
      return res.status(400).json({ message: "Invalid face embedding" });
    }

    req.user.faceData = {
      embedding,
      model: "face-api.js",
      registeredAt: new Date(),
    };

    req.user.faceVerified = true;
    await req.user.save();

    res.json({ success: true });
  }
);

/*
========================
GET MATERIALS
========================
*/
router.get(
  "/materials",
  protect,
  authorizeRoles("learner", "student"),
  getStudentMaterials
);

/*
========================
DOWNLOAD MATERIAL
========================
*/
router.get(
  "/materials/download/:id",
  protect,
  authorizeRoles("learner", "student"),
  downloadStudentMaterial
);

router.post(
  "/materials/:id/generate-quiz",
  protect,
  authorizeRoles("learner", "student"),
  generateStudentMaterialQuiz
);



// dashboard stats for exams
router.get(
  '/dashboard',
  protect,
  authorizeRoles("learner", "student"),
  getStudentDashboard
)


// List semesters for student selection
router.get(
  '/semesters',
  protect,
  authorizeRoles('learner', 'student'),
  async (req, res) => {
    try {
      const list = await Semester.find().sort({ createdAt: -1 }).lean();
      return res.json(list);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Failed to fetch semesters' });
    }
  }
);

// Get student's marksheet for a semester (only if declared)
router.get(
  '/marksheets/:semesterId',
  protect,
  authorizeRoles('learner', 'student'),
  async (req, res) => {
    try {
      const { semesterId } = req.params;
      const sem = await Semester.findById(semesterId);
      if (!sem) return res.status(404).json({ message: 'Semester not found' });
      if (!sem.hasResultsDeclared) return res.status(403).json({ message: 'Results not declared yet' });

      const ExamAttempt = await import('../models/ExamAttempt.js').then(m=>m.default);
      const QuizAttempt = await import('../models/QuizAttempt.js').then(m=>m.default);
      const exams = await Exam.find({ semester: semesterId }).select('_id title subject totalQuestions scheduledAt');
      const examIds = exams.map(e=>e._id);

      const studentId = req.user._id;

      const examAttemptsRaw = await ExamAttempt.find({ exam: { $in: examIds }, student: studentId })
        .populate('exam', 'title subject totalQuestions scheduledAt')
        .lean();

      // filter out attempts for exams without valid scheduledAt
      const examAttemptsFiltered = examAttemptsRaw.filter(ea => ea.exam && ea.exam.scheduledAt);

      // DEDUPLICATE: Keep only latest attempt per exam
      const examMap = new Map();
      examAttemptsFiltered.forEach(attempt => {
        const examId = String(attempt.exam._id);
        const existing = examMap.get(examId);
        if (!existing || new Date(attempt.submittedAt) > new Date(existing.submittedAt)) {
          examMap.set(examId, attempt);
        }
      });
      const examAttempts = Array.from(examMap.values());

      const quizAttemptsRaw = await QuizAttempt.find({ quizType: 'SCHEDULED', quizId: { $in: examIds.map(id=>String(id)) }, student: studentId, isFinalized: true })
        .lean();

      const quizAttempts = quizAttemptsRaw.filter(qa => qa.submittedAt || qa.createdAt);

      // Build aggregated summary for the semester marksheet
      const examsSummary = examAttempts.map(ea => {
        const total = ea.totalQuestions || (ea.exam && ea.exam.totalQuestions) || 0;
        const score = typeof ea.score === 'number' ? ea.score : 0;
        
        // If correctCount exists, use it; otherwise estimate from percentage
        let correctCount = ea.correctCount;
        if (!correctCount || correctCount === 0) {
          correctCount = Math.round((score / 100) * total);
        }
        
        return {
          examId: ea.exam ? String(ea.exam._id) : null,
          title: ea.exam ? ea.exam.title : 'Unknown',
          subject: ea.exam ? ea.exam.subject : 'Unknown',
          score: correctCount,
          percentage: Number(score.toFixed(2)),
          total,
          startedAt: ea.startedAt || ea.createdAt || null,
          submittedAt: ea.submittedAt || null,
        };
      });

      const totalObtained = examsSummary.reduce((s, e) => s + e.score, 0);
      const totalPossible = examsSummary.reduce((s, e) => s + e.total, 0);
      const overallPercentage = totalPossible > 0 ? Number(((totalObtained / totalPossible) * 100).toFixed(2)) : 0;

      return res.json({ examAttempts, quizAttempts, examsSummary, totalObtained, totalPossible, overallPercentage });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Failed to fetch marksheet' });
    }
  }
);

// Get assigned faculty for grievance submission
router.get(
  '/assigned-faculty',
  protect,
  authorizeRoles("learner", "student"),
  async (req, res) => {
    try {
      // Get all faculty members for the grievance dropdown
      const faculty = await User.find({ role: { $in: ["faculty", "trainer"] } }).select(
        "_id fullName email department specialization"
      );

      if (!faculty || faculty.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No faculty members available",
          faculty: []
        });
      }

      res.json({
        success: true,
        faculty: faculty.map(f => ({
          _id: f._id,
          fullName: f.fullName,
          email: f.email,
          department: f.department || 'Not specified',
          specialization: f.specialization || 'Not specified'
        }))
      });
    } catch (error) {
      console.error("Error fetching assigned faculty:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching faculty members",
        error: error.message
      });
    }
  }
)

// Learning Memory Routes
router.get("/learning-memory", protect, authorizeRoles("learner", "student"), getMyLearningMemory);
router.get("/learning-memory/recall", protect, authorizeRoles("learner", "student"), getMyRecallConcepts);
router.get("/learning-memory/recall/:competencyId", protect, authorizeRoles("learner", "student"), getRecallQuestionForCompetency);
router.get("/learning-memory/:competencyId", protect, authorizeRoles("learner", "student"), getCompetencyMemoryDetail);


export default router;