import express from "express";
import { startTutorSession } from "../controllers/aiTutorController.js";

const router = express.Router();

// Test route to verify ai-tutor routes are loaded
router.get("/test", (req, res) => {
  console.log("AI Tutor test route hit");
  res.json({ message: "AI Tutor routes are working!" });
});

router.post("/start", startTutorSession);

export default router;