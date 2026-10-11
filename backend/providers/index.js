import ollamaProvider from "./ollamaProvider.js";
import { getGeminiModel } from "../utils/gemini.js";

/**
 * AI Provider Abstraction
 * Primary: Ollama (local Qwen)
 * Fallback: Gemini (if enabled)
 */
class AIProvider {
  constructor() {
    this.primaryProvider = "ollama";
    this.fallbackEnabled = process.env.GEMINI_FALLBACK_ENABLED === "true";
  }

  /**
   * Get health status of all providers
   */
  async getHealthStatus() {
    const ollamaHealth = await ollamaProvider.healthCheck();
    
    return {
      primary: {
        name: "ollama",
        ...ollamaHealth,
      },
      fallback: {
        name: "gemini",
        enabled: this.fallbackEnabled,
        configured: !!process.env.GEMINI_API_KEY,
      },
    };
  }

  /**
   * Generate content with automatic fallback
   */
  async generate({ prompt, systemPrompt = "", options = {} }) {
    try {
      // Try Ollama first
      console.log("Attempting generation with Ollama...");
      const result = await ollamaProvider.generate({
        prompt,
        systemPrompt,
        ...options,
      });
      
      return {
        ...result,
        usedProvider: "ollama",
      };
    } catch (ollamaError) {
      console.error("Ollama generation failed:", ollamaError.message);
      
      if (this.fallbackEnabled) {
        console.log("Falling back to Gemini...");
        try {
          return await this.generateWithGemini({ prompt, systemPrompt, options });
        } catch (geminiError) {
          console.error("Gemini fallback also failed:", geminiError.message);
          throw new Error("All AI providers failed");
        }
      } else {
        throw new Error(`Ollama unavailable and fallback disabled: ${ollamaError.message}`);
      }
    }
  }

  /**
   * Generate structured JSON with automatic fallback
   */
  async generateJSON({ prompt, systemPrompt = "", schema = {}, options = {} }) {
    try {
      console.log("Attempting JSON generation with Ollama...");
      const result = await ollamaProvider.generateJSON({
        prompt,
        systemPrompt,
        schema,
        ...options,
      });
      
      return {
        ...result,
        usedProvider: "ollama",
      };
    } catch (ollamaError) {
      console.error("Ollama JSON generation failed:", ollamaError.message);
      
      if (this.fallbackEnabled) {
        console.log("Falling back to Gemini for JSON...");
        try {
          return await this.generateJSONWithGemini({ prompt, systemPrompt, schema, options });
        } catch (geminiError) {
          console.error("Gemini JSON fallback also failed:", geminiError.message);
          throw new Error("All AI providers failed for JSON generation");
        }
      } else {
        throw new Error(`Ollama unavailable for JSON and fallback disabled: ${ollamaError.message}`);
      }
    }
  }

  /**
   * Generate MCQ questions for competency assessments
   */
  async generateMCQs(params) {
    try {
      console.log("Attempting MCQ generation with Ollama...");
      const result = await ollamaProvider.generateMCQs(params);
      
      return {
        success: true,
        questions: result,
        usedProvider: "ollama",
      };
    } catch (ollamaError) {
      console.error("Ollama MCQ generation failed:", ollamaError.message);
      throw new Error(`Ollama unavailable for MCQ generation: ${ollamaError.message}`);
    }
  }

  /**
   * Gemini fallback methods
   */
  async generateWithGemini({ prompt, systemPrompt, options = {} }) {
    try {
      const model = getGeminiModel();
      const fullPrompt = systemPrompt 
        ? `${systemPrompt}\n\n${prompt}` 
        : prompt;

      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
        generationConfig: options.maxTokens 
          ? { maxOutputTokens: options.maxTokens } 
          : undefined,
      });

      return {
        success: true,
        provider: "gemini",
        data: result?.response?.text?.() || "",
        usedProvider: "gemini",
      };
    } catch (error) {
      throw new Error(`Gemini generation failed: ${error.message}`);
    }
  }

  async generateJSONWithGemini({ prompt, systemPrompt, schema, options = {} }) {
    try {
      const jsonSystemPrompt = `${systemPrompt}\n\nCRITICAL: You MUST respond ONLY with valid JSON. No markdown, no explanations, no code blocks - ONLY pure JSON that matches the required schema.`;
      
      const result = await this.generateWithGemini({
        prompt: `${prompt}\n\nRequired JSON Schema:\n${JSON.stringify(schema, null, 2)}`,
        systemPrompt: jsonSystemPrompt,
        options,
      });

      let jsonData;
      try {
        jsonData = JSON.parse(result.data);
      } catch (parseError) {
        const jsonMatch = result.data.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          jsonData = JSON.parse(jsonMatch[1]);
        } else {
          throw new Error("Failed to parse JSON from Gemini response");
        }
      }

      return {
        success: true,
        provider: "gemini",
        data: jsonData,
        raw: result.data,
        usedProvider: "gemini",
      };
    } catch (error) {
      throw new Error(`Gemini JSON generation failed: ${error.message}`);
    }
  }

  async generateMCQsWithGemini(params) {
    // Implement Gemini-based MCQ generation as fallback
    // This would use a similar prompt structure as Ollama
    throw new Error("Gemini MCQ fallback not yet implemented");
  }
}

export default new AIProvider();