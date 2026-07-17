import type { NextFunction, Request, Response } from "express";

import { RefreshSession, User } from "#models";
import { AppError } from "#utils";

export const requireActiveSession = async (
  request: Request,
  _response: Response,
  next: NextFunction,
): Promise<void> => {
  if (!request.user) {
    next(new AppError("Authentication required", 401));
    return;
  }

  try {
    const [sessionExists, userExists] = await Promise.all([
      RefreshSession.exists({
        _id: request.user.sessionId,
        user: request.user.userId,
        revokedAt: null,
        expiresAt: { $gt: new Date() },
      }),
      User.exists({ _id: request.user.userId }),
    ]);

    if (!sessionExists || !userExists) {
      next(new AppError("Session is no longer active", 401));
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
};
