import express from "express"
import { protect } from "../middlewares/authMiddleware.js"
import { faceCheck } from "../controllers/proctorController.js"

const router = express.Router()

router.post("/face-check", protect, faceCheck)

export default router