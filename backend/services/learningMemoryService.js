import LearningMemory from "../models/LearningMemory.js";
import QuizAttempt from "../models/QuizAttempt.js";
import Competency from "../models/Competency.js";
import { generateQuizQuestions } from "./quizGenerationService.js";

// Mastery thresholds
const MASTERY_THRESHOLDS = {
  NEEDS_RECALL_CORRECT_RATE: 0.4, // Below 40% correct needs recall
  MASTERED_CORRECT_RATE: 0.75, // Above 75% correct is mastered
  MIN_ATTEMPTS_FOR_MASTERY: 3, // Need at least 3 attempts for mastery
  RECALL_INTERVAL_DAYS: 7, // Recall due after 7 days for needs_recall
};

/**
 * Calculate mastery state based on performance history
 * Deterministic logic - no external LLM calls
 */
export const calculateMasteryState = (memory) => {
  if (!memory || memory.attemptCount === 0) {
    return "developing";
  }

  const correctRate = memory.attemptCount > 0 
    ? memory.correctCount / memory.attemptCount 
    : 0;

  // Needs recall: repeated incorrect performance
  if (correctRate < MASTERY_THRESHOLDS.NEEDS_RECALL_CORRECT_RATE) {
    return "needs_recall";
  }

  // Mastered: repeated successful performance with sufficient attempts
  if (
    correctRate >= MASTERY_THRESHOLDS.MASTERED_CORRECT_RATE &&
    memory.attemptCount >= MASTERY_THRESHOLDS.MIN_ATTEMPTS_FOR_MASTERY
  ) {
    return "mastered";
  }

  // Developing: mixed/inconsistent performance
  return "developing";
};

/**
 * Update learning memory from assessment attempt
 * Called after quiz submission
 */
