import { createHash, randomBytes, randomUUID } from "node:crypto";

import type { Request, RequestHandler, Response } from "express";
import mongoose, { type HydratedDocument, type QueryFilter } from "mongoose";

import {
  BAN_REASONS,
  SupportChat,
  type ISupportChat,
  type IUser,
  type SupportChatLocale,
  type SupportEscalationReason,
  User,
} from "#models";
import {
  banUser,
  CHAT_WELCOME_SENDER,
  chatWelcomeMessage,
  clearAssistantIdleClose,
  closeInactiveAssistantChats,
  createReplySuggestions,
  detectMessageLocale,
  hasReachedHumanSupport,
  improveStaffDraft,
  runAssistant,
  resolveSupportAudience,
  scheduleAssistantIdleClose,
  setAdministratorRole,
  unbanUser,
  type AssistantHistoryMessage,
  type SupportTranscriptMessage,
} from "#services";
import {
  AppError,
  canManageBan,
  getPositiveIntegerEnv,
  isAdminRoles,
  isStaffRoles,
  isSuperAdminRoles,
  normalizeIpAddress,
} from "#utils";
import { supportQueueQuerySchema } from "#schemas";

const validateObjectId = (value: unknown, label: string): string => {
  if (typeof value !== "string" || !mongoose.isValidObjectId(value)) {
    throw new AppError(`Invalid ${label} ID`, 400);
  }
  return value;
};

const requireAuth = (request: Request): Express.AuthUser => {
  if (!request.user) throw new AppError("Authentication required", 401);
  return request.user;
};

const getCurrentUser = async (request: Request): Promise<HydratedDocument<IUser>> => {
  const auth = requireAuth(request);
  const user = await User.findById(auth.userId);
  if (!user) throw new AppError("User not found", 404);
  if (user.ban?.isBanned) {
    throw new AppError("Your account has been banned", 403).withPublicDetails({
      ban: { reason: user.ban.reason, bannedAt: user.ban.bannedAt },
    });
  }
  request.user!.roles = user.roles;
  return user;
};

const fullName = (user: Pick<IUser, "firstName" | "lastName">): string =>
  `${user.firstName} ${user.lastName}`.trim();

const supportName = (user: Pick<IUser, "firstName">): string => user.firstName.trim();

const localized = (locale: SupportChatLocale, english: string, german: string): string =>
  locale === "de" ? german : english;

const systemMessage = (
  locale: SupportChatLocale,
  key:
    | "waiting-super"
    | "waiting-support"
    | "user-ended"
    | "accepted"
    | "transferred"
    | "staff-left"
    | "staff-ended",
  staffName = "",
): string => {
  const messages = {
    "waiting-super": {
      en: "This chat is waiting for a Super Support Agent.",
      de: "Dieser Chat wartet auf einen Super-Support-Agenten.",
    },
    "waiting-support": {
      en: "This chat is waiting for a Human Support Agent.",
      de: "Dieser Chat wartet auf einen Human-Support-Agenten.",
    },
    "user-ended": {
      en: "The user ended this chat.",
      de: "Der Benutzer hat diesen Chat beendet.",
    },
    accepted: {
      en: `${staffName} joined this support chat.`,
      de: `${staffName} ist diesem Support-Chat beigetreten.`,
    },
    transferred: {
      en: `${staffName} transferred this chat to a Super Support Agent.`,
      de: `${staffName} hat diesen Chat an einen Super-Support-Agenten übertragen.`,
    },
    "staff-left": {
      en: `${staffName} left this support chat.`,
      de: `${staffName} hat diesen Support-Chat verlassen.`,
    },
    "staff-ended": {
      en: `${staffName} ended this support chat.`,
      de: `${staffName} hat diesen Support-Chat beendet.`,
    },
  } as const;

  return messages[key][locale];
};

const serializeMessage = (message: ISupportChat["messages"][number]) => ({
  id: String(message._id),
  sender: message.sender,
  senderId: message.senderId ? String(message.senderId) : null,
  senderName: message.senderName,
  content: message.content,
  createdAt: message.createdAt,
});

