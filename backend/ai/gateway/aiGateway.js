import { v4 as uuidv4 } from "uuid";
import { evaluateAIClassification } from "../../config/aiPolicy.js";
import GeminiProvider from "./providers/geminiProvider.js";
import GroqProvider from "./providers/groqProvider.js";
import OllamaProvider from "./providers/ollamaProvider.js";
import LMStudioProvider from "./providers/lmstudioProvider.js";

/**
 * AI Gateway
 *
 * Central gateway for all AI processing requests.
 *
 * Architecture:
 * Application Feature
 *    ↓
 * AI Gateway
 *    ↓
 * MoSPI/Applicable Data Policy
 *    ↓
 * AI Processing Authorization
 *    ↓
 * Provider Selection
 *    ↓
 * External AI (Gemini/Groq) | Private AI (Ollama)
 *    ↓
 * Normalized Response
 *    ↓
 * Application Feature
 *
 * IMPORTANT: The gateway enforces policy BEFORE any provider execution.
 * Classification ≠ automatic AI permission - the gateway makes the final decision.
 *
 * Default-deny: UNKNOWN classification blocks external AI.
 * Restricted data NEVER falls back to external providers.
 */

class AIGateway {
  constructor() {
    this.providers = new Map();
    this.initializeProviders();
  }

  initializeProviders() {
    // Initialize external providers
    this.providers.set("gemini", new GeminiProvider());
    this.providers.set("groq", new GroqProvider());

    // Initialize private provider (optional - may be unavailable)
    this.providers.set("ollama", new OllamaProvider());
    this.providers.set("lmstudio", new LMStudioProvider());
  }

  /**
   * Get provider by name
   */
  getProvider(name) {
    return this.providers.get(name.toLowerCase());
  }

  /**
   * Check if private provider is available
   */
  async isPrivateProviderAvailable(
    providerName = process.env.AI_PRIVATE_PROVIDER || "ollama",
  ) {
    const privateProvider = this.getProvider(providerName);
    if (!privateProvider) return false;

    try {
      const health = await privateProvider.healthCheck();
      return health.available;
    } catch (error) {
      return false;
    }
  }

  /**
   * Redact sensitive content for audit logging
   */
  redactAuditContent(content) {
    if (typeof content !== "string") return "[non-string content]";
    return (
      content.slice(0, 120).replace(/\s+/g, " ") +
      (content.length > 120 ? "..." : "")
    );
  }

