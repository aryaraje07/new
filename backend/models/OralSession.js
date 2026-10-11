import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
  question: String,
  expectedAnswer: String,
  userAnswer: { type: String, default: "" },
  feedback: { type: String, default: "" },
  score: { type: Number, default: 0 }
}); 

const oralSessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    subject: String,
    difficulty: String,
    duration: Number,
    totalQuestions: Number,
    questions: [questionSchema],
    overallScore: { type: Number, default: 0 },
    overallFeedback: { type: String, default: "" },
    status: {
      type: String,
      enum: ["active", "completed"],
      default: "active"
    }
  },
  { timestamps: true }
);

export default mongoose.model("OralSession", oralSessionSchema);
