import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

import {
  AppError,
  clearRefreshTokenCookie,
  REFRESH_TOKEN_COOKIE_NAME,
  verifyRefreshToken,
} from "#utils";

export const authenticateRefreshToken = (
  request: Request,
  response: Response,
  next: NextFunction,
): void => {
  const token = request.cookies?.[REFRESH_TOKEN_COOKIE_NAME] as unknown;

  if (typeof token !== "string" || token.length === 0) {
    next(new AppError("Refresh token is missing", 401));
    return;
  }

  try {
    const payload = verifyRefreshToken(token);
    request.refreshAuth = payload;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      clearRefreshTokenCookie(response);
      next(new AppError("Refresh token has expired", 401));
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      clearRefreshTokenCookie(response);
      next(new AppError("Invalid refresh token", 401));
      return;
    }

    next(error);
  }
};