const serializeChat = (chat: HydratedDocument<ISupportChat>) => {
  const populatedUser =
    chat.user && typeof chat.user === "object" && "email" in chat.user
      ? (chat.user as unknown as IUser & { _id: unknown })
      : null;

  return {
    id: String(chat._id),
    user: populatedUser
      ? {
          id: String(populatedUser._id),
          firstName: populatedUser.firstName,
          lastName: populatedUser.lastName,
          email: populatedUser.email,
          roles: populatedUser.roles,
          profileImage: populatedUser.profileImage ?? null,
          ban: populatedUser.ban ?? null,
        }
      : chat.user
        ? String(chat.user)
        : null,
    guest:
      chat.origin === "guest"
        ? { id: chat.guestId, email: chat.guestEmail, label: "Guest" }
        : null,
    origin: chat.origin,
    locale: chat.locale,
    subject: chat.subject,
    status: chat.status,
    assignedTo: chat.assignedTo ? String(chat.assignedTo) : null,
    assignedToName: chat.assignedToName,
    requiresSuperAdmin: chat.requiresSuperAdmin,
    escalationReason: chat.escalationReason,
    lastAgent: chat.lastAgent,
    messages: chat.messages.map(serializeMessage),
    rating: chat.rating,
    assistantIdleExpiresAt: chat.assistantIdleExpiresAt ?? null,
    endedAt: chat.endedAt,
    createdAt: chat.createdAt,
    updatedAt: chat.updatedAt,
  };
};

const toAssistantHistory = (
  chat: HydratedDocument<ISupportChat>,
): AssistantHistoryMessage[] =>
  chat.messages
    .filter(
      (message) =>
        (message.sender === "user" || message.sender === "ai") &&
        message.senderName !== CHAT_WELCOME_SENDER,
    )
    .map((message) => ({
      role: message.sender === "user" ? "user" : "assistant",
      content: message.content,
    }));

const endChatDocument = async (
  chat: HydratedDocument<ISupportChat>,
): Promise<boolean> => {
  const now = new Date();
  const deleteAfterEnd = !hasReachedHumanSupport(chat);
  chat.status = "ended";
  chat.assistantIdleExpiresAt = null;
  chat.endedAt = now;
  if (deleteAfterEnd) {
    await chat.deleteOne();
    return true;
  }
  const retentionDays = getPositiveIntegerEnv("SUPPORT_CHAT_RETENTION_DAYS", 90);
  chat.expiresAt = new Date(now.getTime() + retentionDays * 24 * 60 * 60 * 1000);
  await chat.save();
  return false;
};

const parseStaffCommand = async (
  message: string,
  actor: HydratedDocument<IUser>,
  locale: SupportChatLocale,
): Promise<string | null> => {
  if (!message.startsWith("/") || !isStaffRoles(actor.roles)) return null;

  const [command, emailValue, reasonValue] = message.trim().split(/\s+/, 3);
  const email = emailValue?.trim().toLowerCase();

  if (!email) {
    return localized(
      locale,
      "A user email is required after the command.",
      "Nach dem Befehl ist eine Benutzer-E-Mail-Adresse erforderlich.",
    );
  }

  const target = await User.findOne({ email });
  if (!target) {
    return localized(
      locale,
      `No user was found for ${email}.`,
      `Für ${email} wurde kein Benutzer gefunden.`,
    );
  }

  const actorInfo = { userId: String(actor._id), roles: actor.roles };

  if (command === "/ban") {
    if (
      !reasonValue ||
      !BAN_REASONS.includes(reasonValue as (typeof BAN_REASONS)[number])
    ) {
      return localized(
        locale,
        `Choose one ban reason: ${BAN_REASONS.join(", ")}.`,
        `Wähle einen Sperrgrund: ${BAN_REASONS.join(", ")}.`,
      );
    }
    if (!canManageBan(actor.roles, target.roles)) {
      throw new AppError("You cannot ban this account", 403);
    }
    const result = await banUser(target, reasonValue as (typeof BAN_REASONS)[number]);
    return localized(
      locale,
      `${target.email} was banned for “${reasonValue}”. ${result.sessionsRevoked} active session(s) were revoked.`,
      `${target.email} wurde wegen „${reasonValue}“ gesperrt. ${result.sessionsRevoked} aktive Sitzung(en) wurden beendet.`,
    );
  }

  if (command === "/unban") {
    if (!canManageBan(actor.roles, target.roles)) {
      throw new AppError("You cannot unban this account", 403);
    }
    if (!target.ban?.isBanned) {
      return localized(
        locale,
        `${target.email} is not currently banned.`,
        `${target.email} ist derzeit nicht gesperrt.`,
      );
    }
    await unbanUser(target);
    return localized(
      locale,
      `${target.email} was unbanned and all ban metadata was cleared.`,
      `Die Sperre von ${target.email} wurde aufgehoben und alle Sperrdaten wurden gelöscht.`,
    );
  }

  if (command === "/promote" || command === "/demote") {
    const result = await setAdministratorRole(actorInfo, target, command === "/promote");
    if (command === "/promote") {
      return localized(
        locale,
        `${target.email} is now an administrator. ${result.sessionsRevoked} active session(s) were revoked.`,
        `${target.email} ist jetzt Administrator. ${result.sessionsRevoked} aktive Sitzung(en) wurden beendet.`,
      );
    }
    return localized(
      locale,
      `${target.email} is no longer an administrator. ${result.sessionsRevoked} active session(s) were revoked.`,
      `${target.email} ist kein Administrator mehr. ${result.sessionsRevoked} aktive Sitzung(en) wurden beendet.`,
    );
  }

  if (command === "/user") {
    return localized(
      locale,
      `${fullName(target)} · ${target.email} · roles: ${target.roles.join(", ")} · banned: ${target.ban?.isBanned ? `yes (${target.ban.reason})` : "no"}`,
      `${fullName(target)} · ${target.email} · Rollen: ${target.roles.join(", ")} · gesperrt: ${target.ban?.isBanned ? `ja (${target.ban.reason})` : "nein"}`,
    );
  }

  return localized(
    locale,
    "Unknown command. Use /ban, /unban, /user, and—if you are a super admin—/promote or /demote.",
    "Unbekannter Befehl. Verwende /ban, /unban, /user und als Super-Admin zusätzlich /promote oder /demote.",
  );
};

