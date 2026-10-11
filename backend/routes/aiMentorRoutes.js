import express from "express";
import { chatWithMentor, resetStressSession } from "../controllers/aiMentorController.js";
import { protect } from "../middlewares/authMiddleware.js";
import { authorizeRoles } from "../middlewares/roleMiddleware.js";

const router = express.Router();

router.post(
  "/chat",
  protect,
  authorizeRoles("student"),
  chatWithMentor
);

router.post(
  "/reset",
  protect,
  authorizeRoles("student"),
  resetStressSession
);

export default router;
