import express from "express";
import {
  uploadMaterial,
  getFacultyStudents,
  removeStudentConnection,
} from "../controllers/trainerMaterial.js";
import { protect } from "../middlewares/authMiddleware.js";
import { authorizeRoles } from "../middlewares/roleMiddleware.js";
import upload from "../middlewares/upload.js";

const router = express.Router();

router.use(protect);
router.use(authorizeRoles("faculty"));

router.post("/upload", upload.array("files", 10), uploadMaterial);
router.get("/students", getFacultyStudents);
router.delete("/students/:studentId", removeStudentConnection);

export default router;