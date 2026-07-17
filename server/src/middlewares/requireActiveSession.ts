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
    const [sessionExists, user] = await Promise.all([
      RefreshSession.exists({
        _id: request.user.sessionId,
        user: request.user.userId,
        revokedAt: null,
        expiresAt: { $gt: new Date() },
      }),
      User.findById(request.user.userId).select("ban").lean(),
    ]);

    if (!sessionExists || !user) {
      next(new AppError("Session is no longer active", 401));
      return;
    }

    if (user.ban?.isBanned) {
      next(
        new AppError("Your account has been banned", 403).withPublicDetails({
          ban: { reason: user.ban.reason, bannedAt: user.ban.bannedAt },
        }),
      );
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
};
