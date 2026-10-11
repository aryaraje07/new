import { GoogleGenerativeAI } from "@google/generative-ai";

// for interview

const genAI = new GoogleGenerativeAI(process.env.GEMINI_INTERVIEW_API_KEY);

const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
});

/* ================= FIRST QUESTION ================= */

export const generateFirstQuestion = async (type, subject) => {
  try {
    const prompt = `
You are conducting a professional ${type} interview for a ${subject} role.

Ask the candidate to introduce themselves in one short sentence.
Do not add anything else.
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;

    return response.text().trim();
  } catch (error) {
    console.error("First Question Error:", error);
    return "Please introduce yourself briefly.";
  }
};

/* ================= INTERVIEW TURN ================= */

export const processInterviewTurn = async (
  type,
  subject,
  question,
  answer
) => {
  try {
    const prompt = `
You are a professional ${type} interviewer for ${subject}.

Previous Question:
${question}

Candidate Answer:
${answer}

If the candidate is confused or says "I don't know":
Give a small helpful hint and ask the same topic again.

Otherwise:
Give short feedback and ask next relevant question about ${subject}.

Respond in this exact format:

<FEEDBACK>
---
<NEXT_QUESTION>
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const parts = text.split('---');

    const feedback = parts[0]?.trim() || "Thank you for your response.";
    const nextQuestion =
      parts[1]?.trim() ||
      `Can you explain one concept in ${subject}?`;

    return {
      feedback,
      score: 5,
      nextQuestion,
    };
  } catch (error) {
    console.error("AI Turn Processing Error:", error);

    return {
      feedback: "Thank you for your response.",
      score: 5,
      nextQuestion: `Can you explain a core concept in ${subject}?`,
    };
  }
};
