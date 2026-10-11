import { generateTutorLesson } from "../services/tutorLessonService.js";

export const startTutorSession = async (req, res) => {
  try {
    const { topic, minutes } = req.body;

    if (!topic) {
      return res.status(400).json({ steps: [] });
    }

    const steps = await generateTutorLesson(topic, minutes || 5);

    return res.json({ steps });
  } catch (error) {
    console.error("Tutor error:", error.message);
    return res.status(500).json({ steps: [] });
  }
};
