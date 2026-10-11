import ExamAttempt from "../models/ExamAttempt.js";
import QuizAttempt from "../models/QuizAttempt.js";
import Recommendation from "../models/Recommendation.js";
import TrainingHistory from "../models/TrainingHistory.js";
import Exam from "../models/Exam.js";
import { getLearnerCompetencyOverview } from "../services/competencyEngine.js";
import { getUserLearningMemory } from "../services/learningMemoryService.js";
import { getDashboardVisualizationData } from "../services/dashboardAggregationService.js";

export const getStudentDashboard = async (req, res) => {
  // Government Official / Learner Dashboard
  try {
    const learnerId = req.user._id;

    /* ================= EXAM & QUIZ ATTEMPTS ================= */
    // Fetch both formal exams and practice quizzes
    const examAttemptsData = await ExamAttempt.find({
      student: learnerId,
      score: { $exists: true, $ne: null }
    }).populate("exam", "title subject");

    const quizAttemptsData = await QuizAttempt.find({
      student: learnerId,
      isFinalized: true
    });

    const competencyOverview = await getLearnerCompetencyOverview(req.user);
    const [scheduledAssessments, recommendations, trainingHistory, learningMemory, visualizationData] = await Promise.all([
      Exam.find({
        status: "SCHEDULED",
        $or: [
          { scope: "ALL" },
          { scope: "SELECTED", assignedStudents: req.user._id },
        ],
      }).select("_id title subject scheduledAt totalQuestions status"),
      Recommendation.find({ user: learnerId })
        .populate("competency", "name code")
        .sort({ createdAt: -1 })
        .lean(),
      TrainingHistory.find({ user: learnerId })
        .populate("competency", "name code")
        .sort({ createdAt: -1 })
        .lean(),
      getUserLearningMemory(req.user),
      getDashboardVisualizationData(req.user._id),
    ]);

    // Merge and normalize both datasets
    const combinedAttempts = [
      ...examAttemptsData.map(a => ({
        type: 'Exam',
        score: a.score || 0,
        title: a.exam?.title || "Formal Exam",
        subject: a.exam?.subject || "General",
        date: a.submittedAt || a.createdAt
      })),
      ...quizAttemptsData.map(q => ({
        type: 'Quiz',
        score: typeof q.score === 'number' ? q.score : 0,
        title: q.quizType === 'CUSTOM' ? "Practice Quiz" : "Scheduled Quiz",
        subject: q.subject || "General",
        date: q.submittedAt || q.createdAt
      }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date)); // Descending order

    const totalQuizzes = combinedAttempts.length;

    const avgQuizScore =
      totalQuizzes > 0
        ? combinedAttempts.reduce((sum, a) => sum + a.score, 0) / totalQuizzes
        : 0;

    // Create trend data with most recent attempts first (reverse for chronological display left to right on chart)
    const quizTrend = [...combinedAttempts].reverse().map((a, i) => ({
      attempt: i + 1,
      score: a.score || 0,
      title: a.title,
      subject: a.subject,
      date: a.date,
    }));

    /* ================= SUBJECT PERFORMANCE ================= */
    const subjectMap = {};

    combinedAttempts.forEach((a) => {
      const subject = a.subject;
      if (!subjectMap[subject]) subjectMap[subject] = [];
      subjectMap[subject].push(a.score || 0);
    });

    const subjectPerformance = Object.keys(subjectMap).map((sub) => ({
      subject: sub,
      score: Math.round(
        subjectMap[sub].reduce((a, b) => a + b, 0) / subjectMap[sub].length
      ),
      attempts: subjectMap[sub].length,
    }));

    /* ================= OVERALL ================= */
    // Only average the categories that actually have data
    let categoriesWithData = 0;
    let totalAverages = 0;

    if (totalQuizzes > 0) { totalAverages += avgQuizScore; categoriesWithData++; }

    const overallAverage = categoriesWithData > 0 ? (totalAverages / categoriesWithData) : 0;

    /* ================= PASS RATE ================= */
    const passedCount = combinedAttempts.filter((a) => a.score >= 40).length;

    const passRate =
      totalQuizzes > 0
        ? Math.round((passedCount / totalQuizzes) * 100)
        : 0;

    /* ================= RECENT ACTIVITY ================= */
    const recentActivity = [
      ...combinedAttempts.map((a) => ({
        type: a.type, // 'Exam' or 'Quiz'
        title: a.title,
        subject: a.subject,
        score: a.score,
        date: a.date,
      })),
    ]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 6);

    /* ================= RESPONSE ================= */
    res.json({
      totalQuizzes,
      avgQuizScore: Math.round(avgQuizScore),
      overallAverage: Math.round(overallAverage),
      passRate,
      streak: totalQuizzes > 0 ? 1 : 0, // Simplified streak representation based on active exams
      quizTrend,
      subjectPerformance,
      recentActivity,
      profile: {
        fullName: req.user.fullName,
        designation: req.user.designation,
        department: req.user.department,
        organization: req.user.organization,
        jobRole: req.user.jobRole,
        currentAssignment: req.user.currentAssignment,
        qualification: req.user.qualification,
        yearsOfExperience: req.user.yearsOfExperience,
        previousTraining: req.user.previousTraining || [],
        targetRole: req.user.targetRole,
      },
      role: "government_official", // Add role identifier for frontend
      competencyOverview,
      scheduledAssessments,
      recommendations,
      trainingHistory,
      learningMemory,
      visualizationData,
    });
  } catch (err) {
    console.error("Dashboard Error:", err);
    res.status(500).json({ message: "Dashboard error" });
  }
};

