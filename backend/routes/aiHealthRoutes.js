import express from "express";
import { getAIHealth } from "../controllers/aiHealthController.js";

const router = express.Router();

// GET /api/ai/health - Check AI provider status (public for health monitoring)
router.get("/", getAIHealth);

export default router;