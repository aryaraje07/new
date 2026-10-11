import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import Role from "../models/Role.js";
import Competency from "../models/Competency.js";
import RoleCompetency from "../models/RoleCompetency.js";

dotenv.config();

const ROLE_COMPETENCY_MAPPINGS = [
  {
    roleName: "Statistical Officer",
    competencies: [
      { code: "STAT_SURVEY_DESIGN", requiredLevel: 4 },
      { code: "STAT_SAMPLING", requiredLevel: 4 },
      { code: "STAT_DATA_QUALITY", requiredLevel: 3 },
      { code: "TECH_PYTHON", requiredLevel: 3 },
      { code: "TECH_SQL", requiredLevel: 3 },
      { code: "TECH_DATA_VISUALIZATION", requiredLevel: 3 },
      { code: "BEH_COMMUNICATION", requiredLevel: 3 },
    ],
  },
  {
    roleName: "Data Analyst",
    competencies: [
      { code: "TECH_PYTHON", requiredLevel: 4 },
      { code: "TECH_SQL", requiredLevel: 4 },
      { code: "TECH_R", requiredLevel: 3 },
      { code: "TECH_DATA_VISUALIZATION", requiredLevel: 4 },
      { code: "STAT_DATA_QUALITY", requiredLevel: 3 },
      { code: "TECH_AI_ML", requiredLevel: 2 },
      { code: "BEH_COMMUNICATION", requiredLevel: 2 },
    ],
  },
  {
    roleName: "Training Officer",
    competencies: [
      { code: "BEH_LEADERSHIP", requiredLevel: 4 },
      { code: "BEH_COMMUNICATION", requiredLevel: 4 },
      { code: "BEH_PROJECT_MANAGEMENT", requiredLevel: 4 },
      { code: "BEH_ETHICS", requiredLevel: 3 },
      { code: "BEH_DECISION_MAKING", requiredLevel: 3 },
      { code: "BEH_CHANGE_MANAGEMENT", requiredLevel: 3 },
    ],
  },
  {
    roleName: "Administrator",
    competencies: [
      { code: "BEH_LEADERSHIP", requiredLevel: 4 },
      { code: "BEH_PROJECT_MANAGEMENT", requiredLevel: 4 },
      { code: "BEH_DECISION_MAKING", requiredLevel: 4 },
      { code: "GOV_CYBERSECURITY", requiredLevel: 3 },
      { code: "GOV_DATA_PRIVACY", requiredLevel: 3 },
      { code: "GOV_CLOUD", requiredLevel: 2 },
    ],
  },
];

const seed = async () => {
  await connectDB();

  console.log("Seeding Role-Competency mappings...");

  for (const roleMapping of ROLE_COMPETENCY_MAPPINGS) {
    const role = await Role.findOne({ name: roleMapping.roleName });
    if (!role) {
      console.log(`Role not found: ${roleMapping.roleName}, skipping...`);
      continue;
    }

    console.log(`Processing role: ${roleMapping.roleName}`);

    for (const compMapping of roleMapping.competencies) {
      const competency = await Competency.findOne({ code: compMapping.code });
      if (!competency) {
        console.log(`  Competency not found: ${compMapping.code}, skipping...`);
        continue;
      }

      await RoleCompetency.findOneAndUpdate(
        { role: role._id, competency: competency._id },
        {
          role: role._id,
          competency: competency._id,
          requiredLevel: compMapping.requiredLevel,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      console.log(`  ✓ ${compMapping.code} → Level ${compMapping.requiredLevel}`);
    }
  }

  console.log("Role-Competency mappings seeded successfully");
};

seed().finally(async () => {
  await mongoose.disconnect();
});
