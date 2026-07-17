import type { RequestHandler } from "express";
import mongoose, { type QueryFilter, type SortOrder } from "mongoose";

import {
  RefreshSession,
  SupportChat,
  Task,
  type BanReason,
  type ITask,
  type IUser,
  User,
} from "#models";
import { deleteAttachmentFromCloudinary, uploadAttachment } from "#middlewares";
import { banUser, setAdministratorRole, unbanUser } from "#services";
import {
  AppError,
  applyTaskStatusTransition,
  canDeleteAccount,
  canManageBan,
} from "#utils";
import { adminTaskQuerySchema, adminUserQuerySchema } from "../schemas/adminSchema.ts";

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const validateObjectId = (value: unknown, label: string): string => {
  if (typeof value !== "string" || !mongoose.isValidObjectId(value)) {
    throw new AppError(`Invalid ${label} ID`, 400);
  }

  return value;
};

const requireAdminId = (userId: string | undefined): string => {
  if (!userId) {
    throw new AppError("Authentication required", 401);
  }

  return userId;
};

const serializeUser = (user: {
  _id: unknown;
  firstName: string;
  lastName: string;
  email: string;
  roles: string[];
  createdAt: Date;
  updatedAt: Date;
  ban?: IUser["ban"];
}) => ({
  id: String(user._id),
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  roles: user.roles,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
  ban: user.ban ?? null,
});

const createPagination = (total: number, page: number, limit: number) => ({
  total,
  page,
  limit,
  totalPages: Math.ceil(total / limit),
  hasNextPage: page * limit < total,
  hasPreviousPage: page > 1,
});

const createAttachment = async (file: Express.Multer.File | undefined) => {
  if (!file) {
    return undefined;
  }

  const result = await uploadAttachment(file);

  return {
    url: result.secure_url,
    publicId: result.public_id,
    originalName: file.originalname,
    resourceType: result.resource_type,
  };
};

const deleteAttachmentSafely = async (
  publicId: string,
  resourceType: string,
): Promise<boolean> => {
  try {
    await deleteAttachmentFromCloudinary(publicId, resourceType);
    return true;
  } catch (error) {
    console.error(`Failed to delete Cloudinary attachment ${publicId}:`, error);
    return false;
  }
};

export const getAdminTasks: RequestHandler = async (request, response) => {
  const query = adminTaskQuerySchema.parse(request.query);
  const filter: QueryFilter<ITask> = {};

  if (query.status) {
    filter.status = query.status;
  }

  if (query.priority) {
    filter.priority = query.priority;
  }

  if (query.ownerId) {
    filter.owner = new mongoose.Types.ObjectId(query.ownerId);
  }

  if (query.search) {
    const search = new RegExp(escapeRegExp(query.search), "i");
    filter.$or = [{ title: search }, { description: search }];
  }

  const skip = (query.page - 1) * query.limit;
  const order: SortOrder = query.order === "asc" ? 1 : -1;

  const [tasks, total] = await Promise.all([
    Task.find(filter)
      .populate("owner", "firstName lastName email roles")
      .sort({ [query.sortBy]: order, _id: order })
      .skip(skip)
      .limit(query.limit),
    Task.countDocuments(filter),
  ]);

  response.status(200).json({
    success: true,
    data: {
      tasks,
      pagination: createPagination(total, query.page, query.limit),
    },
  });
};

export const getAdminTaskById: RequestHandler = async (request, response) => {
  const taskId = validateObjectId(request.params.id, "task");
  const task = await Task.findById(taskId).populate(
    "owner",
    "firstName lastName email roles",
  );

  if (!task) {
    throw new AppError("Task not found", 404);
  }

  response.status(200).json({ success: true, data: { task } });
};

export const updateAdminTask: RequestHandler = async (request, response) => {
  const taskId = validateObjectId(request.params.id, "task");

  if (Object.keys(request.body).length === 0 && !request.file) {
    throw new AppError("At least one task field or an attachment must be provided", 400);
  }

  const task = await Task.findById(taskId);

  if (!task) {
    throw new AppError("Task not found", 404);
  }

  const newAttachment = await createAttachment(request.file);
  const oldAttachment = task.attachment;

  applyTaskStatusTransition(task, request.body.status);
  Object.assign(task, request.body);

  if (newAttachment) {
    task.attachment = newAttachment;
  }

  try {
    await task.save();
  } catch (error) {
    if (newAttachment) {
      await deleteAttachmentSafely(newAttachment.publicId, newAttachment.resourceType);
    }

    throw error;
  }

  // From this point the database references the new file. Cleanup failures
  // must not remove it or roll back an already-persisted task update.
  if (newAttachment && oldAttachment) {
    await deleteAttachmentSafely(oldAttachment.publicId, oldAttachment.resourceType);
  }

  await task.populate("owner", "firstName lastName email roles");

  response.status(200).json({
    success: true,
    message: "Task updated successfully",
    data: { task },
  });
};

