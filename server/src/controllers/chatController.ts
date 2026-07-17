import type { Request, RequestHandler } from "express";
import mongoose, { type HydratedDocument, type QueryFilter } from "mongoose";

import {
  BAN_REASONS,
  SupportChat,
  type ISupportChat,
  type IUser,
  type SupportChatLocale,
  User,
} from "#models";
import {
  banUser,
  createReplySuggestions,
  runAssistant,
  setAdministratorRole,
  unbanUser,
  type AssistantHistoryMessage,
} from "#services";
import {
  AppError,
  canManageBan,
  getPositiveIntegerEnv,
  isAdminRoles,
  isStaffRoles,
  isSuperAdminRoles,
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
    | "staff-ended",
  staffName = "",
): string => {
  const messages = {
    "waiting-super": {
      en: "This chat is waiting for a super administrator.",
      de: "Dieser Chat wartet auf einen Super-Administrator.",
    },
    "waiting-support": {
      en: "This chat is waiting for a support administrator.",
      de: "Dieser Chat wartet auf einen Support-Administrator.",
    },
    "user-ended": {
      en: "The user ended this chat.",
      de: "Der Benutzer hat diesen Chat beendet.",
    },
    accepted: {
      en: `${staffName} accepted this support chat.`,
      de: `${staffName} hat diesen Support-Chat angenommen.`,
    },
    transferred: {
      en: `${staffName} transferred this chat to a super administrator.`,
      de: `${staffName} hat diesen Chat an einen Super-Administrator übertragen.`,
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
  senderName: message.senderName,
  content: message.content,
  createdAt: message.createdAt,
});

const serializeChat = (chat: HydratedDocument<ISupportChat>) => ({
  id: String(chat._id),
  user:
    typeof chat.user === "object" && "email" in chat.user
      ? {
          id: String((chat.user as unknown as { _id: unknown })._id),
          firstName: (chat.user as unknown as IUser).firstName,
          lastName: (chat.user as unknown as IUser).lastName,
          email: (chat.user as unknown as IUser).email,
          roles: (chat.user as unknown as IUser).roles,
          ban: (chat.user as unknown as IUser).ban ?? null,
        }
      : String(chat.user),
  origin: chat.origin,
  locale: chat.locale,
  subject: chat.subject,
  status: chat.status,
  assignedTo: chat.assignedTo ? String(chat.assignedTo) : null,
  assignedToName: chat.assignedToName,
  requiresSuperAdmin: chat.requiresSuperAdmin,
  lastAgent: chat.lastAgent,
  messages: chat.messages.map(serializeMessage),
  rating: chat.rating,
  endedAt: chat.endedAt,
  createdAt: chat.createdAt,
  updatedAt: chat.updatedAt,
});

const toAssistantHistory = (
  chat: HydratedDocument<ISupportChat>,
): AssistantHistoryMessage[] =>
  chat.messages
    .filter((message) => message.sender === "user" || message.sender === "ai")
    .map((message) => ({
      role: message.sender === "user" ? "user" : "assistant",
      content: message.content,
    }));

const endChatDocument = async (chat: HydratedDocument<ISupportChat>): Promise<void> => {
  const now = new Date();
  const retentionDays = getPositiveIntegerEnv("SUPPORT_CHAT_RETENTION_DAYS", 90);
  chat.status = "ended";
  chat.endedAt = now;
  chat.expiresAt = new Date(now.getTime() + retentionDays * 24 * 60 * 60 * 1000);
  await chat.save();
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

export const guestAssistant: RequestHandler = async (request, response) => {
  const { message, history, locale } = request.body as {
    message: string;
    history: AssistantHistoryMessage[];
    locale: "en" | "de";
  };
  const result = await runAssistant(message, history, {
    roles: [],
    authenticated: false,
    locale,
  });
  response.status(200).json({ success: true, data: result });
};

export const createChat: RequestHandler = async (request, response) => {
  const user = await getCurrentUser(request);
  const { message, locale } = request.body as { message: string; locale: "en" | "de" };
  const commandReply = await parseStaffCommand(message, user, locale);
  const assistant = commandReply
    ? { reply: commandReply, agent: "staff-operations" as const, provider: "command" }
    : await runAssistant(message, [], {
        roles: user.roles,
        authenticated: true,
        locale,
      });

  const chat = await SupportChat.create({
    user: user._id,
    origin: isAdminRoles(user.roles) && !isSuperAdminRoles(user.roles) ? "admin" : "user",
    locale,
    subject: message.slice(0, 200),
    status: "assistant",
    lastAgent: assistant.agent,
    messages: [
      { sender: "user", senderName: fullName(user), content: message },
      { sender: "ai", senderName: assistant.agent, content: assistant.reply },
    ],
  });

  response.status(201).json({
    success: true,
    data: { chat: serializeChat(chat), provider: assistant.provider },
  });
};

export const listOwnChats: RequestHandler = async (request, response) => {
  const user = await getCurrentUser(request);
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
  const chat = await SupportChat.findOne({ _id: chatId, user: user._id });
  if (!chat) throw new AppError("Chat not found", 404);
  response.status(200).json({ success: true, data: { chat: serializeChat(chat) } });
};

export const sendOwnMessage: RequestHandler = async (request, response) => {
  const user = await getCurrentUser(request);
  const chatId = validateObjectId(request.params.id, "chat");
  const { message, locale } = request.body as { message: string; locale: "en" | "de" };
  const chat = await SupportChat.findOne({ _id: chatId, user: user._id });
  if (!chat) throw new AppError("Chat not found", 404);
  if (chat.status === "ended") throw new AppError("This chat has ended", 409);

  chat.messages.push({
    sender: "user",
    senderName: fullName(user),
    content: message,
    createdAt: new Date(),
  } as ISupportChat["messages"][number]);

  let provider: string | null = null;
  if (chat.status === "assistant") {
    chat.locale = locale;
    const commandReply = await parseStaffCommand(message, user, locale);
    const assistant = commandReply
      ? { reply: commandReply, agent: "staff-operations" as const, provider: "command" }
      : await runAssistant(message, toAssistantHistory(chat).slice(0, -1), {
          roles: user.roles,
          authenticated: true,
          locale,
        });
    chat.lastAgent = assistant.agent;
    chat.messages.push({
      sender: "ai",
      senderName: assistant.agent,
      content: assistant.reply,
      createdAt: new Date(),
    } as ISupportChat["messages"][number]);
    provider = assistant.provider;
  }

  await chat.save();
  response.status(200).json({
    success: true,
    data: { chat: serializeChat(chat), provider },
  });
};

export const escalateOwnChat: RequestHandler = async (request, response) => {
  const user = await getCurrentUser(request);
  if (isSuperAdminRoles(user.roles)) {
    throw new AppError("Super administrators manage support directly", 400);
  }

  const chatId = validateObjectId(request.params.id, "chat");
  const chat = await SupportChat.findOne({ _id: chatId, user: user._id });
  if (!chat) throw new AppError("Chat not found", 404);
  if (chat.status !== "assistant") {
    throw new AppError("This chat has already been sent to support", 409);
  }

  chat.status = "open";
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
  const chat = await SupportChat.findOne({ _id: chatId, user: user._id });
  if (!chat) throw new AppError("Chat not found", 404);
  if (chat.status !== "ended") {
    chat.messages.push({
      sender: "system",
      senderName: null,
      content: systemMessage(chat.locale, "user-ended"),
      createdAt: new Date(),
    } as ISupportChat["messages"][number]);
    await endChatDocument(chat);
  }
  response.status(200).json({ success: true, data: { chat: serializeChat(chat) } });
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
    throw new AppError("This chat requires a super administrator", 403);
  }
};

export const listStaffChats: RequestHandler = async (request, response) => {
  const staff = await getCurrentUser(request);
  if (!isStaffRoles(staff.roles)) throw new AppError("Administrator required", 403);
  const query = supportQueueQuerySchema.parse(request.query);
  const filter: QueryFilter<ISupportChat> = {
    status: query.status ?? { $in: ["open", "active"] },
  };
  if (!isSuperAdminRoles(staff.roles)) {
    filter.requiresSuperAdmin = false;
    filter.origin = "user";
  }
  const skip = (query.page - 1) * query.limit;
  const [chats, total] = await Promise.all([
    SupportChat.find(filter)
      .populate("user", "firstName lastName email roles ban createdAt updatedAt")
      .sort({ status: 1, updatedAt: -1 })
      .skip(skip)
      .limit(query.limit),
    SupportChat.countDocuments(filter),
  ]);
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
  const staffName = fullName(staff);
  const filter: QueryFilter<ISupportChat> = { _id: chatId, status: "open" };

  if (!isSuperAdminRoles(staff.roles)) {
    filter.requiresSuperAdmin = false;
    filter.origin = "user";
  }

  const pendingChat = await SupportChat.findOne(filter).select("locale").lean();

  // The update remains atomic, so two staff members cannot accept the same chat.
  const chat = pendingChat
    ? await SupportChat.findOneAndUpdate(
        filter,
        {
          $set: {
            status: "active",
            assignedTo: staff._id,
            assignedToName: staffName,
          },
          $push: {
            messages: {
              sender: "system",
              senderName: null,
              content: systemMessage(pendingChat.locale, "accepted", staffName),
              createdAt: new Date(),
            },
          },
        },
        { new: true, runValidators: true },
      )
    : null;

  if (!chat) {
    const existing = await SupportChat.exists({ _id: chatId });
    if (!existing) throw new AppError("Chat not found", 404);
    throw new AppError("This chat is unavailable or has already been claimed", 409);
  }

  await chat.populate("user", "firstName lastName email roles ban createdAt updatedAt");
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
    senderName: fullName(staff),
    content: (request.body as { message: string }).message,
    createdAt: new Date(),
  } as ISupportChat["messages"][number]);
  await chat.save();
  await chat.populate("user", "firstName lastName email roles ban createdAt updatedAt");
  response.status(200).json({ success: true, data: { chat: serializeChat(chat) } });
};

