import Exam from "../models/Exam.js";
import User from "../models/User.js";
import { extractTextFromUploadedFile } from "../utils/extractText.js";
import generateExamQuestions from "../services/examQuestionGenerator.js";
import Competency from "../models/Competency.js";

/* --------------------------------------------------
   1. CREATE EXAM FROM DOC (AI GENERATION)
-------------------------------------------------- */

export const createExamFromDoc = async (req, res) => {
  try {
    console.log("🔥 CREATE EXAM API HIT");
    console.log("Faculty ID:", req.user._id);

    const {
      title,
      description,
      subject,
      duration,
      totalQuestions,
    } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: "Document is required" });
    }

    // 1️⃣ Extract text from uploaded file (LOCAL FILE)
    const extractedText = await extractTextFromUploadedFile(req.file);

    if (!extractedText || extractedText.length < 50) {
      return res
        .status(400)
        .json({ message: "Could not extract enough text from document" });
    }

    // 2️⃣ Generate questions using AI
    const generatedQuestions = await generateExamQuestions({
  text: extractedText,                 // 🔥 SYLLABUS
  totalQuestions: Number(totalQuestions),
  difficulty: "mixed",
  subject,
});

    // 3️⃣ Save exam as DRAFT
    const exam = await Exam.create({
      title,
      description,
      subject,
      difficulty: "mixed",
      duration,
      totalQuestions,
      faculty: req.user._id,
      status: "DRAFT",
        questions: generatedQuestions.map((q, idx) => ({
      questionId: q.questionId || q.id || `q_${idx + 1}`,
  question: q.question,
  options: q.options,
      correctAnswer: q.correctAnswer ?? q.correct,
      explanation: q.explanation,
      difficulty: q.difficulty,
})),
    });

    console.log("✅ EXAM SAVED IN DB:", exam._id);

    res.json({
      examId: exam._id,
      questions: exam.questions,
      status: exam.status,
    });
  } catch (err) {
    console.error(err);
    res.status(503).json({ message: err.message || "Exam creation failed" });
  }
};



/* --------------------------------------------------
   2. GET EXAM (FOR REVIEW)
-------------------------------------------------- */
export const getExamForReview = async (req, res) => {
  try {
    const exam = await Exam.findOne({
      _id: req.params.examId,
      faculty: req.user._id,
    });

    if (!exam) return res.sendStatus(404);
    res.json(exam);
  } catch {
    res.status(500).json({ message: "Failed to fetch exam" });
  }
};

/* --------------------------------------------------
   3. UPDATE QUESTION
-------------------------------------------------- */
export const updateExamQuestion = async (req, res) => {
  try {
    const { examId, questionId } = req.params;
    const { question, options, correctAnswer, competency, competencyDomain, difficulty } = req.body;

    const exam = await Exam.findOne({
      _id: examId,
      faculty: req.user._id,
      status: "DRAFT",
    });

    if (!exam) {
      return res.status(403).json({ message: "Exam not editable" });
    }

    const q = exam.questions.find((q) => q.questionId === questionId);
    if (!q) return res.sendStatus(404);

    if (question) {
      q.revisionHistory.push({ question: q.question, changedAt: new Date(), changedBy: req.user._id });
      q.question = question;
    }
    if (options) {
      if (!Array.isArray(options) || options.length !== 4 || options.some((option) => !String(option).trim()) || new Set(options.map((option) => String(option).trim().toLowerCase())).size !== 4) return res.status(400).json({ message: "Exactly four unique non-empty options are required." });
      q.options = options;
    }
    if (correctAnswer !== undefined) q.correctAnswer = Number(correctAnswer);
    if (competency !== undefined) {
      if (!competency) {
        q.competency = undefined;
        q.competencyDomain = undefined;
      } else {
        const competencyRecord = await Competency.findById(competency).select("domain");
        if (!competencyRecord) return res.status(400).json({ message: "Invalid competency" });
        q.competency = competencyRecord._id;
        q.competencyDomain = competencyDomain || competencyRecord.domain;
      }
    }
    if (difficulty !== undefined) {
      const normalizedDifficulty = Number(difficulty);
      if (!Number.isInteger(normalizedDifficulty) || normalizedDifficulty < 0 || normalizedDifficulty > 5) {
        return res.status(400).json({ message: "Difficulty must be an integer from 0 to 5" });
      }
      q.difficulty = normalizedDifficulty;
    }

    await exam.save();
    res.json({ success: true, questions: exam.questions });
  } catch {
    res.status(500).json({ message: "Question update failed" });
  }
};

