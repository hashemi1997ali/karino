import { getPositiveIntegerEnv, isStaffRoles, isSuperAdminRoles } from "#utils";

export type AssistantAgent =
  "site-guide" | "account-helper" | "support-triage" | "staff-operations";

export interface AssistantHistoryMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AssistantContext {
  roles: readonly string[];
  authenticated: boolean;
  locale: "en" | "de";
}

export interface AssistantResult {
  reply: string;
  agent: AssistantAgent;
  provider: string;
}

const normalizeSecret = (value: string | undefined): string | null => {
  const normalized = value?.trim();
  if (!normalized || /replace|your_.*key|example/i.test(normalized)) return null;
  return normalized;
};

const pickAgent = (message: string, roles: readonly string[]): AssistantAgent => {
  const normalized = message.toLowerCase();

  if (
    isStaffRoles(roles) &&
    /\b(ban|unban|admin|role|promote|demote|user|account lookup)\b/.test(normalized)
  ) {
    return "staff-operations";
  }

  if (/\b(human|support|agent|representative|ticket|problem|issue)\b/.test(normalized)) {
    return "support-triage";
  }

  if (
    /\b(login|log in|register|password|email|session|device|account|profile)\b/.test(
      normalized,
    )
  ) {
    return "account-helper";
  }

  return "site-guide";
};

const commandsForRoles = (roles: readonly string[]): string => {
  if (!isStaffRoles(roles)) return "";

  const commands = [
    "/ban email reason — ban an allowed account",
    "/unban email — remove a ban",
  ];

  if (isSuperAdminRoles(roles)) {
    commands.push(
      "/promote email — grant the admin role",
      "/demote email — remove the admin role",
    );
  }

  return `\nStaff commands are deliberately explicit and are executed only when the message starts with one of these commands:\n${commands.join("\n")}`;
};

const createSystemPrompt = (
  agent: AssistantAgent,
  context: AssistantContext,
): string => `You are Karino's ${agent} agent inside a task-management website.
Be concise, practical, and honest. Never claim an account action happened unless the application reports a successful command result.
The website supports registration, login, personal tasks, task attachments, profile updates, password changes, active-session management, English/German UI, themes, and administrator task/user management.
Regular users can only access their own tasks and account. Admins and super admins can access all tasks and user profiles. Only super admins may grant or remove the admin role. Admins may manage regular-user bans; super admins may also manage admin bans. Nobody may ban a super admin.
Authenticated: ${context.authenticated}. Roles: ${context.roles.join(", ") || "guest"}. Reply language: ${context.locale === "de" ? "German" : "English"}.
For a guest who needs account-specific help or human support, explain that signing in is required. For an authenticated regular user who needs a human, tell them to use the support button. For an admin, human escalation goes only to a super admin. Super admins do not need a support escalation path.${commandsForRoles(context.roles)}`;

const fallbackReply = (agent: AssistantAgent, context: AssistantContext): string => {
  const de = context.locale === "de";

  if (agent === "staff-operations") {
    const base = de
      ? "Ich kann Benutzer- und Rollenaktionen über eindeutige Befehle ausführen."
      : "I can perform user and role actions through explicit commands.";
    return `${base}${commandsForRoles(context.roles)}`;
  }

  if (agent === "account-helper") {
    return de
      ? "Kontodaten, Passwort und aktive Sitzungen findest du unter „Konto“. Wenn du nicht angemeldet bist, melde dich zuerst an; kontospezifische Änderungen kann ich für Gäste nicht durchführen."
      : "You can manage profile details, password, and active sessions from Account. Sign in first for account-specific help; I cannot change a guest account.";
  }

  if (agent === "support-triage") {
    if (!context.authenticated) {
      return de
        ? "Für eine persönliche Support-Anfrage musst du dich zuerst anmelden. Allgemeine Fragen zur Website kann ich direkt beantworten."
        : "Sign in before opening a personal support request. I can still answer general questions about the website here.";
    }

    if (isSuperAdminRoles(context.roles)) {
      return de
        ? "Als Super-Admin kannst du Benutzer- und Supportfälle direkt im Support-Bereich verwalten."
        : "As a super admin, you can manage user and support cases directly from the Support area.";
    }

    return de
      ? "Ich versuche das zuerst selbst zu lösen. Falls du weiterhin einen Menschen brauchst, kannst du diese Unterhaltung an den Support weitergeben."
      : "I will try to solve it first. If you still need a person, you can escalate this conversation to support.";
  }

  return de
    ? "Karino hilft dir, Aufgaben zu erstellen, zu filtern und abzuschließen. Im Konto verwaltest du Profil, Passwort und aktive Geräte; Administratoren haben zusätzlich Benutzer- und Aufgabenverwaltung."
    : "Karino lets you create, filter, and complete tasks. Account contains profile, password, and active-device controls; administrators also get user and all-task management.";
};

interface OpenAiLikeResponse {
  choices?: Array<{ message?: { content?: string | null } }>;
}

const fetchWithTimeout = async (url: string, init: RequestInit): Promise<Response> => {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    getPositiveIntegerEnv("AI_TIMEOUT_MS", 25_000),
  );

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

const callOpenAiCompatible = async (
  endpoint: string,
  apiKey: string,
  model: string,
  systemPrompt: string,
  history: AssistantHistoryMessage[],
  message: string,
  extraHeaders: Record<string, string> = {},
): Promise<string> => {
  const response = await fetchWithTimeout(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...extraHeaders,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        ...history.slice(-16),
        { role: "user", content: message },
      ],
      temperature: 0.2,
      max_tokens: 700,
    }),
  });

  if (!response.ok) {
    throw new Error(`AI provider returned ${response.status}`);
  }

  const payload = (await response.json()) as OpenAiLikeResponse;
  const text = payload.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("AI provider returned an empty response");
  return text;
};