const GUEST_SUPPORT_COOKIE_NAME = "guestSupportToken";
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;

const hashGuestToken = (token: string): string =>
  createHash("sha256").update(token).digest("hex");

const setGuestSupportCookie = (response: Response, token: string): void => {
  const retentionDays = getPositiveIntegerEnv("SUPPORT_CHAT_RETENTION_DAYS", 90);
  response.cookie(GUEST_SUPPORT_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: retentionDays * 24 * 60 * 60 * 1000,
  });
};

const getGuestToken = (request: Request): string | null => {
  const token = request.cookies?.[GUEST_SUPPORT_COOKIE_NAME] as unknown;
  return typeof token === "string" && token.length >= 32 ? token : null;
};

const resolveLocale = (message: string, fallback: SupportChatLocale): SupportChatLocale =>
  detectMessageLocale(message, fallback).locale;

const escalationReply = (
  locale: SupportChatLocale,
  reason: SupportEscalationReason,
  requiresSuperAdmin: boolean,
): string => {
  if (requiresSuperAdmin && reason === "account_banned") {
    return localized(
      locale,
      "I’ve sent your account-ban issue to a Super Support Agent. You can continue writing here while you wait.",
      "Ich habe dein Problem mit der Kontosperre an einen Super-Support-Agenten weitergeleitet. Du kannst hier weiterschreiben, während du wartest.",
    );
  }
  if (requiresSuperAdmin && reason === "security") {
    return localized(
      locale,
      "I’ve sent this security issue to a Super Support Agent. Please do not share your password or recovery codes.",
      "Ich habe dieses Sicherheitsproblem an einen Super-Support-Agenten weitergeleitet. Bitte teile weder dein Passwort noch Wiederherstellungscodes.",
    );
  }
  return localized(
    locale,
    "I’ve sent this conversation to human support. You can continue writing here while you wait.",
    "Ich habe diese Unterhaltung an den menschlichen Support weitergeleitet. Du kannst hier weiterschreiben, während du wartest.",
  );
};

const applyAssistantTurn = (
  chat: HydratedDocument<ISupportChat>,
  assistant: Awaited<ReturnType<typeof runAssistant>>,
  options: {
    supportAudience?: "all-staff" | "super-admin";
    allowEscalation?: boolean;
  } = {},
): boolean => {
  const shouldEscalate =
    assistant.action === "escalate" && options.allowEscalation !== false;
  const reason = assistant.escalationReason ?? "unresolved";
  const requiresSuperAdmin =
    options.supportAudience === "super-admin" ||
    (options.supportAudience === undefined && assistant.requiresSuperAdmin);

  chat.lastAgent = assistant.agent;
  chat.messages.push({
    sender: "ai",
    senderName: assistant.agent,
    content: shouldEscalate
      ? escalationReply(chat.locale, reason, requiresSuperAdmin)
      : assistant.reply,
    createdAt: new Date(),
  } as ISupportChat["messages"][number]);

  if (!shouldEscalate) {
    scheduleAssistantIdleClose(chat);
    return false;
  }

  chat.status = "open";
  clearAssistantIdleClose(chat);
  chat.assignedTo = null;
  chat.assignedToName = null;
  chat.escalationReason = reason;
  chat.requiresSuperAdmin = requiresSuperAdmin;
  chat.messages.push({
    sender: "system",
    senderName: null,
    content: systemMessage(
      chat.locale,
      chat.requiresSuperAdmin ? "waiting-super" : "waiting-support",
    ),
    createdAt: new Date(),
  } as ISupportChat["messages"][number]);
  return true;
};

