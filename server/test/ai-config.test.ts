import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

import { getAiConfig } from "../src/ai/providers/openai-compatible.ts";
import { getConfiguredProviderName } from "../src/ai/providers/index.ts";

beforeEach(() => {
  delete process.env.AI_BASE_URL;
  delete process.env.AI_API_KEY;
  delete process.env.AI_MODEL;
});

test("the assistant is disabled until a base URL and a model are set", () => {
  assert.equal(getAiConfig(), null);
  process.env.AI_BASE_URL = "https://api.groq.com/openai/v1";
  assert.equal(getAiConfig(), null);
  assert.equal(getConfiguredProviderName(), "none");
});

test("normalises the base URL and reports the provider host", () => {
  process.env.AI_BASE_URL = "https://api.groq.com/openai/v1/";
  process.env.AI_MODEL = "openai/gpt-oss-120b";
  process.env.AI_API_KEY = " gsk_test ";

  assert.deepEqual(getAiConfig(), {
    baseUrl: "https://api.groq.com/openai/v1",
    model: "openai/gpt-oss-120b",
    apiKey: "gsk_test",
  });
  assert.equal(getConfiguredProviderName(), "api.groq.com");
});

test("a local Ollama endpoint works without a key", () => {
  process.env.AI_BASE_URL = "http://127.0.0.1:11434/v1";
  process.env.AI_MODEL = "qwen3:4b";
  assert.equal(getAiConfig()?.apiKey, null);
});

test("the task assistant reads times in the user's time zone", async () => {
  const { describeLocalTime } = await import("../src/ai/agents/taskAgent.ts");
  const summer = new Date("2026-07-01T12:00:00Z");
  const winter = new Date("2026-01-15T12:00:00Z");

  assert.equal(describeLocalTime("Europe/Berlin", summer).offset, "+02:00");
  assert.equal(describeLocalTime("Europe/Berlin", winter).offset, "+01:00");
  assert.equal(describeLocalTime("Asia/Tehran", winter).offset, "+03:30");
  // Unknown or missing zones fall back to UTC instead of failing.
  assert.deepEqual(
    [
      describeLocalTime("Mars/Olympus", summer).zone,
      describeLocalTime(undefined, summer).offset,
    ],
    ["UTC", "+00:00"],
  );
});
