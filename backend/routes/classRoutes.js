import express from "express";
import {
  createClass,
  getFacultyClasses,
  updateClass,
  deleteClass,
  addStudentsToClass,
  removeStudentsFromClass,
  uploadExcelForClass,
  getClassDetails,
} from "../controllers/classController.js";
import { protect } from "../middlewares/authMiddleware.js";
import { authorizeRoles } from "../middlewares/roleMiddleware.js";
import upload from "../middlewares/upload.js";

const router = express.Router();

router.use(protect);
router.use(authorizeRoles("faculty"));

router.post("/", createClass);
router.get("/", getFacultyClasses);
router.get("/:classId", getClassDetails);
router.put("/:classId", updateClass);
router.delete("/:classId", deleteClass);

router.post("/:classId/students", addStudentsToClass);
router.delete("/:classId/students", removeStudentsFromClass);

router.post("/:classId/upload-excel", upload.single("excel"), uploadExcelForClass);

export default router;