/* --------------------------------------------------
   4. DELETE QUESTION
-------------------------------------------------- */
export const deleteExamQuestion = async (req, res) => {
  try {
    const { examId, questionId } = req.params;

    const exam = await Exam.findOne({
      _id: examId,
      faculty: req.user._id,
      status: "DRAFT",
    });

    if (!exam) {
      return res.status(403).json({ message: "Exam not editable" });
    }

    exam.questions = exam.questions.filter(
      (q) => q.questionId !== questionId
    );
    exam.totalQuestions = exam.questions.length;

    await exam.save();
    res.json({ success: true, questions: exam.questions });
  } catch {
    res.status(500).json({ message: "Delete failed" });
  }
};

/* --------------------------------------------------
   5. APPROVE EXAM
-------------------------------------------------- */
export const approveExam = async (req, res) => {
  try {
    const exam = await Exam.findOne({
      _id: req.params.examId,
      faculty: req.user._id,
      status: "DRAFT",
    });

    if (!exam) {
      return res.status(403).json({ message: "Cannot approve exam" });
    }

    exam.status = "APPROVED";
    exam.approvedBy = req.user._id;
    exam.approvedAt = new Date();
    await exam.save();

    res.json({ success: true, status: exam.status });
  } catch {
    res.status(500).json({ message: "Approval failed" });
  }
};

/* --------------------------------------------------
   6. SCHEDULE EXAM
-------------------------------------------------- */
// ✅ CORRECT
export const scheduleExam = async (req, res) => {
  try {
    const { examId } = req.params;
    const {
      scheduledAt,
      duration,
      scope = "ALL",              // ⭐ DEFAULT
      assignedStudents = [],
      assignedClass = null,
    } = req.body;

    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    exam.scheduledAt = new Date(scheduledAt);
    exam.duration = duration;
    exam.scope = scope;
    
    if (scope === "SELECTED") {
      exam.assignedStudents = assignedStudents;
      exam.assignedClass = null;
    } else if (scope === "CLASS") {
      exam.assignedClass = assignedClass;
      exam.assignedStudents = [];
    } else {
      exam.assignedStudents = [];
      exam.assignedClass = null;
    }
    
    exam.status = "SCHEDULED";

    await exam.save();

    res.json({ success: true, exam });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Schedule failed" });
  }
};

/* --------------------------------------------------
   7. ASSIGN STUDENTS
-------------------------------------------------- */
export const assignStudentsToExam = async (req, res) => {
  try {
    const { scope, studentIds, assignedClass } = req.body;
    const { examId } = req.params;

    const exam = await Exam.findOne({
      _id: examId,
      faculty: req.user._id,
      status: "APPROVED",
    });

    if (!exam) {
      return res.status(403).json({ message: "Exam not assignable" });
    }

    exam.scope = scope;

    if (scope === "SELECTED") {
      const faculty = await User.findById(req.user._id);
      exam.assignedStudents = studentIds.filter((id) =>
        faculty.students.some((s) => s.toString() === id.toString())
      );
      exam.assignedClass = null;
    } else if (scope === "CLASS") {
      exam.assignedClass = assignedClass;
      exam.assignedStudents = [];
    } else {
      exam.assignedStudents = [];
      exam.assignedClass = null;
    }

    await exam.save();

    res.json({
      success: true,
      scope: exam.scope,
      assignedStudents: exam.assignedStudents,
      assignedClass: exam.assignedClass,
    });
  } catch {
    res.status(500).json({ message: "Assignment failed" });
  }
};
