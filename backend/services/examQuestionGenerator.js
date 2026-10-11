import aiProvider from "../providers/index.js";

/**
 * Faculty exam MCQ generator
 * Generates EXACT number of questions from extracted text using Ollama/Gemini
 */
const generateExamQuestions = async ({
  text,
  totalQuestions,
  difficulty,
  subject,
}) => {
  try {
    const sourceText = String(text || "").replace(/\s+/g, " ").trim().slice(0, 16000);
    const result = await aiProvider.generateMCQs({
      subject: subject || "General",
      materialText: sourceText,
      questions: totalQuestions || 10,
      difficulty: "mixed",
      targetProficiencyLevel: 3,
      questionType: "knowledge",
      sourceReference: "Exam Material",
    });
    const questions = Array.isArray(result) ? result : result?.questions;

    if (Array.isArray(questions) && questions.length > 0) {
      return questions.map((q, index) => ({
        questionId: q.questionId || `q_${index + 1}`,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer ?? q.correct,
        explanation: q.explanation,
        difficulty: { easy: 1, medium: 3, hard: 5 }[String(q.difficulty || "").toLowerCase()] || Number(q.difficulty) || 3,
      }));
    }

    throw new Error("Failed to generate exam questions");
  } catch (error) {
    console.error("Exam Question Generation Error:", error.message);
    throw new Error(`Failed to generate exam questions: ${error.message}`);
  }
};

export default generateExamQuestions;
