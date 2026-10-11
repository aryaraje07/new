import mongoose from "mongoose";

const learningMemorySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    competency: { type: mongoose.Schema.Types.ObjectId, ref: "Competency", required: true },
    topic: { type: String, default: "" },
    
    // Attempt tracking
    attemptCount: { type: Number, default: 0 },
    correctCount: { type: Number, default: 0 },
    incorrectCount: { type: Number, default: 0 },
    
    // Performance metrics
    recentPerformance: { type: Number, min: 0, max: 100, default: null },
    averagePerformance: { type: Number, min: 0, max: 100, default: null },
    
    // Mastery state
    masteryState: { 
      type: String, 
      enum: ["needs_recall", "developing", "mastered"], 
      default: "developing" 
    },
    
    // Timing
    lastAttemptedAt: Date,
    lastCorrectAt: Date,
    recallDueAt: Date,
    
    // Question history for repetition prevention
    recentQuestionIds: [{ type: String }],
  },
  { timestamps: true }
);

learningMemorySchema.index({ user: 1, competency: 1, topic: 1 }, { unique: true });
learningMemorySchema.index({ user: 1, masteryState: 1 });
learningMemorySchema.index({ user: 1, recallDueAt: 1 });

export default mongoose.model("LearningMemory", learningMemorySchema);
