import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { authorizeRoles } from "../middlewares/roleMiddleware.js";
import upload from "../middlewares/upload.js";
import {
  createSemester,
  listSemesters,
  assignFacultyFromExcel,
  getSemestersForFaculty,
  declareResults,
  getSemesterResults,
} from "../controllers/semesterController.js";

const router = express.Router();

router.post("/create", protect, authorizeRoles("admin"), createSemester);
router.get("/list", protect, authorizeRoles("admin"), listSemesters);
router.post(
  "/:semesterId/assign-faculty-excel",
  protect,
  authorizeRoles("admin"),
  upload.single("file"),
  assignFacultyFromExcel
);

router.get("/for-faculty", protect, authorizeRoles("faculty"), getSemestersForFaculty);

router.patch("/:semesterId/declare", protect, authorizeRoles("admin"), declareResults);

router.get("/:semesterId/results", protect, authorizeRoles("admin"), getSemesterResults);

export default router;
