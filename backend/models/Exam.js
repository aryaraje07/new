import mongoose from "mongoose";

const examSchema = new mongoose.Schema({
  title: String,
  description: String,
  subject: String,
  difficulty: String,

  faculty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  duration: Number,
  totalQuestions: Number,

  questions: [
    {
      questionId: { type: String, required: true },
      question: { type: String, required: true },
      options: { type: [String], required: true },
      correctAnswer: { type: Number, required: true },
      topic: { type: String },
      competency: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Competency",
      },
      competencyDomain: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CompetencyDomain",
      },
      difficulty: { type: Number, min: 0, max: 5 },
      targetProficiencyLevel: { type: Number, min: 1, max: 5 },
      questionType: { type: String, enum: ["knowledge", "conceptual", "application", "scenario", "diagnostic"], default: "knowledge" },
      explanation: { type: String, default: "" },
      sourceReference: { type: String, default: "" },
      aiGenerated: { type: Boolean, default: false },
      revisionHistory: [{ question: String, changedAt: Date, changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" } }],
    }
  ],

  status: {
    type: String,
    enum: ["DRAFT", "APPROVED", "SCHEDULED"],
    default: "DRAFT",
  },

  // ⭐⭐ PERMANENT FIX ⭐⭐
  scope: {
    type: String,
    enum: ["ALL", "SELECTED", "CLASS"],
    default: "ALL",     // 🔥 NEVER missing now
  },

  assignedStudents: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: "User",
    default: [],        // 🔥 NEVER undefined
  },

  assignedClass: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Class",
  },

  semester: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Semester",
  },

  scheduledAt: Date,
  competencyTags: [{ type: mongoose.Schema.Types.ObjectId, ref: "Competency" }],
  material: { type: mongoose.Schema.Types.ObjectId, ref: "Material" },
  assessmentType: { type: String, enum: ["STANDARD", "DIAGNOSTIC", "MATERIAL"], default: "STANDARD" },
  generatedByModel: String,
  followUpFor: { type: mongoose.Schema.Types.ObjectId, ref: "Exam" },
  trainingHistory: { type: mongoose.Schema.Types.ObjectId, ref: "TrainingHistory" },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  approvedAt: Date,
}, { timestamps: true });

examSchema.index({ followUpFor: 1, assignedStudents: 1 }, { sparse: true });

export default mongoose.model("Exam", examSchema);
