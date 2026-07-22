import { createHash, randomUUID } from "node:crypto";

import jwt from "jsonwebtoken";
import { Types } from "mongoose";

import { RefreshSession, type RefreshSessionRevocationReason } from "#models";
import {
  AppError,
  createRefreshToken,
  getRefreshTokenTtl,
  type RefreshTokenPayload,
  verifyRefreshToken,
  normalizeIpAddress,
} from "#utils";

export interface IssuedRefreshToken {
  token: string;
  sessionId: string;
  expiresAt: Date;
}

export interface RefreshSessionContext {
  userAgent?: string | null;
  ipAddress?: string | null;
}

export interface ListedRefreshSession {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: Date;
  lastUsedAt: Date;
  expiresAt: Date;
  rotationCounter: number;
  isCurrent: boolean;
}

const objectIdPattern = /^[a-f\d]{24}$/i;

const hashJti = (jti: string): string => createHash("sha256").update(jti).digest("hex");

const hasValidSessionReference = (sessionId: string, userId: string): boolean =>
  objectIdPattern.test(sessionId) && objectIdPattern.test(userId);

const normalizeContext = (
  context: RefreshSessionContext,
): Required<RefreshSessionContext> => ({
  userAgent: context.userAgent?.trim().slice(0, 512) || null,
  ipAddress: normalizeIpAddress(context.ipAddress) ?? null,
});

export const createRefreshSession = async (
  userId: string,
  context: RefreshSessionContext = {},
): Promise<IssuedRefreshToken> => {
  const sessionId = new Types.ObjectId();
  const nowInSeconds = Math.floor(Date.now() / 1000);
  const expiresAt = new Date((nowInSeconds + getRefreshTokenTtl()) * 1000);
  const jti = randomUUID();
  const token = createRefreshToken(userId, String(sessionId), jti, expiresAt);
  const sessionContext = normalizeContext(context);

  const session = new RefreshSession({
    _id: sessionId,
    user: userId,
    currentJtiHash: hashJti(jti),
    ...sessionContext,
    expiresAt,
    lastUsedAt: new Date(),
  });

  await session.save();

  return { token, sessionId: String(sessionId), expiresAt };
};

export const rotateRefreshSession = async (
  payload: RefreshTokenPayload,
  context: RefreshSessionContext = {},
): Promise<IssuedRefreshToken> => {
  if (!hasValidSessionReference(payload.sessionId, payload.userId)) {
    throw new AppError("Invalid refresh session", 401);
  }

  const now = new Date();
  const expiresAt = new Date(payload.exp * 1000);

  if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= now.getTime()) {
    throw new AppError("Refresh session is no longer active", 401);
  }

  const presentedJtiHash = hashJti(payload.jti);
  const nextJti = randomUUID();
  const nextJtiHash = hashJti(nextJti);
  const nextToken = createRefreshToken(
    payload.userId,
    payload.sessionId,
    nextJti,
    expiresAt,
  );
  const sessionContext = normalizeContext(context);
  const tokenMatches = { $eq: ["$currentJtiHash", presentedJtiHash] };

  // A single MongoDB document represents the whole token family. This update
  // either rotates the current JTI or atomically revokes the family when an
  // older JTI is replayed.
  const previousSession = await RefreshSession.findOneAndUpdate(
    {
      _id: payload.sessionId,
      user: payload.userId,
      revokedAt: null,
      expiresAt: { $eq: expiresAt, $gt: now },
    },
    [
      {
        $set: {
          currentJtiHash: {
            $cond: [tokenMatches, nextJtiHash, "$currentJtiHash"],
          },
          lastUsedAt: {
            $cond: [tokenMatches, now, "$lastUsedAt"],
          },
          userAgent: {
            $cond: [tokenMatches, sessionContext.userAgent ?? "$userAgent", "$userAgent"],
          },
          ipAddress: {
            $cond: [tokenMatches, sessionContext.ipAddress ?? "$ipAddress", "$ipAddress"],
          },
          rotationCounter: {
            $cond: [
              tokenMatches,
              { $add: [{ $ifNull: ["$rotationCounter", 0] }, 1] },
              "$rotationCounter",
            ],
          },
          revokedAt: {
            $cond: [tokenMatches, "$revokedAt", now],
          },
          revocationReason: {
            $cond: [tokenMatches, "$revocationReason", "reuse-detected"],
          },
        },
      },
    ],
    { returnDocument: "before", updatePipeline: true },
  ).select("+currentJtiHash");

  if (!previousSession) {
    throw new AppError("Refresh session is no longer active", 401);
  }

  if (previousSession.currentJtiHash !== presentedJtiHash) {
    throw new AppError("Refresh token reuse detected. Please log in again", 401);
  }

  return {
    token: nextToken,
    sessionId: payload.sessionId,
    expiresAt,
  };
};

export const listActiveRefreshSessions = async (
  userId: string,
  currentSessionId: string,
): Promise<ListedRefreshSession[]> => {
  if (!hasValidSessionReference(currentSessionId, userId)) {
    throw new AppError("Invalid refresh session", 401);
  }

  const sessions = await RefreshSession.find({
    user: userId,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  }).sort({ lastUsedAt: -1, createdAt: -1 });

  return sessions.map((session) => ({
    id: String(session._id),
    userAgent: session.userAgent,
    ipAddress: session.ipAddress,
    createdAt: session.createdAt,
    lastUsedAt: session.lastUsedAt,
    expiresAt: session.expiresAt,
    rotationCounter: session.rotationCounter,
    isCurrent: String(session._id) === currentSessionId,
  }));
};

export const revokeOtherRefreshSessions = async (
  userId: string,
  currentSessionId: string,
  reason: RefreshSessionRevocationReason = "logout-others",
): Promise<number> => {
  if (!hasValidSessionReference(currentSessionId, userId)) {
    throw new AppError("Invalid refresh session", 401);
  }

  const result = await RefreshSession.updateMany(
    {
      user: userId,
      _id: { $ne: currentSessionId },
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    },
    {
      $set: {
        revokedAt: new Date(),
        revocationReason: reason,
      },
    },
  );

  return result.modifiedCount;
};

export const revokeAllRefreshSessions = async (
  userId: string,
  reason: RefreshSessionRevocationReason = "logout-all",
): Promise<number> => {
  if (!objectIdPattern.test(userId)) {
    throw new AppError("Invalid user", 401);
  }

  const result = await RefreshSession.updateMany(
    {
      user: userId,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    },
    {
      $set: {
        revokedAt: new Date(),
        revocationReason: reason,
      },
    },
  );

  return result.modifiedCount;
};

export const revokeRefreshSession = async (
  sessionId: string,
  userId: string,
  reason: RefreshSessionRevocationReason,
): Promise<boolean> => {
  if (!hasValidSessionReference(sessionId, userId)) {
    return false;
  }

  const result = await RefreshSession.updateOne(
    {
      _id: sessionId,
      user: userId,
      revokedAt: null,
    },
    {
      $set: {
        revokedAt: new Date(),
        revocationReason: reason,
      },
    },
  );

  return result.modifiedCount > 0;
};

export const revokeRefreshSessionFromToken = async (
  token: string,
  reason: RefreshSessionRevocationReason,
): Promise<boolean> => {
  let payload: RefreshTokenPayload;

  try {
    payload = verifyRefreshToken(token);
  } catch (error) {
    if (
      error instanceof jwt.TokenExpiredError ||
      error instanceof jwt.JsonWebTokenError
    ) {
      return false;
    }

    throw error;
  }

  return revokeRefreshSession(payload.sessionId, payload.userId, reason);
};
