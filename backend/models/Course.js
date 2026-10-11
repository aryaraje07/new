import mongoose from "mongoose";

const courseSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  title: String,
  link: String,
  snippet: String,
  platform: String,
  difficulty: String,     // ✅ NEW
  thumbnail: String,     // ✅ NEW
  type: String,          // ✅ NEW (web / youtube)
  competency: { type: mongoose.Schema.Types.ObjectId, ref: "Competency" },
  requiredLevel: Number,
  currentLevel: Number,
  recommendationReason: String,
  completionStatus: { type: String, enum: ["recommended", "assessment_generating", "completed", "assessment_created"], default: "recommended" },
  trainingHistory: { type: mongoose.Schema.Types.ObjectId, ref: "TrainingHistory" },
  assessment: { type: mongoose.Schema.Types.ObjectId, ref: "Exam" },
  savedAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("Course", courseSchema);
