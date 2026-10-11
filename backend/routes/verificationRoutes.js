import express from "express";
import {
  verifyResultIntegrity,
  getAuditTrail,
  getTamperedRecords,
  getVerificationStats,
} from "../services/hashVerificationService.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

/**
 * @route   GET /api/verify/result/:attemptId
 * @desc    Verify result integrity using SHA256 hash
 * @access  Private - Student/Faculty
 */
router.get("/result/:attemptId", protect, async (req, res) => {
  try {
    const result = await verifyResultIntegrity(req.params.attemptId);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/verify/audit/:examId/:studentId
 * @desc    Get audit trail for an exam attempt
 * @access  Private - Student/Faculty
 */
router.get("/audit/:examId/:studentId", protect, async (req, res) => {
  try {
    const result = await getAuditTrail(
      req.params.examId,
      req.params.studentId
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/verify/tampered
 * @desc    Get all tampered records (Admin only)
 * @access  Private - Admin
 */
router.get("/tampered", protect, async (req, res) => {
  try {
    const result = await getTamperedRecords();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/verify/stats
 * @desc    Get verification statistics (Admin only)
 * @access  Private - Admin
 */
router.get("/stats", protect, async (req, res) => {
  try {
    const result = await getVerificationStats();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;
