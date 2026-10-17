import type { RequestHandler } from "express";
import mongoose, { type HydratedDocument } from "mongoose";

import { detectMessageLocale, getAiConfig, runTaskAgent } from "#ai";
import {
  AssistantConversation,
  Task,
  User,
  type IAssistantConversation,
  type IAssistantMessage,
  type IUser,
} from "#models";
import { AppError } from "#utils";

const validateObjectId = (value: unknown, label: string): string => {
  if (typeof value !== "string" || !mongoose.isValidObjectId(value)) {
    throw new AppError(`Invalid ${label} ID`, 400);
  }
  return value;
};

const getCurrentUser = async (
  userId: string | undefined,
): Promise<HydratedDocument<IUser>> => {
  if (!userId) throw new AppError("Authentication required", 401);
  const user = await User.findById(userId);
  if (!user) throw new AppError("User not found", 404);
  if (user.ban?.isBanned) throw new AppError("Your account has been banned", 403);
  return user;
};

const serializeProposal = (proposal: IAssistantMessage["taskProposal"]) =>
  proposal
    ? {
        title: proposal.title,
        description: proposal.description,
        priority: proposal.priority,
        dueDate: proposal.dueDate,
        status: proposal.status,
        taskId: proposal.taskId ? String(proposal.taskId) : null,
      }
    : null;

const serializeConversation = (
  conversation: HydratedDocument<IAssistantConversation>,
) => ({
  id: String(conversation._id),
  locale: conversation.locale,
  subject: conversation.subject,
  messages: conversation.messages.map((message) => ({
    id: String(message._id),
    sender: message.sender,
    content: message.content,
    taskProposal: serializeProposal(message.taskProposal),
    createdAt: message.createdAt,
  })),
  createdAt: conversation.createdAt,
  updatedAt: conversation.updatedAt,
});

// Open tasks first, soonest due date first (undated last), then done tasks.
// ponytail: looks at the 200 most recently updated tasks; plenty for one person.
const loadTaskContext = async (userId: string) => {
  const tasks = await Task.find({ owner: userId })
    .select("title status priority dueDate")
    .sort({ updatedAt: -1 })
    .limit(200)
    .lean();
  const dueTime = (date?: Date | null) => date?.getTime() ?? Number.MAX_SAFE_INTEGER;
  tasks.sort(
    (a, b) =>
      Number(a.status === "done") - Number(b.status === "done") ||
      dueTime(a.dueDate) - dueTime(b.dueDate),
  );
  return tasks.slice(0, 20).map((task) => ({
    title: task.title,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate?.toISOString() ?? null,
  }));
};

// The draft itself lives outside the reply text, so a short note tells the
// model what it proposed and whether the user created or dismissed it.
const draftNote = (proposal: IAssistantMessage["taskProposal"]): string =>
  proposal
    ? `
[Task draft: "${proposal.title}" · ${proposal.priority} priority · due ${
        proposal.dueDate ? proposal.dueDate.toISOString() : "none"
      } · ${proposal.status}]`
    : "";

const historyOf = (conversation: HydratedDocument<IAssistantConversation>) =>
  conversation.messages.slice(-30).map((message) => ({
    role: message.sender as "user" | "assistant",
    content: message.content + draftNote(message.taskProposal),
  }));

// A failed turn is not saved, so the user can simply send the message again.
const assertAvailable = (result: { available: boolean }): void => {
  if (result.available) return;
  throw getAiConfig()
    ? new AppError("The AI assistant is temporarily unavailable. Please try again", 503)
    : new AppError("AI assistance is currently disabled", 503);
};

export const listAssistantConversations: RequestHandler = async (request, response) => {
  const user = await getCurrentUser(request.user?.userId);
  const conversations = await AssistantConversation.find({ user: user._id })
    .sort({ updatedAt: -1 })
    .limit(50);
  response.status(200).json({
    success: true,
    data: { conversations: conversations.map(serializeConversation) },
  });
};

export const createAssistantConversation: RequestHandler = async (request, response) => {
  const user = await getCurrentUser(request.user?.userId);
  const {
    message,
    locale: requestedLocale,
    timeZone,
  } = request.body as {
    message: string;
    locale: "en" | "de";
    timeZone?: string;
  };
  const locale = detectMessageLocale(message, requestedLocale).locale;
  const result = await runTaskAgent({
    message,
    history: [],
    context: {
      roles: user.roles,
      authenticated: true,
      locale,
      userId: String(user._id),
    },
    getTaskContext: () => loadTaskContext(String(user._id)),
    timeZone,
  });
  assertAvailable(result);

  const conversation = await AssistantConversation.create({
    user: user._id,
    locale,
    subject: message.slice(0, 100),
    messages: [
      { sender: "user", content: message, createdAt: new Date() },
      {
        sender: "assistant",
        content: result.reply,
        taskProposal: result.proposal
          ? { ...result.proposal, status: "pending", taskId: null }
          : null,
        createdAt: new Date(),
      },
    ],
  });

  response.status(201).json({
    success: true,
    data: {
      conversation: serializeConversation(conversation),
      provider: result.provider,
    },
  });
};

