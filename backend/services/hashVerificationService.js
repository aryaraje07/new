import crypto from "crypto";
import ResultHashVerification from "../models/ResultHashVerification.js";

/**
 * Generate SHA256 hash of data
 */
export const generateHash = (data) => {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(data))
    .digest("hex");
};

/**
 * Record exam result hash verification
 */
export const recordResultHash = async (examAttemptId, resultData) => {
  try {
    const { exam, student, score, totalMarks, answers, metadata } = resultData;

    // Create snapshot of result
    const resultSnapshot = {
      score,
      totalMarks,
      answers,
      metadata,
    };

    // Generate hashes
    const currentHash = generateHash(resultSnapshot);
    const originalHash = currentHash; // Same on first record

    // Check if already exists
    let verification = await ResultHashVerification.findOne({
      examAttempt: examAttemptId,
    });

    if (!verification) {
      // First time recording
      verification = new ResultHashVerification({
        examAttempt: examAttemptId,
        exam,
        student,
        currentHash,
        originalHash,
        resultSnapshot,
        verificationStatus: "valid",
        accessLog: [
          {
            action: "created",
            accessedBy: student,
          },
        ],
      });
    } else {
      // Update existing (should not happen normally)
      verification.currentHash = currentHash;
      verification.resultSnapshot = resultSnapshot;
    }

    await verification.save();

    return {
      success: true,
      hashVerificationId: verification._id,
      currentHash,
      originalHash,
      message: "Result hash recorded successfully",
    };
  } catch (error) {
    console.error("Error recording result hash:", error);
    throw new Error("Failed to record result hash: " + error.message);
  }
};

/**
 * Verify result integrity
 */
export const verifyResultIntegrity = async (examAttemptId) => {
  try {
    const verification = await ResultHashVerification.findOne({
      examAttempt: examAttemptId,
    });

    if (!verification) {
      return {
        success: false,
        verified: false,
        message: "No hash verification record found",
      };
    }

    // Recalculate hash based on current snapshot
    const calculatedHash = generateHash(verification.resultSnapshot);

    // Check if hash matches
    const isValid = calculatedHash === verification.currentHash;

    // Update last verified timestamp
    verification.lastVerifiedAt = new Date();

    if (!isValid) {
      // Detected tampering
      verification.isTampered = true;
      verification.verificationStatus = "tampered";

      // Log the tampering event
      verification.tamperLog.push({
        detectedAt: new Date(),
        previousHash: verification.currentHash,
        newHash: calculatedHash,
      });
    } else {
      verification.verificationStatus = "valid";
    }

    // Add to access log
    verification.accessLog.push({
      action: "verified",
    });

    await verification.save();

    return {
      success: true,
      verified: isValid,
      isTampered: verification.isTampered,
      currentHash: verification.currentHash,
      calculatedHash,
      originalHash: verification.originalHash,
      verificationStatus: verification.verificationStatus,
      lastVerifiedAt: verification.lastVerifiedAt,
      tamperCount: verification.tamperLog.length,
      message: isValid ? "Result integrity verified ✅" : "TAMPERING DETECTED ⚠️",
    };
  } catch (error) {
    console.error("Error verifying result integrity:", error);
    throw new Error("Failed to verify result integrity: " + error.message);
  }
};

/**
 * Get audit trail for an exam
 */
export const getAuditTrail = async (examId, studentId) => {
  try {
    const verifications = await ResultHashVerification.find({
      exam: examId,
      student: studentId,
    })
      .populate("examAttempt")
      .sort({ createdAt: -1 });

    if (verifications.length === 0) {
      return {
        success: false,
        data: [],
        message: "No verification records found",
      };
    }

    return {
      success: true,
      data: verifications.map((v) => ({
        id: v._id,
        examAttemptId: v.examAttempt._id,
        currentHash: v.currentHash,
        originalHash: v.originalHash,
        isTampered: v.isTampered,
        verificationStatus: v.verificationStatus,
        tamperLog: v.tamperLog,
        accessLog: v.accessLog,
        createdAt: v.createdAt,
        lastVerifiedAt: v.lastVerifiedAt,
      })),
      message: `Found ${verifications.length} verification record(s)`,
    };
  } catch (error) {
    console.error("Error getting audit trail:", error);
    throw new Error("Failed to get audit trail: " + error.message);
  }
};

/**
 * Get all tampered records (admin)
 */
export const getTamperedRecords = async () => {
  try {
    const tamperedRecords = await ResultHashVerification.find({
      isTampered: true,
    })
      .populate("exam student")
      .sort({ createdAt: -1 });

    return {
      success: true,
      count: tamperedRecords.length,
      data: tamperedRecords,
      message: `Found ${tamperedRecords.length} tampered record(s)`,
    };
  } catch (error) {
    console.error("Error getting tampered records:", error);
    throw new Error("Failed to get tampered records: " + error.message);
  }
};

/**
 * Get verification stats
 */
export const getVerificationStats = async () => {
  try {
    const total = await ResultHashVerification.countDocuments();
    const tampered = await ResultHashVerification.countDocuments({
      isTampered: true,
    });
    const valid = await ResultHashVerification.countDocuments({
      verificationStatus: "valid",
    });
    const unverified = await ResultHashVerification.countDocuments({
      verificationStatus: "unverified",
    });

    return {
      success: true,
      stats: {
        totalRecords: total,
        tamperedRecords: tampered,
        validRecords: valid,
        unverifiedRecords: unverified,
        tamperPercentage: total > 0 ? ((tampered / total) * 100).toFixed(2) : 0,
      },
    };
  } catch (error) {
    console.error("Error getting verification stats:", error);
    throw new Error("Failed to get verification stats: " + error.message);
  }
};
