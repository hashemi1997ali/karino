import { outputGuardrail } from "../guardrails/index.ts";
import { isStronglyMixedLanguage } from "../language.ts";
import { runProviders } from "../providers/index.ts";
import type {
  AssistantContext,
  AssistantHistoryMessage,
  TaskAssistantResult,
  TaskContextItem,
  TaskProposalDraft,
} from "../types.ts";
import { OFFLINE_PROVIDER } from "./base.ts";

const CREATE_INTENT =
  /\b(create|add|make|set up|new)\s+(?:me\s+)?(?:a\s+)?task\b|\btask\s+(?:for|to)\b|\b(erstelle|erstellen|anlegen|hinzufÃ¼gen)\b.*\b(aufgabe|task)\b/i;
const TASK_SCOPE =
  /\b(task|tasks|todo|to-do|priority|prioriti[sz]e|plan|planning|schedule|deadline|due|overdue|focus|workload|project|day|week|productiv|aufgabe|aufgaben|prioritÃ¤t|priorisieren|planen|planung|termin|fÃ¤llig|Ã¼berfÃ¤llig|fokus|projekt|tag|woche)\b/i;
const OTHER_DOMAIN =
  /\b(account|login|password|ban|banned|admin|support|contact|profile|email|weather|news|code|recipe|konto|anmeldung|passwort|gesperrt|administrator|kontakt|profil|wetter|nachrichten|rezept)\b/i;
const TASK_FOLLOW_UP =
  /^(yes|no|okay|ok|sure|what about|which one|make it|change it|move it|that|this|it|tomorrow|today|next week|how should i|why|ja|nein|okay|was ist mit|welche|mach es|ändere|verschiebe|das|dies|morgen|heute|nächste woche|wie soll ich|warum)\b/i;

const localised = (locale: "en" | "de", english: string, german: string): string =>
  locale === "de" ? german : english;

const normaliseTitle = (message: string): string => {
  let title = message
    .replace(
      /\b(can|could|would)\s+you\s+(please\s+)?(create|add|make|set up)\s+(me\s+)?(a\s+)?task\s*(for|to)?\s*/i,
      "",
    )
    .replace(
      /\b(please\s+)?(create|add|make|set up)\s+(me\s+)?(a\s+)?task\s*(for|to)?\s*/i,
      "",
    )
    .replace(
      /\b(bitte\s+)?(erstelle|erstellen|anlegen|hinzufÃ¼gen)\b.*?\baufgabe\b\s*/i,
      "",
    )
    .replace(/[.!?]+$/g, "")
    .trim();

  if (title.length < 3) title = message.replace(/[.!?]+$/g, "").trim();
  if (title.length < 3) title = "New task";
  return `${title.charAt(0).toUpperCase()}${title.slice(1)}`.slice(0, 100);
};

const fallbackProposal = (message: string): TaskProposalDraft | null => {
  if (!CREATE_INTENT.test(message)) return null;
  const priority = /\b(high|urgent|important|hoch|dringend|wichtig)\b/i.test(message)
    ? "high"
    : /\b(low|whenever|niedrig|irgendwann)\b/i.test(message)
      ? "low"
      : "medium";
  return {
    title: normaliseTitle(message),
    description: "",
    priority,
    dueDate: null,
  };
};

const parseProposal = (
  text: string,
): {
  reply: string;
  proposal: TaskProposalDraft | null;
} => {
  const marker = "[TASK_PROPOSAL]";
  const markerIndex = text.lastIndexOf(marker);
  if (markerIndex === -1) return { reply: text.trim(), proposal: null };

  const reply = text.slice(0, markerIndex).trim();
  const raw = text.slice(markerIndex + marker.length).trim();
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    const title = typeof value.title === "string" ? value.title.trim() : "";
    const description =
      typeof value.description === "string" ? value.description.trim() : "";
    const priority =
      value.priority === "low" || value.priority === "high" ? value.priority : "medium";
    const dueDate =
      typeof value.dueDate === "string" && !Number.isNaN(Date.parse(value.dueDate))
        ? new Date(value.dueDate)
        : null;

    if (title.length < 3 || title.length > 100 || description.length > 2000) {
      return { reply, proposal: null };
    }
    return {
      reply,
      proposal: { title, description, priority, dueDate },
    };
  } catch {
    return { reply, proposal: null };
  }
};

const taskContextText = (tasks: TaskContextItem[]): string =>
  tasks.length
    ? tasks
        .slice(0, 20)
        .map(
          (task) =>
            `- ${task.title} | ${task.status} | ${task.priority} | due ${task.dueDate ?? "none"}`,
        )
        .join("\n")
    : "- No existing tasks";