export const sendAssistantMessage: RequestHandler = async (request, response) => {
  const user = await getCurrentUser(request.user?.userId);
  const conversationId = validateObjectId(request.params.id, "conversation");
  const {
    message,
    locale: requestedLocale,
    timeZone,
  } = request.body as {
    message: string;
    locale: "en" | "de";
    timeZone?: string;
  };
  const conversation = await AssistantConversation.findOne({
    _id: conversationId,
    user: user._id,
  });
  if (!conversation) throw new AppError("Conversation not found", 404);

  const locale = detectMessageLocale(
    message,
    conversation.locale ?? requestedLocale,
  ).locale;
  const history = historyOf(conversation);
  const result = await runTaskAgent({
    message,
    history,
    context: {
      roles: user.roles,
      authenticated: true,
      locale,
      userId: String(user._id),
    },
    getTaskContext: () => loadTaskContext(String(user._id)),
    timeZone,
  });
  assertAvailable(result);

  conversation.locale = locale;
  conversation.messages.push(
    { sender: "user", content: message, createdAt: new Date() } as IAssistantMessage,
    {
      sender: "assistant",
      content: result.reply,
      taskProposal: result.proposal
        ? { ...result.proposal, status: "pending", taskId: null }
        : null,
      createdAt: new Date(),
    } as IAssistantMessage,
  );
  await conversation.save();

  response.status(200).json({
    success: true,
    data: {
      conversation: serializeConversation(conversation),
      provider: result.provider,
    },
  });
};

export const confirmAssistantTask: RequestHandler = async (request, response) => {
  const user = await getCurrentUser(request.user?.userId);
  const conversationId = validateObjectId(request.params.id, "conversation");
  const messageId = validateObjectId(request.params.messageId, "message");

  const reserved = await AssistantConversation.findOneAndUpdate(
    {
      _id: conversationId,
      user: user._id,
      messages: {
        $elemMatch: {
          _id: messageId,
          sender: "assistant",
          "taskProposal.status": "pending",
        },
      },
    },
    { $set: { "messages.$[message].taskProposal.status": "creating" } },
    {
      returnDocument: "after",
      arrayFilters: [{ "message._id": messageId }],
      runValidators: true,
    },
  );
  if (!reserved) {
    const exists = await AssistantConversation.exists({
      _id: conversationId,
      user: user._id,
    });
    if (!exists) throw new AppError("Conversation not found", 404);
    throw new AppError("This task proposal is no longer pending", 409);
  }

  const sourceMessage = reserved.messages.find(
    (message) => String(message._id) === messageId,
  );
  const proposal = sourceMessage?.taskProposal;
  if (!proposal) throw new AppError("Task proposal not found", 404);

  try {
    const task = await Task.create({
      owner: user._id,
      title: proposal.title,
      description: proposal.description,
      priority: proposal.priority,
      dueDate: proposal.dueDate,
      status: "todo",
      completedAt: null,
    });
    const conversation = await AssistantConversation.findOneAndUpdate(
      { _id: conversationId, user: user._id },
      {
        $set: {
          "messages.$[message].taskProposal.status": "created",
          "messages.$[message].taskProposal.taskId": task._id,
        },
      },
      { returnDocument: "after", arrayFilters: [{ "message._id": messageId }] },
    );
    if (!conversation) throw new AppError("Conversation not found", 404);
    response.status(201).json({
      success: true,
      message: "Task created successfully",
      data: { conversation: serializeConversation(conversation), task },
    });
  } catch (error) {
    await AssistantConversation.updateOne(
      { _id: conversationId, user: user._id },
      { $set: { "messages.$[message].taskProposal.status": "pending" } },
      { arrayFilters: [{ "message._id": messageId }] },
    );
    throw error;
  }
};

export const dismissAssistantTask: RequestHandler = async (request, response) => {
  const user = await getCurrentUser(request.user?.userId);
  const conversationId = validateObjectId(request.params.id, "conversation");
  const messageId = validateObjectId(request.params.messageId, "message");
  const conversation = await AssistantConversation.findOneAndUpdate(
    {
      _id: conversationId,
      user: user._id,
      messages: {
        $elemMatch: {
          _id: messageId,
          sender: "assistant",
          "taskProposal.status": "pending",
        },
      },
    },
    { $set: { "messages.$[message].taskProposal.status": "dismissed" } },
    {
      returnDocument: "after",
      arrayFilters: [{ "message._id": messageId }],
      runValidators: true,
    },
  );
  if (!conversation) {
    const exists = await AssistantConversation.exists({
      _id: conversationId,
      user: user._id,
    });
    if (!exists) throw new AppError("Conversation not found", 404);
    throw new AppError("This task proposal is no longer pending", 409);
  }
  response.status(200).json({
    success: true,
    data: { conversation: serializeConversation(conversation) },
  });
};