const escalationPayload = (chat: HydratedDocument<ISupportChat>, completed: boolean) => ({
  requested: completed,
  completed,
  reason: completed ? chat.escalationReason : null,
});

const findGuestChat = async (
  request: Request,
  chatId: string,
): Promise<HydratedDocument<ISupportChat>> => {
  const token = getGuestToken(request);
  if (!token) throw new AppError("Guest chat not found", 404);
  const id = validateObjectId(chatId, "chat");
  await closeInactiveAssistantChats({ _id: id, origin: "guest" });
  const chat = await SupportChat.findOne({
    _id: id,
    origin: "guest",
    guestTokenHash: hashGuestToken(token),
  }).select("+guestTokenHash");
  if (!chat) throw new AppError("Guest chat not found", 404);
  return chat;
};

export const guestAssistant: RequestHandler = async (request, response) => {
  const {
    message,
    locale: requestedLocale,
    chatId,
  } = request.body as {
    message: string;
    locale: SupportChatLocale;
    chatId?: string;
  };

  let chat: HydratedDocument<ISupportChat> | null = null;
  let token = getGuestToken(request);
  if (chatId) {
    if (!token) throw new AppError("Guest chat not found", 404);
    const existingChatId = validateObjectId(chatId, "chat");
    await closeInactiveAssistantChats({ _id: existingChatId, origin: "guest" });
    chat = await SupportChat.findOne({
      _id: existingChatId,
      origin: "guest",
      guestTokenHash: hashGuestToken(token),
    }).select("+guestTokenHash");
    if (!chat) throw new AppError("Guest chat not found", 404);
    if (chat.status === "ended") throw new AppError("This chat has ended", 409);
  }

  const detectedLocale = resolveLocale(message, chat?.locale ?? requestedLocale);
  const email = message.match(EMAIL_PATTERN)?.[0]?.toLowerCase() ?? null;
  let isNew = false;

  if (!chat) {
    isNew = true;
    token = randomBytes(32).toString("base64url");
    chat = new SupportChat({
      user: null,
      origin: "guest",
      guestId: randomUUID(),
      guestTokenHash: hashGuestToken(token),
      guestEmail: email,
      guestIpAddress: normalizeIpAddress(request.ip),
      guestUserAgent: request.get("user-agent")?.slice(0, 512) ?? null,
      locale: detectedLocale,
      subject: message.slice(0, 200),
      status: "assistant",
      messages: [
        {
          sender: "ai",
          senderName: CHAT_WELCOME_SENDER,
          content: chatWelcomeMessage(requestedLocale),
          createdAt: new Date(),
        },
      ],
    });
  } else {
    chat.locale = detectedLocale;
    if (!chat.guestEmail && email) chat.guestEmail = email;
  }

  chat.messages.push({
    sender: "user",
    senderName: "Guest",
    content: message,
    createdAt: new Date(),
  } as ISupportChat["messages"][number]);

  let provider: string | null = null;
  let escalated = false;
  if (chat.status === "assistant") {
    clearAssistantIdleClose(chat);
    if (!isNew) await chat.save();
    const assistant = await runAssistant(message, toAssistantHistory(chat).slice(0, -1), {
      roles: [],
      authenticated: false,
      locale: detectedLocale,
    });
    escalated = applyAssistantTurn(chat, assistant, {
      supportAudience: resolveSupportAudience([]),
    });
    provider = assistant.provider;
  }

  // The success response and transfer confirmation are only returned after the
  // chat (including its open status) has been persisted successfully.
  await chat.save();
  if (isNew && token) setGuestSupportCookie(response, token);

  response.status(isNew ? 201 : 200).json({
    success: true,
    data: {
      chat: serializeChat(chat),
      provider,
      escalation: escalationPayload(chat, escalated),
    },
  });
};

export const getGuestChat: RequestHandler = async (request, response) => {
  const chat = await findGuestChat(request, String(request.params.id));
  response.status(200).json({ success: true, data: { chat: serializeChat(chat) } });
};

