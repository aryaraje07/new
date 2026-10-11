import InterviewSession from "../models/Interview.js";
import { getGeminiModel } from "../utils/gemini.js";

/* ================= QUESTION COUNT ================= */

const calculateQuestionCount = (duration) => {
  if (duration == 10) return 5;
  if (duration == 20) return 10;
  if (duration == 30) return 15;
  if (duration == 60) return 25;
  return 5;
};

/* ================= CREATE INTERVIEW SESSION ================= */

export const createInterviewSession = async (req, res) => {
  try {
    const { type, subject, difficulty, duration } = req.body;

    if (!req.user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const totalQuestions = calculateQuestionCount(duration);
    const gemini = getGeminiModel();

    // added things
    const introCount = 1;
    const closingCount = 1;

    let generalWeight = 0;
    let coreWeight = 0;

    // 🎯 Type-based weight distribution
    switch (type) {
      case "hr":
        generalWeight = 0.4;
        coreWeight = 0.4;
        break;

      case "technical":
        generalWeight = 0.1;
        coreWeight = 0.8;
        break;

      case "behavioral":
        generalWeight = 0.2;
        coreWeight = 0.6;
        break;

      case "case":
        generalWeight = 0.05;
        coreWeight = 0.9;
        break;

      default:
        generalWeight = 0.2;
        coreWeight = 0.6;
    }

    const remaining = totalQuestions - (introCount + closingCount);

    let generalCount = Math.floor(remaining * generalWeight);
    let coreCount = remaining - generalCount;

    // 🔥 Safety adjustment for very short interviews (like 5 questions)
    if (totalQuestions <= 5) {
      generalCount = 0;
      coreCount = totalQuestions - 2;
    }

    let difficultyGuide = "";

    switch (difficulty) {
      case "easy":
        difficultyGuide = `
- Questions should be basic level.
- Suitable for freshers or entry-level candidates.
- Avoid deep edge cases.
`;
        break;

      case "medium":
        difficultyGuide = `
- Moderate depth questions.
- Include real-world application.
- Suitable for internship or 1-2 years experience.
`;
        break;

      case "hard":
        difficultyGuide = `
- Deep technical or analytical depth.
- Include edge cases, tradeoffs, and complex reasoning.
- Suitable for experienced professionals.
`;
        break;
    }

    const prompt = `
You are a senior professional interviewer conducting a ${type} interview.

Do NOT mention candidate name.
Do NOT use placeholders like [Candidate Name].

Position: ${subject}
Total Questions: ${totalQuestions}
Difficulty Level: ${difficulty}

Interview Structure:

- ${introCount} Introduction question
- ${generalCount} General interview questions
- ${coreCount} ${type}-focused core questions
- ${closingCount} Closing question

Definitions:

Introduction:
- Ask candidate to introduce themselves professionally.

General:
- Career goals, strengths, weaknesses, motivation, teamwork.

${type}-Specific:

If HR:
- Personality, cultural fit, conflict resolution, adaptability.

If Technical:
- Core concepts, real-world technical problems, debugging, system design.

If Behavioral:
- Past experiences using STAR method.

If Case:
- Real business case problems, analytical reasoning, structured thinking.

Difficulty Guidelines:
${difficultyGuide}

Important Rules:

- Majority of questions must follow the ${type} weight distribution.
- Questions must sound like a real company interview.
- Avoid textbook definitions.
- Make it conversational and realistic.
- Do not repeat themes.
- expectedAnswer must describe what a strong candidate should ideally answer.

Return STRICT JSON only:
[
  {
    "question": "...",
    "expectedAnswer": "..."
  }
]
`;

    const result = await gemini.generateContent(prompt);
    const text = result.response.text();
    const cleanText = text.replace(/```json|```/g, "").trim();

    const questions = JSON.parse(cleanText);

    const session = await InterviewSession.create({
      student: req.user._id,
      type,
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
    console.error("Create Interview Error:", error);
    res.status(500).json({
      message: "Failed to create interview session",
      error: error.message,
    });
  }
};

/* ================= GET INTERVIEW SESSION ================= */

export const getInterviewSession = async (req, res) => {
  const session = await InterviewSession.findById(req.params.id);
  res.json(session);
};

/* ================= SAVE USER ANSWER ================= */

export const saveInterviewAnswer = async (req, res) => {
  const { sessionId, questionIndex, userAnswer } = req.body;

  const session = await InterviewSession.findById(sessionId);

  session.questions[questionIndex].userAnswer = userAnswer;

  await session.save();

  res.json({ success: true });
};

/* ================= EVALUATE INTERVIEW ================= */

export const evaluateInterviewSession = async (req, res) => {
  try {
    const { sessionId } = req.body;

    const session = await InterviewSession.findById(sessionId);

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    const gemini = getGeminiModel();

    const prompt = `
You are a professional interview evaluator.

Evaluate each question.

Return STRICT JSON only:
{
  "questions": [
    {
      "feedback": "...",
      "score": number
    }
  ],
  "overallScore": number,
  "overallFeedback": "...",
  "analytics": {
      "communication": number,
      "technical": number,
      "confidence": number,
      "problemSolving": number,
      "timeManagement": number
  }
}

Interview Type: ${session.type}
Subject: ${session.subject}

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
        // 🔥 Normalize score
        let normalizedScore = q.score;

        if (normalizedScore <= 1) {
          normalizedScore = normalizedScore * 10;
        }

        session.questions[i].feedback = q.feedback;
        session.questions[i].score = Math.min(10, normalizedScore);
      }
    });

    const totalScore = session.questions.reduce(
      (acc, q) => acc + (q.score || 0),
      0,
    );

    const averageScore =
      session.questions.length > 0 ? totalScore / session.questions.length : 0;

    session.overallScore = Math.round((averageScore / 10) * 100);

    session.overallFeedback = evaluation.overallFeedback;
    session.analytics = evaluation.analytics;
    session.status = "completed";

    await session.save();

    res.json(session);
  } catch (error) {
    console.error("Evaluate Interview Error:", error);
    res.status(500).json({
      message: "Evaluation failed",
      error: error.message,
    });
  }
};

/* ================= GET USER INTERVIEWS ================= */

export const getUserInterviews = async (req, res) => {
  try {
    const sessions = await InterviewSession.find({
      student: req.user._id,
    })
      .sort({ createdAt: -1 })
      .select("type subject difficulty duration overallScore status createdAt");

    res.json(sessions);
  } catch (error) {
    console.error("Fetch interviews error:", error);
    res.status(500).json({ message: "Failed to fetch interviews" });
  }
};
