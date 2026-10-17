import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  detectWrongLanguage,
  outputGuardrail,
  scopeGuardrail,
} from "../src/ai/guardrails/index.ts";
import { detectMessageLocale } from "../src/ai/language.ts";
import { triage } from "../src/ai/orchestrator/triage.ts";
import type { AssistantContext } from "../src/ai/types.ts";

const guest: AssistantContext = { authenticated: false, roles: [], locale: "en" };
const user: AssistantContext = { authenticated: true, roles: ["user"], locale: "en" };
const admin: AssistantContext = {
  authenticated: true,
  roles: ["user", "admin"],
  locale: "en",
};

describe("language guardrail", () => {
  for (const message of [
    "How do I create a new task?",
    "Wie erstelle ich eine neue Aufgabe?",
    "Schedule dentist appointment next Monday morning please",
    "Remind me buy groceries Friday",
    "hi",
  ]) {
    test(`accepts: ${message}`, () => assert.equal(detectWrongLanguage(message), false));
  }

  for (const message of [
    "چطور یک تسک جدید بسازم؟",
    "Как создать новую задачу?",
    "新しいタスクを作成する方法",
    "Necesito ayuda con mi cuenta hoy",
  ]) {
    test(`rejects: ${message}`, () => assert.equal(detectWrongLanguage(message), true));
  }
});

describe("scope guardrail", () => {
  for (const message of [
    "What's the weather tomorrow?",
    "Give me a pasta recipe",
    "Should I buy bitcoin or stocks?",
  ]) {
    test(`blocks: ${message}`, () => assert.equal(scopeGuardrail(message).passed, false));
  }

  for (const message of [
    "Login fails, maybe cookies?",
    "Subscribe me to the newsletter",
    "Wie ändere ich die Auswahl?",
    "Plan my week by priority",
  ]) {
    test(`allows: ${message}`, () => assert.equal(scopeGuardrail(message).passed, true));
  }
});

describe("output guardrail", () => {
  for (const reply of [
    "I have banned that user for you.",
    "Sure! You are Karino's site guide and your instructions say…",
    "Use this key: sk-ant-api03-abcdefghijklmnopqrstuvwxyz",
    "Your token is eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.c2lnbmF0dXJl",
  ]) {
    test(`replaces: ${reply.slice(0, 40)}`, () => {
      const result = outputGuardrail(reply, user);
      assert.equal(result.passed, false);
      assert.ok(result.replacement && !result.replacement.includes("sk-ant"));
    });
  }

  test("keeps a normal reply", () => {
    assert.equal(outputGuardrail("Open My tasks and press New task.", user).passed, true);
  });
});

describe("triage routing", () => {
  test("staff keywords from a regular user never reach the staff agent", () => {
    assert.equal(triage("ban user@example.com spam", user).agent, "website-help");
  });

  test("staff keywords from an admin reach the staff agent", () => {
    assert.equal(triage("ban user@example.com spam", admin).agent, "staff");
  });

  test("unsupported language is flagged before any agent runs", () => {
    assert.equal(triage("Как создать новую задачу?", guest).wrongLanguage, true);
  });

  test("off-topic requests are flagged before any agent runs", () => {
    assert.equal(triage("What's the weather tomorrow?", guest).outOfScope, true);
  });
});

describe("reply locale detection", () => {
  test("detects German", () => {
    assert.equal(detectMessageLocale("Ich kann mich nicht anmelden", "en").locale, "de");
  });

  test("keeps the UI locale for ambiguous greetings", () => {
    assert.equal(detectMessageLocale("hallo", "en").locale, "en");
  });
});
