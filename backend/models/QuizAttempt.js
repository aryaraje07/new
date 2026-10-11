// models/QuizAttempt.js
import mongoose from "mongoose";

const quizAttemptSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    quizType: {
      type: String,
      enum: ["CUSTOM", "SCHEDULED"],
      required: true,
    },

    quizId: {
      type: String,
    },

    subject: {
      type: String,
      default: null,
    },

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
      },
    ],

    correctAnswers: [
      {
        questionId: { type: String, required: true },
        correctAnswer: { type: Number, required: true },
        question: { type: String, default: "" },
        options: { type: [String], default: [] },
        topic: { type: String, default: "" },
        competency: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Competency",
        },
        competencyDomain: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "CompetencyDomain",
        },
        difficulty: { type: Number, min: 0, max: 5 },
      },
    ],

    answers: [
      {
        questionId: { type: String, required: true },
        selectedIndex: { type: Number, default: null },
      },
    ],

    totalQuestions: { type: Number, default: 0 },

    warnings: {
      tab: { type: Number, default: 0 },
      face: { type: Number, default: 0 },
    },

    score: { type: Number, default: 0 },

    correctCount: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ["ONGOING", "SUBMITTED", "AUTO_SUBMITTED"],
      default: "ONGOING",
    },

    submittedAt: Date,

    // 🔒 MOST IMPORTANT
    isFinalized: {
      type: Boolean,
      default: false,
    },

    examId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Exam",
},

noFaceSince: {
  type: Date,
  default: null,
},

    lastFaceWarningAt: {
      type: Date,
      default: null,
    },

    submissionType: {
      type: String,
      enum: ["MANUAL", "AUTO", "TIME_UP"],
    },

    submitReason: {
      type: String,
      enum: ["NORMAL", "TIME_UP", "PROCTOR_VIOLATION"],
    },
  },
  { timestamps: true }
);

// Indexes for efficient querying (no duplicates with schema-level indexes)
quizAttemptSchema.index({ student: 1, createdAt: -1 });

export default mongoose.model("QuizAttempt", quizAttemptSchema);
