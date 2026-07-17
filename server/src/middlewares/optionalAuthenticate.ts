import type { NextFunction, Request, Response } from "express";

import { verifyAccessToken } from "#utils";

/**
 * Sets request.user when a valid Bearer token is present, but never rejects
 * the request. Used for endpoints that also serve anonymous visitors.
 */
export const optionalAuthenticate = (
  request: Request,
  _response: Response,
  next: NextFunction,
): void => {
  const authorization = request.headers.authorization;

  if (authorization?.startsWith("Bearer ")) {
    const token = authorization.slice("Bearer ".length).trim();

    if (token) {
      try {
        const payload = verifyAccessToken(token);
        request.user = {
          userId: payload.userId,
          sessionId: payload.sessionId,
          roles: payload.roles,
        };
      } catch {
        // Anonymous access is allowed; ignore invalid or expired tokens.
      }
    }
  }

  next();
};
