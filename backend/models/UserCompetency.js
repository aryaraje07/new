import mongoose from "mongoose";

const userCompetencySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    competency: { type: mongoose.Schema.Types.ObjectId, ref: "Competency", required: true },
    currentLevel: { type: Number, min: 0, max: 5, default: 0 },
    score: { type: Number, min: 0, max: 100, default: null },
    assessedAt: Date,
    source: { type: String, default: "manual" },
  },
  { timestamps: true }
);

userCompetencySchema.index({ user: 1, competency: 1 }, { unique: true });

export default mongoose.model("UserCompetency", userCompetencySchema);
