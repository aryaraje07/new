import Competency from "../models/Competency.js";
import CompetencyDomain from "../models/CompetencyDomain.js";
import UserCompetency from "../models/UserCompetency.js";

/**
 * Competency Profile Service
 * 
 * Derives relevant competencies from learner profile information.
 * 
 * IMPORTANT: This service identifies RELEVANT competencies based on profile.
 * It does NOT assign proficiency scores - that requires assessment evidence.
 * 
 * Profile evidence is marked as source: "profile" and treated as provisional.
 */

const PROFILE_KEYWORD_MAPPING = {
  // Statistical Competencies
  survey: ["STAT_SURVEY_DESIGN", "STAT_SAMPLING", "STAT_DATA_QUALITY"],
  sampling: ["STAT_SAMPLING"],
  data: ["STAT_DATA_QUALITY", "TECH_DATA_VISUALIZATION", "TECH_SQL", "TECH_PYTHON"],
  statistics: ["STAT_SURVEY_DESIGN", "STAT_SAMPLING", "STAT_DATA_QUALITY"],
  national: ["STAT_NATIONAL_ACCOUNTS"],
  accounts: ["STAT_NATIONAL_ACCOUNTS"],
  price: ["STAT_PRICE_STATISTICS"],
  labour: ["STAT_LABOUR_STATISTICS"],
  labor: ["STAT_LABOUR_STATISTICS"],
  agricultural: ["STAT_AGRICULTURAL_STATISTICS"],
  industrial: ["STAT_INDUSTRIAL_STATISTICS"],
  sdg: ["STAT_SDG_INDICATORS"],
  metadata: ["STAT_METADATA_STANDARDS"],
  quality: ["STAT_DATA_QUALITY"],
  
  // Technical Competencies
  python: ["TECH_PYTHON"],
  r: ["TECH_R"],
  sql: ["TECH_SQL"],
  stata: ["TECH_STATA"],
  spss: ["TECH_SPSS"],
  sas: ["TECH_SAS"],
  gis: ["TECH_GIS"],
  visualization: ["TECH_DATA_VISUALIZATION"],
  visual: ["TECH_DATA_VISUALIZATION"],
  ai: ["TECH_AI_ML"],
  ml: ["TECH_AI_ML"],
  machine: ["TECH_AI_ML"],
  cloud: ["TECH_CLOUD", "GOV_CLOUD"],
  api: ["TECH_APIS"],
  open: ["TECH_OPEN_DATA"],
  
  // Digital Governance
  cyber: ["GOV_CYBERSECURITY"],
  security: ["GOV_CYBERSECURITY"],
  privacy: ["GOV_DATA_PRIVACY"],
  digital: ["GOV_DIGITAL_SIGNATURES", "GOV_DPI"],
  signature: ["GOV_DIGITAL_SIGNATURES"],
  government: ["GOV_CLOUD", "GOV_DPI"],
  infrastructure: ["GOV_DPI"],
  
  // Behavioural and Managerial
  leadership: ["BEH_LEADERSHIP"],
  communication: ["BEH_COMMUNICATION"],
  project: ["BEH_PROJECT_MANAGEMENT"],
  management: ["BEH_PROJECT_MANAGEMENT", "BEH_CHANGE_MANAGEMENT"],
  ethics: ["BEH_ETHICS"],
  decision: ["BEH_DECISION_MAKING"],
  change: ["BEH_CHANGE_MANAGEMENT"],
};

const DESIGNATION_MAPPING = {
  "statistical officer": [
    "STAT_SURVEY_DESIGN", "STAT_SAMPLING", "STAT_DATA_QUALITY",
    "TECH_PYTHON", "TECH_SQL", "TECH_DATA_VISUALIZATION"
  ],
  "data analyst": [
    "TECH_PYTHON", "TECH_SQL", "TECH_R", "TECH_DATA_VISUALIZATION",
    "STAT_DATA_QUALITY"
  ],
  "training officer": [
    "BEH_LEADERSHIP", "BEH_COMMUNICATION", "BEH_PROJECT_MANAGEMENT",
    "BEH_ETHICS"
  ],
  "administrator": [
    "BEH_LEADERSHIP", "BEH_PROJECT_MANAGEMENT", "BEH_DECISION_MAKING",
    "GOV_CYBERSECURITY", "GOV_DATA_PRIVACY"
  ],
};

/**
 * Extract competency codes from text using keyword mapping
 */
