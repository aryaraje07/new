import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = process.env.MENTOR_API_KEY
  ? new GoogleGenerativeAI(process.env.MENTOR_API_KEY)
  : null;

export const getAIResponse = async (message) => {
  try {
    if (!genAI) {
      throw new Error("No API key");
    }

    const model = genAI.getGenerativeModel({
      model: "models/gemini-2.5-flash",
    });

    const result = await model.generateContent(message);
    return result.response.text();

  } catch (error) {
    console.log("⚠️ Gemini unavailable, using fallback.");

    // Smart fallback responses
    if (message.toLowerCase().includes("stress")) {
      return "I understand you're feeling stressed. Let's take a moment and break things down together. What’s causing the most pressure right now?";
    }

    if (message.toLowerCase().includes("overwhelmed")) {
      return "Feeling overwhelmed can be tough. You're not alone. Would you like to talk about what's making things feel heavy?";
    }

    return "I'm here to support you. Tell me more about how you're feeling.";
  }
};
