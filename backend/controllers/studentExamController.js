import Exam from "../models/Exam.js";
import ExamAttempt from "../models/ExamAttempt.js";
import { recordResultHash } from "../services/hashVerificationService.js";
import { updateCompetencyFromAssessment } from "../services/competencyEngine.js";
import { updateLearningMemoryFromAttempt } from "../services/learningMemoryService.js";

console.log("studentExamController loaded");

/* ======================================================
   GET SCHEDULED EXAMS FOR STUDENT
====================================================== */
export const getScheduledExamsForStudent = async (req, res) => {
  try {
    const studentId = req.user._id;

    // Get all classes the student belongs to
    const Class = await import("../models/Class.js").then(m => m.default);
    const studentClasses = await Class.find({ 
      "students": studentId 
    }).select("_id");

    const classIds = studentClasses.map(cls => cls._id);

    const query = {
      status: "SCHEDULED",
      $or: [
        { scope: "ALL" },
        {
          scope: "SELECTED",
          assignedStudents: { $in: [studentId] },
        },
        {
          scope: "CLASS",
          assignedClass: { $in: classIds },
        },
      ],
    };

    // optional semester filter
    if (req.query?.semester) {
      query.semester = req.query.semester;
    }

    const exams = await Exam.find(query).populate("faculty", "fullName email");

    console.log(`Found ${exams.length} scheduled exams for student ${studentId}`);
    console.log("Student class IDs:", classIds);
    console.log("Exams found:", exams.map(e => ({ 
      id: e._id, 
      title: e.title, 
      scope: e.scope, 
      assignedClass: e.assignedClass 
    })));

    return res.status(200).json(exams);
  } catch (error) {
    console.error("❌ Fetch scheduled exams error:", error);
    return res
      .status(500)
      .json({ message: "Failed to fetch scheduled exams" });
  }
};

/* ======================================================
   START / RESUME SCHEDULED EXAM
====================================================== */
export const startScheduledExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.examId);

    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    const isImmediateAssessment = ["DIAGNOSTIC", "MATERIAL"].includes(exam.assessmentType);

    if (!exam.assignedStudents.some((student) => String(student) === String(req.user._id))) {
      return res.status(403).json({ message: "This assessment is not assigned to this learner." });
    }

    /* -------- TIME WINDOW CHECK -------- */
    const GRACE_MINUTES = 2;

    const now = new Date();
    const start = new Date(exam.scheduledAt);
    const end = new Date(start.getTime() + exam.duration * 60000);
    const graceStart = new Date(
      start.getTime() - GRACE_MINUTES * 60000
    );

    if (!isImmediateAssessment && now < graceStart) {
      return res
        .status(403)
        .json({ message: "Exam has not started yet" });
    }

    if (!isImmediateAssessment && now > end) {
      return res
        .status(403)
        .json({ message: "Exam has already ended" });
    }

    /* -------- CHECK EXISTING ATTEMPT -------- */
    const existingAttempt = await ExamAttempt.findOne({
      exam: exam._id,
      student: req.user._id,
    });

    // ❌ Already submitted → block
    if (
      existingAttempt &&
      ["SUBMITTED", "AUTO_SUBMITTED"].includes(
        existingAttempt.status
      )
    ) {
      return res
        .status(403)
        .json({ message: "Exam already attempted" });
    }

    // ✅ Resume ongoing attempt
    if (
      existingAttempt &&
      existingAttempt.status === "STARTED"
    ) {
      return res.json({
        attemptId: existingAttempt._id,
        duration: exam.duration,
        questions: exam.questions.map((q) => ({
          questionId: q.questionId,
          question: q.question,
          options: q.options,
        })),
      });
    }

    /* -------- CREATE NEW ATTEMPT -------- */
    const attempt = await ExamAttempt.create({
      exam: exam._id,
      student: req.user._id,
      totalQuestions: exam.questions.length,
      startedAt: new Date(),
      status: "STARTED",
    });

    return res.json({
      attemptId: attempt._id,
      duration: exam.duration,
      questions: exam.questions.map((q) => ({
        questionId: q.questionId,
        question: q.question,
        options: q.options,
      })),
    });
  } catch (error) {
    console.error("❌ Start exam error:", error)
    return res
      .status(500)
      .json({ message: error.message || "Failed to start exam" })
  }
};


