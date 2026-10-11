import mongoose from "mongoose";

const answerSchema = new mongoose.Schema({
  questionIndex: Number,
  studentAnswer: String,
  aiFeedback: String,
  score: Number,
});

const facultyOralAttemptSchema = new mongoose.Schema(
  {
    exam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FacultyOralExam",
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    answers: [answerSchema],
    overallScore: Number,
    aiSummary: String,
    status: {
      type: String,
      enum: ["in-progress", "completed"],
      default: "in-progress",
    },
  },
  { timestamps: true }
);

export default mongoose.model(
  "FacultyOralAttempt",
  facultyOralAttemptSchema
);