export const deleteAdminTask: RequestHandler = async (request, response) => {
  const taskId = validateObjectId(request.params.id, "task");
  const task = await Task.findByIdAndDelete(taskId);

  if (!task) {
    throw new AppError("Task not found", 404);
  }

  let attachmentCleanupFailed = false;

  if (task.attachment) {
    attachmentCleanupFailed = !(await deleteAttachmentSafely(
      task.attachment.publicId,
      task.attachment.resourceType,
    ));
  }

  response.status(200).json({
    success: true,
    message: "Task deleted successfully",
    data: { attachmentCleanupFailed },
  });
};

export const deleteAdminTaskAttachment: RequestHandler = async (request, response) => {
  const taskId = validateObjectId(request.params.id, "task");
  const task = await Task.findById(taskId);

  if (!task) {
    throw new AppError("Task not found", 404);
  }

  if (!task.attachment) {
    throw new AppError("Task does not have an attachment", 404);
  }

  const attachment = task.attachment;
  task.attachment = null;
  await task.save();

  const attachmentCleanupFailed = !(await deleteAttachmentSafely(
    attachment.publicId,
    attachment.resourceType,
  ));

  await task.populate("owner", "firstName lastName email roles");

  response.status(200).json({
    success: true,
    message: "Attachment deleted successfully",
    data: { task, attachmentCleanupFailed },
  });
};

export const getAdminUsers: RequestHandler = async (request, response) => {
  const query = adminUserQuerySchema.parse(request.query);
  const filter: QueryFilter<IUser> = {};

  if (query.role) {
    filter.roles = query.role;
  }

  if (query.banned === true) {
    filter["ban.isBanned"] = true;
  } else if (query.banned === false) {
    filter.$and = [
      ...(filter.$and ?? []),
      { $or: [{ ban: null }, { "ban.isBanned": { $ne: true } }] },
    ];
  }

  if (query.search) {
    const search = new RegExp(escapeRegExp(query.search), "i");
    filter.$or = [{ firstName: search }, { lastName: search }, { email: search }];
  }

  const skip = (query.page - 1) * query.limit;
  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(query.limit),
    User.countDocuments(filter),
  ]);

  response.status(200).json({
    success: true,
    data: {
      users: users.map(serializeUser),
      pagination: createPagination(total, query.page, query.limit),
    },
  });
};

export const getAdminUserById: RequestHandler = async (request, response) => {
  const userId = validateObjectId(request.params.id, "user");
  const user = await User.findById(userId);

  if (!user) {
    throw new AppError("User not found", 404);
  }

  const now = new Date();
  const [taskCount, activeSessionCount] = await Promise.all([
    Task.countDocuments({ owner: userId }),
    RefreshSession.countDocuments({
      user: userId,
      revokedAt: null,
      expiresAt: { $gt: now },
    }),
  ]);

  response.status(200).json({
    success: true,
    data: {
      user: serializeUser(user),
      stats: { taskCount, activeSessionCount },
    },
  });
};

export const updateAdminUser: RequestHandler = async (request, response) => {
  const userId = validateObjectId(request.params.id, "user");
  const user = await User.findById(userId);

  if (!user) {
    throw new AppError("User not found", 404);
  }

  if (
    String(user._id) !== request.user?.userId &&
    !canDeleteAccount(request.user?.roles ?? [], user.roles)
  ) {
    throw new AppError("You do not have permission to edit this account", 403);
  }

  const { firstName, lastName, email } = request.body as {
    firstName?: string;
    lastName?: string;
    email?: string;
  };

  if (email && email !== user.email) {
    const emailExists = await User.exists({
      _id: { $ne: user._id },
      email,
    });

    if (emailExists) {
      throw new AppError("An account with this email already exists", 409);
    }
  }

  if (firstName !== undefined) {
    user.firstName = firstName;
  }
  if (lastName !== undefined) {
    user.lastName = lastName;
  }
  if (email !== undefined) {
    user.email = email;
  }

  try {
    await user.save();
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      throw new AppError("An account with this email already exists", 409);
    }

    throw error;
  }

  response.status(200).json({
    success: true,
    message: "User updated successfully",
    data: { user: serializeUser(user) },
  });
};

