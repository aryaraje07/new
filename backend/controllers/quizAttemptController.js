//quizAttemptController.js
// 
import QuizAttempt from "../models/QuizAttempt.js";
import Exam from "../models/Exam.js";
import { updateCompetencyFromAssessment } from "../services/competencyEngine.js";
import { updateLearningMemoryFromAttempt } from "../services/learningMemoryService.js";

/* ---------------- HELPERS ---------------- */

const normalizeWarnings = (warnings) => ({
  tab: Number.isFinite(Number(warnings?.tab)) ? Number(warnings.tab) : 0,
  face: Number.isFinite(Number(warnings?.face)) ? Number(warnings.face) : 0,
});

const normalizeAnswers = (answers) =>
  Array.isArray(answers)
    ? answers
        .filter((a) => a && a.questionId)
        .map((a) => ({
          questionId: String(a.questionId),
          selectedIndex:
            a.selectedIndex === null || a.selectedIndex === undefined
              ? null
              : Number(a.selectedIndex),
        }))
    : [];

const calculateScore = (attempt) => {
  const correct = attempt.correctAnswers || [];
  const answers = normalizeAnswers(attempt.answers);
  const total = attempt.totalQuestions || correct.length;

  if (!total) return { correctCount: 0, percentage: 0 };

  let count = 0;
  for (const ans of answers) {
    const truth = correct.find(
      (c) => String(c.questionId) === String(ans.questionId)
    );
    if (
      truth &&
      ans.selectedIndex !== null &&
      Number(truth.correctAnswer) === Number(ans.selectedIndex)
    ) {
      count++;
    }
  }

  return {
    correctCount: count,
    percentage: Math.round((count / total) * 100),
  };
};

/* ---------------- START ATTEMPT ---------------- */

export const startAttempt = async (req, res) => {
  try {
    const { quizType, questions, subject } = req.body;
    const safeQuestions = Array.isArray(questions) ? questions : [];

    const attempt = await QuizAttempt.create({
      student: req.user._id,
      quizType,
      quizId: "CUSTOM_AI",
      subject: subject || null,
      questions: safeQuestions.map((q) => ({
        questionId: String(q.questionId),
        question: q.question || "",
        options: Array.isArray(q.options) ? q.options : [],
        correctAnswer: Number(q.correctAnswer),
        competency: q.competency || undefined,
        competencyDomain: q.competencyDomain || undefined,
        difficulty: q.difficulty,
      })),
      correctAnswers: safeQuestions.map((q) => ({
        questionId: String(q.questionId),
        correctAnswer: Number(q.correctAnswer),
        question: q.question || "",
        options: Array.isArray(q.options) ? q.options : [],
        competency: q.competency || undefined,
        competencyDomain: q.competencyDomain || undefined,
        difficulty: q.difficulty,
      })),
      answers: [],
      totalQuestions: safeQuestions.length,
      warnings: { tab: 0, face: 0 },
      score: 0,
      status: "ONGOING",
      isFinalized: false,
    });

    res.json({ attemptId: attempt._id });
  } catch (err) {
    res.status(500).json({ message: "Failed to start attempt" });
  }
};

/* -------- START SCHEDULED EXAM ATTEMPT -------- */

export const startScheduledExamAttempt = async (req, res) => {
  try {
    const studentId = req.user._id;
    const { examId } = req.params;

    // 1️⃣ Fetch exam
    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    if (exam.status !== "SCHEDULED") {
      return res.status(403).json({ message: "Exam not active" });
    }

    // 2️⃣ Eligibility check
    if (
      exam.scope === "SELECTED" &&
      !exam.assignedStudents.some(
        (id) => id.toString() === studentId.toString()
      )
    ) {
      return res.status(403).json({ message: "Not assigned to this exam" });
    }

    // 3️⃣ Prevent reattempt
    const existing = await QuizAttempt.findOne({
      student: studentId,
      quizId: examId,
      isFinalized: false,
    });

    if (existing) {
      return res.json({
        attemptId: existing._id,
        duration: exam.duration,
        questions: existing.questions,
      });
    }

    // 4️⃣ Create attempt from faculty questions
    const attempt = await QuizAttempt.create({
      student: studentId,
      quizType: "SCHEDULED",
      quizId: examId,

      questions: exam.questions.map((q) => ({
        questionId: String(q.questionId),
        question: q.question,
        options: q.options,
        correctAnswer: Number(q.correctAnswer), // kept for score logic
        competency: q.competency || undefined,
        competencyDomain: q.competencyDomain || undefined,
        difficulty: q.difficulty,
      })),

      correctAnswers: exam.questions.map((q) => ({
        questionId: String(q.questionId),
        correctAnswer: Number(q.correctAnswer),
        question: q.question,
        options: q.options,
        competency: q.competency || undefined,
        competencyDomain: q.competencyDomain || undefined,
        difficulty: q.difficulty,
      })),

      answers: [],
      totalQuestions: exam.questions.length,
      warnings: { tab: 0, face: 0 },
      score: 0,
      status: "ONGOING",
      isFinalized: false,
    });

    res.json({
      attemptId: attempt._id,
      duration: exam.duration,
      questions: attempt.questions,
    });
  } catch (err) {
    console.error("Scheduled exam start failed:", err);
    res.status(500).json({ message: "Failed to start scheduled exam" });
  }
};