export const endGuestChat: RequestHandler = async (request, response) => {
  const chat = await findGuestChat(request, String(request.params.id));
  let deleted = false;
  if (chat.status !== "ended") {
    chat.messages.push({
      sender: "system",
      senderName: null,
      content: systemMessage(chat.locale, "user-ended"),
      createdAt: new Date(),
    } as ISupportChat["messages"][number]);
    deleted = await endChatDocument(chat);
  } else if (!hasReachedHumanSupport(chat)) {
    await chat.deleteOne();
    deleted = true;
  }
  response
    .status(200)
    .json({ success: true, data: { chat: serializeChat(chat), deleted } });
};

export const createChat: RequestHandler = async (request, response) => {
  const user = await getCurrentUser(request);
  const { message, locale: requestedLocale } = request.body as {
    message: string;
    locale: SupportChatLocale;
  };
  const locale = resolveLocale(message, requestedLocale);
  const commandReply = await parseStaffCommand(message, user, locale);
  const assistant = commandReply
    ? {
        reply: commandReply,
        agent: "staff" as const,
        provider: "command",
        action: "reply" as const,
        escalationReason: null,
        requiresSuperAdmin: false,
        locale,
      }
    : await runAssistant(message, [], {
        roles: user.roles,
        authenticated: true,
        locale,
      });

  const chat = new SupportChat({
    user: user._id,
    origin: isAdminRoles(user.roles) && !isSuperAdminRoles(user.roles) ? "admin" : "user",
    locale,
    subject: message.slice(0, 200),
    status: "assistant",
    messages: [
      {
        sender: "ai",
        senderName: CHAT_WELCOME_SENDER,
        content: chatWelcomeMessage(requestedLocale),
        createdAt: new Date(),
      },
      {
        sender: "user",
        senderId: user._id,
        senderName: supportName(user),
        content: message,
        createdAt: new Date(),
      },
    ],
  });
  const escalated = applyAssistantTurn(chat, assistant, {
    supportAudience: resolveSupportAudience(user.roles),
    allowEscalation: !isSuperAdminRoles(user.roles),
  });
  await chat.save();

  response.status(201).json({
    success: true,
    data: {
      chat: serializeChat(chat),
      provider: assistant.provider,
      escalation: escalationPayload(chat, escalated),
    },
  });
};

export const listOwnChats: RequestHandler = async (request, response) => {
  const user = await getCurrentUser(request);
  await closeInactiveAssistantChats({ user: user._id });
  const chats = await SupportChat.find({ user: user._id })
    .sort({ updatedAt: -1 })
    .limit(50);
  response.status(200).json({
    success: true,
    data: { chats: chats.map(serializeChat) },
  });
};

export const getOwnChat: RequestHandler = async (request, response) => {
  const user = await getCurrentUser(request);
  const chatId = validateObjectId(request.params.id, "chat");
  await closeInactiveAssistantChats({ _id: chatId, user: user._id });
  const chat = await SupportChat.findOne({ _id: chatId, user: user._id });
  if (!chat) throw new AppError("Chat not found", 404);
  response.status(200).json({ success: true, data: { chat: serializeChat(chat) } });
};

export const sendOwnMessage: RequestHandler = async (request, response) => {
  const user = await getCurrentUser(request);
  const chatId = validateObjectId(request.params.id, "chat");
  const { message, locale: requestedLocale } = request.body as {
    message: string;
    locale: SupportChatLocale;
  };
  await closeInactiveAssistantChats({ _id: chatId, user: user._id });
  const chat = await SupportChat.findOne({ _id: chatId, user: user._id });
  if (!chat) throw new AppError("Chat not found", 404);
  if (chat.status === "ended") throw new AppError("This chat has ended", 409);

  const locale = resolveLocale(message, chat.locale ?? requestedLocale);
  chat.locale = locale;
  chat.messages.push({
    sender: "user",
    senderId: user._id,
    senderName: supportName(user),
    content: message,
    createdAt: new Date(),
  } as ISupportChat["messages"][number]);

  let provider: string | null = null;
  let escalated = false;
  if (chat.status === "assistant") {
    clearAssistantIdleClose(chat);
    await chat.save();
    const commandReply = await parseStaffCommand(message, user, locale);
    const assistant = commandReply
      ? {
          reply: commandReply,
          agent: "staff" as const,
          provider: "command",
          action: "reply" as const,
          escalationReason: null,
          requiresSuperAdmin: false,
          locale,
        }
      : await runAssistant(message, toAssistantHistory(chat).slice(0, -1), {
          roles: user.roles,
          authenticated: true,
          locale,
        });
    escalated = applyAssistantTurn(chat, assistant, {
      supportAudience: resolveSupportAudience(user.roles),
      allowEscalation: !isSuperAdminRoles(user.roles),
    });
    provider = assistant.provider;
  }

  await chat.save();
  response.status(200).json({
    success: true,
    data: {
      chat: serializeChat(chat),
      provider,
      escalation: escalationPayload(chat, escalated),
    },
  });
};

