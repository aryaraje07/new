import CompetencyHistory from "../models/CompetencyHistory.js";
import UserCompetency from "../models/UserCompetency.js";
import SkillGap from "../models/SkillGap.js";
import TrainingHistory from "../models/TrainingHistory.js";

/**
 * Get competency progress trend over time
 */
export const getCompetencyProgressTrend = async (userId, competencyId = null, limit = 30) => {
  const query = { user: userId };
  if (competencyId) {
    query.competency = competencyId;
  }

  const history = await CompetencyHistory.find(query)
    .populate("competency", "name code")
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  // Group by date and competency
  const trend = history.reverse().map((h) => ({
    date: h.createdAt,
    competencyId: h.competency?._id,
    competencyName: h.competency?.name,
    score: h.currentScore,
    level: h.currentLevel,
  }));

  return trend;
};

/**
 * Get before vs current competency comparison
 * Uses actual diagnostic score as baseline, not arbitrary first record
 */
export const getBeforeAfterComparison = async (userId) => {
  const userCompetencies = await UserCompetency.find({ user: userId })
    .populate("competency", "name code")
    .lean();

  const comparison = await Promise.all(
    userCompetencies.map(async (uc) => {
      // Get the diagnostic assessment score as the true baseline
      const diagnosticHistory = CompetencyHistory.findOne({
        user: userId,
        competency: uc.competency._id,
        source: "diagnostic",
      })
        .sort({ createdAt: 1 })
        .lean();

      // If no diagnostic, use the first recorded assessment
      const firstHistory = diagnosticHistory || (await CompetencyHistory.findOne({
        user: userId,
        competency: uc.competency._id,
      })
        .sort({ createdAt: 1 })
        .lean());

      return {
        competencyId: uc.competency._id,
        competencyName: uc.competency.name,
        competencyCode: uc.competency.code,
        currentScore: uc.score,
        currentLevel: uc.currentLevel,
        initialScore: firstHistory?.currentScore || 0,
        initialLevel: firstHistory?.currentLevel || null,
        hasDiagnostic: !!diagnosticHistory,
        improvement: uc.score - (firstHistory?.currentScore || 0),
      };
    })
  );

  return comparison;
};

/**
 * Get skill gap distribution
 */
export const getSkillGapDistribution = async (userId) => {
  const skillGaps = await SkillGap.find({ user: userId })
    .populate("competency", "name code")
    .lean();

  const distribution = {
    open: skillGaps.filter((sg) => sg.status === "open").length,
    closed: skillGaps.filter((sg) => sg.status === "closed").length,
    inProgress: skillGaps.filter((sg) => sg.status === "in_progress").length,
    total: skillGaps.length,
    details: skillGaps.map((sg) => ({
      competencyName: sg.competency?.name,
      gap: sg.gap,
      status: sg.status,
      requiredLevel: sg.requiredLevel,
      currentLevel: sg.currentLevel,
    })),
  };

  return distribution;
};

/**
 * Get priority skill gaps (largest gaps)
 */
export const getPriorityGaps = async (userId, limit = 5) => {
  const skillGaps = await SkillGap.find({ user: userId, status: "open" })
    .populate("competency", "name code")
    .sort({ gap: -1 })
    .limit(limit)
    .lean();

  return skillGaps.map((sg) => ({
    competencyName: sg.competency?.name,
    competencyCode: sg.competency?.code,
    gap: sg.gap,
    requiredLevel: sg.requiredLevel,
    currentLevel: sg.currentLevel,
    status: sg.status,
  }));
};

/**
 * Get training impact (competency scores before and after training)
 * Only shows impact when there is actual post-training assessment evidence
 */
export const getTrainingImpact = async (userId) => {
  const trainingHistory = await TrainingHistory.find({ user: userId })
    .populate("competency", "name code")
    .sort({ completedAt: -1 })
    .limit(10)
    .lean();

  const impact = await Promise.all(
    trainingHistory.map(async (th) => {
      if (!th.competency) return null;

      // Get competency score before training
      const beforeHistory = CompetencyHistory.findOne({
        user: userId,
        competency: th.competency._id,
        createdAt: { $lt: th.completedAt },
      })
        .sort({ createdAt: -1 })
        .lean();

      // Get competency score after training (must be post-training assessment)
      const afterHistory = CompetencyHistory.findOne({
        user: userId,
        competency: th.competency._id,
        createdAt: { $gte: th.completedAt },
        source: { $in: ["quiz", "assessment", "diagnostic"] },
      })
        .sort({ createdAt: 1 })
        .lean();

      const currentCompetency = await UserCompetency.findOne({
        user: userId,
        competency: th.competency._id,
      }).lean();

      // Only show impact if there's actual post-training assessment evidence
      if (!afterHistory) {
        return {
          trainingId: th._id,
          trainingTitle: th.title,
          competencyName: th.competency?.name,
          completedAt: th.completedAt,
          scoreBefore: beforeHistory?.currentScore || 0,
          scoreAfter: null,
          currentScore: currentCompetency?.score || 0,
          impact: null,
          hasPostTrainingAssessment: false,
          message: "Complete a post-training assessment to measure your improvement",
        };
      }

      return {
        trainingId: th._id,
        trainingTitle: th.title,
        competencyName: th.competency?.name,
        completedAt: th.completedAt,
        scoreBefore: beforeHistory?.currentScore || 0,
        scoreAfter: afterHistory?.currentScore || 0,
        currentScore: currentCompetency?.score || 0,
        impact: (afterHistory?.currentScore || 0) - (beforeHistory?.currentScore || 0),
        hasPostTrainingAssessment: true,
      };
    })
  );

  return impact.filter((i) => i !== null);
};

/**
 * Get all dashboard visualization data
 */
export const getDashboardVisualizationData = async (userId) => {
  const [progressTrend, beforeAfter, gapDistribution, priorityGaps, trainingImpact] =
    await Promise.all([
      getCompetencyProgressTrend(userId),
      getBeforeAfterComparison(userId),
      getSkillGapDistribution(userId),
      getPriorityGaps(userId),
      getTrainingImpact(userId),
    ]);

  return {
    progressTrend,
    beforeAfter,
    gapDistribution,
    priorityGaps,
    trainingImpact,
  };
};

export default {
  getCompetencyProgressTrend,
  getBeforeAfterComparison,
  getSkillGapDistribution,
  getPriorityGaps,
  getTrainingImpact,
  getDashboardVisualizationData,
};
