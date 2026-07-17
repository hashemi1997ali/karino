export const isAdminRoles = (roles: readonly string[]): boolean =>
  roles.includes("admin");

export const isSuperAdminRoles = (roles: readonly string[]): boolean =>
  roles.includes("super_admin");

export const isStaffRoles = (roles: readonly string[]): boolean =>
  isAdminRoles(roles) || isSuperAdminRoles(roles);

/**
 * Super admins can manage users and admins; admins can only manage regular
 * users. Nobody can ban a super admin.
 */
export const canManageBan = (
  actorRoles: readonly string[],
  targetRoles: readonly string[],
): boolean => {
  if (isSuperAdminRoles(targetRoles)) return false;
  if (isAdminRoles(targetRoles)) return isSuperAdminRoles(actorRoles);
  return isStaffRoles(actorRoles);
};

/** Uses the same hierarchy for destructive account actions. */
export const canDeleteAccount = (
  actorRoles: readonly string[],
  targetRoles: readonly string[],
): boolean => canManageBan(actorRoles, targetRoles);