/* ---------------- ADD WARNING ---------------- */

export const addWarning = async (req, res) => {
  try {
    const { attemptId, type, answers } = req.body;
    const attempt = await QuizAttempt.findById(attemptId);
    if (!attempt) return res.sendStatus(404);

    if (attempt.isFinalized) {
      return res.json({
        warnings: normalizeWarnings(attempt.warnings),
        autoSubmitted: true,
      });
    }

    attempt.warnings = normalizeWarnings(attempt.warnings);

    if (Array.isArray(answers)) {
      const parsed = normalizeAnswers(answers);
      if (parsed.length) attempt.answers = parsed;
    }

    if (type === "TAB") attempt.warnings.tab++;
    if (type === "FACE") attempt.warnings.face++;

    const totalWarnings = attempt.warnings.tab + attempt.warnings.face;

    if (totalWarnings >= 3) {
      const scoreData = calculateScore(attempt);
      attempt.status = "AUTO_SUBMITTED";
      attempt.score = scoreData.percentage;
      attempt.correctCount = scoreData.correctCount;
      attempt.submittedAt = new Date();
      attempt.isFinalized = true;
      attempt.submitReason = "PROCTOR_VIOLATION";
      attempt.submissionType = "AUTO";
    }

    await attempt.save();

    if (attempt.isFinalized) {
      try {
        await updateCompetencyFromAssessment({
          user: req.user,
          questions: attempt.questions,
          answers: attempt.answers,
          source: "quiz",
        });
      } catch (competencyError) {
        console.error("Competency evidence update failed:", competencyError.message);
      }

      // Update Learning Memory
      try {
        await updateLearningMemoryFromAttempt({
          user: req.user,
          questions: attempt.questions,
          answers: attempt.answers,
        });
      } catch (learningMemoryError) {
        console.error("Learning Memory update failed:", learningMemoryError.message);
      }
    }

    res.json({
      warnings: normalizeWarnings(attempt.warnings),
      autoSubmitted: attempt.isFinalized,
    });
  } catch (err) {
    res.status(500).json({ message: "Warning update failed" });
  }
};

/* ---------------- SUBMIT ATTEMPT ---------------- */

export const submitAttempt = async (req, res) => {
  try {
    const { quizAttemptId, answers, submitReason = "NORMAL" } = req.body;

    if (!quizAttemptId) {
      return res.status(400).json({ message: "Quiz attempt ID required" });
    }

    const attempt = await QuizAttempt.findById(quizAttemptId);
    if (!attempt) {
      return res.status(404).json({ message: "Quiz attempt not found" });
    }

    if (attempt.isFinalized) {
      return res.json({
        alreadySubmitted: true,
        quizAttemptId: attempt._id,
        score: attempt.score,
        correctCount: attempt.correctCount,
        status: attempt.status,
      });
    }

    if (Array.isArray(answers) && answers.length) {
      attempt.answers = normalizeAnswers(answers);
    }

    const scoreData = calculateScore(attempt);
    attempt.score = scoreData.percentage;
    attempt.correctCount = scoreData.correctCount;
    attempt.status =
      submitReason === "PROCTOR_VIOLATION" ? "AUTO_SUBMITTED" : "SUBMITTED";
    attempt.submittedAt = new Date();
    attempt.isFinalized = true;
    attempt.submitReason = submitReason;

    // Set submissionType based on submitReason
    if (submitReason === "TIME_UP") {
      attempt.submissionType = "TIME_UP";
    } else if (submitReason === "PROCTOR_VIOLATION") {
      attempt.submissionType = "AUTO";
    } else {
      attempt.submissionType = "MANUAL";
    }

    await attempt.save();

    try {
      await updateCompetencyFromAssessment({
        user: req.user,
        questions: attempt.questions,
        answers: attempt.answers,
        source: "quiz",
      });
    } catch (competencyError) {
      console.error("Competency evidence update failed:", competencyError.message);
    }

    // Update Learning Memory
    try {
      await updateLearningMemoryFromAttempt({
        user: req.user,
        questions: attempt.questions,
        answers: attempt.answers,
      });
    } catch (learningMemoryError) {
      console.error("Learning Memory update failed:", learningMemoryError.message);
    }

    res.json({
      success: true,
      quizAttemptId: attempt._id,
      score: attempt.score,
      correctCount: attempt.correctCount,
      status: attempt.status,
    });
  } catch (err) {
    console.error("Submit attempt error:", err);
    res.status(500).json({ message: "Submit failed" });
  }
};
