import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import User from "../models/User.js";
import Role from "../models/Role.js";
import Competency from "../models/Competency.js";
import CompetencyDomain from "../models/CompetencyDomain.js";
import RoleCompetency from "../models/RoleCompetency.js";

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const domains = [
  ["Statistical Competencies", "Official statistics and data quality practice."],
  ["Technical Competencies", "Data, software, cloud, and analytical capabilities."],
  ["Digital Governance", "Secure and responsible digital public infrastructure."],
  ["Behavioural and Managerial", "Leadership, communication, and organizational capabilities."],
];

const competencies = [
  ["Survey Design", "STAT_SURVEY_DESIGN", "Statistical Competencies"],
  ["Sampling", "STAT_SAMPLING", "Statistical Competencies"],
  ["Statistical Methods", "STAT_STATISTICAL_METHODS", "Statistical Competencies"],
  ["National Accounts", "STAT_NATIONAL_ACCOUNTS", "Statistical Competencies"],
  ["Price Statistics", "STAT_PRICE_STATISTICS", "Statistical Competencies"],
  ["Labour Statistics", "STAT_LABOUR_STATISTICS", "Statistical Competencies"],
  ["Agricultural Statistics", "STAT_AGRICULTURAL_STATISTICS", "Statistical Competencies"],
  ["Industrial Statistics", "STAT_INDUSTRIAL_STATISTICS", "Statistical Competencies"],
  ["SDG Indicators", "STAT_SDG_INDICATORS", "Statistical Competencies"],
  ["Metadata Standards", "STAT_METADATA_STANDARDS", "Statistical Competencies"],
  ["Data Quality Frameworks", "STAT_DATA_QUALITY", "Statistical Competencies"],
  ["Python", "TECH_PYTHON", "Technical Competencies"],
  ["R", "TECH_R", "Technical Competencies"],
  ["SQL", "TECH_SQL", "Technical Competencies"],
  ["Stata", "TECH_STATA", "Technical Competencies"],
  ["SPSS", "TECH_SPSS", "Technical Competencies"],
  ["SAS", "TECH_SAS", "Technical Competencies"],
  ["GIS", "TECH_GIS", "Technical Competencies"],
  ["Data Visualization", "TECH_DATA_VISUALIZATION", "Technical Competencies"],
  ["AI/ML", "TECH_AI_ML", "Technical Competencies"],
  ["Cloud Computing", "TECH_CLOUD", "Technical Competencies"],
  ["APIs", "TECH_APIS", "Technical Competencies"],
  ["Open Data", "TECH_OPEN_DATA", "Technical Competencies"],
  ["Cybersecurity", "GOV_CYBERSECURITY", "Digital Governance"],
  ["Data Privacy", "GOV_DATA_PRIVACY", "Digital Governance"],
  ["Digital Signatures", "GOV_DIGITAL_SIGNATURES", "Digital Governance"],
  ["Government Cloud", "GOV_CLOUD", "Digital Governance"],
  ["Digital Public Infrastructure", "GOV_DPI", "Digital Governance"],
  ["Leadership", "BEH_LEADERSHIP", "Behavioural and Managerial"],
  ["Communication", "BEH_COMMUNICATION", "Behavioural and Managerial"],
  ["Project Management", "BEH_PROJECT_MANAGEMENT", "Behavioural and Managerial"],
  ["Ethics", "BEH_ETHICS", "Behavioural and Managerial"],
  ["Decision Making", "BEH_DECISION_MAKING", "Behavioural and Managerial"],
  ["Change Management", "BEH_CHANGE_MANAGEMENT", "Behavioural and Managerial"],
];

