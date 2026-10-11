import mongoose from "mongoose";

const skillGapSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    competency: { type: mongoose.Schema.Types.ObjectId, ref: "Competency", required: true },
    requiredLevel: { type: Number, min: 0, max: 5, default: 0 },
    currentLevel: { type: Number, min: 0, max: 5, default: 0 },
    status: { type: String, enum: ["open", "addressed"], default: "open" },
  },
  { timestamps: true }
);

skillGapSchema.index({ user: 1, competency: 1 }, { unique: true });

export default mongoose.model("SkillGap", skillGapSchema);