const buildPrompt = (context: AssistantContext, tasks: TaskContextItem[]): string => {
  const language = context.locale === "de" ? "German" : "English";
  return [
    `You are the private Karino Task Agent. Reply only in ${language}.`,
    "Be friendly, practical, concise, and supportive.",
    "Your only scope is the signed-in user's tasks: planning, prioritising, scheduling, productivity guidance, and proposing a new task.",
    "Do not answer questions about accounts, login, bans, support, staff/admin features, website architecture, general knowledge, news, coding, medical, legal, or financial topics.",
    "If a request is outside task scope, politely say that this private assistant only helps with tasks and planning.",
    "You may use the task list below as context, but never claim to see anything else.",
    "Never edit, delete, complete, or create a task directly.",
    "When the user clearly asks to create a task, propose exactly one task and ask them to review and confirm it.",
    "For a task proposal, end your response with exactly this marker followed by valid JSON on the same final line:",
    '[TASK_PROPOSAL]{"title":"3-100 chars","description":"","priority":"low|medium|high","dueDate":"ISO date or null"}',
    "Do not emit the marker for advice, planning, or questions that do not request task creation.",
    "Do not say a task was created. The application creates it only after a separate user confirmation.",
    `Current UTC date: ${new Date().toISOString()}.`,
    `Current task context:\n${taskContextText(tasks)}`,
  ].join("\n");
};

export const runTaskAgent = async ({
  message,
  history,
  context,
  tasks,
}: {
  message: string;
  history: AssistantHistoryMessage[];
  context: AssistantContext;
  tasks: TaskContextItem[];
}): Promise<TaskAssistantResult> => {
  const scopedFollowUp = history.length > 0 && TASK_FOLLOW_UP.test(message.trim());
  if (
    (OTHER_DOMAIN.test(message) && !TASK_SCOPE.test(message)) ||
    (!TASK_SCOPE.test(message) && !CREATE_INTENT.test(message) && !scopedFollowUp)
  ) {
    return {
      reply: localised(
        context.locale,
        "I can only help with your tasks, planning, priorities, and task creation.",
        "Ich kann dir nur bei deinen Aufgaben, deiner Planung, PrioritÃ¤ten und beim Erstellen von Aufgaben helfen.",
      ),
      provider: OFFLINE_PROVIDER,
      proposal: null,
    };
  }

  const result = await runProviders({
    systemPrompt: buildPrompt(context, tasks),
    history,
    message,
    temperature: 0.2,
    maxTokens: 700,
  });

  let reply: string;
  let proposal: TaskProposalDraft | null;
  if (result) {
    const parsed = parseProposal(result.text);
    reply = parsed.reply;
    proposal = parsed.proposal ?? fallbackProposal(message);
  } else {
    proposal = fallbackProposal(message);
    reply = proposal
      ? localised(
          context.locale,
          "I prepared a task draft. Review it below and confirm only if it looks right.",
          "Ich habe einen Aufgabenentwurf vorbereitet. PrÃ¼fe ihn unten und bestÃ¤tige ihn nur, wenn alles stimmt.",
        )
      : localised(
          context.locale,
          "The task assistant is temporarily unavailable. I can still create a simple task draft if you ask me to create a task.",
          "Der Aufgabenassistent ist vorÃ¼bergehend nicht verfÃ¼gbar. Ich kann trotzdem einen einfachen Aufgabenentwurf vorbereiten, wenn du mich bittest, eine Aufgabe zu erstellen.",
        );
  }

  if (proposal && !reply) {
    reply = localised(
      context.locale,
      "Review this task draft and confirm it when you are ready.",
      "PrÃ¼fe diesen Aufgabenentwurf und bestÃ¤tige ihn, wenn du bereit bist.",
    );
  }

  const guard = outputGuardrail(reply, context);
  const safeReply = guard.passed
    ? reply
    : localised(
        context.locale,
        "I can prepare a task draft, but I need your confirmation before it is created.",
        "Ich kann einen Aufgabenentwurf vorbereiten, benÃ¶tige aber deine BestÃ¤tigung, bevor er erstellt wird.",
      );

  return {
    reply: isStronglyMixedLanguage(safeReply)
      ? localised(
          context.locale,
          "I can help you plan, prioritise, or create a task draft.",
          "Ich kann dir beim Planen, Priorisieren oder Erstellen eines Aufgabenentwurfs helfen.",
        )
      : safeReply,
    provider: result?.provider ?? OFFLINE_PROVIDER,
    proposal,
  };
};
