import mongoose from "mongoose";

const trainingHistorySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    provider: String,
    sourceType: { type: String, enum: ["internal", "igot", "nssta", "other"], default: "internal" },
    competency: { type: mongoose.Schema.Types.ObjectId, ref: "Competency" },
    startedAt: Date,
    completedAt: Date,
    status: { type: String, enum: ["planned", "in_progress", "completed"], default: "planned" },
  },
  { timestamps: true }
);

export default mongoose.model("TrainingHistory", trainingHistorySchema);
