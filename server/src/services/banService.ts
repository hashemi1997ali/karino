import type { HydratedDocument } from "mongoose";

import { RefreshSession, User, type BanReason, type IUser } from "#models";

export interface BanResult {
  user: HydratedDocument<IUser>;
  sessionsRevoked: number;
}

/**
 * Bans a user: stores the reason, timestamp, and the IPs of all active
 * sessions, then revokes every active refresh session so the user is logged
 * out everywhere immediately.
 */
export const banUser = async (
  user: HydratedDocument<IUser>,
  reason: BanReason,
): Promise<BanResult> => {
  const activeSessions = await RefreshSession.find({
    user: user._id,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  }).select("ipAddress");

  const sessionIps = [
    ...new Set(
      activeSessions.flatMap((session) => (session.ipAddress ? [session.ipAddress] : [])),
    ),
  ];

  user.ban = {
    isBanned: true,
    reason,
    bannedAt: new Date(),
    sessionIps,
  };
  await user.save();

  const revokeResult = await RefreshSession.updateMany(
    { user: user._id, revokedAt: null },
    { $set: { revokedAt: new Date(), revocationReason: "banned" } },
  );

  return { user, sessionsRevoked: revokeResult.modifiedCount };
};

/**
 * Unbans a user by clearing every ban-related value so the account is clean
 * again.
 */
export const unbanUser = async (
  user: HydratedDocument<IUser>,
): Promise<HydratedDocument<IUser>> => {
  user.ban = null;
  await user.save();

  return user;
};

export const findBannedUserByEmail = (email: string) =>
  User.findOne({ email, "ban.isBanned": true });
