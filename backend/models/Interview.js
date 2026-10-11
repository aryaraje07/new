import mongoose from "mongoose";

const interviewQuestionSchema = new mongoose.Schema({
  question: String,
  expectedAnswer: String,
  userAnswer: { type: String, default: "" },
  feedback: { type: String, default: "" },
  score: { type: Number, default: 0 },
});

const interviewSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    type: {
      type: String,
      enum: ["hr", "technical", "behavioral", "case"],
      required: true,
    },

    subject: {
      type: String,
      required: true,
    },

    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },

    duration: {
      type: Number,
      required: true,
    },

    totalQuestions: Number,

    questions: [interviewQuestionSchema],

    overallScore: { type: Number, default: 0 },

    overallFeedback: { type: String, default: "" },

    analytics: {
      communication: { type: Number, default: 0 },
      technical: { type: Number, default: 0 },
      confidence: { type: Number, default: 0 },
      problemSolving: { type: Number, default: 0 },
      timeManagement: { type: Number, default: 0 },
    },

    status: {
      type: String,
      enum: ["active", "completed"],
      default: "active",
    },
  },
  { timestamps: true }
);

export default mongoose.model("InterviewSession", interviewSchema);
