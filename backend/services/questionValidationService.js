import mongoose from "mongoose";
import Competency from "../models/Competency.js";

const DIFFICULTY = { easy: 1, medium: 3, hard: 5 };
const TYPES = new Set([
  "knowledge",
  "conceptual",
  "application",
  "scenario",
  "diagnostic",
]);

const normaliseAnswer = (value, options) => {
  if (
    Number.isInteger(Number(value)) &&
    Number(value) >= 0 &&
    Number(value) < options.length
  )
    return Number(value);
  const index = options.findIndex(
    (option) =>
      option.toLowerCase() ===
      String(value || "")
        .trim()
        .toLowerCase(),
  );
  return index;
};

/** Validates untrusted model output before it can be persisted. */
export const validateGeneratedQuestions = async (
  rawQuestions,
  {
    allowedCompetencyIds = [],
    defaultCompetencyId,
    defaultLevel = 3,
    sourceReference = "",
    requireCompetency = true,
  } = {},
) => {

   console.log("========== RAW AI QUESTIONS ==========");
  console.log(JSON.stringify(rawQuestions, null, 2));
  console.log("======================================");

  
  if (!Array.isArray(rawQuestions) || rawQuestions.length === 0)
    throw new Error("AI returned no questions.");
  const allowed = new Set(allowedCompetencyIds.map(String));
  if (defaultCompetencyId) allowed.add(String(defaultCompetencyId));
  const existing = await Competency.find({
    _id: { $in: [...allowed].filter(mongoose.isValidObjectId) },
  })
    .select("_id domain")
    .lean();
  const competencyById = new Map(
    existing.map((item) => [String(item._id), item]),
  );
  const seen = new Set();

  return rawQuestions.map((raw, index) => {
    const question = String(raw?.question || "").trim();
    const options = Array.isArray(raw?.options)
      ? raw.options.map((item) => String(item || "").trim())
      : [];
    const answer = normaliseAnswer(raw?.correctAnswer ?? raw?.correct, options);
    const competencyId = String(raw?.competencyId || defaultCompetencyId || "");
    const normalizedQuestion = question.toLowerCase().replace(/\s+/g, " ");
    const type = String(raw?.questionType || "knowledge").toLowerCase();
    const level = Number(raw?.targetProficiencyLevel ?? defaultLevel);
    const difficultyRaw = raw?.difficulty ?? "medium";
    const difficulty = Number.isFinite(Number(difficultyRaw))
      ? Number(difficultyRaw)
      : DIFFICULTY[String(difficultyRaw).toLowerCase()];

    if (!question || question.length < 10 || seen.has(normalizedQuestion))
      throw new Error(
        `Invalid or duplicate question at position ${index + 1}.`,
      );
    if (
      options.length !== 4 ||
      options.some((option) => !option) ||
      new Set(options.map((option) => option.toLowerCase())).size !== 4
    )
      throw new Error(
        `Question ${index + 1} must have four unique non-empty options.`,
      );
    if (answer < 0)
      throw new Error(`Question ${index + 1} has an invalid correct answer.`);
    if (requireCompetency && !competencyById.has(competencyId))
      throw new Error(
        `Question ${index + 1} references an invalid competency.`,
      );
    if (
      !Number.isInteger(level) ||
      level < 1 ||
      level > 5 ||
      !Number.isInteger(difficulty) ||
      difficulty < 1 ||
      difficulty > 5 ||
      !TYPES.has(type)
    )
      throw new Error(`Question ${index + 1} contains invalid metadata.`);
    seen.add(normalizedQuestion);
    return {
      questionId: String(
        raw?.questionId || raw?.id || `ai_${Date.now()}_${index + 1}`,
      ),
      question,
      options,
      correctAnswer: answer,
      explanation: String(raw?.explanation || "").trim(),
      competency: competencyById.has(competencyId) ? competencyId : undefined,
      competencyDomain: competencyById.get(competencyId)?.domain,
      targetProficiencyLevel: level,
      difficulty,
      questionType: type,
      sourceReference: String(raw?.sourceReference || sourceReference),
      aiGenerated: true,
    };
  });
};