export const escalateOwnChat: RequestHandler = async (request, response) => {
  const user = await getCurrentUser(request);
  if (isSuperAdminRoles(user.roles)) {
    throw new AppError("Super Support Agents manage these requests directly", 400);
  }

  const chatId = validateObjectId(request.params.id, "chat");
  await closeInactiveAssistantChats({ _id: chatId, user: user._id });
  const chat = await SupportChat.findOne({ _id: chatId, user: user._id });
  if (!chat) throw new AppError("Chat not found", 404);
  if (chat.status === "ended") throw new AppError("This chat has ended", 409);
  if (chat.status !== "assistant") {
    throw new AppError("This chat has already been sent to support", 409);
  }

  chat.status = "open";
  clearAssistantIdleClose(chat);
  chat.escalationReason = "human_requested";
  chat.requiresSuperAdmin = isAdminRoles(user.roles);
  chat.messages.push({
    sender: "system",
    senderName: null,
    content: systemMessage(
      chat.locale,
      chat.requiresSuperAdmin ? "waiting-super" : "waiting-support",
    ),
    createdAt: new Date(),
  } as ISupportChat["messages"][number]);
  await chat.save();

  response.status(200).json({ success: true, data: { chat: serializeChat(chat) } });
};

export const endOwnChat: RequestHandler = async (request, response) => {
  const user = await getCurrentUser(request);
  const chatId = validateObjectId(request.params.id, "chat");
  await closeInactiveAssistantChats({ _id: chatId, user: user._id });
  const chat = await SupportChat.findOne({ _id: chatId, user: user._id });
  if (!chat) throw new AppError("Chat not found", 404);
  let deleted = false;
  if (chat.status !== "ended") {
    chat.messages.push({
      sender: "system",
      senderName: null,
      content: systemMessage(chat.locale, "user-ended"),
      createdAt: new Date(),
    } as ISupportChat["messages"][number]);
    deleted = await endChatDocument(chat);
  } else if (!hasReachedHumanSupport(chat)) {
    await chat.deleteOne();
    deleted = true;
  }
  response
    .status(200)
    .json({ success: true, data: { chat: serializeChat(chat), deleted } });
};

export const rateOwnChat: RequestHandler = async (request, response) => {
  const user = await getCurrentUser(request);
  const chatId = validateObjectId(request.params.id, "chat");
  const chat = await SupportChat.findOne({ _id: chatId, user: user._id });
  if (!chat) throw new AppError("Chat not found", 404);
  if (chat.status !== "ended") throw new AppError("End the chat before rating it", 409);
  if (chat.rating) throw new AppError("This chat has already been rated", 409);
  chat.rating = request.body as { score: number; reason: string };
  await chat.save();
  response.status(200).json({ success: true, data: { chat: serializeChat(chat) } });
};

const ensureStaffMayHandle = (
  chat: HydratedDocument<ISupportChat>,
  staff: HydratedDocument<IUser>,
): void => {
  if (chat.requiresSuperAdmin && !isSuperAdminRoles(staff.roles)) {
    throw new AppError("This chat requires a Super Support Agent", 403);
  }
};

export const listStaffChats: RequestHandler = async (request, response) => {
  const staff = await getCurrentUser(request);
  if (!isStaffRoles(staff.roles)) throw new AppError("Administrator required", 403);
  await closeInactiveAssistantChats();
  const query = supportQueueQuerySchema.parse(request.query);
  const superAdmin = isSuperAdminRoles(staff.roles);
  const filter: QueryFilter<ISupportChat> = {};
  if (superAdmin) {
    if (query.status) filter.status = query.status;
    else {
      filter.$or = [
        { status: { $in: ["open", "active"] } },
        { assignedTo: { $ne: null } },
        { "staffParticipants.0": { $exists: true } },
        { escalationReason: { $ne: null } },
      ];
    }
  } else {
    filter.$or = [
      {
        status: "open",
        assignedTo: null,
        requiresSuperAdmin: false,
        origin: { $in: ["user", "guest"] },
      },
      { staffParticipants: staff._id },
      { assignedTo: staff._id },
    ];
  }
  const [allChats, total] = await Promise.all([
    SupportChat.find(filter)
      .populate("user", "firstName lastName email roles profileImage ban createdAt updatedAt"),
    SupportChat.countDocuments(filter),
  ]);
  const statusRank: Record<ISupportChat["status"], number> = {
    open: 0,
    active: 1,
    ended: 2,
    assistant: 3,
  };
  const lastMessageTime = (chat: HydratedDocument<ISupportChat>): number =>
    chat.messages.at(-1)?.createdAt.getTime() ?? chat.updatedAt.getTime();
  const superSupportPriority = (chat: HydratedDocument<ISupportChat>): number =>
    chat.requiresSuperAdmin ? 0 : 1;
  const chats = allChats
    .sort(
      (left, right) =>
        statusRank[left.status] - statusRank[right.status] ||
        superSupportPriority(left) - superSupportPriority(right) ||
        lastMessageTime(right) - lastMessageTime(left),
    )
    .slice((query.page - 1) * query.limit, query.page * query.limit);
  response.status(200).json({
    success: true,
    data: {
      chats: chats.map(serializeChat),
      pagination: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
        hasNextPage: query.page * query.limit < total,
        hasPreviousPage: query.page > 1,
      },
    },
  });
};

