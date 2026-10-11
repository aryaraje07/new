/**
 * AI Response Schema
 * 
 * Defines the structure for AI responses from the gateway.
 */

export const AIResponseSchema = {
  // Success status
  success: {
    type: "boolean",
    required: true,
    description: "Whether the request was successful",
  },
  
  // Policy decision
  allowed: {
    type: "boolean",
    required: true,
    description: "Whether the request was allowed by policy",
  },
  
  processingMode: {
    type: "string",
    required: true,
    enum: ["external", "private", "blocked"],
    description: "Processing mode used (external, private, or blocked)",
  },
  
  // Provider information
  provider: {
    type: "string",
    required: false,
    description: "AI provider used (gemini, groq, ollama)",
  },
  
  providerType: {
    type: "string",
    required: false,
    enum: ["external", "private"],
    description: "Provider type (external or private)",
  },
  
  // Classification information
  classification: {
    type: "string",
    required: true,
    description: "Data classification used for policy decision",
  },
  
  classificationSource: {
    type: "string",
    required: true,
    description: "Source of the classification",
  },
  
  // Response data
  data: {
    type: "any",
    required: false,
    description: "Generated content/data from the AI provider",
  },
  
  // Error information
  error: {
    type: "string",
    required: false,
    description: "Error message if the request failed",
  },
  
  // Policy reason
  reason: {
    type: "string",
    required: true,
    description: "Reason for the policy decision",
  },
  
  // Metadata
  metadata: {
    type: "object",
    required: false,
    description: "Additional metadata about the request/response",
    properties: {
      requestId: "string",
      capability: "string",
      model: "string",
      tokensUsed: "number",
      latency: "number",
      timestamp: "string",
    },
  },
  
  // Audit information (safe for logging)
  audit: {
    type: "object",
    required: false,
    description: "Safe audit metadata (does not include sensitive content)",
    properties: {
      requestId: "string",
      capability: "string",
      classification: "string",
      classificationSource: "string",
      provider: "string",
      processingMode: "string",
      allowed: "boolean",
      contentLength: "number",
      latency: "number",
      timestamp: "string",
    },
  },
};

export default AIResponseSchema;
