// import express from "express";
// import { protect } from "../middlewares/authMiddleware.js";
// import { authorizeRoles } from "../middlewares/roleMiddleware.js";
// import User from "../models/User.js";
// import upload from "../middlewares/upload.js";
// import { uploadMaterial } from "../controllers/facultyMaterial.js";
// import {
//   getFacultyStudents,
//   removeStudentConnection,
// } from "../controllers/facultyMaterial.js";



// const router = express.Router();

// // Faculty dashboard
// router.get(
//   "/dashboard",
//   protect,
//   authorizeRoles("faculty"),
//   (req, res) => {
//     res.json({
//       message: "Faculty dashboard data",
//       facultyId: req.user.facultyId,
//     });
//   }
// );

// // Extract student by studentId
// router.get(
//   "/student/:studentId",
//   protect,
//   authorizeRoles("faculty"),
//   async (req, res) => {
//     const { studentId } = req.params;

//     const student = await User.findOne({
//       studentId,
//       role: "student",
//     }).select("-password");

//     if (!student) {
//       return res.status(404).json({ message: "Student not found" });
//     }

//     res.json(student);
//   }
// );

// router.post(
//   "/add-student",
//   protect,
//   authorizeRoles("faculty"),
//   async (req, res) => {
//     const { studentId } = req.body;

//     const student = await User.findOne({
//       studentId,
//       role: "student",
//     });

//     if (!student) {
//       return res.status(404).json({ message: "Student not found" });
//     }

//     // Prevent duplicate
//     if (student.faculties.includes(req.user._id)) {
//       return res.status(400).json({
//         message: "Student already assigned to this faculty",
//       });
//     }

//     // Add faculty to student
//     student.faculties.push(req.user._id);
//     await student.save();

//     // Add student to faculty
//     req.user.students.push(student._id);
//     await req.user.save();

//     res.json({ success: true, message: "Student added successfully" });
//   }
// );
// /*
// ========================
// GET ASSIGNED STUDENTS
// ========================
// */
// router.get(
//   "/my-students",
//   protect,
//   authorizeRoles("faculty"),
//   async (req, res) => {
//     const faculty = await User.findById(req.user._id)
//       .populate("students", "fullName studentId");

//     res.json(faculty.students);
//   }
// );

// /*
// ========================
// UPLOAD MATERIAL
// ========================
// */
// router.post(
//   "/upload-material",
//   protect,
//   authorizeRoles("faculty"),
//   upload.array("files"),
//   uploadMaterial
// );

// router.get(
//   "/students",
//   protect,
//   authorizeRoles("faculty"),
//   getFacultyStudents
// );

// router.delete(
//   "/students/:studentId",
//   protect,
//   authorizeRoles("faculty"),
//   removeStudentConnection
// );



// export default router;




import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { authorizeRoles } from "../middlewares/roleMiddleware.js";
import User from "../models/User.js";
import upload from "../middlewares/upload.js";
import { getLearnerCompetencyOverview } from "../services/competencyEngine.js";
import { uploadMaterial } from "../controllers/trainerMaterial.js";
import {
  getFacultyStudents,
  removeStudentConnection,
  generateQuizFromMaterial,
  saveQuizFromMaterial,
  getFacultyMaterials,
} from "../controllers/trainerMaterial.js";
import ExamAttempt from "../models/ExamAttempt.js";
import Exam from "../models/Exam.js";

const router = express.Router();

router.post(
  "/materials/:materialId/assessment",
  protect,
  authorizeRoles("trainer", "faculty"),
  saveQuizFromMaterial
);

