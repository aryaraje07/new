import BaseAIProvider from "./baseProvider.js";

class LMStudioProvider extends BaseAIProvider {
  constructor(config = {}) {
    super(config);
    this.baseUrl = (config.baseUrl || process.env.LMSTUDIO_BASE_URL || "http://localhost:1234/v1").replace(/\/$/, "");
    this.modelName = config.model || process.env.LMSTUDIO_MODEL || "";
    this.type = "private";
  }

  getType() {
    return "private";
  }

  async request(path, payload, method = "POST") {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      ...(payload ? { body: JSON.stringify(payload) } : {}),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`LM Studio API error: ${response.status}${detail ? `: ${detail.slice(0, 200)}` : ""}`);
    }

    const data = await response.json();
    if (!data || typeof data !== "object") throw new Error("LM Studio returned a malformed response");
    return data;
  }

  async getModels() {
    const response = await this.request("/models", null, "GET");
    return Array.isArray(response.data) ? response.data : [];
  }

  async resolveModel() {
    const models = await this.getModels();
    const configured = this.modelName && models.find((model) => model.id === this.modelName);
    const selected = configured || (!this.modelName && models[0]);
    if (!selected) {
      throw new Error("PRIVATE_PROVIDER_UNAVAILABLE: No LM Studio model is available.");
    }
    if (!this.modelName) this.modelName = selected.id;
    return this.modelName;
  }

  buildMessages(prompt, systemPrompt) {
    return [
      ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
      { role: "user", content: prompt },
    ];
  }

  async generateText({ prompt, systemPrompt, maxTokens, temperature = 0.7, ...options }) {
    try {
      const model = await this.resolveModel();
      const response = await this.request("/chat/completions", {
        model,
        messages: this.buildMessages(prompt, systemPrompt),
        temperature,
        ...(maxTokens ? { max_tokens: maxTokens } : {}),
        ...options,
      });
      const text = response?.choices?.[0]?.message?.content;
      if (typeof text !== "string") throw new Error("LM Studio returned no text content");
      return { success: true, data: text, metadata: { provider: "lmstudio", model, tokensUsed: response.usage?.total_tokens } };
    } catch (error) {
      return { success: false, error: error.message, metadata: { provider: "lmstudio", model: this.modelName || undefined } };
    }
  }

  async generateStructured({ prompt, systemPrompt, schema, maxTokens, temperature = 0.7, ...options }) {
    try {
      const model = await this.resolveModel();
      const schemaInstruction = schema
        ? "\nReturn only valid JSON matching the requested schema. Do not include markdown or commentary."
        : "";
      const response = await this.request("/chat/completions", {
        model,
        messages: this.buildMessages(`${prompt}${schemaInstruction}`, systemPrompt),
        temperature,
        ...(maxTokens ? { max_tokens: maxTokens } : {}),
        response_format: { type: "json_object" },
        ...options,
      });
      const text = response?.choices?.[0]?.message?.content;
      if (typeof text !== "string") throw new Error("LM Studio returned no structured content");
      const data = JSON.parse(text.replace(/```json|```/g, "").trim());
      if (!data || typeof data !== "object") throw new Error("LM Studio returned malformed JSON");
      return { success: true, data, metadata: { provider: "lmstudio", model, tokensUsed: response.usage?.total_tokens } };
    } catch (error) {
      return { success: false, error: error.message, metadata: { provider: "lmstudio", model: this.modelName || undefined } };
    }
  }

  async healthCheck() {
    const startTime = Date.now();
    try {
      const models = await this.getModels();
      const modelAvailable = models.some((model) => model.id === this.modelName) || (!this.modelName && models.length > 0);
      return {
        available: modelAvailable,
        latency: Date.now() - startTime,
        error: modelAvailable ? null : "PRIVATE_PROVIDER_UNAVAILABLE: Configured LM Studio model is not available.",
        metadata: { provider: "lmstudio", model: this.modelName || models[0]?.id, availableModels: models.map((model) => model.id) },
      };
    } catch (error) {
      return { available: false, latency: Date.now() - startTime, error: `PRIVATE_PROVIDER_UNAVAILABLE: ${error.message}`, metadata: { provider: "lmstudio", model: this.modelName || undefined } };
    }
  }
}

export default LMStudioProvider;