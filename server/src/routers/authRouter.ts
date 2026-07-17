import { Router } from "express";

import {
  changePassword,
  getSessions,
  getMe,
  login,
  logout,
  logoutAllSessions,
  logoutOtherSessions,
  refreshAccessToken,
  register,
  revokeSession,
  updateMe,
} from "#controllers";
import {
  authenticate,
  authenticateRefreshToken,
  loginRateLimiter,
  refreshIpRateLimiter,
  refreshSessionRateLimiter,
  registerRateLimiter,
  requireActiveSession,
  validateByZod,
} from "#middlewares";
import {
  changePasswordSchema,
  loginSchema,
  registerSchema,
  updateProfileSchema,
} from "#schemas";

export const authRouter = Router();

authRouter.use((_request, response, next) => {
  response.set("Cache-Control", "no-store");
  next();
});

authRouter.post(
  "/register",
  registerRateLimiter,
  validateByZod(registerSchema),
  register,
);
authRouter.post("/login", loginRateLimiter, validateByZod(loginSchema), login);
authRouter.post(
  "/refresh",
  refreshIpRateLimiter,
  authenticateRefreshToken,
  refreshSessionRateLimiter,
  refreshAccessToken,
);
authRouter.post("/logout", logout);

authRouter
  .route("/me")
  .get(authenticate, requireActiveSession, getMe)
  .patch(
    authenticate,
    requireActiveSession,
    validateByZod(updateProfileSchema),
    updateMe,
  );

authRouter.patch(
  "/me/password",
  authenticate,
  requireActiveSession,
  validateByZod(changePasswordSchema),
  changePassword,
);

authRouter.get("/sessions", authenticate, requireActiveSession, getSessions);
authRouter.delete(
  "/sessions/others",
  authenticate,
  requireActiveSession,
  logoutOtherSessions,
);
authRouter.delete(
  "/sessions/:sessionId",
  authenticate,
  requireActiveSession,
  revokeSession,
);
authRouter.delete("/sessions", authenticate, requireActiveSession, logoutAllSessions);
