import type { RequestHandler } from "express";

import { Activity } from "#models";
import { AppError } from "#utils";

export const listOwnActivity: RequestHandler = async (request, response) => {
  const userId = request.user?.userId;
  if (!userId) throw new AppError("Authentication required", 401);

  const page = Math.max(1, Number(request.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(request.query.limit) || 20));
  const skip = (page - 1) * limit;
  const filter = { user: userId };
  const [activities, total] = await Promise.all([
    Activity.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).lean(),
    Activity.countDocuments(filter),
  ]);

  response.status(200).json({
    success: true,
    data: {
      activities,
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
