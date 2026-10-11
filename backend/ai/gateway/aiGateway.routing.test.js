import assert from "node:assert/strict";
import test from "node:test";
import aiGateway from "./aiGateway.js";

const makeStructuredResult = () => ({
  success: true,
  data: { questions: [{ question: "Q", options: ["A", "B", "C", "D"], correct: 0 }] },
  metadata: { model: "qwen3:8b" },
});

const privateProviderName = () => process.env.AI_PRIVATE_PROVIDER || "ollama";

test("Category C routes only to the private provider", async () => {
  const privateProvider = aiGateway.getProvider(privateProviderName());
  const gemini = aiGateway.getProvider("gemini");
  const groq = aiGateway.getProvider("groq");
  const originalHealth = privateProvider.healthCheck;
  const originalGenerate = privateProvider.generateStructured;
  const originalGemini = gemini.generateStructured;
  const originalGroq = groq.generateStructured;
  let privateCalls = 0;
  let externalCalls = 0;

  privateProvider.healthCheck = async () => ({ available: true });
  privateProvider.generateStructured = async () => {
    privateCalls += 1;
    return makeStructuredResult();
  };
  gemini.generateStructured = async () => { externalCalls += 1; throw new Error("Gemini must not be called"); };
  groq.generateStructured = async () => { externalCalls += 1; throw new Error("Groq must not be called"); };

  try {
    const result = await aiGateway.generateStructured({
      content: "restricted material",
      classification: "CATEGORY_C_RESTRICTED_ACCESS",
      classificationSource: "MOSPI_GSDD_2026",
      externalAIAllowed: false,
      schema: { questions: "array" },
    });

    assert.equal(result.success, true);
    assert.equal(result.processingMode, "private");
    assert.equal(result.provider, privateProvider.getName());
    assert.equal(privateCalls, 1);
    assert.equal(externalCalls, 0);
  } finally {
    privateProvider.healthCheck = originalHealth;
    privateProvider.generateStructured = originalGenerate;
    gemini.generateStructured = originalGemini;
    groq.generateStructured = originalGroq;
  }
});

test("Category C with unavailable private provider blocks without external fallback", async () => {
  const privateProvider = aiGateway.getProvider(privateProviderName());
  const gemini = aiGateway.getProvider("gemini");
  const groq = aiGateway.getProvider("groq");
  const originalHealth = privateProvider.healthCheck;
  const originalGemini = gemini.generateStructured;
  const originalGroq = groq.generateStructured;
  let externalCalls = 0;

  privateProvider.healthCheck = async () => ({ available: false });
  gemini.generateStructured = async () => { externalCalls += 1; return makeStructuredResult(); };
  groq.generateStructured = async () => { externalCalls += 1; return makeStructuredResult(); };

  try {
    const result = await aiGateway.generateStructured({
      content: "restricted material",
      classification: "CATEGORY_C_RESTRICTED_ACCESS",
      classificationSource: "MOSPI_GSDD_2026",
      externalAIAllowed: false,
      schema: { questions: "array" },
    });

    assert.equal(result.success, false);
    assert.equal(result.processingMode, "blocked");
    assert.match(result.error, /PRIVATE_PROVIDER_UNAVAILABLE/);
    assert.equal(externalCalls, 0);
  } finally {
    privateProvider.healthCheck = originalHealth;
    gemini.generateStructured = originalGemini;
    groq.generateStructured = originalGroq;
  }
});

test("Non-Shareable routes only to the private provider", async () => {
  const privateProvider = aiGateway.getProvider(privateProviderName());
  const gemini = aiGateway.getProvider("gemini");
  const groq = aiGateway.getProvider("groq");
  const originalHealth = privateProvider.healthCheck;
  const originalGenerate = privateProvider.generateStructured;
  const originalGemini = gemini.generateStructured;
  const originalGroq = groq.generateStructured;
  let privateCalls = 0;
  let externalCalls = 0;

  privateProvider.healthCheck = async () => ({ available: true });
  privateProvider.generateStructured = async () => {
    privateCalls += 1;
    return makeStructuredResult();
  };
  gemini.generateStructured = async () => { externalCalls += 1; return makeStructuredResult(); };
  groq.generateStructured = async () => { externalCalls += 1; return makeStructuredResult(); };

  try {
    const result = await aiGateway.generateStructured({
      content: "non-shareable material",
      classification: "NON_SHAREABLE",
      classificationSource: "DOCUMENT_OWNER",
      externalAIAllowed: true,
      schema: { questions: "array" },
    });

    assert.equal(result.success, true);
    assert.equal(result.processingMode, "private");
    assert.equal(privateCalls, 1);
    assert.equal(externalCalls, 0);
  } finally {
    privateProvider.healthCheck = originalHealth;
    privateProvider.generateStructured = originalGenerate;
    gemini.generateStructured = originalGemini;
    groq.generateStructured = originalGroq;
  }
});

test("Unknown classification remains blocked without provider calls", async () => {
  const result = await aiGateway.generateStructured({
    content: "unclassified material",
    classification: "UNKNOWN",
    classificationSource: "UNKNOWN",
    externalAIAllowed: false,
    schema: { questions: "array" },
  });

  assert.equal(result.success, false);
  assert.equal(result.processingMode, "blocked");
  assert.match(result.error, /EXTERNAL_AI_NOT_AUTHORIZED/);
});
