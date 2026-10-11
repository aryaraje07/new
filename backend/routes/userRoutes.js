import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { getFaceEmbedding,getMyFaculties } from "../controllers/userController.js";

const router = express.Router();

router.get("/face-embedding", protect, getFaceEmbedding);
router.get("/my-faculties", protect, getMyFaculties);

export default router;