const extractCompetenciesFromText = (text) => {
  if (!text || typeof text !== "string") return [];
  
  const lowerText = text.toLowerCase();
  const competencyCodes = new Set();
  
  for (const [keyword, codes] of Object.entries(PROFILE_KEYWORD_MAPPING)) {
    if (lowerText.includes(keyword)) {
      codes.forEach(code => competencyCodes.add(code));
    }
  }
  
  return Array.from(competencyCodes);
};

/**
 * Get relevant competencies based on designation
 */
const getCompetenciesByDesignation = (designation) => {
  if (!designation || typeof designation !== "string") return [];
  
  const lowerDesignation = designation.toLowerCase();
  
  for (const [mappedDesignation, codes] of Object.entries(DESIGNATION_MAPPING)) {
    if (lowerDesignation.includes(mappedDesignation)) {
      return codes;
    }
  }
  
  return [];
};

/**
 * Get relevant competencies from previous training array
 */
const getCompetenciesFromTraining = (previousTraining) => {
  if (!Array.isArray(previousTraining)) return [];
  
  const competencyCodes = new Set();
  
  for (const training of previousTraining) {
    if (typeof training === "string") {
      const codes = extractCompetenciesFromText(training);
      codes.forEach(code => competencyCodes.add(code));
    }
  }
  
  return Array.from(competencyCodes);
};

/**
 * Generate competency profile from user profile
 * 
 * This identifies RELEVANT competencies without assigning scores.
 * Returns provisional evidence marked as source: "profile"
 */
export const generateCompetencyProfile = async (user) => {
  if (!user) {
    throw new Error("User required");
  }
  
  const relevantCodes = new Set();
  
  // Extract from designation
  const designationCompetencies = getCompetenciesByDesignation(user.designation);
  designationCompetencies.forEach(code => relevantCodes.add(code));
  
  // Extract from current assignment
  const assignmentCompetencies = extractCompetenciesFromText(user.currentAssignment);
  assignmentCompetencies.forEach(code => relevantCodes.add(code));
  
  // Extract from previous training
  const trainingCompetencies = getCompetenciesFromTraining(user.previousTraining);
  trainingCompetencies.forEach(code => relevantCodes.add(code));
  
  // Fetch actual Competency documents
  const competencies = await Competency.find({
    code: { $in: Array.from(relevantCodes) },
    isActive: true,
  }).populate("domain");
  
  // Create/update UserCompetency records with profile evidence
  const profileCompetencies = [];
  for (const competency of competencies) {
    const existing = await UserCompetency.findOne({
      user: user._id,
      competency: competency._id,
    });
    
    // Only create profile evidence if no valid assessment evidence exists
    // Profile evidence is provisional and should not override assessment results
    if (!existing || existing.source === "profile" || !existing.score) {
      const record = await UserCompetency.findOneAndUpdate(
        { user: user._id, competency: competency._id },
        {
          $set: {
            currentLevel: 0, // No evidence of proficiency
            score: null, // No score from profile alone
            assessedAt: new Date(),
            source: "profile", // Mark as provisional profile evidence
          },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      ).populate("competency domain");
      
      profileCompetencies.push(record);
    } else {
      // Keep existing assessment evidence
      profileCompetencies.push(existing);
    }
  }
  
  return {
    user: user._id,
    relevantCompetencies: competencies,
    profileCompetencies,
    source: "profile",
    note: "Profile-based relevance identification. Proficiency requires assessment evidence.",
  };
};

/**
 * Get comprehensive competency profile including both profile-relevant
 * and assessed competencies
 */
export const getComprehensiveCompetencyProfile = async (user) => {
  if (!user) {
    throw new Error("User required");
  }
  
  // Get all user competencies
  const allCompetencies = await UserCompetency.find({ user: user._id })
    .populate("competency domain")
    .lean();
  
  // Separate profile evidence from assessment evidence
  const profileEvidence = allCompetencies.filter(c => c.source === "profile");
  const assessmentEvidence = allCompetencies.filter(c => c.source !== "profile" && c.source !== "no-evidence");
  
  return {
    user: user._id,
    profileEvidence,
    assessmentEvidence,
    totalCompetencies: allCompetencies.length,
    assessedCount: assessmentEvidence.length,
    profileOnlyCount: profileEvidence.length,
  };
};

export default {
  generateCompetencyProfile,
  getComprehensiveCompetencyProfile,
};
