import type { QueryFilter, SortOrder } from "mongoose";
import mongoose from "mongoose";
import type { RequestHandler } from "express";

import { Task, User, type ITask } from "#models";
import { deleteAttachmentFromCloudinary, uploadAttachment } from "#middlewares";
import { AppError, applyTaskStatusTransition } from "#utils";
import { taskQuerySchema } from "#schemas";

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const requireUserId = (userId: string | undefined): string => {
  if (!userId) {
    throw new AppError("Authentication required", 401);
  }

  return userId;
};

const validateTaskId = (id: unknown): string => {
  if (typeof id !== "string" || !mongoose.isValidObjectId(id)) {
    throw new AppError("Invalid task ID", 400);
  }

  return id;
};

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

export const createTask: RequestHandler = async (request, response) => {
  const owner = requireUserId(request.user?.userId);
  const ownerExists = await User.exists({ _id: owner });

  if (!ownerExists) {
    throw new AppError("User no longer exists", 401);
  }

  const attachment = await createAttachment(request.file);

  try {
    const task = await Task.create({
      ...request.body,
      owner,
      ...(attachment && { attachment }),
      completedAt: request.body.status === "done" ? new Date() : null,
    });

    response.status(201).json({
      success: true,
      message: "Task created successfully",
      data: { task },
    });
  } catch (error) {
    if (attachment) {
      await deleteAttachmentFromCloudinary(
        attachment.publicId,
        attachment.resourceType,
      ).catch(() => undefined);
    }

    throw error;
  }
};

export const getTasks: RequestHandler = async (request, response) => {
  const owner = requireUserId(request.user?.userId);
  const filter: QueryFilter<ITask> = { owner };
  const query = taskQuerySchema.parse(request.query);

  if (query.status) {
    filter.status = query.status;
  }

  if (query.priority) {
    filter.priority = query.priority;
  }

  if (query.search) {
    const regex = new RegExp(escapeRegExp(query.search), "i");
    filter.$or = [{ title: regex }, { description: regex }];
  }

  if (query.dueBefore || query.dueAfter) {
    const dueDateFilter: { $lte?: Date; $gte?: Date } = {};

    if (query.dueBefore) {
      dueDateFilter.$lte = query.dueBefore;
    }

    if (query.dueAfter) {
      dueDateFilter.$gte = query.dueAfter;
    }

    filter.dueDate = dueDateFilter;
  }

  const { page, limit } = query;
  const skip = (page - 1) * limit;
  const order: SortOrder = query.order === "asc" ? 1 : -1;

  const [tasks, total] = await Promise.all([
    Task.find(filter)
      .sort({ [query.sortBy]: order, _id: order })
      .skip(skip)
      .limit(limit),
    Task.countDocuments(filter),
  ]);

  response.status(200).json({
    success: true,
    data: {
      tasks,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1,
      },
    },
  });
};

export const getTaskById: RequestHandler = async (request, response) => {
  const owner = requireUserId(request.user?.userId);
  const taskId = validateTaskId(request.params.id);
  const task = await Task.findOne({ _id: taskId, owner });

  if (!task) {
    throw new AppError("Task not found", 404);
  }

  response.status(200).json({ success: true, data: { task } });
};

export const updateTask: RequestHandler = async (request, response) => {
  const owner = requireUserId(request.user?.userId);
  const taskId = validateTaskId(request.params.id);

  if (Object.keys(request.body).length === 0 && !request.file) {
    throw new AppError("At least one task field or an attachment must be provided", 400);
  }

  const task = await Task.findOne({ _id: taskId, owner });

  if (!task) {
    throw new AppError("Task not found", 404);
  }

  const newAttachment = await createAttachment(request.file);
  const oldAttachment = task.attachment;

  try {
    applyTaskStatusTransition(task, request.body.status);
    Object.assign(task, request.body);

    if (newAttachment) {
      task.attachment = newAttachment;
    }

    await task.save();

    if (newAttachment && oldAttachment) {
      await deleteAttachmentFromCloudinary(
        oldAttachment.publicId,
        oldAttachment.resourceType,
      ).catch(() => undefined);
    }

    response.status(200).json({
      success: true,
      message: "Task updated successfully",
      data: { task },
    });
  } catch (error) {
    if (newAttachment) {
      await deleteAttachmentFromCloudinary(
        newAttachment.publicId,
        newAttachment.resourceType,
      ).catch(() => undefined);
    }
    throw error;
  }
};

export const deleteTask: RequestHandler = async (request, response) => {
  const owner = requireUserId(request.user?.userId);
  const taskId = validateTaskId(request.params.id);
  const task = await Task.findOneAndDelete({ _id: taskId, owner });

  if (!task) {
    throw new AppError("Task not found", 404);
  }

  if (task.attachment) {
    await deleteAttachmentFromCloudinary(
      task.attachment.publicId,
      task.attachment.resourceType,
    ).catch(() => undefined);
  }

  response.status(200).json({
    success: true,
    message: "Task deleted successfully",
  });
};

export const deleteTaskAttachment: RequestHandler = async (request, response) => {
  const owner = requireUserId(request.user?.userId);
  const taskId = validateTaskId(request.params.id);
  const task = await Task.findOne({ _id: taskId, owner });

  if (!task) {
    throw new AppError("Task not found", 404);
  }

  if (!task.attachment) {
    throw new AppError("Task does not have an attachment", 404);
  }

  const attachment = task.attachment;
  task.attachment = null;
  await task.save();

  await deleteAttachmentFromCloudinary(
    attachment.publicId,
    attachment.resourceType,
  ).catch(() => undefined);

  response.status(200).json({
    success: true,
    message: "Attachment deleted successfully",
    data: { task },
  });
};

export const getTaskSummary: RequestHandler = async (request, response) => {
  const owner = requireUserId(request.user?.userId);

  const [summary] = await Task.aggregate<{
    total: number;
    todo: number;
    inProgress: number;
    done: number;
    low: number;
    medium: number;
    high: number;
    overdue: number;
  }>([
    { $match: { owner: new mongoose.Types.ObjectId(owner) } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        todo: { $sum: { $cond: [{ $eq: ["$status", "todo"] }, 1, 0] } },
        inProgress: {
          $sum: { $cond: [{ $eq: ["$status", "in-progress"] }, 1, 0] },
        },
        done: { $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] } },
        low: { $sum: { $cond: [{ $eq: ["$priority", "low"] }, 1, 0] } },
        medium: {
          $sum: { $cond: [{ $eq: ["$priority", "medium"] }, 1, 0] },
        },
        high: { $sum: { $cond: [{ $eq: ["$priority", "high"] }, 1, 0] } },
        overdue: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $ne: ["$status", "done"] },
                  { $ne: ["$dueDate", null] },
                  { $lt: ["$dueDate", new Date()] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
    { $project: { _id: 0 } },
  ]);

  response.status(200).json({
    success: true,
    data: {
      summary: summary ?? {
        total: 0,
        todo: 0,
        inProgress: 0,
        done: 0,
        low: 0,
        medium: 0,
        high: 0,
        overdue: 0,
      },
    },
  });
};
