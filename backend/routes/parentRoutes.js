import express from "express";
import User from "../models/User.js";
import { protect } from "../middlewares/authMiddleware.js";
import { authorizeRoles } from "../middlewares/roleMiddleware.js";
import {
  getChildMaterials,
  downloadChildMaterial,
  getFacultyOfChildren,
} from "../controllers/parentMaterial.js";
import Exam from "../models/Exam.js";
import ExamAttempt from "../models/ExamAttempt.js";
const router = express.Router();

/*
====================================
PARENT DASHBOARD
====================================
*/
router.get(
  "/dashboard",
  protect,
  authorizeRoles("parent"),
  async (req, res) => {
    try {
      const parent = await User.findById(req.user._id)
        .populate("children", "fullName studentId educationLevel");

      res.json(parent.children);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  }
);


/*
====================================
EXTRACT STUDENT BY ID (FOR PARENT)
====================================
*/
router.get(
  "/student/:studentId",
  protect,
  authorizeRoles("parent"),
  async (req, res) => {
    try {
      const { studentId } = req.params;

      const student = await User.findOne({
        studentId,
        role: "student",
      }).select("-password");

      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      res.json(student);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  }
);

/*
====================================
ADD CHILD (PARENT → STUDENT)
====================================
*/
router.post(
  "/add-student",
  protect,
  authorizeRoles("parent"),
  async (req, res) => {
    try {
      const { studentId } = req.body;

      const student = await User.findOne({
        studentId,
        role: "student",
      });

      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      // Prevent duplicate assignment
      const alreadyAdded = student.parents.some(
  (id) => id.toString() === req.user._id.toString()
);

if (alreadyAdded) {
  return res.status(400).json({
    message: "Child already added",
  });
}


      // Add parent to student
      student.parents.push(req.user._id);
      await student.save();

      // Add student to parent
      req.user.children.push(student._id);
      await req.user.save();

      res.json({
        success: true,
        message: "Child added successfully",
      });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  }
);

/*
========================
GET CHILD MATERIALS
========================
*/
router.get(
  "/child-materials/:childId",
  protect,
  authorizeRoles("parent"),
  getChildMaterials
);

/*
========================
DOWNLOAD CHILD MATERIAL
========================
*/
router.get(
  "/child-materials/download/:childId/:materialId",
  protect,
  authorizeRoles("parent"),
  downloadChildMaterial
);

router.get(
  "/faculty",
  protect,
  authorizeRoles("parent"),
  getFacultyOfChildren
);

/*
====================================
GET CHILD PROGRESS ANALYSIS
====================================
*/
router.get(
  "/child-progress/:childId",
  protect,
  authorizeRoles("parent"),
  async (req, res) => {
    try {
      const { childId } = req.params;

      // Verify child belongs to parent
      const parent = await User.findById(req.user._id);
      if (!parent || !parent.children.includes(childId)) {
        return res.status(403).json({ message: "Child not found" });
      }

      // Get child's exam attempts
      const attempts = await ExamAttempt.find({ student: childId })
        .populate({
          path: 'exam',
          select: 'title subject difficulty duration totalQuestions'
        })
        .sort({ submittedAt: -1 });

      // Calculate progress metrics
      const totalExams = attempts.length;
      const passedExams = attempts.filter(a => a.score >= 40).length;
      const averageScore = totalExams > 0 
        ? Math.round((attempts.reduce((sum, a) => sum + (a.score || 0), 0) / totalExams) * 100) / 100
        : 0;

      // Group by subject
      const subjectPerformance = {};
      attempts.forEach(attempt => {
        const subject = attempt.exam?.subject || 'Unknown';
        if (!subjectPerformance[subject]) {
          subjectPerformance[subject] = {
            attempts: 0,
            totalScore: 0,
            passed: 0
          };
        }
        subjectPerformance[subject].attempts++;
        subjectPerformance[subject].totalScore += attempt.score || 0;
        if (attempt.score >= 40) {
          subjectPerformance[subject].passed++;
        }
      });

      // Calculate subject averages
      Object.keys(subjectPerformance).forEach(subject => {
        const perf = subjectPerformance[subject];
        subjectPerformance[subject].averageScore = perf.attempts > 0
          ? Math.round((perf.totalScore / perf.attempts) * 100) / 100
          : 0;
        subjectPerformance[subject].passRate = perf.attempts > 0
          ? Math.round((perf.passed / perf.attempts) * 100)
          : 0;
      });

      res.json({
        child: {
          id: childId,
          totalExams,
          passedExams,
          averageScore,
          passRate: totalExams > 0 ? Math.round((passedExams / totalExams) * 100) : 0
        },
        subjectPerformance,
        recentAttempts: attempts.slice(0, 10)
      });
    } catch (error) {
      console.error("Child progress error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

export default router;