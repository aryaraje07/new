import mongoose from "mongoose";

const recommendationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    competency: { type: mongoose.Schema.Types.ObjectId, ref: "Competency" },
    gap: { type: Number, default: 0 },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    provider: { type: String, default: "" },
    source: { type: String, default: "serpapi" },
    sourceType: { type: String, enum: ["internal", "igot", "nssta", "other"], default: "internal" },
    sourceUrl: { type: String, default: "" },
    status: { type: String, enum: ["new", "in_progress", "completed"], default: "new" },
    recommendationStatus: { type: String, enum: ["new", "in_progress", "completed"], default: "new" },
  },
  { timestamps: true }
);

recommendationSchema.index({ user: 1, competency: 1, sourceUrl: 1 }, { unique: true, sparse: true });

export default mongoose.model("Recommendation", recommendationSchema);
