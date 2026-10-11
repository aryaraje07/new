import { GoogleGenerativeAI } from "@google/generative-ai";

// Main AI for grievances
const genAI = new GoogleGenerativeAI(process.env.GRIEVANCES_API_KEY || process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
});

export default model;

// Separate AI instance for oral exams
const genAIOral = new GoogleGenerativeAI(process.env.GEMINI_ORAL_API_KEY || process.env.GEMINI_API_KEY);

// Dedicated AI instance for coding questions
const genAICoding = new GoogleGenerativeAI(process.env.CODING_QUESTIONS_API_KEY || process.env.GEMINI_API_KEY);

// Dedicated AI instance for code analysis
const genAIAnalysis = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const getGeminiModel = () => {
  return genAIOral.getGenerativeModel({ model: "gemini-2.5-flash" });
};

export const getCodingQuestionsModel = () => {
  return genAICoding.getGenerativeModel({ model: "gemini-2.5-flash" });
};

export const getCodeAnalysisModel = () => {
  return genAIAnalysis.getGenerativeModel({ model: "gemini-2.5-flash" });
};

export const getGrievanceModel = () => {
  return genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
};




