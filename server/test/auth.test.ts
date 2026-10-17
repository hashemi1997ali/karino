import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

process.env.ACCESS_JWT_SECRET = "test-access-secret-that-is-long-enough";
process.env.REFRESH_JWT_SECRET = "test-refresh-secret-that-is-different";

const { authenticate, authorize } = await import("#middlewares");
const {
  AppError,
  createAccessToken,
  createRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} = await import("#utils");

const userId = "64b7f0c2a1b2c3d4e5f60718";
const sessionId = "64b7f0c2a1b2c3d4e5f60719";

const runMiddleware = (
  middleware: (request: Request, response: Response, next: NextFunction) => void,
  request: Partial<Request>,
): { error: unknown; request: Request } => {
  let error: unknown = "next-not-called";
  middleware(request as Request, {} as Response, (value?: unknown) => {
    error = value;
  });
  return { error, request: request as Request };
};

const bearer = (token: string): Partial<Request> => ({
  headers: { authorization: `Bearer ${token}` },
});

describe("JWT access tokens", () => {
  test("round-trips user, session and roles", () => {
    const payload = verifyAccessToken(
      createAccessToken(userId, ["user", "admin"], sessionId),
    );

    assert.equal(payload.userId, userId);
    assert.equal(payload.sessionId, sessionId);
    assert.deepEqual(payload.roles, ["user", "admin"]);
    assert.equal(payload.type, "access");
  });

  test("rejects a token signed with another secret", () => {
    const forged = jwt.sign(
      { userId, sessionId, roles: ["super_admin"], type: "access" },
      "attacker-secret",
      { algorithm: "HS256", issuer: "karino-api", subject: userId },
    );

    assert.throws(() => verifyAccessToken(forged), jwt.JsonWebTokenError);
  });

  test('rejects unsigned "alg: none" tokens', () => {
    const unsigned = jwt.sign(
      { userId, sessionId, roles: ["super_admin"], type: "access" },
      "",
      { algorithm: "none", issuer: "karino-api", subject: userId },
    );

    assert.throws(() => verifyAccessToken(unsigned), jwt.JsonWebTokenError);
  });

  test("rejects unknown roles injected into the payload", () => {
    const token = jwt.sign(
      { userId, sessionId, roles: ["root"], type: "access" },
      process.env.ACCESS_JWT_SECRET!,
      { algorithm: "HS256", issuer: "karino-api", subject: userId, expiresIn: 60 },
    );

    assert.throws(() => verifyAccessToken(token), /Invalid access token payload/);
  });

  test("rejects expired tokens", () => {
    const expired = jwt.sign(
      { userId, sessionId, roles: ["user"], type: "access" },
      process.env.ACCESS_JWT_SECRET!,
      { algorithm: "HS256", issuer: "karino-api", subject: userId, expiresIn: -10 },
    );

    assert.throws(() => verifyAccessToken(expired), jwt.TokenExpiredError);
  });

  test("a refresh token cannot be used as an access token", () => {
    const refresh = createRefreshToken(
      userId,
      sessionId,
      "jti-1",
      new Date(Date.now() + 60_000),
    );

    assert.throws(() => verifyAccessToken(refresh));
    assert.equal(verifyRefreshToken(refresh).jti, "jti-1");
  });

  test("refresh tokens must expire in the future", () => {
    assert.throws(
      () => createRefreshToken(userId, sessionId, "jti-2", new Date(Date.now() - 1000)),
      AppError,
    );
  });
});

describe("authenticate middleware", () => {
  test("returns 401 without a bearer token", () => {
    const { error } = runMiddleware(authenticate, { headers: {} });

    assert.ok(error instanceof AppError);
    assert.equal(error.statusCode, 401);
  });

  test("attaches the verified user to the request", () => {
    const token = createAccessToken(userId, ["user"], sessionId);
    const { error, request } = runMiddleware(authenticate, bearer(token));

    assert.equal(error, undefined);
    assert.deepEqual(request.user, { userId, sessionId, roles: ["user"] });
  });

  test("reports an expired token distinctly so the client can refresh", () => {
    const expired = jwt.sign(
      { userId, sessionId, roles: ["user"], type: "access" },
      process.env.ACCESS_JWT_SECRET!,
      { algorithm: "HS256", issuer: "karino-api", subject: userId, expiresIn: -10 },
    );
    const { error } = runMiddleware(authenticate, bearer(expired));

    assert.ok(error instanceof AppError);
    assert.equal(error.message, "Access token has expired");
  });
});

describe("authorize middleware", () => {
  test("allows a matching role", () => {
    const { error } = runMiddleware(authorize("admin"), {
      user: { userId, sessionId, roles: ["user", "admin"] },
    });

    assert.equal(error, undefined);
  });

  test("returns 403 for a missing role", () => {
    const { error } = runMiddleware(authorize("admin", "super_admin"), {
      user: { userId, sessionId, roles: ["user"] },
    });

    assert.ok(error instanceof AppError);
    assert.equal(error.statusCode, 403);
  });
});
