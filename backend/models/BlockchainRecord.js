import mongoose from "mongoose";

/**
 * BlockchainRecord stores references to blockchain transactions
 * This links database records to their blockchain-stored hashes
 */
const blockchainRecordSchema = new mongoose.Schema(
  {
    // Reference to ExamAttempt
    examAttempt: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExamAttempt",
      required: true,
    },

    // Blockchain transaction hash
    transactionHash: {
      type: String,
      required: true,
      unique: true,
    },

    // Result hash stored on blockchain
    resultHash: {
      type: String,
      required: true,
    },

    // Verification hash (for integrity checks)
    verificationHash: {
      type: String,
      required: true,
    },

    // Block number where result was recorded
    blockNumber: {
      type: Number,
      required: true,
    },

    // Gas used for the transaction
    gasUsed: {
      type: String,
    },

    // Status of the blockchain recording
    status: {
      type: String,
      enum: ["PENDING", "CONFIRMED", "FAILED"],
      default: "CONFIRMED",
    },

    // Verification status
    verified: {
      type: Boolean,
      default: false,
    },

    // Tampering detected flag
    tamperDetected: {
      type: Boolean,
      default: false,
    },

    // Number of tampering attempts
    tamperAttempts: {
      type: Number,
      default: 0,
    },

    // Last verification timestamp
    lastVerifiedAt: Date,

    // Metadata stored on blockchain (base64 encoded)
    metadata: String,
  },
  { timestamps: true }
);

// Indexes for efficient querying
blockchainRecordSchema.index({ transactionHash: 1 });
blockchainRecordSchema.index({ resultHash: 1 });
blockchainRecordSchema.index({ tamperDetected: 1 });
blockchainRecordSchema.index({ createdAt: -1 });

export default mongoose.model("BlockchainRecord", blockchainRecordSchema);
