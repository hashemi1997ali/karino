import type { HydratedDocument } from "mongoose";

import { RefreshSession, User, type BanReason, type IUser } from "#models";

export interface BanResult {
  user: HydratedDocument<IUser>;
  sessionsRevoked: number;
}

export const banUser = async (
  user: HydratedDocument<IUser>,
  reason: BanReason,
): Promise<BanResult> => {
  user.ban = {
    isBanned: true,
    reason,
    bannedAt: new Date(),
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
