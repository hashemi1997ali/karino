import type { HydratedDocument } from "mongoose";

import { RefreshSession, type IUser } from "#models";
import { AppError, isSuperAdminRoles } from "#utils";

export interface RoleChangeResult {
  user: HydratedDocument<IUser>;
  sessionsRevoked: number;
  changed: boolean;
}

export const setAdministratorRole = async (
  actor: { userId: string; roles: readonly string[] },
  user: HydratedDocument<IUser>,
  isAdmin: boolean,
): Promise<RoleChangeResult> => {
  if (!isSuperAdminRoles(actor.roles)) {
    throw new AppError("Only a super administrator can change administrator roles", 403);
  }

  if (user.roles.includes("super_admin")) {
    throw new AppError("A super administrator role cannot be changed here", 403);
  }

  if (String(user._id) === actor.userId && !isAdmin) {
    throw new AppError("You cannot remove your own administrator role", 400);
  }

  const currentlyAdmin = user.roles.includes("admin");
  const nextRoles = isAdmin ? ["user", "admin"] : ["user"];
  const changed =
    currentlyAdmin !== isAdmin ||
    user.roles.length !== nextRoles.length ||
    !user.roles.includes("user");

  if (!changed) {
    return { user, sessionsRevoked: 0, changed: false };
  }

  user.roles = nextRoles;
  await user.save();

  const result = await RefreshSession.updateMany(
    { user: user._id, revokedAt: null },
    {
      $set: {
        revokedAt: new Date(),
        revocationReason: "role-changed",
      },
    },
  );

  return { user, sessionsRevoked: result.modifiedCount, changed: true };
};
