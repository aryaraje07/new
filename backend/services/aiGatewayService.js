import { getGeminiModel } from "../utils/gemini.js";
import { evaluateAIClassification } from "../config/aiPolicy.js";

const AZURE_PROVIDER_MAP = {
  gemini: "gemini",
  google: "gemini",
  groq: "groq",
  openai: "groq",
};

const redactAuditPayload = (payload = {}) => {
  const safe = { ...payload };
  if (safe.content) {
    safe.contentPreview = typeof safe.content === "string"
      ? safe.content.slice(0, 120).replace(/\s+/g, " ")
      : "[non-string content]";
    delete safe.content;
  }
  return safe;
};

export const generateWithAI = async ({
  provider = "gemini",
  purpose = "general",
  content,
  classification,
  externalAIAllowed = false,
  systemPrompt,
  maxTokens,
  requestOptions = {},
} = {}) => {
  const normalizedProvider = AZURE_PROVIDER_MAP[provider?.toLowerCase?.() || provider] || "gemini";
  const policyCheck = evaluateAIClassification({ classification, externalAIAllowed });

  if (!policyCheck.allowed) {
    return {
      success: false,
      allowed: false,
      provider: normalizedProvider,
      purpose,
      classification: policyCheck.classification,
      reason: policyCheck.reason,
      audit: {
        provider: normalizedProvider,
        purpose,
        classification: policyCheck.classification,
      },
    };
  }

  try {
    if (normalizedProvider === "gemini") {
      const model = getGeminiModel();
      const prompt = [
        systemPrompt || `You are assisting with approved educational content for ${purpose}.`,
        typeof content === "string" ? content : JSON.stringify(content),
      ].join("\n\n");

      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: maxTokens ? { maxOutputTokens: maxTokens } : undefined,
        ...requestOptions,
      });

      return {
        success: true,
        allowed: true,
        provider: "gemini",
        purpose,
        classification: policyCheck.classification,
        data: result?.response?.text?.() || "",
        audit: {
          provider: "gemini",
          purpose,
          classification: policyCheck.classification,
          contentLength: typeof content === "string" ? content.length : 0,
        },
      };
    }

    return {
      success: false,
      allowed: false,
      provider: normalizedProvider,
      purpose,
      classification: policyCheck.classification,
      reason: "Provider is not enabled for this gateway yet.",
      audit: { provider: normalizedProvider, purpose, classification: policyCheck.classification },
    };
  } catch (error) {
    return {
      success: false,
      allowed: false,
      provider: normalizedProvider,
      purpose,
      classification: policyCheck.classification,
      reason: error?.message || "External AI generation failed.",
      audit: redactAuditPayload({
        provider: normalizedProvider,
        purpose,
        classification: policyCheck.classification,
      }),
    };
  }
};

export default generateWithAI;
