import mongoose from "mongoose";

const resultHashVerificationSchema = new mongoose.Schema(
  {
    examAttempt: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExamAttempt",
      required: true,
    },
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
    // SHA256 hash of current result data
    currentHash: {
      type: String,
      required: true,
    },
    // SHA256 hash of previous version (if modified)
    previousHash: {
      type: String,
      default: null,
    },
    // Original unmodified data hash
    originalHash: {
      type: String,
      required: true,
    },
    // Current result data (score, answers, etc)
    resultSnapshot: {
      score: Number,
      totalMarks: Number,
      answers: mongoose.Schema.Types.Mixed,
      metadata: mongoose.Schema.Types.Mixed,
    },
    // Tamper detection
    isTampered: {
      type: Boolean,
      default: false,
    },
    // List of all modifications detected
    tamperLog: [
      {
        detectedAt: {
          type: Date,
          default: Date.now,
        },
        previousHash: String,
        newHash: String,
        modifiedFields: [String],
      },
    ],
    // Track who accessed this record
    accessLog: [
      {
        accessedAt: {
          type: Date,
          default: Date.now,
        },
        accessedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        action: String, // "viewed", "verified", "modified"
      },
    ],
    // Last verification timestamp
    lastVerifiedAt: {
      type: Date,
      default: null,
    },
    // Verification status
    verificationStatus: {
      type: String,
      enum: ["valid", "tampered", "unverified"],
      default: "unverified",
    },
  },
  { timestamps: true }
);

// Index for quick lookups
resultHashVerificationSchema.index({ exam: 1, student: 1 }); // Compound index for exam-student queries
resultHashVerificationSchema.index({ isTampered: 1 });
resultHashVerificationSchema.index({ createdAt: -1 });

export default mongoose.model(
  "ResultHashVerification",
  resultHashVerificationSchema
);
