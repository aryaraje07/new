import mongoose from "mongoose";

const competencySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String, default: "" },
    domain: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CompetencyDomain",
      required: true,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

competencySchema.index({ domain: 1, name: 1 }, { unique: true });

export default mongoose.model("Competency", competencySchema);