export const updateAdminRole: RequestHandler = async (request, response) => {
  const actorId = requireAdminId(request.user?.userId);
  const userId = validateObjectId(request.params.id, "user");
  const { isAdmin } = request.body as { isAdmin: boolean };
  const user = await User.findById(userId);

  if (!user) {
    throw new AppError("User not found", 404);
  }

  const result = await setAdministratorRole(
    { userId: actorId, roles: request.user?.roles ?? [] },
    user,
    isAdmin,
  );

  response.status(200).json({
    success: true,
    message: isAdmin
      ? "Administrator role enabled successfully"
      : "Administrator role removed successfully",
    data: {
      user: serializeUser(result.user),
      sessionsRevoked: result.sessionsRevoked,
    },
  });
};

export const banAdminUser: RequestHandler = async (request, response) => {
  const actorId = requireAdminId(request.user?.userId);
  const userId = validateObjectId(request.params.id, "user");

  if (actorId === userId) {
    throw new AppError("You cannot ban your own account", 400);
  }

  const user = await User.findById(userId);
  if (!user) throw new AppError("User not found", 404);

  if (!canManageBan(request.user?.roles ?? [], user.roles)) {
    throw new AppError("You do not have permission to ban this account", 403);
  }

  const { reason } = request.body as { reason: BanReason };
  const result = await banUser(user, reason);

  response.status(200).json({
    success: true,
    message: "User banned successfully",
    data: {
      user: serializeUser(result.user),
      sessionsRevoked: result.sessionsRevoked,
    },
  });
};

export const unbanAdminUser: RequestHandler = async (request, response) => {
  const userId = validateObjectId(request.params.id, "user");
  const user = await User.findById(userId);
  if (!user) throw new AppError("User not found", 404);

  if (!canManageBan(request.user?.roles ?? [], user.roles)) {
    throw new AppError("You do not have permission to unban this account", 403);
  }

  if (!user.ban?.isBanned) {
    throw new AppError("This user is not banned", 409);
  }

  await unbanUser(user);
  response.status(200).json({
    success: true,
    message: "User unbanned successfully",
    data: { user: serializeUser(user) },
  });
};

export const deleteAdminUser: RequestHandler = async (request, response) => {
  const currentAdminId = requireAdminId(request.user?.userId);
  const userId = validateObjectId(request.params.id, "user");

  if (currentAdminId === userId) {
    throw new AppError("You cannot delete your own administrator account", 400);
  }

  const user = await User.findById(userId);

  if (!user) {
    throw new AppError("User not found", 404);
  }

  if (!canDeleteAccount(request.user?.roles ?? [], user.roles)) {
    throw new AppError("You do not have permission to delete this account", 403);
  }

  const tasks = await Task.find({ owner: user._id }).select("attachment");
  const attachments = tasks.flatMap((task) => (task.attachment ? [task.attachment] : []));

  await RefreshSession.updateMany(
    { user: user._id, revokedAt: null },
    {
      $set: {
        revokedAt: new Date(),
        revocationReason: "user-deleted",
      },
    },
  );

  const taskDeleteResult = await Task.deleteMany({ owner: user._id });
  await RefreshSession.deleteMany({ user: user._id });
  const chatDeleteResult = await SupportChat.deleteMany({ user: user._id });
  await User.deleteOne({ _id: user._id });

  const cleanupResults = await Promise.allSettled(
    attachments.map((attachment) =>
      deleteAttachmentFromCloudinary(attachment.publicId, attachment.resourceType),
    ),
  );
  const attachmentCleanupFailures = cleanupResults.filter(
    (result) => result.status === "rejected",
  ).length;

  if (attachmentCleanupFailures > 0) {
    console.error(
      `Failed to delete ${attachmentCleanupFailures} Cloudinary attachment(s) for deleted user ${userId}`,
    );
  }

  response.status(200).json({
    success: true,
    message: "User and related data deleted successfully",
    data: {
      deletedTaskCount: taskDeleteResult.deletedCount,
      deletedChatCount: chatDeleteResult.deletedCount,
      attachmentCleanupFailures,
    },
  });
};
