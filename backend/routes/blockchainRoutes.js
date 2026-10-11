import express from "express";
import authMiddleware from "../middlewares/authMiddleware.js";
import { roleMiddleware } from "../middlewares/roleMiddleware.js";
import BlockchainRecord from "../models/BlockchainRecord.js";
import ExamAttempt from "../models/ExamAttempt.js";
import {
  verifyResultIntegrity,
  getTamperLog,
  getBlockchainResult,
  getAuditTrail,
  getBlockchainStats,
  checkBlockchainConnection,
} from "../services/blockchainService.js";

const router = express.Router();

/**
 * GET /api/blockchain/health
 * Check blockchain connection status
 */
router.get("/health", async (req, res) => {
  try {
    const status = await checkBlockchainConnection();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/blockchain/stats
 * Get blockchain statistics (requires admin/faculty)
 */
router.get(
  "/stats",
  authMiddleware,
  roleMiddleware(["ADMIN", "FACULTY"]),
  async (req, res) => {
    try {
      const stats = await getBlockchainStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * GET /api/blockchain/verify/:examAttemptId
 * Verify integrity of an exam result
 */
router.get(
  "/verify/:examAttemptId",
  authMiddleware,
  async (req, res) => {
    try {
      const { examAttemptId } = req.params;
      const user = req.user;

      // Find exam attempt
      const examAttempt = await ExamAttempt.findById(examAttemptId)
        .populate("exam", "title subject")
        .populate("student", "fullName studentId");

      if (!examAttempt) {
        return res.status(404).json({ error: "Exam attempt not found" });
      }

      // Check authorization (student can only view their own, faculty/admin can view all)
      if (
        user.role === "STUDENT" &&
        examAttempt.student._id.toString() !== user.id
      ) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      // Get blockchain record
      const blockchainRecord = await BlockchainRecord.findOne({
        examAttempt: examAttemptId,
      });

      if (!blockchainRecord) {
        return res.status(404).json({
          error: "Blockchain record not found for this attempt",
        });
      }

      // Verify result integrity
      const verification = await verifyResultIntegrity(
        examAttempt.exam._id.toString(),
        examAttempt.student._id.toString(),
        examAttempt.score,
        examAttempt.totalQuestions
      );

      // Get tamper log
      const tamperLog = await getTamperLog(blockchainRecord.resultHash);

      return res.json({
        examAttempt: {
          id: examAttempt._id,
          exam: examAttempt.exam.title,
          student: examAttempt.student.fullName,
          score: examAttempt.score,
          totalQuestions: examAttempt.totalQuestions,
          submittedAt: examAttempt.submittedAt,
        },
        blockchain: {
          transactionHash: blockchainRecord.transactionHash,
          blockNumber: blockchainRecord.blockNumber,
          resultHash: blockchainRecord.resultHash,
          verified: blockchainRecord.verified,
        },
        integrity: verification,
        tamperLog: tamperLog,
        safe:
          verification.tampered === false &&
          tamperLog.tamperLog.length === 0,
      });
    } catch (error) {
      console.error("Verification error:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * GET /api/blockchain/audit/:examId/:studentId
 * Get complete audit trail for exam-student pair
 */
router.get(
  "/audit/:examId/:studentId",
  authMiddleware,
  async (req, res) => {
    try {
      const { examId, studentId } = req.params;
      const user = req.user;

      // Check authorization
      if (user.role === "STUDENT" && studentId !== user.id) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const auditTrail = await getAuditTrail(examId, studentId);

      if (!auditTrail) {
        return res.status(404).json({ error: "No blockchain record found" });
      }

      return res.json(auditTrail);
    } catch (error) {
      console.error("Audit trail error:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * GET /api/blockchain/records
 * Get all blockchain records for admin
 */
router.get(
  "/records",
  authMiddleware,
  roleMiddleware(["ADMIN"]),
  async (req, res) => {
    try {
      const { page = 1, limit = 20 } = req.query;
      const skip = (page - 1) * limit;

      const records = await BlockchainRecord.find()
        .populate("examAttempt", "score totalQuestions submittedAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await BlockchainRecord.countDocuments();

      return res.json({
        records,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * GET /api/blockchain/records/tampered
 * Get records with tampering detected
 */
router.get(
  "/records/tampered",
  authMiddleware,
  roleMiddleware(["ADMIN"]),
  async (req, res) => {
    try {
      const records = await BlockchainRecord.find({
        tamperDetected: true,
      })
        .populate("examAttempt")
        .sort({ createdAt: -1 });

      return res.json({
        tamperedRecords: records,
        count: records.length,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * GET /api/blockchain/result/:resultHash
 * Get specific result from blockchain
 */
router.get(
  "/result/:resultHash",
  authMiddleware,
  async (req, res) => {
    try {
      const { resultHash } = req.params;

      const result = await getBlockchainResult(resultHash);

      if (!result) {
        return res.status(404).json({ error: "Result not found on blockchain" });
      }

      return res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

export default router;
