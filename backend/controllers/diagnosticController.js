import Exam from "../models/Exam.js";
import { generateDiagnosticQuestions } from "../services/diagnosticService.js";

export const createDiagnostic = async (req, res) => {
  try {
    if (!['learner', 'student'].includes(req.user.role)) return res.status(403).json({ message: "Learner access required." });
    const targetRole = req.user.targetRole;
    if (!targetRole) return res.status(400).json({ message: "Select a target role before starting the initial diagnostic." });
    const roleName = String(targetRole).trim();
    const existing = await Exam.findOne({
      assessmentType: "DIAGNOSTIC",
      subject: new RegExp(`^${roleName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
      assignedStudents: req.user._id,
    }).sort({ createdAt: -1 });
    if (existing) {
      const attempt = await (await import("../models/ExamAttempt.js")).default.findOne({ exam: existing._id, student: req.user._id }).lean();
      return res.json({ success: true, examId: existing._id, status: existing.status, existing: true, completed: Boolean(attempt && ["SUBMITTED", "AUTO_SUBMITTED"].includes(attempt.status)) });
    }
    const generated = await generateDiagnosticQuestions({ targetRole, count: req.body.questionCount });
    const exam = await Exam.create({ title: "Initial Competency Diagnostic", description: `Role-based baseline assessment for ${generated.role.name}.`, subject: generated.role.name, faculty: req.user._id, duration: 30, totalQuestions: generated.questions.length, questions: generated.questions, competencyTags: [...new Set(generated.questions.map((question) => question.competency))], assessmentType: "DIAGNOSTIC", generatedByModel: generated.model || generated.provider, status: "SCHEDULED", scope: "SELECTED", assignedStudents: [req.user._id], scheduledAt: new Date() });
    res.status(201).json({ success: true, examId: exam._id, status: exam.status, provider: generated.provider, questions: exam.questions.map(({ correctAnswer, ...question }) => question) });
  } catch (error) { res.status(error.message.includes("unavailable") ? 503 : 400).json({ message: error.message }); }
};
