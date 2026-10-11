import UserCompetency from "../models/UserCompetency.js";
import { getLearnerCompetencyOverview, getRequiredCompetenciesForRole, recalculateSkillGaps } from "../services/competencyEngine.js";
import { generateCompetencyProfile, getComprehensiveCompetencyProfile } from "../services/competencyProfileService.js";
import Role from "../models/Role.js";

const learnerOnly = (req, res) => {
  if (!["learner", "student"].includes(req.user.role)) {
    res.status(403).json({ message: "Learner access required" });
    return false;
  }
  return true;
};

export const getCurrentCompetencies = async (req, res) => {
  if (!learnerOnly(req, res)) return;
  const records = await UserCompetency.find({ user: req.user._id })
    .populate({ path: "competency", populate: { path: "domain" } })
    .lean();
  res.json(records);
};

export const getRequiredCompetencies = async (req, res) => {
  if (!learnerOnly(req, res)) return;
  const roleName = String(req.user.targetRole || "").trim();
  if (!roleName) return res.json({ targetRole: null, message: "Target role not configured", competencies: [] });

  const roles = await Role.find({ isActive: true }).lean();
  const role = roles.find((candidate) => candidate.name.toLowerCase() === roleName.toLowerCase());
  if (!role) return res.json({ targetRole: roleName, message: "Target role not configured", competencies: [] });

  const competencies = await getRequiredCompetenciesForRole(role._id);
  res.json({ targetRole: roleName, role, competencies });
};

export const getSkillGaps = async (req, res) => {
  if (!learnerOnly(req, res)) return;
  const result = await recalculateSkillGaps(req.user);
  res.json({ targetRole: result.targetRole, role: result.role, gaps: result.gaps || [], message: result.message });
};

export const getCompetencyOverview = async (req, res) => {
  if (!learnerOnly(req, res)) return;
  res.json(await getLearnerCompetencyOverview(req.user));
};

export const regenerateCompetencyProfile = async (req, res) => {
  if (!learnerOnly(req, res)) return;
  try {
    const profile = await generateCompetencyProfile(req.user);
    res.json(profile);
  } catch (error) {
    console.error("Competency profile regeneration failed:", error);
    res.status(500).json({ message: "Failed to regenerate competency profile" });
  }
};

export const getComprehensiveProfile = async (req, res) => {
  if (!learnerOnly(req, res)) return;
  try {
    const profile = await getComprehensiveCompetencyProfile(req.user);
    res.json(profile);
  } catch (error) {
    console.error("Comprehensive competency profile fetch failed:", error);
    res.status(500).json({ message: "Failed to fetch comprehensive competency profile" });
  }
};
