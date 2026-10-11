import Course from "../models/Course.js";
import Exam from "../models/Exam.js";
import ExamAttempt from "../models/ExamAttempt.js";
import Material from "../models/Material.js";
import QuizAttempt from "../models/QuizAttempt.js";
import TrainingHistory from "../models/TrainingHistory.js";
import { getLearnerCompetencyOverview } from "./competencyEngine.js";

const idOf = (value) => String(value?._id || value || "");

const compactCompetencies = (overview) => (overview?.competencies || []).map((item) => ({
  name: item.competency?.name || "Unknown competency",
  code: item.competency?.code || null,
  currentScore: item.current?.score ?? null,
  currentLevel: item.current?.currentLevel ?? 0,
  requiredLevel: item.requiredLevel ?? null,
  gapStatus: item.gap?.status || "none",
  gapLevel: item.gap?.gap ?? 0,
}));

export const buildAssistantContext = async (user) => {
  const learnerId = user._id;
  let competencyOverview = null;

  try {
    competencyOverview = await getLearnerCompetencyOverview(user);
  } catch (error) {
    console.warn("Assistant competency context unavailable:", error.message);
  }

  const now = new Date();
  const [courses, trainingHistory, exams, examAttempts, quizAttempts, materials] = await Promise.all([
    Course.find({ user: learnerId })
      .select("title platform competency currentLevel requiredLevel recommendationReason completionStatus trainingHistory assessment link")
      .populate("competency", "name code")
      .populate("assessment", "title subject scheduledAt status totalQuestions")
      .populate("trainingHistory", "title status startedAt completedAt")
      .sort({ savedAt: -1 })
      .limit(20)
      .lean(),
    TrainingHistory.find({ user: learnerId })
      .select("title provider competency status startedAt completedAt")
      .populate("competency", "name code")
      .sort({ updatedAt: -1 })
      .limit(20)
      .lean(),
    Exam.find({
      status: "SCHEDULED",
      $or: [{ scope: "ALL" }, { scope: "SELECTED", assignedStudents: learnerId }],
    })
      .select("title subject scheduledAt duration totalQuestions status assessmentType competencyTags")
      .populate("competencyTags", "name code")
      .sort({ scheduledAt: 1 })
      .limit(20)
      .lean(),
    ExamAttempt.find({ student: learnerId })
      .select("exam score correctCount totalQuestions status submittedAt createdAt")
      .populate("exam", "title subject scheduledAt totalQuestions")
      .sort({ submittedAt: -1, createdAt: -1 })
      .limit(20)
      .lean(),
    QuizAttempt.find({ student: learnerId, isFinalized: true })
      .select("quizType quizId subject score correctCount totalQuestions status submittedAt createdAt")
      .sort({ submittedAt: -1, createdAt: -1 })
      .limit(20)
      .lean(),
    Material.find({
      processingStatus: "READY",
      $or: [{ scope: "ALL" }, { scope: "SELECTED", students: learnerId }],
    })
      .select("title description competencies chunks classification")
      .populate("competencies", "name code")
      .sort({ updatedAt: -1 })
      .limit(12)
      .lean(),
  ]);

  const submittedExamIds = new Set(
    examAttempts
      .filter((attempt) => ["SUBMITTED", "AUTO_SUBMITTED"].includes(attempt.status))
      .map((attempt) => idOf(attempt.exam))
  );

  const assessmentStatus = exams.map((exam) => {
    const attempt = examAttempts.find((item) => idOf(item.exam) === idOf(exam));
    const submitted = submittedExamIds.has(idOf(exam));
    const missed = !submitted && exam.scheduledAt && new Date(exam.scheduledAt) < now;
    return {
      id: idOf(exam),
      title: exam.title,
      subject: exam.subject,
      scheduledAt: exam.scheduledAt || null,
      totalQuestions: exam.totalQuestions || 0,
      status: submitted ? attempt.status : missed ? "MISSED" : attempt?.status || "PENDING",
      score: submitted ? attempt.score ?? null : null,
    };
  });

  const relevantCompetencyIds = new Set(
    (competencyOverview?.competencies || [])
      .filter((item) => item.gap?.status === "open")
      .map((item) => idOf(item.competency))
  );
  const learningMaterials = materials.flatMap((material) => {
    const isRelevant = !relevantCompetencyIds.size || material.competencies?.some((item) => relevantCompetencyIds.has(idOf(item)));
    if (!isRelevant) return [];
    return [{
      title: material.title,
      description: material.description || "",
      classification: material.classification,
      excerpts: (material.chunks || []).slice(0, 3).map((chunk) => ({
        source: chunk.sourceReference || material.title,
        text: String(chunk.text || "").slice(0, 1200),
      })),
    }];
  }).slice(0, 6);

  return {
    learner: { targetRole: user.targetRole || null, designation: user.designation || null },
    competencyProfile: compactCompetencies(competencyOverview),
    courses: courses.map((course) => ({
      id: idOf(course),
      title: course.title,
      platform: course.platform || null,
      competency: course.competency?.name || null,
      currentLevel: course.currentLevel ?? null,
      requiredLevel: course.requiredLevel ?? null,
      recommendationReason: course.recommendationReason || null,
      completionStatus: course.completionStatus,
      trainingStatus: course.trainingHistory?.status || null,
      assessment: course.assessment ? {
        id: idOf(course.assessment),
        title: course.assessment.title,
        scheduledAt: course.assessment.scheduledAt || null,
        status: course.assessment.status,
      } : null,
    })),
    trainingHistory: trainingHistory.map((item) => ({
      title: item.title,
      provider: item.provider || null,
      competency: item.competency?.name || null,
      status: item.status,
      completedAt: item.completedAt || null,
    })),
    assessments: assessmentStatus,
    assessmentHistory: [
      ...examAttempts.map((item) => ({
        type: "exam",
        title: item.exam?.title || "Exam",
        subject: item.exam?.subject || null,
        score: item.score ?? null,
        status: item.status,
        submittedAt: item.submittedAt || null,
      })),
      ...quizAttempts.map((item) => ({
        type: item.quizType?.toLowerCase() || "quiz",
        title: item.subject || "Practice quiz",
        score: item.score ?? null,
        status: item.status,
        submittedAt: item.submittedAt || null,
      })),
    ].slice(0, 24),
    learningMaterials,
  };
};

export default buildAssistantContext;