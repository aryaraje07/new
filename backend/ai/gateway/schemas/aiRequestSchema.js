/**
 * AI Request Schema
 * 
 * Defines the structure for AI requests through the gateway.
 */

export const AIRequestSchema = {
  // Required fields
  capability: {
    type: "string",
    required: true,
    enum: ["text_generation", "structured_generation", "quiz_generation", "oral_evaluation", "interview_evaluation", "tutor", "grievance"],
    description: "The AI capability being requested",
  },
  
  // Content to process
  content: {
    type: "string",
    required: true,
    description: "The content/prompt to send to the AI provider",
  },
  
  // Classification metadata
  classification: {
    type: "string",
    required: true,
    description: "Data classification (e.g., CATEGORY_A_OPEN_ACCESS, CATEGORY_B_REGISTERED_ACCESS, etc.)",
  },
  
  classificationSource: {
    type: "string",
    required: false,
    default: "UNKNOWN",
    enum: ["MOSPI_GSDD_2026", "SOURCE_AUTHORITY_POLICY", "ORGANIZATION_POLICY", "DOCUMENT_OWNER", "UNKNOWN"],
    description: "Source of the classification",
  },
  
  classificationScheme: {
    type: "string",
    required: false,
    default: "UNKNOWN",
    enum: ["MOSPI_GSDD_2026", "ORGANIZATION_POLICY", "SOURCE_AUTHORITY_POLICY", "DOCUMENT_OWNER", "UNKNOWN"],
    description: "Classification scheme used",
  },
  
  externalAIAllowed: {
    type: "boolean",
    required: false,
    default: false,
    description: "Explicit authorization for external AI processing",
  },
  
  // Provider selection
  preferredProvider: {
    type: "string",
    required: false,
    enum: ["gemini", "groq", "ollama", "auto"],
    default: "auto",
    description: "Preferred AI provider (auto lets gateway decide based on policy)",
  },
  
  // AI parameters
  systemPrompt: {
    type: "string",
    required: false,
    description: "System prompt for the AI",
  },
  
  maxTokens: {
    type: "number",
    required: false,
    description: "Maximum tokens to generate",
  },
  
  temperature: {
    type: "number",
    required: false,
    default: 0.7,
    description: "Temperature for generation",
  },
  
  // Structured output
  schema: {
    type: "object",
    required: false,
    description: "Expected JSON schema for structured output",
  },
  
  // Additional options
  options: {
    type: "object",
    required: false,
    description: "Additional provider-specific options",
  },
  
  // Request metadata
  requestId: {
    type: "string",
    required: false,
    description: "Unique request ID for tracking",
  },
  
  userId: {
    type: "string",
    required: false,
    description: "User ID making the request",
  },
  
  purpose: {
    type: "string",
    required: false,
    description: "Purpose/context of the AI request",
  },
};

export default AIRequestSchema;