  /**
   * Create audit metadata (safe for logging)
   */
  createAuditMetadata(
    request,
    policyDecision,
    provider,
    processingMode,
    latency,
  ) {
    return {
      requestId: request.requestId || uuidv4(),
      capability: request.capability,
      classification: policyDecision.classification,
      classificationSource: policyDecision.classificationSource,
      provider: provider?.getName() || "none",
      processingMode,
      allowed: policyDecision.allowed,
      contentLength:
        typeof request.content === "string" ? request.content.length : 0,
      contentPreview: this.redactAuditContent(request.content),
      latency,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Main gateway method - process AI request
   */
  async processRequest(request) {
    const requestId = request.requestId || uuidv4();
    const startTime = Date.now();

    // Step 1: Evaluate AI policy
    const privateProviderName =
      request.preferredProvider || process.env.AI_PRIVATE_PROVIDER || "ollama";
    const privateProviderAvailable =
      await this.isPrivateProviderAvailable(privateProviderName);

    // console.log("AI GATEWAY DEBUG:", {
    //   classification: request.classification,
    //   classificationSource: request.classificationSource,
    //   externalAIAllowed: request.externalAIAllowed,
    //   preferredProvider: request.preferredProvider,
    //   privateProviderName,
    //   privateProviderAvailable,
    // });

    const policyDecision = evaluateAIClassification({
      classification: request.classification,
      classificationSource: request.classificationSource,
      externalAIAllowed: request.externalAIAllowed,
      privateProviderAvailable,
    });

    // console.log("POLICY DECISION:", policyDecision);

    // Step 2: Check if blocked by policy
    if (
      !policyDecision.allowed ||
      policyDecision.processingMode === "blocked"
    ) {
      const latency = Date.now() - startTime;

      return {
        success: false,
        allowed: false,
        processingMode: "blocked",
        provider: null,
        providerType: null,
        classification: policyDecision.classification,
        classificationSource: policyDecision.classificationSource,
        data: null,
        error: policyDecision.reason,
        reason: policyDecision.reason,
        metadata: {
          requestId,
          capability: request.capability,
          latency,
          timestamp: new Date().toISOString(),
        },
        audit: this.createAuditMetadata(
          request,
          policyDecision,
          null,
          "blocked",
          latency,
        ),
      };
    }

    // Step 3: Select provider based on policy and preference
    const processingMode = policyDecision.processingMode;
    let provider;

    if (processingMode === "private" || request.forcePrivate === true) {
      // Policy requires private processing
      provider = this.getProvider(
        request.preferredProvider ||
          process.env.AI_PRIVATE_PROVIDER ||
          "ollama",
      );

      if (!provider) {
        const latency = Date.now() - startTime;
        return {
          success: false,
          allowed: true,
          processingMode: "blocked",
          provider: null,
          providerType: null,
          classification: policyDecision.classification,
          classificationSource: policyDecision.classificationSource,
          data: null,
          error:
            "PRIVATE_PROVIDER_UNAVAILABLE: Approved private AI provider is not available.",
          reason:
            "Policy requires private processing, but private provider is unavailable.",
          metadata: {
            requestId,
            capability: request.capability,
            latency,
            timestamp: new Date().toISOString(),
          },
          audit: this.createAuditMetadata(
            request,
            policyDecision,
            null,
            "blocked",
            latency,
          ),
        };
      }
    } else if (processingMode === "external") {
      // Policy allows external processing
      const preferredProvider = request.preferredProvider || "auto";

      if (preferredProvider === "auto") {
        // Auto-select: try gemini first, then groq
        provider = this.getProvider("gemini") || this.getProvider("groq");
      } else {
        provider = this.getProvider(preferredProvider);
      }

      if (!provider) {
        const latency = Date.now() - startTime;
        return {
          success: false,
          allowed: true,
          processingMode: "blocked",
          provider: null,
          providerType: null,
          classification: policyDecision.classification,
          classificationSource: policyDecision.classificationSource,
          data: null,
          error:
            "PROVIDER_UNAVAILABLE: Requested AI provider is not available.",
          reason: "External AI provider is not configured or unavailable.",
          metadata: {
            requestId,
            capability: request.capability,
            latency,
            timestamp: new Date().toISOString(),
          },
          audit: this.createAuditMetadata(
            request,
            policyDecision,
            null,
            "blocked",
            latency,
          ),
        };
      }
    }

    // Step 4: Execute provider request
    let providerResult;

    try {
      if (request.schema) {
        // Structured generation
        providerResult = await provider.generateStructured({
          prompt: request.content,
          systemPrompt: request.systemPrompt,
          schema: request.schema,
          maxTokens: request.maxTokens,
          temperature: request.temperature,
          ...request.options,
        });
      } else {
        // Text generation
        providerResult = await provider.generateText({
          prompt: request.content,
          systemPrompt: request.systemPrompt,
          maxTokens: request.maxTokens,
          temperature: request.temperature,
          ...request.options,
        });
      }
    } catch (error) {
      const latency = Date.now() - startTime;

      return {
        success: false,
        allowed: true,
        processingMode,
        provider: provider?.getName(),
        providerType: provider?.getType(),
        classification: policyDecision.classification,
        classificationSource: policyDecision.classificationSource,
        data: null,
        error: error.message,
        reason: `Provider execution failed: ${error.message}`,
        metadata: {
          requestId,
          capability: request.capability,
          latency,
          timestamp: new Date().toISOString(),
        },
        audit: this.createAuditMetadata(
          request,
          policyDecision,
          provider,
          processingMode,
          latency,
        ),
      };
    }

    const latency = Date.now() - startTime;

    // Step 5: Return normalized response
    return {
      success: providerResult.success,
      allowed: true,
      processingMode,
      provider: provider?.getName(),
      providerType: provider?.getType(),
      classification: policyDecision.classification,
      classificationSource: policyDecision.classificationSource,
      data: providerResult.data,
      error: providerResult.error,
      reason: policyDecision.reason,
      metadata: {
        requestId,
        capability: request.capability,
        model: providerResult.metadata?.model,
        tokensUsed: providerResult.metadata?.tokensUsed,
        latency,
        timestamp: new Date().toISOString(),
      },
      audit: this.createAuditMetadata(
        request,
        policyDecision,
        provider,
        processingMode,
        latency,
      ),
    };
  }

  /**
   * Convenience method for text generation
   */
  async generateText(params) {
    return this.processRequest({
      capability: "text_generation",
      ...params,
    });
  }

  /**
   * Convenience method for structured generation
   */
  async generateStructured(params) {
    return this.processRequest({
      capability: "structured_generation",
      ...params,
    });
  }

  /**
   * Health check for all providers
   */
  async healthCheck() {
    const results = {};

    for (const [name, provider] of this.providers.entries()) {
      try {
        results[name] = await provider.healthCheck();
      } catch (error) {
        results[name] = {
          available: false,
          error: error.message,
        };
      }
    }

    return results;
  }
}

// Singleton instance
const aiGateway = new AIGateway();

export default aiGateway;