export const transferStaffChat: RequestHandler = async (request, response) => {
  const staff = await getCurrentUser(request);
  if (isSuperAdminRoles(staff.roles)) {
    throw new AppError("A super administrator cannot transfer a chat upward", 400);
  }
  const chatId = validateObjectId(request.params.id, "chat");
  const chat = await SupportChat.findById(chatId);
  if (!chat) throw new AppError("Chat not found", 404);
  requireAssignedStaff(chat, staff);
  chat.status = "open";
  chat.assignedTo = null;
  chat.assignedToName = null;
  chat.requiresSuperAdmin = true;
  chat.messages.push({
    sender: "system",
    senderName: null,
    content: systemMessage(chat.locale, "transferred", fullName(staff)),
    createdAt: new Date(),
  } as ISupportChat["messages"][number]);
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
    content: systemMessage(chat.locale, "staff-ended", fullName(staff)),
    createdAt: new Date(),
  } as ISupportChat["messages"][number]);
  await endChatDocument(chat);
  await chat.populate("user", "firstName lastName email roles ban createdAt updatedAt");
  response.status(200).json({ success: true, data: { chat: serializeChat(chat) } });
};

export const getStaffSuggestions: RequestHandler = async (request, response) => {
  const staff = await getCurrentUser(request);
  const chatId = validateObjectId(request.params.id, "chat");
  const chat = await SupportChat.findById(chatId);
  if (!chat) throw new AppError("Chat not found", 404);
  ensureStaffMayHandle(chat, staff);
  const transcript: AssistantHistoryMessage[] = chat.messages
    .filter((message) => message.sender === "user" || message.sender === "staff")
    .map((message) => ({
      role: message.sender === "user" ? "user" : "assistant",
      content: message.content,
    }));
  const suggestions = await createReplySuggestions(transcript, {
    roles: staff.roles,
    authenticated: true,
    locale: chat.locale,
  });
  response.status(200).json({ success: true, data: { suggestions } });
};
