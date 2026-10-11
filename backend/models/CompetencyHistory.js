import mongoose from "mongoose";

const competencyHistorySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    competency: { type: mongoose.Schema.Types.ObjectId, ref: "Competency", required: true },
    previousScore: { type: Number, min: 0, max: 100, default: null },
    previousLevel: { type: Number, min: 0, max: 5, default: null },
    currentScore: { type: Number, min: 0, max: 100, default: null },
    currentLevel: { type: Number, min: 0, max: 5, default: 0 },
    requiredLevel: { type: Number, min: 0, max: 5, default: null },
    source: { type: String, default: "assessment" },
    reason: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("CompetencyHistory", competencyHistorySchema);
