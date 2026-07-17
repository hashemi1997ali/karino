import type { NextFunction, Request, Response } from "express";

import { User } from "#models";
import { AppError, isStaffRoles, isSuperAdminRoles } from "#utils";

const createRoleGuard =
  (check: (roles: readonly string[]) => boolean, message: string) =>
  async (request: Request, _response: Response, next: NextFunction): Promise<void> => {
    if (!request.user?.userId) {
      next(new AppError("Authentication required", 401));
      return;
    }

    try {
      const currentUser = await User.findById(request.user.userId).select("roles").lean();

      if (!currentUser || !check(currentUser.roles)) {
        next(new AppError(message, 403));
        return;
      }

      // Use the database value instead of potentially stale JWT roles. This
      // makes a demotion effective immediately on all guarded routes.
      request.user.roles = currentUser.roles;
      next();
    } catch (error) {
      next(error);
    }
  };

/** Requires the current user to be an admin or super admin (staff). */
export const requireCurrentStaff = createRoleGuard(
  isStaffRoles,
  "Administrator permission is required",
);

/** Requires the current user to be a super admin. */
export const requireCurrentSuperAdmin = createRoleGuard(
  isSuperAdminRoles,
  "Super administrator permission is required",
);
