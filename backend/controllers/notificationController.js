// oral review notification

import Notification from '../models/Notification.js'

/* ================= GET STUDENT NOTIFICATIONS ================= */
export const getMyNotifications = async (req, res) => {
  const notifications = await Notification.find({
    userId: req.user._id,
  }).sort({ createdAt: -1 })

  res.json({ notifications })
}

/* ================= MARK AS READ ================= */
export const markAsRead = async (req, res) => {
  const { id } = req.params

  await Notification.findByIdAndUpdate(id, {
    isRead: true,
  })

  res.json({ success: true })
}