export const claimStaffChat: RequestHandler = async (request, response) => {
  const staff = await getCurrentUser(request);
  const chatId = validateObjectId(request.params.id, "chat");
  const staffName = supportName(staff);
  const superAdmin = isSuperAdminRoles(staff.roles);
  const pendingChat = await SupportChat.findById(chatId)
    .select("locale status assignedTo assignedToName requiresSuperAdmin origin")
    .lean();
  if (!pendingChat) throw new AppError("Chat not found", 404);

  const takingOver =
    superAdmin &&
    pendingChat.status === "active" &&
    String(pendingChat.assignedTo ?? "") !== String(staff._id);
  if (pendingChat.status !== "open" && !takingOver) {
    throw new AppError("This chat is unavailable or has already been joined", 409);
  }

  const filter: QueryFilter<ISupportChat> = takingOver
    ? {
        _id: chatId,
        status: "active",
        assignedTo: pendingChat.assignedTo,
      }
    : { _id: chatId, status: "open" };
  if (!superAdmin) {
    filter.requiresSuperAdmin = false;
    filter.origin = { $in: ["user", "guest"] };
  }

  const transitionMessages = takingOver
    ? [
        {
          sender: "system",
          senderName: null,
          content: systemMessage(
            pendingChat.locale,
            "staff-left",
            pendingChat.assignedToName ?? "Support",
          ),
          createdAt: new Date(),
        },
        {
          sender: "system",
          senderName: null,
          content: systemMessage(pendingChat.locale, "accepted", staffName),
          createdAt: new Date(),
        },
      ]
    : [
        {
              sender: "system",
              senderName: null,
              content: systemMessage(pendingChat.locale, "accepted", staffName),
              createdAt: new Date(),
        },
      ];
  const chat = await SupportChat.findOneAndUpdate(
    filter,
    {
      $set: {
        status: "active",
        assignedTo: staff._id,
        assignedToName: staffName,
        ...(takingOver && { requiresSuperAdmin: true }),
      },
      $addToSet: {
        staffParticipants: {
          $each:
            takingOver && pendingChat.assignedTo
              ? [staff._id, pendingChat.assignedTo]
              : [staff._id],
        },
      },
      $push: { messages: { $each: transitionMessages } },
    },
    { new: true, runValidators: true },
  );

  if (!chat) {
    throw new AppError("The chat assignment changed before you could join", 409);
  }

  await chat.populate("user", "firstName lastName email roles profileImage ban createdAt updatedAt");
  response.status(200).json({ success: true, data: { chat: serializeChat(chat) } });
};

const requireAssignedStaff = (
  chat: HydratedDocument<ISupportChat>,
  staff: HydratedDocument<IUser>,
): void => {
  ensureStaffMayHandle(chat, staff);
  if (chat.status !== "active" || String(chat.assignedTo) !== String(staff._id)) {
    throw new AppError("You must claim this chat before replying", 403);
  }
};

export const sendStaffMessage: RequestHandler = async (request, response) => {
  const staff = await getCurrentUser(request);
  const chatId = validateObjectId(request.params.id, "chat");
  const chat = await SupportChat.findById(chatId);
  if (!chat) throw new AppError("Chat not found", 404);
  requireAssignedStaff(chat, staff);
  chat.messages.push({
    sender: "staff",
    senderId: staff._id,
    senderName: supportName(staff),
    content: (request.body as { message: string }).message,
    createdAt: new Date(),
  } as ISupportChat["messages"][number]);
  if (!chat.staffParticipants.some((id) => String(id) === String(staff._id))) {
    chat.staffParticipants.push(staff._id);
  }
  await chat.save();
  await chat.populate("user", "firstName lastName email roles profileImage ban createdAt updatedAt");
  response.status(200).json({ success: true, data: { chat: serializeChat(chat) } });
};

