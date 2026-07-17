import type { NextFunction, Request, Response } from "express";

import { User } from "#models";
import { AppError } from "#utils";

export const requireCurrentAdmin = async (
  request: Request,
  _response: Response,
  next: NextFunction,
): Promise<void> => {
  if (!request.user?.userId) {
    next(new AppError("Authentication required", 401));
    return;
  }

  try {
    const currentUser = await User.findById(request.user.userId).select("roles").lean();

    if (!currentUser?.roles.includes("admin")) {
      next(new AppError("Administrator permission is required", 403));
      return;
    }

    // Use the database value instead of potentially stale JWT roles. This
    // makes an admin demotion effective immediately on all admin routes.
    request.user.roles = currentUser.roles;
    next();
  } catch (error) {
    next(error);
  }
};
