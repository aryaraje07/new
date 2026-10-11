import Groq from "groq-sdk";
import BaseAIProvider from "./baseProvider.js";

/**
 * Groq AI Provider
 * 
 * External AI provider using Groq's API.
 * This provider should only be used for content that passes the AI policy check.
 */
class GroqProvider extends BaseAIProvider {
  constructor(config = {}) {
    super(config);
    this.apiKey = config.apiKey || process.env.GROQ_API_KEY;
    this.modelName = config.model || "llama-3.3-70b-versatile";
    this.type = "external";
    
    if (!this.apiKey) {
      console.warn("GroqProvider: No API key provided");
    }
  }

  getType() {
    return "external";
  }

  getClient() {
    if (!this.apiKey) {
      throw new Error("Groq API key not configured");
    }
    
    if (!this.client) {
      this.client = new Groq({ apiKey: this.apiKey });
    }
    
    return this.client;
  }

  async generateText({ prompt, systemPrompt, maxTokens, temperature = 0.7, ...options }) {
    try {
      const client = this.getClient();
      
      const messages = [];
      
      if (systemPrompt) {
        messages.push({ role: "system", content: systemPrompt });
      }
      
      messages.push({ role: "user", content: prompt });
      
      const completion = await client.chat.completions.create({
        model: this.modelName,
        messages,
        temperature,
        max_tokens: maxTokens,
        ...options,
      });
      
      const text = completion?.choices?.[0]?.message?.content || "";
      
      return {
        success: true,
        data: text,
        metadata: {
          provider: "groq",
          model: this.modelName,
          tokensUsed: completion?.usage?.total_tokens,
        },
      };
    } catch (error) {
      console.error("GroqProvider error:", error.message);
      return {
        success: false,
        error: error.message,
        metadata: {
          provider: "groq",
          model: this.modelName,
        },
      };
    }
  }

  async generateStructured({ prompt, systemPrompt, schema, maxTokens, temperature = 0.7, ...options }) {
    try {
      const client = this.getClient();
      
      const messages = [];
      
      if (systemPrompt) {
        messages.push({ role: "system", content: systemPrompt });
      }
      
      // Add JSON output instruction
      const jsonPrompt = schema 
        ? `${prompt}\n\nReturn STRICT JSON only. Do not include markdown code blocks.`
        : prompt;
      
      messages.push({ role: "user", content: jsonPrompt });
      
      const completion = await client.chat.completions.create({
        model: this.modelName,
        messages,
        temperature,
        max_tokens: maxTokens,
        response_format: { type: "json_object" },
        ...options,
      });
      
      const text = completion?.choices?.[0]?.message?.content || "";
      
      // Clean markdown if present
      const cleanedText = text.replace(/```json|```/g, "").trim();
      
      let parsedData;
      try {
        parsedData = JSON.parse(cleanedText);
      } catch (parseError) {
        console.error("GroqProvider JSON parse error:", parseError.message);
        return {
          success: false,
          error: "Failed to parse JSON response",
          rawText: cleanedText,
          metadata: {
            provider: "groq",
            model: this.modelName,
          },
        };
      }
      
      return {
        success: true,
        data: parsedData,
        metadata: {
          provider: "groq",
          model: this.modelName,
          tokensUsed: completion?.usage?.total_tokens,
        },
      };
    } catch (error) {
      console.error("GroqProvider structured error:", error.message);
      return {
        success: false,
        error: error.message,
        metadata: {
          provider: "groq",
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
      
      const client = this.getClient();
      await client.chat.completions.create({
        model: this.modelName,
        messages: [{ role: "user", content: "Hello" }],
        max_tokens: 10,
      });
      
      const latency = Date.now() - startTime;
      
      return {
        available: true,
        latency,
        metadata: {
          provider: "groq",
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

export default GroqProvider;
