import Exam from "../models/Exam.js";
import Competency from "../models/Competency.js";
import { generateQuizQuestions } from "./quizGenerationService.js";

/** Creates one idempotent, next-day assessment for the highest unresolved gap. */
export const scheduleFollowUpAssessment = async ({ user, sourceExamId, overview }) => {
  const gap = (overview?.competencies || []).filter((item) => item.gap?.status === "open")
    .sort((a, b) => (b.gap?.gap || 0) - (a.gap?.gap || 0))[0];
  if (!gap?.competency?._id || !sourceExamId) return null;
  const exists = await Exam.findOne({ followUpFor: sourceExamId, assignedStudents: user._id }).lean();
  if (exists) return exists;
  const competency = await Competency.findById(gap.competency._id).lean();
  if (!competency) return null;
  const questions = await generateQuizQuestions({
    subject: `${competency.name} improvement assessment`, materialText: `Assess ${competency.name} for ${overview.targetRole || user.designation || 'the learner'}.`,
    questions: 8, difficulty: "medium", classification: "CATEGORY_A_OPEN_ACCESS", classificationSource: "ORGANIZATION_POLICY",
    competencyIds: [competency._id], targetProficiencyLevel: gap.requiredLevel, questionType: "diagnostic", sourceReference: "Adaptive follow-up assessment", allowFallback: false,
  });
  return Exam.create({ title: `${competency.name} follow-up assessment`, description: "Scheduled to measure competency improvement after the previous assessment.", subject: competency.name, faculty: user._id, duration: 25, totalQuestions: questions.length, questions, competencyTags: [competency._id], assessmentType: "DIAGNOSTIC", generatedByModel: process.env.OLLAMA_MODEL, status: "SCHEDULED", scope: "SELECTED", assignedStudents: [user._id], scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000), followUpFor: sourceExamId });
};
