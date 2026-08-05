import type { Request, RequestHandler, Response } from "express";
import mongoose from "mongoose";

import { PasswordReset, User, type IUserBan } from "#models";
import { deleteProfileImageFromCloudinary, uploadProfileImage } from "#middlewares";
import {
  createRefreshSession,
  deleteUserAccount,
  listActiveRefreshSessions,
  type RefreshSessionContext,
  revokeAllRefreshSessions,
  revokeOtherRefreshSessions,
  revokeRefreshSession,
  revokeRefreshSessionFromToken,
  rotateRefreshSession,
} from "#services";
import {
  AppError,
  clearRefreshTokenCookie,
  createAccessToken,
  REFRESH_TOKEN_COOKIE_NAME,
  setRefreshTokenCookie,
} from "#utils";

const serializeUser = (user: {
  _id: unknown;
  firstName: string;
  lastName: string;
  email: string;
  roles: string[];
  profileImage?: { url: string; publicId: string } | null;
  createdAt: Date;
  updatedAt: Date;
}) => ({
  id: String(user._id),
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  roles: user.roles,
  profileImage: user.profileImage ?? null,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const requireAuthUser = (request: Request): Express.AuthUser => {
  if (!request.user) {
    throw new AppError("Authentication required", 401);
  }

  return request.user;
};

const getSessionContext = (request: Request): RefreshSessionContext => ({
  userAgent: request.get("user-agent") ?? null,
  ipAddress: request.ip ?? null,
});

const createBannedError = (ban: IUserBan): AppError =>
  new AppError("Your account has been banned", 403).withPublicDetails({
    ban: { reason: ban.reason, bannedAt: ban.bannedAt },
  });

const issueNewSessionTokens = async (
  response: Response,
  userId: string,
  roles: string[],
  context: RefreshSessionContext,
): Promise<string> => {
  const refreshToken = await createRefreshSession(userId, context);
  let accessToken: string;

  try {
    accessToken = createAccessToken(userId, roles, refreshToken.sessionId);
  } catch (error) {
    await revokeRefreshSession(refreshToken.sessionId, userId, "logout").catch(
      () => undefined,
    );
    throw error;
  }

  setRefreshTokenCookie(response, refreshToken.token, refreshToken.expiresAt);

  return accessToken;
};

export const register: RequestHandler = async (request, response) => {
  const { firstName, lastName, email, password } = request.body;

  const existingUser = await User.findOne({ email }).select("ban").lean();

  if (existingUser) {
    if (existingUser.ban?.isBanned) {
      throw createBannedError(existingUser.ban);
    }

    throw new AppError("An account with this email already exists", 409);
  }

  const user = await User.create({
    firstName,
    lastName,
    email,
    password,
  });
  let accessToken: string;

  try {
    accessToken = await issueNewSessionTokens(
      response,
      String(user._id),
      user.roles,
      getSessionContext(request),
    );
  } catch (error) {
    try {
      await User.deleteOne({ _id: user._id });
    } catch (rollbackError) {
      console.error(
        "Failed to roll back user after refresh session creation failed:",
        rollbackError,
      );
    }

    throw error;
  }

  response.status(201).json({
    success: true,
    message: "Account created successfully",
    data: { user: serializeUser(user), accessToken },
  });
};

export const login: RequestHandler = async (request, response) => {
  const { email, password } = request.body;

  const user = await User.findOne({ email }).select("+password");

  if (!user || !(await user.comparePassword(password))) {
    throw new AppError("Invalid email or password", 401);
  }

  if (user.ban?.isBanned) {
    throw createBannedError(user.ban);
  }

  const accessToken = await issueNewSessionTokens(
    response,
    String(user._id),
    user.roles,
    getSessionContext(request),
  );

  response.status(200).json({
    success: true,
    message: "Logged in successfully",
    data: { user: serializeUser(user), accessToken },
  });
};

export const getMe: RequestHandler = async (request, response) => {
  const authUser = requireAuthUser(request);
  const user = await User.findById(authUser.userId);

  if (!user) {
    throw new AppError("User not found", 404);
  }

  response.status(200).json({
    success: true,
    data: { user: serializeUser(user) },
  });
};

export const updateMe: RequestHandler = async (request, response) => {
  const authUser = requireAuthUser(request);
  const user = await User.findById(authUser.userId);

  if (!user) {
    throw new AppError("User not found", 404);
  }

  const { firstName, lastName, email, removeProfileImage } = request.body;
  if (email !== undefined && email !== user.email) {
    const emailAlreadyExists = await User.exists({
      _id: { $ne: user._id },
      email,
    });

    if (emailAlreadyExists) {
      throw new AppError("An account with this email already exists", 409);
    }
  }

  const uploadedImage = request.file ? await uploadProfileImage(request.file) : null;
  const previousImage = user.profileImage;

  if (firstName !== undefined) {
    user.firstName = firstName;
  }
  if (lastName !== undefined) {
    user.lastName = lastName;
  }
  const emailChanged = email !== undefined && email !== user.email;
  if (email !== undefined) {
    user.email = email;
  }

  if (uploadedImage) {
    user.profileImage = {
      url: uploadedImage.secure_url,
      publicId: uploadedImage.public_id,
    };
  } else if (removeProfileImage) {
    user.profileImage = null;
  }

  try {
    await user.save();
  } catch (error) {
    if (uploadedImage) {
      await deleteProfileImageFromCloudinary(uploadedImage.public_id).catch(
        () => undefined,
      );
    }
    throw error;
  }
  if ((uploadedImage || removeProfileImage) && previousImage) {
    await deleteProfileImageFromCloudinary(previousImage.publicId).catch(() => undefined);
  }
  if (emailChanged) await PasswordReset.deleteMany({ user: user._id });

  response.status(200).json({
    success: true,
    message: "Profile updated successfully",
    data: { user: serializeUser(user) },
  });
};

export const changePassword: RequestHandler = async (request, response) => {
  const authUser = requireAuthUser(request);
  const { currentPassword, newPassword } = request.body;
  const user = await User.findById(authUser.userId).select("+password");

  if (!user) {
    throw new AppError("User not found", 404);
  }

  if (!(await user.comparePassword(currentPassword))) {
    throw new AppError("Current password is incorrect", 400);
  }

  if (await user.comparePassword(newPassword)) {
    throw new AppError("New password must be different", 400);
  }

  const revokedSessions = await revokeOtherRefreshSessions(
    authUser.userId,
    authUser.sessionId,
    "password-changed",
  );

  user.password = newPassword;
  await user.save();
  await PasswordReset.deleteMany({ user: user._id });

  response.status(200).json({
    success: true,
    message: "Password changed successfully",
    data: { revokedSessions },
  });
};

export const deleteMe: RequestHandler = async (request, response) => {
  const authUser = requireAuthUser(request);
  const user = await User.findById(authUser.userId);

  if (!user) {
    clearRefreshTokenCookie(response);
    throw new AppError("User not found", 404);
  }

  const deletion = await deleteUserAccount(user);
  clearRefreshTokenCookie(response);

  response.status(200).json({
    success: true,
    message: "Account and related data deleted successfully",
    data: deletion,
  });
};

export const getSessions: RequestHandler = async (request, response) => {
  const authUser = requireAuthUser(request);
  const sessions = await listActiveRefreshSessions(authUser.userId, authUser.sessionId);

  response.status(200).json({
    success: true,
    data: { sessions },
  });
};

export const logoutOtherSessions: RequestHandler = async (request, response) => {
  const authUser = requireAuthUser(request);
  const revokedSessions = await revokeOtherRefreshSessions(
    authUser.userId,
    authUser.sessionId,
  );

  response.status(200).json({
    success: true,
    message: "Other sessions logged out successfully",
    data: { revokedSessions },
  });
};

export const logoutAllSessions: RequestHandler = async (request, response) => {
  const authUser = requireAuthUser(request);
  const revokedSessions = await revokeAllRefreshSessions(authUser.userId);

  clearRefreshTokenCookie(response);
  response.status(200).json({
    success: true,
    message: "All sessions logged out successfully",
    data: { revokedSessions },
  });
};

export const revokeSession: RequestHandler = async (request, response) => {
  const authUser = requireAuthUser(request);
  const sessionId = request.params.sessionId;

  if (typeof sessionId !== "string" || !mongoose.isValidObjectId(sessionId)) {
    throw new AppError("Invalid session ID", 400);
  }

  const revoked = await revokeRefreshSession(sessionId, authUser.userId, "logout");

  if (!revoked) {
    throw new AppError("Active session not found", 404);
  }

  const isCurrent = sessionId === authUser.sessionId;
  if (isCurrent) {
    clearRefreshTokenCookie(response);
  }

  response.status(200).json({
    success: true,
    message: "Session logged out successfully",
    data: { isCurrent },
  });
};

export const refreshAccessToken: RequestHandler = async (request, response) => {
  const refreshAuth = request.refreshAuth;

  if (!refreshAuth) {
    throw new AppError("Refresh authentication is required", 401);
  }

  const user = await User.findById(refreshAuth.userId);

  if (!user) {
    await revokeRefreshSession(refreshAuth.sessionId, refreshAuth.userId, "user-deleted");
    clearRefreshTokenCookie(response);
    throw new AppError("User no longer exists", 401);
  }

  if (user.ban?.isBanned) {
    await revokeRefreshSession(refreshAuth.sessionId, refreshAuth.userId, "banned");
    clearRefreshTokenCookie(response);
    throw createBannedError(user.ban);
  }

  const accessToken = createAccessToken(
    String(user._id),
    user.roles,
    refreshAuth.sessionId,
  );

  try {
    const refreshToken = await rotateRefreshSession(
      refreshAuth,
      getSessionContext(request),
    );
    setRefreshTokenCookie(response, refreshToken.token, refreshToken.expiresAt);
  } catch (error) {
    if (error instanceof AppError && error.statusCode === 401) {
      clearRefreshTokenCookie(response);
    }

    throw error;
  }

  response.status(200).json({
    success: true,
    message: "Token refreshed successfully",
    data: { accessToken },
  });
};

export const logout: RequestHandler = async (request, response) => {
  const token = request.cookies?.[REFRESH_TOKEN_COOKIE_NAME] as unknown;

  try {
    if (typeof token === "string" && token.length > 0) {
      await revokeRefreshSessionFromToken(token, "logout");
    }
  } finally {
    clearRefreshTokenCookie(response);
  }

  response.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
};