// Representative prototype competency mapping aligned with FRAC principles;
// it is intentionally not represented as an official FRAC source.
const roleMappings = {
  "Statistical Officer": [["STAT_SURVEY_DESIGN", 4, .95], ["STAT_SAMPLING", 4, .95], ["STAT_DATA_QUALITY", 4, .9], ["STAT_METADATA_STANDARDS", 3, .75], ["TECH_PYTHON", 3, .7], ["TECH_SQL", 3, .7], ["TECH_DATA_VISUALIZATION", 3, .65], ["GOV_DATA_PRIVACY", 2, .6], ["BEH_COMMUNICATION", 3, .6], ["BEH_DECISION_MAKING", 3, .6]],
  "Statistical Analyst": [["STAT_STATISTICAL_METHODS", 4, .95], ["STAT_DATA_QUALITY", 4, .9], ["TECH_PYTHON", 4, .9], ["TECH_R", 3, .75], ["TECH_SQL", 4, .85], ["TECH_DATA_VISUALIZATION", 4, .8], ["TECH_AI_ML", 3, .65], ["BEH_COMMUNICATION", 3, .55]],
  "Survey / Field Statistics Officer": [["STAT_SURVEY_DESIGN", 4, .95], ["STAT_SAMPLING", 4, .95], ["STAT_DATA_QUALITY", 4, .9], ["STAT_METADATA_STANDARDS", 3, .7], ["GOV_DATA_PRIVACY", 3, .7], ["TECH_GIS", 3, .65], ["BEH_COMMUNICATION", 4, .75], ["BEH_ETHICS", 3, .6]],
  "Statistical Programmer / Data Systems Officer": [["TECH_PYTHON", 4, .95], ["TECH_R", 3, .7], ["TECH_SQL", 4, .95], ["TECH_APIS", 4, .85], ["TECH_CLOUD", 3, .7], ["TECH_OPEN_DATA", 3, .65], ["GOV_CYBERSECURITY", 3, .75], ["GOV_DATA_PRIVACY", 3, .75], ["STAT_DATA_QUALITY", 3, .65]],
};

const seed = async () => {
  await connectDB();

  const domainMap = new Map();
  for (const [name, description] of domains) {
    const domain = await CompetencyDomain.findOneAndUpdate(
      { name },
      { name, description },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    domainMap.set(name, domain._id);
  }

  for (const [name, code, domainName] of competencies) {
    await Competency.findOneAndUpdate(
      { code },
      { name, code, domain: domainMap.get(domainName) },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  const competencyByCode = new Map((await Competency.find().select("_id code").lean()).map((item) => [item.code, item]));
  for (const name of Object.keys(roleMappings)) {
    await Role.findOneAndUpdate(
      { name },
      { name },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  for (const [roleName, mappings] of Object.entries(roleMappings)) {
    const role = await Role.findOne({ name: roleName });
    for (const [code, requiredLevel, importanceWeight] of mappings) {
      const competency = competencyByCode.get(code);
      if (!competency) continue;
      await RoleCompetency.findOneAndUpdate(
        { role: role._id, competency: competency._id },
        { role: role._id, competency: competency._id, requiredLevel, importanceWeight, isMandatory: true, rationale: "Representative prototype competency mapping aligned with FRAC principles." },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
  }

  const password = await bcrypt.hash("ChangeMe123!", 10);
  const samples = [
    { fullName: "Sample Learner", email: "learner@example.gov.in", role: "learner", officialId: "SAMPLE-OFFICIAL-001", designation: "Statistical Officer", targetRole: "Statistical Officer", organization: "Ministry of Statistics and Programme Implementation (MoSPI)" },
    { fullName: "Sample Trainer", email: "trainer@example.gov.in", role: "trainer", employeeId: "SAMPLE-TRAINER-001", designation: "Trainer" },
    { fullName: "Sample Administrator", email: "admin@example.gov.in", role: "admin", employeeId: "SAMPLE-ADMIN-001", designation: "Administrator" },
  ];

  for (const sample of samples) {
    let u = await User.findOne({ email: sample.email });
    if (!u) {
      u = new User({ ...sample, password, phone: "0000000000" });
    } else {
      Object.assign(u, sample, { password, phone: "0000000000" });
    }
    await u.save();
  }

  console.log("SIH foundation data seeded successfully");
};

seed().finally(async () => {
  await mongoose.disconnect();
});
