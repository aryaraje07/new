import assert from "node:assert/strict";
import test from "node:test";
import { evaluateAIClassification, normalizeClassification } from "../../config/aiPolicy.js";

test("Category A + allowed policy → external processing permitted", () => {
  const result = evaluateAIClassification({
    classification: "CATEGORY_A_OPEN_ACCESS",
    classificationSource: "MOSPI_GSDD_2026",
    externalAIAllowed: true,
    privateProviderAvailable: false,
  });
  
  assert.equal(result.allowed, true);
  assert.equal(result.processingMode, "external");
  assert.equal(result.classification, "CATEGORY_A_OPEN_ACCESS");
});

test("Category A + organization policy blocks external AI → blocked/private", () => {
  const result = evaluateAIClassification({
    classification: "CATEGORY_A_OPEN_ACCESS",
    classificationSource: "ORGANIZATION_POLICY",
    externalAIAllowed: false,
    privateProviderAvailable: true,
  });
  
  assert.equal(result.allowed, true);
  assert.equal(result.processingMode, "private");
});

test("Category B + externalAIAllowed false → blocked", () => {
  const result = evaluateAIClassification({
    classification: "CATEGORY_B_REGISTERED_ACCESS",
    classificationSource: "MOSPI_GSDD_2026",
    externalAIAllowed: false,
    privateProviderAvailable: false,
  });
  
  assert.equal(result.allowed, false);
  assert.equal(result.processingMode, "blocked");
});

test("Category B + explicit authorized external processing → allowed according to configured policy", () => {
  const result = evaluateAIClassification({
    classification: "CATEGORY_B_REGISTERED_ACCESS",
    classificationSource: "MOSPI_GSDD_2026",
    externalAIAllowed: true,
    privateProviderAvailable: false,
  });
  
  assert.equal(result.allowed, true);
  assert.equal(result.processingMode, "external");
});

test("Category C → external blocked", () => {
  const result = evaluateAIClassification({
    classification: "CATEGORY_C_RESTRICTED_ACCESS",
    classificationSource: "MOSPI_GSDD_2026",
    externalAIAllowed: false,
    privateProviderAvailable: false,
  });
  
  assert.equal(result.allowed, false);
  assert.equal(result.processingMode, "blocked");
});

test("Non-Shareable → external blocked", () => {
  const result = evaluateAIClassification({
    classification: "NON_SHAREABLE",
    classificationSource: "MOSPI_GSDD_2026",
    externalAIAllowed: false,
    privateProviderAvailable: false,
  });
  
  assert.equal(result.allowed, false);
  assert.equal(result.processingMode, "blocked");
});

test("Unknown → external blocked", () => {
  const result = evaluateAIClassification({
    classification: "UNKNOWN",
    classificationSource: "UNKNOWN",
    externalAIAllowed: false,
    privateProviderAvailable: false,
  });
  
  assert.equal(result.allowed, false);
  assert.equal(result.processingMode, "blocked");
  assert.ok(result.reason.includes("EXTERNAL_AI_NOT_AUTHORIZED"));
});

test("Category C + approved private provider → private processing", () => {
  const result = evaluateAIClassification({
    classification: "CATEGORY_C_RESTRICTED_ACCESS",
    classificationSource: "MOSPI_GSDD_2026",
    externalAIAllowed: false,
    privateProviderAvailable: true,
  });
  
  assert.equal(result.allowed, true);
  assert.equal(result.processingMode, "private");
});

test("Category C + private provider unavailable → blocked", () => {
  const result = evaluateAIClassification({
    classification: "CATEGORY_C_RESTRICTED_ACCESS",
    classificationSource: "MOSPI_GSDD_2026",
    externalAIAllowed: false,
    privateProviderAvailable: false,
  });
  
  assert.equal(result.allowed, false);
  assert.equal(result.processingMode, "blocked");
});

test("Category C + private provider unavailable → MUST NOT call Gemini/Groq", () => {
  const result = evaluateAIClassification({
    classification: "CATEGORY_C_RESTRICTED_ACCESS",
    classificationSource: "MOSPI_GSDD_2026",
    externalAIAllowed: false,
    privateProviderAvailable: false,
  });
  
  assert.equal(result.allowed, false);
  assert.equal(result.processingMode, "blocked");
  assert.notEqual(result.processingMode, "external");
});

test("Invalid classification value → reject request", () => {
  const result = evaluateAIClassification({
    classification: "INVALID_CLASSIFICATION",
    classificationSource: "UNKNOWN",
    externalAIAllowed: false,
    privateProviderAvailable: false,
  });
  
  assert.equal(result.allowed, false);
  assert.equal(result.processingMode, "blocked");
});

test("Missing classification source → default to safe/blocked behavior", () => {
  const result = evaluateAIClassification({
    classification: "CATEGORY_B_REGISTERED_ACCESS",
    classificationSource: undefined,
    externalAIAllowed: false,
    privateProviderAvailable: false,
  });
  
  assert.equal(result.allowed, false);
  assert.equal(result.processingMode, "blocked");
});

test("normalizeClassification handles MoSPI categories", () => {
  assert.equal(normalizeClassification("CATEGORY_A"), "CATEGORY_A_OPEN_ACCESS");
  assert.equal(normalizeClassification("CATEGORY_B"), "CATEGORY_B_REGISTERED_ACCESS");
  assert.equal(normalizeClassification("CATEGORY_C"), "CATEGORY_C_RESTRICTED_ACCESS");
  assert.equal(normalizeClassification("OPEN_ACCESS"), "CATEGORY_A_OPEN_ACCESS");
  assert.equal(normalizeClassification("REGISTERED_ACCESS"), "CATEGORY_B_REGISTERED_ACCESS");
  assert.equal(normalizeClassification("RESTRICTED_ACCESS"), "CATEGORY_C_RESTRICTED_ACCESS");
});

test("normalizeClassification handles legacy categories", () => {
  assert.equal(normalizeClassification("OPEN"), "PUBLIC");
  assert.equal(normalizeClassification("NONE"), "UNCLASSIFIED");
});

test("normalizeClassification defaults to UNKNOWN for invalid values", () => {
  assert.equal(normalizeClassification("INVALID"), "UNKNOWN");
  assert.equal(normalizeClassification(""), "UNKNOWN");
  assert.equal(normalizeClassification(null), "UNKNOWN");
  assert.equal(normalizeClassification(undefined), "UNKNOWN");
});

test("Non-Shareable with private provider available → private processing", () => {
  const result = evaluateAIClassification({
    classification: "NON_SHAREABLE",
    classificationSource: "MOSPI_GSDD_2026",
    externalAIAllowed: false,
    privateProviderAvailable: true,
  });
  
  assert.equal(result.allowed, true);
  assert.equal(result.processingMode, "private");
});

test("Legacy PUBLIC classification → external allowed", () => {
  const result = evaluateAIClassification({
    classification: "PUBLIC",
    classificationSource: "ORGANIZATION_POLICY",
    externalAIAllowed: false,
    privateProviderAvailable: false,
  });
  
  assert.equal(result.allowed, true);
  assert.equal(result.processingMode, "external");
});

test("Legacy RESTRICTED classification → external blocked", () => {
  const result = evaluateAIClassification({
    classification: "RESTRICTED",
    classificationSource: "ORGANIZATION_POLICY",
    externalAIAllowed: false,
    privateProviderAvailable: false,
  });
  
  assert.equal(result.allowed, false);
  assert.equal(result.processingMode, "blocked");
});
