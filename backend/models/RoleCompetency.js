import mongoose from "mongoose";

const roleCompetencySchema = new mongoose.Schema(
  {
    role: { type: mongoose.Schema.Types.ObjectId, ref: "Role", required: true },
    competency: { type: mongoose.Schema.Types.ObjectId, ref: "Competency", required: true },
    requiredLevel: { type: Number, min: 0, max: 5, default: 0 },
    importanceWeight: { type: Number, min: 0, max: 1, default: 0.5 },
    isMandatory: { type: Boolean, default: true },
    rationale: { type: String, default: "Representative prototype competency mapping aligned with FRAC principles." },
  },
  { timestamps: true }
);

roleCompetencySchema.index({ role: 1, competency: 1 }, { unique: true });

export default mongoose.model("RoleCompetency", roleCompetencySchema);
