import express from "express";
import {
  translateHandler,
  getSupportedLanguagesHandler,
} from "../controllers/bhashiniController.js";

const router = express.Router();

/**
 * All translation routes require valid authentication
 * Prevents unauthorized access or proxy abuse
 */
router.post("/", translateHandler);
router.get("/supported-languages", getSupportedLanguagesHandler);

export default router;

