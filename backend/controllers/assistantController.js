import { answerAssistantQuestion } from "../services/assistantService.js";

export const postAssistantQuestion = async (req, res) => {
  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
  if (!message) return res.status(400).json({ message: "A learning question is required." });
  if (message.length > 2000) return res.status(400).json({ message: "Please keep the question under 2000 characters." });

  try {
    const result = await answerAssistantQuestion({ user: req.user, message });
    return res.json(result);
  } catch (error) {
    console.error("Personalized assistant request failed:", error.message);
    if (error.code === "PRIVATE_PROVIDER_UNAVAILABLE") {
      return res.status(503).json({ message: "The private learning assistant is temporarily unavailable. Please try again shortly." });
    }
    return res.status(502).json({ message: "The learning assistant could not answer right now. Please try again." });
  }
};

export default { postAssistantQuestion };