const callAnthropic = async (
  apiKey: string,
  model: string,
  systemPrompt: string,
  history: AssistantHistoryMessage[],
  message: string,
): Promise<string> => {
  const response = await fetchWithTimeout("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      system: systemPrompt,
      max_tokens: 700,
      temperature: 0.2,
      messages: [...history.slice(-16), { role: "user", content: message }],
    }),
  });

  if (!response.ok) throw new Error(`Anthropic returned ${response.status}`);
  const payload = (await response.json()) as {
    content?: Array<{ type?: string; text?: string }>;
  };
  const text = payload.content
    ?.filter((item) => item.type === "text")
    .map((item) => item.text ?? "")
    .join("\n")
    .trim();
  if (!text) throw new Error("Anthropic returned an empty response");
  return text;
};

const callGemini = async (
  apiKey: string,
  model: string,
  systemPrompt: string,
  history: AssistantHistoryMessage[],
  message: string,
): Promise<string> => {
  const contents = [
    ...history.slice(-16),
    { role: "user" as const, content: message },
  ].map((item) => ({
    role: item.role === "assistant" ? "model" : "user",
    parts: [{ text: item.content }],
  }));
  const response = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { temperature: 0.2, maxOutputTokens: 700 },
      }),
    },
  );

  if (!response.ok) throw new Error(`Gemini returned ${response.status}`);
  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = payload.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("\n")
    .trim();
  if (!text) throw new Error("Gemini returned an empty response");
  return text;
};

const callOllama = async (
  model: string,
  systemPrompt: string,
  history: AssistantHistoryMessage[],
  message: string,
): Promise<string> => {
  const baseUrl = (process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434").replace(
    /\/$/,
    "",
  );
  const response = await fetchWithTimeout(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      stream: false,
      messages: [
        { role: "system", content: systemPrompt },
        ...history.slice(-16),
        { role: "user", content: message },
      ],
      options: { temperature: 0.2 },
    }),
  });

  if (!response.ok) throw new Error(`Ollama returned ${response.status}`);
  const payload = (await response.json()) as { message?: { content?: string } };
  const text = payload.message?.content?.trim();
  if (!text) throw new Error("Ollama returned an empty response");
  return text;
};

export const runAssistant = async (
  message: string,
  history: AssistantHistoryMessage[],
  context: AssistantContext,
): Promise<AssistantResult> => {
  const agent = pickAgent(message, context.roles);
  const provider = (process.env.AI_PROVIDER ?? "none").trim().toLowerCase();
  const systemPrompt = createSystemPrompt(agent, context);

  try {
    if (provider === "openrouter") {
      const key = normalizeSecret(process.env.OPENROUTER_API_KEY);
      if (!key) throw new Error("OPENROUTER_API_KEY is missing");
      const reply = await callOpenAiCompatible(
        "https://openrouter.ai/api/v1/chat/completions",
        key,
        process.env.OPENROUTER_MODEL ?? "openai/gpt-oss-20b:free",
        systemPrompt,
        history,
        message,
        {
          ...(process.env.APP_URL && { "HTTP-Referer": process.env.APP_URL }),
          "X-OpenRouter-Title": process.env.AI_APP_NAME ?? "Karino Task Manager",
        },
      );
      return { reply, agent, provider };
    }

    if (provider === "openai") {
      const key = normalizeSecret(process.env.OPENAI_API_KEY);
      if (!key) throw new Error("OPENAI_API_KEY is missing");
      const reply = await callOpenAiCompatible(
        "https://api.openai.com/v1/chat/completions",
        key,
        process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
        systemPrompt,
        history,
        message,
      );
      return { reply, agent, provider };
    }

    if (provider === "anthropic") {
      const key = normalizeSecret(process.env.ANTHROPIC_API_KEY);
      if (!key) throw new Error("ANTHROPIC_API_KEY is missing");
      const reply = await callAnthropic(
        key,
        process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5",
        systemPrompt,
        history,
        message,
      );
      return { reply, agent, provider };
    }

    if (provider === "gemini") {
      const key = normalizeSecret(process.env.GEMINI_API_KEY);
      if (!key) throw new Error("GEMINI_API_KEY is missing");
      const reply = await callGemini(
        key,
        process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
        systemPrompt,
        history,
        message,
      );
      return { reply, agent, provider };
    }

    if (provider === "ollama") {
      const reply = await callOllama(
        process.env.OLLAMA_MODEL ?? "qwen3:4b",
        systemPrompt,
        history,
        message,
      );
      return { reply, agent, provider };
    }
  } catch (error) {
    console.error(`AI provider ${provider} failed:`, error);
  }

  return { reply: fallbackReply(agent, context), agent, provider: "fallback" };
};

export const createReplySuggestions = async (
  transcript: AssistantHistoryMessage[],
  context: AssistantContext,
): Promise<string[]> => {
  const prompt =
    "Create exactly three short support-agent reply suggestions for the latest user message. Put each suggestion on its own line without numbering.";
  const result = await runAssistant(prompt, transcript, context);
  const suggestions = result.reply
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*\d.)\s]+/, "").trim())
    .filter(Boolean)
    .slice(0, 3);

  if (suggestions.length === 3) return suggestions;

  return context.locale === "de"
    ? [
        "Danke für die Details. Ich prüfe das jetzt für dich.",
        "Kannst du den letzten Schritt vor dem Problem genauer beschreiben?",
        "Ich habe den Fall verstanden und erkläre dir gleich die nächsten Schritte.",
      ]
    : [
        "Thanks for the details. I am checking this for you now.",
        "Could you describe the last step before the problem appeared?",
        "I understand the case and will explain the next steps now.",
      ];
};
