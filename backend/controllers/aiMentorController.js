import { getAIResponse } from "../services/aiService.js";
import { detectEmotion } from "../services/emotionService.js";
import MentorChat from "../models/MentorChat.js";
import StudentStress from "../models/StudentStress.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";

export const chatWithMentor = async (req, res) => {
  try {
    const { message } = req.body;
    const studentId = req.user._id;

    if (!message) {
      return res.status(400).json({ error: "Message required" });
    }

    const emotion = detectEmotion(message);

    await MentorChat.create({
      studentId,
      message,
      emotion,
    });

    let stressRecord = await StudentStress.findOne({ studentId });

    if (!stressRecord) {
      stressRecord = await StudentStress.create({
        studentId,
        stressCount: 0,
        alerted: false,
      });
    }

    if (emotion === "stressed") {
      stressRecord.stressCount += 1;
    }

    if (stressRecord.stressCount >= 3 && !stressRecord.alerted) {
      const student = await User.findById(studentId).populate("parents");

      if (student.parents?.length > 0) {
        for (const parent of student.parents) {
          await Notification.create({
            userId: parent._id,
            title: "⚠️ Emotional Support Alert",
            message: `${student.fullName} has shown repeated stress signals. Please check in and provide support.`,
            type: "alert",
          });
        }
      }

      stressRecord.alerted = true;
    }

    await stressRecord.save();

    const aiReply = await getAIResponse(message);

    res.json({
      reply: aiReply,
      emotion,
      stressCount: stressRecord.stressCount,
      parentAlerted: stressRecord.alerted,
    });

  } catch (error) {
    console.error("AI Mentor Error:", error);
    res.status(500).json({ error: "AI mentor failed" });
  }
};

export const resetStressSession = async (req, res) => {
  try {
    const studentId = req.user._id;

    await StudentStress.findOneAndUpdate(
      { studentId },
      {
        stressCount: 0,
        alerted: false,
      },
      { upsert: true }
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Reset stress error:", error);
    res.status(500).json({ error: "Failed to reset stress session" });
  }
};

