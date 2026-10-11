import express from "express";
import Notification from "../models/Notification.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/", protect, async (req, res) => {
  const notifications = await Notification.find({
    userId: req.user._id,
  }).sort({ createdAt: -1 });

  res.json(notifications);
});


// ORAL ROUTES
router.put("/:id/read", protect, async (req, res) => {
  await Notification.findByIdAndUpdate(req.params.id, {
    read: true,
  });

  res.json({ message: "Marked as read" });
});


router.delete("/:id", protect, async (req, res) => {
  await Notification.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted successfully" });
});

router.put("/mark-all", protect, async (req, res) => {
  await Notification.updateMany(
    { userId: req.user._id, read: false },
    { read: true }
  );

  res.json({ message: "All marked as read" });
});



export default router;


