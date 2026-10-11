import mongoose from "mongoose";

const examAttemptSchema = new mongoose.Schema(
  {
    exam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    answers: [
      {
        questionId: String,
        selectedOption: Number,
      },
    ],

    score: Number,
    correctCount: Number,
    totalQuestions: Number,
    competencyResults: [
      {
        competency: { type: mongoose.Schema.Types.ObjectId, ref: "Competency" },
        competencyDomain: { type: mongoose.Schema.Types.ObjectId, ref: "CompetencyDomain" },
        difficulty: { type: Number, min: 0, max: 5 },
        score: { type: Number, min: 0, max: 100 },
      },
    ],

    startedAt: Date,
    submittedAt: Date,

    status: {
      type: String,
      enum: ["STARTED", "SUBMITTED", "AUTO_SUBMITTED"],
      default: "STARTED",
    },

    proctoring: {
  faceWarnings: { type: Number, default: 0 },
  escWarnings: { type: Number, default: 0 },
  autoSubmitted: { type: Boolean, default: false },
  reasons: { type: [String], default: [] },
},
  },
  { timestamps: true }
);

// Compound index for exam-student uniqueness (removes duplicate index warning)
examAttemptSchema.index({ exam: 1, student: 1 }, { unique: true });

export default mongoose.model("ExamAttempt", examAttemptSchema);
