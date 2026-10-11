import assert from "node:assert/strict";
import test from "node:test";
import OllamaProvider from "./ollamaProvider.js";

test("Ollama health check requires the configured model", async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => new Response(JSON.stringify({ models: [{ name: "qwen3:4b" }] }), { status: 200 });

  try {
    const result = await new OllamaProvider({ baseUrl: "http://ollama.test", model: "qwen3:8b" }).healthCheck();
    assert.equal(result.available, false);
    assert.match(result.error, /qwen3:8b/);
  } finally {
    global.fetch = originalFetch;
  }
});

test("Ollama structured generation rejects malformed model output", async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => new Response(JSON.stringify({ message: { content: "not json" } }), { status: 200 });

  try {
    const result = await new OllamaProvider({ baseUrl: "http://ollama.test", model: "qwen3:8b" }).generateStructured({
      prompt: "Return questions",
      schema: { questions: "array" },
    });
    assert.equal(result.success, false);
    assert.equal(result.error, "Failed to parse JSON response");
  } finally {
    global.fetch = originalFetch;
  }
});