export const updateLearningMemoryFromAttempt = async ({ user, questions, answers }) => {
  const answerMap = new Map(
    (answers || []).map((answer) => [String(answer.questionId), answer])
  );

  const competencyUpdates = new Map();

  for (const question of questions || []) {
    if (!question.competency) continue;

    const answer = answerMap.get(String(question.questionId));
    const selected = answer?.selectedIndex ?? answer?.selectedOption;
    
    if (selected === null || selected === undefined) continue;

    const isCorrect = Number(selected) === Number(question.correctAnswer);
    const competencyId = String(question.competency);
    const topic = question.topic || "";

    if (!competencyUpdates.has(competencyId)) {
      competencyUpdates.set(competencyId, {
        competency: question.competency,
        topic,
        correct: 0,
        incorrect: 0,
        total: 0,
        questionIds: [],
      });
    }

    const update = competencyUpdates.get(competencyId);
    update.total++;
    update.questionIds.push(String(question.questionId));

    if (isCorrect) {
      update.correct++;
    } else {
      update.incorrect++;
    }
  }

  const updatedMemories = [];

  for (const [competencyId, data] of competencyUpdates.entries()) {
    const existing = await LearningMemory.findOne({
      user: user._id,
      competency: competencyId,
      topic: data.topic,
    });

    const newAttemptCount = (existing?.attemptCount || 0) + data.total;
    const newCorrectCount = (existing?.correctCount || 0) + data.correct;
    const newIncorrectCount = (existing?.incorrectCount || 0) + data.incorrect;
    const newCorrectRate = newAttemptCount > 0 ? newCorrectCount / newAttemptCount : 0;

    // Calculate recent performance (last 5 attempts)
    const recentQuestionIds = [
      ...(existing?.recentQuestionIds || []),
      ...data.questionIds,
    ].slice(-10); // Keep last 10 question IDs

    const memory = await LearningMemory.findOneAndUpdate(
      { user: user._id, competency: competencyId, topic: data.topic },
      {
        $set: {
          attemptCount: newAttemptCount,
          correctCount: newCorrectCount,
          incorrectCount: newIncorrectCount,
          recentPerformance: Math.round(newCorrectRate * 100),
          averagePerformance: Math.round(newCorrectRate * 100),
          lastAttemptedAt: new Date(),
          lastCorrectAt: data.correct > 0 ? new Date() : existing?.lastCorrectAt,
          recentQuestionIds,
        },
        $setOnInsert: {
          masteryState: "developing",
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();

    // Recalculate mastery state
    const newMasteryState = calculateMasteryState(memory);
    
    // Set recall due date for needs_recall
    let recallDueAt = memory.recallDueAt;
    if (newMasteryState === "needs_recall") {
      recallDueAt = new Date(Date.now() + MASTERY_THRESHOLDS.RECALL_INTERVAL_DAYS * 24 * 60 * 60 * 1000);
    }

    const updatedMemory = await LearningMemory.findByIdAndUpdate(
      memory._id,
      {
        $set: {
          masteryState: newMasteryState,
          recallDueAt,
        },
      },
      { new: true }
    ).populate("competency").lean();

    updatedMemories.push(updatedMemory);
  }

  return updatedMemories;
};

/**
 * Get learning memory for a user
 */
export const getUserLearningMemory = async (user) => {
  const memories = await LearningMemory.find({ user: user._id })
    .populate("competency")
    .sort({ lastAttemptedAt: -1 })
    .lean();

  return memories;
};

/**
 * Get concepts that need recall
 */
export const getRecallConcepts = async (user) => {
  const memories = await LearningMemory.find({
    user: user._id,
    masteryState: { $in: ["needs_recall", "developing"] },
  })
    .populate("competency")
    .sort({ lastAttemptedAt: -1 })
    .lean();

  return memories;
};

/**
 * Get a question for quick recall
 * Improved selection logic with fallback to generate new question
 */
export const getRecallQuestion = async (user, competencyId, topic = "", language = "en") => {
  const memory = await LearningMemory.findOne({
    user: user._id,
    competency: competencyId,
    topic,
  }).lean();

  if (!memory) {
    return null;
  }

  // Get competency details
  const competency = await Competency.findById(competencyId).lean();
  if (!competency) {
    return null;
  }

  // Find recent attempts with this competency/topic
  const recentAttempts = await QuizAttempt.find({
    student: user._id,
    isFinalized: true,
    "questions.competency": competencyId,
  })
    .sort({ submittedAt: -1 })
    .limit(10)
    .lean();

  // Collect all question IDs from recent attempts to avoid repetition
  const recentQuestionIds = new Set();
  for (const attempt of recentAttempts) {
    for (const q of attempt.questions || []) {
      if (String(q.competency) === String(competencyId)) {
        recentQuestionIds.add(String(q.questionId));
      }
    }
  }

  // Also exclude from memory's recentQuestionIds
  for (const qId of memory.recentQuestionIds || []) {
    recentQuestionIds.add(qId);
  }

  // Priority 1: Same competency, same topic, different question
  if (topic) {
    for (const attempt of recentAttempts) {
      for (const q of attempt.questions || []) {
        if (
          String(q.competency) === String(competencyId) &&
          q.topic === topic &&
          !recentQuestionIds.has(String(q.questionId))
        ) {
          return {
            questionId: q.questionId,
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer,
            competency: q.competency,
            competencyDomain: q.competencyDomain,
            difficulty: q.difficulty,
            topic: q.topic,
          };
        }
      }
    }
  }

  // Priority 2: Same competency, any topic, different question
  for (const attempt of recentAttempts) {
    for (const q of attempt.questions || []) {
      if (
        String(q.competency) === String(competencyId) &&
        !recentQuestionIds.has(String(q.questionId))
      ) {
        return {
          questionId: q.questionId,
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          competency: q.competency,
          competencyDomain: q.competencyDomain,
          difficulty: q.difficulty,
          topic: q.topic,
        };
      }
    }
  }

  // Priority 3: Generate a new question using existing Ollama/Qwen architecture
  // This uses the private local AI provider - no public LLM for sensitive data
  try {
    const generatedQuestions = await generateQuizQuestions({
      competencyId: competencyId,
      competencyName: competency.name,
      competencyCode: competency.code,
      topic: topic || competency.name,
      difficulty: 2, // Medium difficulty for recall
      count: 1,
      language: language || "en",
    });

    if (generatedQuestions && generatedQuestions.length > 0) {
      const newQuestion = generatedQuestions[0];
      return {
        questionId: `generated_${Date.now()}`,
        question: newQuestion.question,
        options: newQuestion.options,
        correctAnswer: newQuestion.correctAnswer,
        competency: competencyId,
        competencyDomain: competency.domain,
        difficulty: 2,
        topic: topic || competency.name,
        isGenerated: true,
      };
    }
  } catch (error) {
    console.error("Failed to generate recall question:", error.message);
  }

  // If all options exhausted, return null (graceful handling)
  return null;
};

/**
 * Get learning memory for a specific competency
 */
export const getCompetencyLearningMemory = async (user, competencyId, topic = "") => {
  const memory = await LearningMemory.findOne({
    user: user._id,
    competency: competencyId,
    topic,
  })
    .populate("competency")
    .lean();

  return memory;
};

export default {
  updateLearningMemoryFromAttempt,
  getUserLearningMemory,
  getRecallConcepts,
  getRecallQuestion,
  getCompetencyLearningMemory,
  calculateMasteryState,
};