export const transferStaffChat: RequestHandler = async (request, response) => {
  const staff = await getCurrentUser(request);
  if (isSuperAdminRoles(staff.roles)) {
    throw new AppError("A Super Support Agent cannot transfer this chat upward", 400);
  }
  const chatId = validateObjectId(request.params.id, "chat");
  const chat = await SupportChat.findById(chatId);
  if (!chat) throw new AppError("Chat not found", 404);
  requireAssignedStaff(chat, staff);
  if (!chat.staffParticipants.some((id) => String(id) === String(staff._id))) {
    chat.staffParticipants.push(staff._id);
  }
  chat.status = "open";
  chat.assignedTo = null;
  chat.assignedToName = null;
  chat.requiresSuperAdmin = true;
  const staffName = supportName(staff);
  chat.messages.push(
    {
      sender: "system",
      senderName: null,
      content: systemMessage(chat.locale, "staff-left", staffName),
      createdAt: new Date(),
    } as ISupportChat["messages"][number],
    {
      sender: "system",
      senderName: null,
      content: systemMessage(chat.locale, "transferred", staffName),
      createdAt: new Date(),
    } as ISupportChat["messages"][number],
    {
      sender: "system",
      senderName: null,
      content: systemMessage(chat.locale, "waiting-super"),
      createdAt: new Date(),
    } as ISupportChat["messages"][number],
  );
  await chat.save();
  response.status(200).json({ success: true, data: { chat: serializeChat(chat) } });
};

export const endStaffChat: RequestHandler = async (request, response) => {
  const staff = await getCurrentUser(request);
  const chatId = validateObjectId(request.params.id, "chat");
  const chat = await SupportChat.findById(chatId);
  if (!chat) throw new AppError("Chat not found", 404);
  requireAssignedStaff(chat, staff);
  chat.messages.push({
    sender: "system",
    senderName: null,
    content: systemMessage(chat.locale, "staff-ended", supportName(staff)),
    createdAt: new Date(),
  } as ISupportChat["messages"][number]);
  await endChatDocument(chat);
  await chat.populate("user", "firstName lastName email roles profileImage ban createdAt updatedAt");
  response.status(200).json({ success: true, data: { chat: serializeChat(chat) } });
};

export const getStaffSuggestions: RequestHandler = async (request, response) => {
  const staff = await getCurrentUser(request);
  const chatId = validateObjectId(request.params.id, "chat");
  const chat = await SupportChat.findById(chatId);
  if (!chat) throw new AppError("Chat not found", 404);
  requireAssignedStaff(chat, staff);
  await chat.populate("user", "roles");
  const transcript: SupportTranscriptMessage[] = chat.messages.map((message) => ({
    sender: message.sender,
    senderName: message.senderName,
    content: message.content,
  }));
  const customer = chat.user ? (chat.user as unknown as Pick<IUser, "roles">) : null;
  const suggestions = await createReplySuggestions(transcript, {
    roles: staff.roles,
    authenticated: true,
    locale: chat.locale,
    staffName: supportName(staff),
    staffRole: isSuperAdminRoles(staff.roles) ? "super_admin" : "admin",
    customerRoles: customer?.roles ?? [],
  });
  response.status(200).json({ success: true, data: { suggestions } });
};

export const rewriteStaffMessage: RequestHandler = async (request, response) => {
  const staff = await getCurrentUser(request);
  const chatId = validateObjectId(request.params.id, "chat");
  const chat = await SupportChat.findById(chatId);
  if (!chat) throw new AppError("Chat not found", 404);
  requireAssignedStaff(chat, staff);
  await chat.populate("user", "roles");
  const transcript: SupportTranscriptMessage[] = chat.messages.map((item) => ({
    sender: item.sender,
    senderName: item.senderName,
    content: item.content,
  }));
  const customer = chat.user ? (chat.user as unknown as Pick<IUser, "roles">) : null;
  const message = await improveStaffDraft(
    (request.body as { message: string }).message,
    transcript,
    {
      roles: staff.roles,
      authenticated: true,
      locale: chat.locale,
      staffName: supportName(staff),
      staffRole: isSuperAdminRoles(staff.roles) ? "super_admin" : "admin",
      customerRoles: customer?.roles ?? [],
    },
  );
  response.status(200).json({ success: true, data: { message } });
};
