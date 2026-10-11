import axios from "axios";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen2.5:7b";
const OLLAMA_TIMEOUT_MS = parseInt(process.env.OLLAMA_TIMEOUT_MS || "300000");

/**
 * Ollama Provider for Local AI Generation
 * Uses Qwen model through Ollama for SIH competency-based assessments
 */
class OllamaProvider {
  constructor() {
    this.baseUrl = OLLAMA_BASE_URL;
    this.model = OLLAMA_MODEL;
    this.timeout = OLLAMA_TIMEOUT_MS;
  }

  /**
   * Check if Ollama is available and configured
   */
  async healthCheck() {
    try {
      const startTime = Date.now();
      const response = await axios.get(`${this.baseUrl}/api/tags`, {
        timeout: 5000,
      });
      const latency = Date.now() - startTime;
      
      const models = response.data?.models || [];
      const modelAvailable = models.some(m => m.name.includes(this.model));
      
      return {
        available: true,
        configuredModel: this.model,
        modelAvailable,
        availableModels: models.map(m => m.name),
        latency,
        message: modelAvailable 
          ? `Ollama is running with ${this.model} available` 
          : `Ollama is running but ${this.model} is not available`
      };
    } catch (error) {
      return {
        available: false,
        configuredModel: this.model,
        error: error.message,
        message: `Ollama is not available at ${this.baseUrl}`
      };
    }
  }

  /**
   * Generate content using Ollama
   */
  async generate({ prompt, systemPrompt = "", temperature = 0.7, maxTokens = 2000 }) {
    try {
      const fullPrompt = systemPrompt 
        ? `${systemPrompt}\n\n${prompt}` 
        : prompt;

      const response = await axios.post(
        `${this.baseUrl}/api/generate`,
        {
          model: this.model,
          prompt: fullPrompt,
          stream: false,
          options: {
            temperature,
            num_predict: maxTokens,
          },
        },
        {
          timeout: this.timeout,
          headers: { "Content-Type": "application/json" },
        }
      );

      const generatedText = response.data?.response;
      
      if (!generatedText) {
        throw new Error("Empty response from Ollama");
      }

      return {
        success: true,
        provider: "ollama",
        model: this.model,
        data: generatedText,
        usage: {
          total_duration: response.data?.total_duration,
          eval_count: response.data?.eval_count,
        },
      };
    } catch (error) {
      const message = error?.response?.data?.error || error?.message || error?.code || "Unknown Ollama error";
      console.error("Ollama Generation Error:", message);
      throw new Error(`Ollama generation failed: ${message}`);
    }
  }

  /**
   * Generate structured JSON output
   */
  async generateJSON({ prompt, systemPrompt = "", schema = {}, temperature = 0.5 }) {
    try {
      const jsonSystemPrompt = `${systemPrompt}\n\nCRITICAL: You MUST respond ONLY with valid JSON. No markdown, no explanations, no code blocks - ONLY pure JSON that matches the required schema.`;
      
      const response = await this.generate({
        prompt: `${prompt}\n\nRequired JSON Schema:\n${JSON.stringify(schema, null, 2)}`,
        systemPrompt: jsonSystemPrompt,
        temperature,
      });

      // Extract JSON from response
      let jsonData;
      try {
        // Try to parse directly first
        jsonData = JSON.parse(response.data);
      } catch (parseError) {
        // Try to extract JSON from markdown code blocks
        const jsonMatch = response.data.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          jsonData = JSON.parse(jsonMatch[1]);
        } else {
          throw new Error("Failed to parse JSON from Ollama response");
        }
      }

      return {
        success: true,
        provider: "ollama",
        model: this.model,
        data: jsonData,
        raw: response.data,
      };
    } catch (error) {
      const message = error?.response?.data?.error || error?.message || error?.code || "Unknown Ollama error";
      console.error("Ollama JSON Generation Error:", message);
      throw new Error(`Ollama JSON generation failed: ${message}`);
    }
  }

  /**
   * Generate MCQ questions for competency assessments
   */
  async generateMCQs({
    subject,
    materialText,
    questions = 10,
    difficulty = "medium",
    competencyIds = [],
    targetProficiencyLevel = 3,
    questionType = "knowledge",
    sourceReference = "",
    language = "en",
  }) {
    try {
      const difficultyLevels = {
        easy: 1,
        medium: 2,
        hard: 3,
      };

      const difficultyValue = difficultyLevels[difficulty.toLowerCase()] || 2;

      const langNotice = language === "mr"
        ? "\nLANGUAGE REQUIREMENT: Generate all question text, options, and explanations in Marathi (मराठी). Maintain clear and accurate official statistical terminology."
        : language === "hi"
          ? "\nLANGUAGE REQUIREMENT: Generate all question text, options, and explanations in Hindi (हिन्दी). Maintain clear and accurate official statistical terminology."
          : "";

      const systemPrompt = `You are an expert assessment generator for India's Official Statistical System. Generate competency-based multiple-choice questions that test knowledge and application.${langNotice}`;

      const prompt = `Generate ${questions} multiple-choice questions for a competency assessment.

Subject: ${subject}
Difficulty: ${difficulty} (Level ${difficultyValue}/3)
Target Proficiency Level: ${targetProficiencyLevel}/5
Question Type: ${questionType}
Language: ${language === "mr" ? "Marathi (मराठी)" : language === "hi" ? "Hindi (हिन्दी)" : "English"}
${sourceReference ? `Source Material: ${sourceReference}` : ""}

CONTEXT:
${materialText}

REQUIREMENTS:
1. Generate EXACTLY ${questions} questions
2. Each question must have exactly 4 options (A, B, C, D)
3. Only ONE option is correct (indicated by correctAnswer: 0-3)
4. Include competency metadata for each question
5. Provide clear explanations for the correct answer
6. Questions should be factual and grounded in the provided context
7. Vary the position of correct answers (don't always make it A)

OUTPUT FORMAT (JSON):
{
  "questions": [
    {
      "questionId": "q1",
      "question": "Clear question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Detailed explanation of why this answer is correct",
      "competencyId": "${competencyIds[0] || "competency_id"}",
      "competencyName": "Name of competency being tested",
      "targetProficiencyLevel": ${targetProficiencyLevel},
      "difficulty": "${difficulty}",
      "questionType": "${questionType}",
      "sourceReference": "${sourceReference || "Source material"}"
    }
  ]
}

Generate the questions now:`;

      const response = await this.generateJSON({
        prompt,
        systemPrompt,
        schema: {
          type: "object",
          properties: {
            questions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  questionId: { type: "string" },
                  question: { type: "string" },
                  options: { type: "array", items: { type: "string" } },
                  correctAnswer: { type: "number" },
                  explanation: { type: "string" },
                  competencyId: { type: "string" },
                  competencyName: { type: "string" },
                  targetProficiencyLevel: { type: "number" },
                  difficulty: { type: "string" },
                  questionType: { type: "string" },
                  sourceReference: { type: "string" },
                },
              },
            },
          },
        },
        temperature: 0.7,
      });

      if (!response.data?.questions || !Array.isArray(response.data.questions)) {
        throw new Error("Invalid response format: missing questions array");
      }

      if (response.data.questions.length !== questions) {
        console.warn(`Warning: Generated ${response.data.questions.length} questions instead of ${questions}`);
      }

      return response.data.questions;
    } catch (error) {
      const message = error?.response?.data?.error || error?.message || error?.code || "Unknown Ollama error";
      console.error("Ollama MCQ Generation Error:", message);
      throw new Error(`Failed to generate MCQs: ${message}`);
    }
  }
}

export default new OllamaProvider();