router.get(
  "/dashboard",
  protect,
  authorizeRoles("trainer", "faculty"),
  async (req, res) => {
    try {
      const facultyId = req.user._id; // ✅ correct

      /* 1️⃣ TOTAL STUDENTS */
      const faculty = await User.findById(facultyId).select("students").lean();
      const exams = await Exam.find({ faculty: facultyId }).select("assignedStudents").lean();
      const assignedIds = [
        ...(faculty?.students || []),
        ...(await User.find({ faculties: facultyId, role: { $in: ["learner", "student"] } }).distinct("_id")),
        ...exams.flatMap((exam) => exam.assignedStudents || []),
      ];
      const uniqueStudentIds = [...new Set(assignedIds.map((id) => String(id)))];
      const students = await User.find({ _id: { $in: uniqueStudentIds } }).lean();
      const totalStudents = students.length;
      const learnerProgress = await Promise.all(students.map(async (student) => {
        const [latestAttempt, overview] = await Promise.all([
          ExamAttempt.findOne({ student: student._id, status: { $in: ["SUBMITTED", "AUTO_SUBMITTED"] } })
            .sort({ submittedAt: -1 })
            .select("score submittedAt exam"),
          getLearnerCompetencyOverview(student),
        ]);
        const competencies = overview.competencies || [];
        const readiness = competencies.length === 0 || competencies.some((item) => item.current?.score == null)
          ? "NOT ASSESSED"
          : competencies.some((item) => item.gap?.status === "open") ? "GAP" : "READY";
        return {
          _id: student._id,
          fullName: student.fullName,
          designation: student.designation,
          targetRole: student.targetRole,
          latestScore: latestAttempt?.score ?? null,
          latestAssessmentAt: latestAttempt?.submittedAt ?? null,
          readiness,
          openGaps: competencies.filter((item) => item.gap?.status === "open").length,
        };
      }));

      /* 2️⃣ TOTAL EXAMS */
      const totalExams = await Exam.countDocuments({
        faculty: facultyId,
      });


      /* 4️⃣ RECENT EXAMS */
      const recentExamsRaw = await Exam.find({ faculty: facultyId })
  .sort({ createdAt: -1 })
  .limit(5);

const recentExams = await Promise.all(
  recentExamsRaw.map(async (exam) => {
    const attemptsCount = await ExamAttempt.countDocuments({
      exam: exam._id,
    });

    return {
      _id: exam._id,
      title: exam.title,
      subject: exam.subject,
      studentsCount: attemptsCount,
      status: exam.isCompleted ? "completed" : "active",
    };
  })
);
      /* 5️⃣ SUBJECT PERFORMANCE */
      const subjectPerformance = await Exam.aggregate([
        { $match: { faculty: facultyId } },
        {
          $group: {
            _id: "$subject",
            avgScore: { $avg: "$averageScore" }, // 👈 verify field exists
          },
        },
        {
          $project: {
            subject: "$_id",
            avgScore: { $round: ["$avgScore", 0] },
            _id: 0,
          },
        },
      ]);

      /* 6️⃣ AVG PASS RATE */
      const avgPassRate =
        subjectPerformance.length > 0
          ? Math.round(
              subjectPerformance.reduce((sum, s) => sum + s.avgScore, 0) /
                subjectPerformance.length
            )
          : 0;

      res.json({
  totalStudents,
  totalExams,
  avgPassRate,
  recentExams,
  subjectPerformance,
  learnerProgress,
});
    } catch (error) {
      console.error("Faculty dashboard error:", error);
      res.status(500).json({ message: "Failed to load dashboard" });
    }
  }
);

// Extract student by studentId
router.get(
  "/student/:studentId",
  protect,
  authorizeRoles("trainer", "faculty"),
  async (req, res) => {
    const { studentId } = req.params;

    const student = await User.findOne({
      studentId,
      role: { $in: ["student", "learner"] },
    }).select("-password");

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.json(student);
  }
);

router.post(
  "/add-student",
  protect,
  authorizeRoles("trainer", "faculty"),
  async (req, res) => {
    const { studentId } = req.body;

    const student = await User.findOne({
      studentId,
      role: { $in: ["student", "learner"] },
    });

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Prevent duplicate
    if (student.faculties.includes(req.user._id)) {
      return res.status(400).json({
        message: "Student already assigned to this faculty",
      });
    }

    // Add faculty to student
    student.faculties.push(req.user._id);
    await student.save();

    // Add student to faculty
    req.user.students.push(student._id);
    await req.user.save();

    res.json({ success: true, message: "Student added successfully" });
  }
);
/*
========================
GET ASSIGNED STUDENTS
========================
*/
router.get(
  "/my-students",
  protect,
  authorizeRoles("trainer", "faculty"),
  async (req, res) => {
    const faculty = await User.findById(req.user._id)
      .populate("students", "fullName email phone studentId designation targetRole parents");

    res.json(faculty.students);
  }
);

router.get(
  "/classes",
  protect,
  authorizeRoles("trainer", "faculty"),
  async (req, res) => {
    try {
      const Class = await import("../models/Class.js").then(m => m.default);
      const classes = await Class.find({ faculty: req.user._id })
        .populate("students", "fullName studentId")
        .lean();
      res.json(classes);
    } catch (error) {
      console.error("Failed to fetch classes:", error);
      res.status(500).json({ message: "Failed to fetch classes" });
    }
  }
);

/*
========================
UPLOAD MATERIAL
========================
*/
router.post(
  "/upload-material",
  protect,
  authorizeRoles("trainer", "faculty"),
  upload.array("files"),
  uploadMaterial
);

router.get(
  "/materials",
  protect,
  authorizeRoles("trainer", "faculty"),
  getFacultyMaterials
);

router.post(
  "/generate-quiz-from-material",
  protect,
  authorizeRoles("trainer", "faculty"),
  generateQuizFromMaterial
);

// Canonical material-scoped generation endpoint used by the SIH trainer flow.
router.post(
  "/materials/:materialId/generate-assessment",
  protect,
  authorizeRoles("trainer", "faculty"),
  (req, _res, next) => { req.body.materialId = req.params.materialId; next(); },
  generateQuizFromMaterial
);

router.get(
  "/students",
  protect,
  authorizeRoles("trainer", "faculty"),
  getFacultyStudents
);

router.delete(
  "/students/:studentId",
  protect,
  authorizeRoles("trainer", "faculty"),
  removeStudentConnection
);



export default router;
