import { GoogleGenerativeAI } from "@google/generative-ai";
import BaseAIProvider from "./baseProvider.js";

/**
 * Gemini AI Provider
 * 
 * External AI provider using Google's Gemini API.
 * This provider should only be used for content that passes the AI policy check.
 */
class GeminiProvider extends BaseAIProvider {
  constructor(config = {}) {
    super(config);
    this.apiKey = config.apiKey || process.env.GEMINI_API_KEY || process.env.MENTOR_API_KEY;
    this.modelName = config.model || "gemini-2.5-flash";
    this.type = "external";
    
    if (!this.apiKey) {
      console.warn("GeminiProvider: No API key provided");
    }
  }

  getType() {
    return "external";
  }

  getClient() {
    if (!this.apiKey) {
      throw new Error("Gemini API key not configured");
    }
    
    if (!this.client) {
      this.client = new GoogleGenerativeAI(this.apiKey);
    }
    
    return this.client;
  }

  getModel() {
    const client = this.getClient();
    return client.getGenerativeModel({ model: this.modelName });
  }

  async generateText({ prompt, systemPrompt, maxTokens, temperature = 0.7, ...options }) {
    try {
      const model = this.getModel();
      
      const fullPrompt = systemPrompt 
        ? `${systemPrompt}\n\n${prompt}`
        : prompt;
      
      const generationConfig = {
        temperature,
        maxOutputTokens: maxTokens,
      };
      
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
        generationConfig,
        ...options,
      });
      
      const text = result?.response?.text?.() || "";
      
      return {
        success: true,
        data: text,
        metadata: {
          provider: "gemini",
          model: this.modelName,
          tokensUsed: result?.response?.usageMetadata?.totalTokenCount,
        },
      };
    } catch (error) {
      console.error("GeminiProvider error:", error.message);
      return {
        success: false,
        error: error.message,
        metadata: {
          provider: "gemini",
          model: this.modelName,
        },
      };
    }
  }

  async generateStructured({ prompt, systemPrompt, schema, maxTokens, temperature = 0.7, ...options }) {
    try {
      const model = this.getModel();
      
      const fullPrompt = systemPrompt 
        ? `${systemPrompt}\n\n${prompt}`
        : prompt;
      
      // Add JSON output instruction if schema is provided
      if (schema) {
        const schemaInstruction = "\n\nReturn STRICT JSON only. Do not include markdown code blocks.";
        fullPrompt += schemaInstruction;
      }
      
      const generationConfig = {
        temperature,
        maxOutputTokens: maxTokens,
        responseMimeType: "application/json",
      };
      
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
        generationConfig,
        ...options,
      });
      
      const text = result?.response?.text?.() || "";
      
      // Clean markdown if present
      const cleanedText = text.replace(/```json|```/g, "").trim();
      
      let parsedData;
      try {
        parsedData = JSON.parse(cleanedText);
      } catch (parseError) {
        console.error("GeminiProvider JSON parse error:", parseError.message);
        return {
          success: false,
          error: "Failed to parse JSON response",
          rawText: cleanedText,
          metadata: {
            provider: "gemini",
            model: this.modelName,
          },
        };
      }
      
      return {
        success: true,
        data: parsedData,
        metadata: {
          provider: "gemini",
          model: this.modelName,
          tokensUsed: result?.response?.usageMetadata?.totalTokenCount,
        },
      };
    } catch (error) {
      console.error("GeminiProvider structured error:", error.message);
      return {
        success: false,
        error: error.message,
        metadata: {
          provider: "gemini",
          model: this.modelName,
        },
      };
    }
  }

  async healthCheck() {
    const startTime = Date.now();
    
    try {
      if (!this.apiKey) {
        return {
          available: false,
          latency: 0,
          error: "API key not configured",
        };
      }
      
      const model = this.getModel();
      const result = await model.generateContent("Hello");
      
      const latency = Date.now() - startTime;
      
      return {
        available: true,
        latency,
        metadata: {
          provider: "gemini",
          model: this.modelName,
        },
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      return {
        available: false,
        latency,
        error: error.message,
      };
    }
  }
}

export default GeminiProvider;
