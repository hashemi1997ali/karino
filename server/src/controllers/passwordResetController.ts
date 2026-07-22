import { createHash, randomBytes } from "node:crypto";

import type { RequestHandler } from "express";

import { PasswordReset, User } from "#models";
import {
  ensureTransactionalEmailConfigured,
  revokeAllRefreshSessions,
  sendPasswordResetEmail,
} from "#services";
import { AppError, getPositiveIntegerEnv } from "#utils";

const hashToken = (token: string): string =>
  createHash("sha256").update(token).digest("hex");

const genericMessage =
  "If an account exists for that email, a password reset link has been sent";

export const forgotPassword: RequestHandler = async (request, response) => {
  ensureTransactionalEmailConfigured();
  const { email, locale } = request.body as {
    email: string;
    locale: "en" | "de";
  };
  const user = await User.findOne({ email }).select("firstName lastName email ban");

  if (user && !user.ban?.isBanned) {
    const token = randomBytes(32).toString("base64url");
    const ttlMinutes = getPositiveIntegerEnv("PASSWORD_RESET_TOKEN_TTL_MINUTES", 60);
    await PasswordReset.deleteMany({ user: user._id });
    const reset = await PasswordReset.create({
      user: user._id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + ttlMinutes * 60 * 1000),
    });

    try {
      await sendPasswordResetEmail({
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        token,
        locale,
      });
    } catch (error) {
      await PasswordReset.deleteOne({ _id: reset._id });
      console.error("Failed to send password reset email:", error);
    }
  }

  response.status(200).json({ success: true, message: genericMessage });
};

export const resetPassword: RequestHandler = async (request, response) => {
  const { token, password } = request.body as { token: string; password: string };
  const tokenHash = hashToken(token);
  const reset = await PasswordReset.findOne({
    tokenHash,
    expiresAt: { $gt: new Date() },
  });
  if (!reset) throw new AppError("This password reset link is invalid or expired", 400);

  const user = await User.findById(reset.user).select("+password");
  if (!user) {
    await PasswordReset.deleteOne({ _id: reset._id });
    throw new AppError("This password reset link is invalid or expired", 400);
  }
  if (await user.comparePassword(password)) {
    throw new AppError("New password must be different from your current password", 400);
  }

  const claimed = await PasswordReset.findOneAndDelete({
    _id: reset._id,
    tokenHash,
    expiresAt: { $gt: new Date() },
  });
  if (!claimed) throw new AppError("This password reset link is invalid or expired", 400);

  user.password = password;
  await user.save();
  await Promise.all([
    PasswordReset.deleteMany({ user: user._id }),
    revokeAllRefreshSessions(String(user._id), "password-changed"),
  ]);

  response.status(200).json({
    success: true,
    message: "Password reset successfully. You can now sign in",
  });
};