/* ======================================================
   SUBMIT SCHEDULED EXAM
====================================================== */
export const submitScheduledExam = async (req, res) => {
  try {
    const { answers, proctoring } = req.body;

    const attempt = await ExamAttempt.findById(
      req.params.attemptId
    ).populate("exam");

    if (!attempt || attempt.status !== "STARTED") {
      return res.status(400).json({ message: "Invalid attempt" });
    }

    let score = 0;

    attempt.exam.questions.forEach((q) => {
      const ans = answers.find(
        (a) => a.questionId === q.questionId
      );
      if (ans && ans.selectedOption === q.correctAnswer) {
        score++;
      }
    });

    const percentage = attempt.totalQuestions > 0 
      ? Math.round((score / attempt.totalQuestions) * 100)
      : 0;

    attempt.answers = answers;
    attempt.correctCount = score;
    attempt.score = percentage;
    attempt.submittedAt = new Date();
    attempt.status = proctoring?.autoSubmitted
      ? "AUTO_SUBMITTED"
      : "SUBMITTED";
    attempt.proctoring = {
      faceWarnings: proctoring?.faceWarnings || 0,
      escWarnings: proctoring?.escWarnings || 0,
      autoSubmitted: proctoring?.autoSubmitted || false,
      reasons: proctoring?.reasons || [],
    }

    await attempt.save();

    try {
      await updateCompetencyFromAssessment({
        user: req.user,
        questions: attempt.exam.questions,
        answers: attempt.answers,
        source: attempt.exam.assessmentType === "DIAGNOSTIC" ? "initial-diagnostic" : "exam",
      });
    } catch (competencyError) {
      console.error("Competency evidence update failed:", competencyError.message);
    }

    // Update Learning Memory for diagnostic and exam assessments
    try {
      await updateLearningMemoryFromAttempt({
        user: req.user,
        questions: attempt.exam.questions,
        answers: attempt.answers,
      });
    } catch (learningMemoryError) {
      console.error("Learning Memory update failed:", learningMemoryError.message);
    }

    // � HASH VERIFICATION: Record result hash for tamper detection
    try {
      console.log("\n📝 Recording result hash for integrity verification...");
      
      const hashResult = await recordResultHash(attempt._id, {
        exam: attempt.exam._id,
        student: attempt.student,
        score: percentage,
        correctCount: score,
        totalMarks: attempt.totalQuestions,
        answers: attempt.answers,
        metadata: {
          examTitle: attempt.exam.title,
          subject: attempt.exam.subject,
          autoSubmitted: proctoring?.autoSubmitted || false,
        },
      });

      console.log("✅ Result hash recorded:", hashResult.currentHash.substring(0, 16) + "...");
      
      return res.json({
        score: percentage,
        correctCount: score,
        total: attempt.totalQuestions,
        verification: {
          hash: hashResult.currentHash,
          message: "Result secured with SHA256 verification ✅",
        },
      });
    } catch (hashError) {
      console.error("❌ Hash verification error:", hashError.message);
      console.warn("⚠️  Continuing with exam submission");
      
      return res.json({
        score: percentage,
        correctCount: score,
        total: attempt.totalQuestions,
        warning: "Exam submitted (hash verification unavailable)",
      });
    }
  } catch (error) {
    console.error("❌ Submit exam error:", error);
    return res
      .status(500)
      .json({ message: "Failed to submit exam" });
  }
};

/* ======================================================
   GET SCHEDULED EXAM RESULT
====================================================== */
export const getScheduledExamResult = async (req, res) => {
  try {
    const attempt = await ExamAttempt.findById(
      req.params.attemptId
    ).populate("exam");

    if (!attempt) {
      return res.sendStatus(404);
    }

    const analysis = attempt.exam.questions.map((q) => {
      const ans = attempt.answers.find(
        (a) => a.questionId === q.questionId
      );

      return {
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        studentAnswer: ans?.selectedOption ?? null,
        isCorrect:
          ans?.selectedOption === q.correctAnswer,
      };
    });

    // Calculate correctCount if missing from old records
    let correctCount = attempt.correctCount;
    if (!correctCount || correctCount === 0) {
      const correctAnswers = analysis.filter(a => a.isCorrect).length;
      correctCount = correctAnswers;
    }

    return res.json({
      quizTitle: attempt.exam?.title || "Scheduled Exam",
      subject: attempt.exam?.subject || null,
      score: attempt.score,
      correctCount: correctCount,
      total: attempt.totalQuestions,
      status: attempt.status,
      proctoring: attempt.proctoring,
      analysis,
    });
  } catch (error) {
    console.error("❌ Get result error:", error);
    return res
      .status(500)
      .json({ message: "Failed to fetch result" });
  }
};
