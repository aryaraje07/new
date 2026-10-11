import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { 
  summarizeMaterial, 
  generateAINotes, 
  downloadAINotePDF, 
  getSavedNotes, 
  getAINoteById 
} from "../controllers/aiController.js";
import { getAIHealth } from "../controllers/aiHealthController.js";
import { createDiagnostic } from "../controllers/diagnosticController.js";
import { postAssistantQuestion } from "../controllers/assistantController.js";
import { authorizeRoles } from "../middlewares/roleMiddleware.js";

const router = express.Router();

router.post("/summarize/:materialId", protect, summarizeMaterial);
router.post("/generate-notes", protect, generateAINotes);
router.get("/saved-notes", protect, getSavedNotes);
router.get("/notes/:noteId", protect, getAINoteById);
router.get("/download/:noteId/pdf", protect, downloadAINotePDF);
router.get("/test", (req, res) => {
  res.json({ message: "AI routes are working!" });
});
router.get("/health", protect, getAIHealth);
router.post("/diagnostics", protect, createDiagnostic);
router.post("/assistant", protect, authorizeRoles("learner", "student"), postAssistantQuestion);

export default router;
