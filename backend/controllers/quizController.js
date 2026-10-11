import { generateQuizQuestions } from "../services/quizGenerationService.js"

export const generateQuiz = async (req, res) => {
  const { subject, questions, language } = req.body
  const learnerLanguage = language || req.headers["x-learner-language"] || "en"

  try {
    const quizQuestions = await generateQuizQuestions({
      subject,
      questions,
      difficulty: "mixed",
      language: learnerLanguage,
    })

    res.json({
      success: true,
      questions: quizQuestions,
    })
  } catch (err) {
    res.status(503).json({ success: false, message: err.message || "Quiz generation failed" })
  }
}
