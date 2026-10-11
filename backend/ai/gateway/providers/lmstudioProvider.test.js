import assert from "node:assert/strict";
import test from "node:test";
import LMStudioProvider from "./lmstudioProvider.js";

test("LM Studio health check detects the configured model", async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => new Response(JSON.stringify({ data: [{ id: "qwen-test" }] }), { status: 200 });
  try {
    const result = await new LMStudioProvider({ baseUrl: "http://lmstudio.test/v1", model: "qwen-test" }).healthCheck();
    assert.equal(result.available, true);
  } finally {
    global.fetch = originalFetch;
  }
});

test("LM Studio structured generation rejects malformed JSON", async () => {
  const originalFetch = global.fetch;
  global.fetch = async (url) => new Response(JSON.stringify(
    url.endsWith("/models") ? { data: [{ id: "qwen-test" }] } : { choices: [{ message: { content: "not-json" } }] },
  ), { status: 200 });
  try {
    const result = await new LMStudioProvider({ baseUrl: "http://lmstudio.test/v1", model: "qwen-test" }).generateStructured({ prompt: "Return JSON", schema: { questions: "array" } });
    assert.equal(result.success, false);
  } finally {
    global.fetch = originalFetch;
  }
});