/**
 * Base AI Provider Interface
 * 
 * All AI providers must implement this interface.
 * This abstraction allows the AI Gateway to route requests to different providers
 * (Gemini, Groq, Ollama, etc.) based on policy and availability.
 */

class BaseAIProvider {
  constructor(config = {}) {
    this.config = config;
    this.providerName = this.constructor.name;
  }

  /**
   * Generate text response
   * @param {Object} params - { prompt, systemPrompt, maxTokens, temperature, ... }
   * @returns {Promise<Object>} - { success, data, error, metadata }
   */
  async generateText(params) {
    throw new Error("generateText must be implemented by subclass");
  }

  /**
   * Generate structured response (JSON)
   * @param {Object} params - { prompt, systemPrompt, schema, maxTokens, ... }
   * @returns {Promise<Object>} - { success, data, error, metadata }
   */
  async generateStructured(params) {
    throw new Error("generateStructured must be implemented by subclass");
  }

  /**
   * Health check for the provider
   * @returns {Promise<Object>} - { available, latency, error }
   */
  async healthCheck() {
    throw new Error("healthCheck must be implemented by subclass");
  }

  /**
   * Get provider name
   * @returns {string}
   */
  getName() {
    return this.providerName;
  }

  /**
   * Get provider type (external | private)
   * @returns {string}
   */
  getType() {
    return "unknown";
  }
}

export default BaseAIProvider;
