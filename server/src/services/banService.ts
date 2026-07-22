import type { HydratedDocument, Types } from "mongoose";

import { RefreshSession, User, type BanReason, type IUser } from "#models";
import { getIpLookupCandidates, normalizeIpAddress } from "#utils";

export interface BanResult {
  user: HydratedDocument<IUser>;
  sessionsRevoked: number;
}

/**
 * Returns the IP addresses of every session document that still exists for a
 * user. Revoked and expired sessions remain included until MongoDB actually
 * removes their documents, which keeps ban details and registration blocking
 * in sync with the session collection.
 */
export const getLiveBanSessionIps = async (
  userId: Types.ObjectId | string,
): Promise<string[]> => {
  const sessions = await RefreshSession.find({ user: userId }).select("ipAddress").lean();
  return [
    ...new Set(
      sessions.flatMap((session) => {
        const normalized = normalizeIpAddress(session.ipAddress);
        return normalized ? [normalized] : [];
      }),
    ),
  ];
};

/** Finds a currently banned account that owns a still-existing session on the IP. */
export const findBannedUserBySessionIp = async (ipAddress: string | null | undefined) => {
  const candidates = getIpLookupCandidates(ipAddress);
  if (candidates.length === 0) return null;

  const userIds = await RefreshSession.distinct("user", {
    ipAddress: { $in: candidates },
  });
  if (userIds.length === 0) return null;

  return User.findOne({ _id: { $in: userIds }, "ban.isBanned": true }).select("ban");
};

/**
 * Bans a user and records a compatibility snapshot of all session IPs. The
 * session collection remains the source of truth for reads and registration
 * checks, so deleting a session automatically removes its live ban IP.
 */
export const banUser = async (
  user: HydratedDocument<IUser>,
  reason: BanReason,
): Promise<BanResult> => {
  const sessionIps = await getLiveBanSessionIps(user._id);

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

export const unbanUser = async (
  user: HydratedDocument<IUser>,
): Promise<HydratedDocument<IUser>> => {
  user.ban = null;
  await user.save();
  return user;
};

export const findBannedUserByEmail = (email: string) =>
  User.findOne({ email, "ban.isBanned": true });
