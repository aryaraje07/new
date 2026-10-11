import express from "express";
import {
  searchCourses,
  saveCourse,
  getSavedCourses,
  deleteCourse,
  getPersonalizedRecommendations,
  getRecommendedCourses,
  completeRecommendedCourse,
} from "../controllers/courseController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/search", protect, searchCourses);
router.get("/recommendations", protect, getPersonalizedRecommendations);
router.get("/recommended", protect, getRecommendedCourses);
router.post("/:id/complete", protect, completeRecommendedCourse);
router.post("/save", protect, saveCourse);
router.get("/saved", protect, getSavedCourses);
router.delete("/delete/:id", protect, deleteCourse);


export default router;
