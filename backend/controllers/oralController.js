import OralSession from "../models/OralSession.js";
import { getGeminiModel } from "../utils/gemini.js";
import FacultyOralExam from "../models/FacultyOralExam.js";


const calculateQuestionCount = (duration) => {
  if (duration == 10) return 5;
  if (duration == 20) return 10;
  if (duration == 30) return 15;
  if (duration == 60) return 25;
  return 5;
};

export const createOralSession = async (req, res) => {
  try {
    const { subject, duration, difficulty } = req.body;

    if (!req.user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const userId = req.user._id;

    const totalQuestions = calculateQuestionCount(duration);

    const gemini = getGeminiModel();

    const prompt = `
Generate ${totalQuestions} oral exam questions for subject: ${subject}
Difficulty: ${difficulty}

Return STRICT JSON only:
[
  {
    "question": "...",
    "expectedAnswer": "..."
  }
]
`;

    const result = await gemini.generateContent(prompt);
    const responseText = result.response.text();

    // 🔥 CLEAN MARKDOWN (Gemini sometimes wraps in ```json)
    const cleanText = responseText.replace(/```json|```/g, "").trim();

    const questions = JSON.parse(cleanText);

    const session = await OralSession.create({
      user: userId,
      subject,
      difficulty,
      duration,
      totalQuestions,
      questions,
    });

    res.status(201).json({
      success: true,
      sessionId: session._id,
    });
  } catch (error) {
    console.error("Create Oral Error:", error);
    res.status(500).json({
      message: "Failed to create oral session",
      error: error.message,
    });
  }
};

export const getOralSession = async (req, res) => {
  const session = await OralSession.findById(req.params.id);
  res.json(session);
};

export const saveUserAnswer = async (req, res) => {
  const { sessionId, questionIndex, userAnswer } = req.body;

  const session = await OralSession.findById(sessionId);

  session.questions[questionIndex].userAnswer = userAnswer;

  await session.save();

  res.json({ success: true });
};

export const evaluateOralSession = async (req, res) => {
  try {
    const { sessionId } = req.body;

    const session = await OralSession.findById(sessionId);

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    const gemini = getGeminiModel();

    // 🔥 Set 0 score for unanswered questions BEFORE sending to Gemini
    session.questions.forEach((q) => {
      if (!q.userAnswer || q.userAnswer.trim() === "") {
        q.score = 0;
        q.feedback = "No answer provided.";
      }
    });

    const prompt = `
You are an oral exam evaluator.

Evaluate each question below.

Return STRICT JSON only:
{
  "questions": [
    {
      "feedback": "...",
      "score": number
    }
  ],
  "overallScore": number,
  "overallFeedback": "..."
}

Questions:
${JSON.stringify(session.questions)}
`;

    const result = await gemini.generateContent(prompt);
    const text = result.response.text();

    const cleanText = text.replace(/```json|```/g, "").trim();
    const evaluation = JSON.parse(cleanText);

    evaluation.questions.forEach((q, i) => {
      if (
        session.questions[i].userAnswer &&
        session.questions[i].userAnswer.trim() !== ""
      ) {
        session.questions[i].feedback = q.feedback;
        session.questions[i].score = q.score;
      }
    });

    session.overallScore = evaluation.overallScore;
    session.overallFeedback = evaluation.overallFeedback;
    session.status = "completed";

    await session.save();

    res.json(session);
  } catch (error) {
    console.error("Evaluate Error:", error);
    res.status(500).json({
      message: "Evaluation failed",
      error: error.message,
    });
  }
};

export const getUserOralSessions = async (req, res) => {
  try {
    const sessions = await OralSession.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .select("subject difficulty duration overallScore status createdAt");

    res.json(sessions);
  } catch (error) {
    console.error("Fetch sessions error:", error);
    res.status(500).json({ message: "Failed to fetch sessions" });
  }
};

export const getStudentScheduledExams = async (req, res) => {
  try {
    const studentId = req.user._id;

    // Get all classes the student belongs to
    const Class = await import("../models/Class.js").then(m => m.default);
    const studentClasses = await Class.find({ 
      "students": studentId 
    }).select("_id");

    const classIds = studentClasses.map(cls => cls._id);

    const exams = await FacultyOralExam.find({
      status: "assigned",
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
    })
    .populate("faculty", "fullName email") 
    .sort({ createdAt: -1 });

    console.log(`Found ${exams.length} scheduled oral exams for student ${studentId}`);
    console.log("Student class IDs:", classIds);
    console.log("Oral exams found:", exams.map(e => ({ 
      id: e._id, 
      topic: e.topic, 
      scope: e.scope, 
      assignedClass: e.assignedClass 
    })));

    res.json(exams);
  } catch (error) {
    console.error("❌ Fetch scheduled oral exams error:", error);
    res.status(500).json({ message: "Failed to fetch scheduled oral exams" });
  }
};