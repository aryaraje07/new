import aiGateway from "../ai/gateway/aiGateway.js";
import Role from "../models/Role.js";
import { getRequiredCompetenciesForRole } from "./competencyEngine.js";
import { validateGeneratedQuestions } from "./questionValidationService.js";
import { updateLearningMemoryFromAttempt } from "./learningMemoryService.js";

export const generateDiagnosticQuestions = async ({
  targetRole,
  count = 10,
}) => {
  const role = await Role.findOne({
    name: new RegExp(
      `^${String(targetRole || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
      "i",
    ),
    isActive: true,
  });
  if (!role)
    throw new Error(
      "Select one of the configured prototype designations first.",
    );
  const required = await getRequiredCompetenciesForRole(role._id);
  if (!required.length)
    throw new Error(
      "No competency mapping is configured for this designation.",
    );
  const compact = required.map((item) => ({
    id: String(item.competency._id),
    name: item.competency.name,
    targetLevel: item.requiredLevel,
  }));
  // const questionCount = Math.max(
  //   required.length,
  //   Math.min(20, Math.max(required.length * 2, Number(count) || 10)),
  // );
  const questionCount = Math.min(
    10,
    Math.max(required.length, Number(count) || 10),
  );
  const prompt = `Generate exactly ${questionCount} diagnostic MCQs for a ${role.name}. Cover EVERY supplied competency with at least one question and distribute questions proportionally. Questions must test knowledge and application, not profile information. Use mixed difficulty with beginner, intermediate, and advanced reasoning. Return JSON {"questions":[{"question":"","options":["","","",""],"correctAnswer":0,"explanation":"","competencyId":"","targetProficiencyLevel":1,"difficulty":"easy|medium|hard","questionType":"diagnostic"}]}. Competencies: ${JSON.stringify(compact)}`;
  const response = await aiGateway.generateStructured({
    capability: "diagnostic_generation",
    content: prompt,
    classification: "CATEGORY_A_OPEN_ACCESS",
    classificationSource: "ORGANIZATION_POLICY",
    externalAIAllowed: false,
    forcePrivate: true,
    preferredProvider: "ollama",
    systemPrompt: "Generate accurate assessment questions. Return JSON only.",
    schema: { questions: "array" },
    maxTokens: 3072,
    temperature: 0.2,
  });
  if (!response.success)
    throw new Error(
      response.reason ||
        response.error ||
        "Local diagnostic provider is unavailable.",
    );
  const questions = await validateGeneratedQuestions(response.data.questions, {
    allowedCompetencyIds: compact.map((item) => item.id),
    defaultLevel: 3,
    sourceReference: "Initial Competency Diagnostic",
  });
  const covered = new Set(
    questions.map((question) => String(question.competency)),
  );
  const missing = compact.filter((item) => !covered.has(item.id));
  if (missing.length)
    throw new Error(
      `Initial diagnostic did not cover: ${missing.map((item) => item.name).join(", ")}. Please retry.`,
    );
  return {
    role,
    questions: questions.slice(0, questionCount),
    provider: response.provider,
    model: response.metadata?.model,
  };
};
