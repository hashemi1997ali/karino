import type { RefreshTokenPayload } from "../utils/auth.ts";

export {};

declare global {
  namespace Express {
    interface AuthUser {
      userId: string;
      sessionId: string;
      roles: string[];
    }

    interface Request {
      user?: AuthUser;
      refreshAuth?: RefreshTokenPayload;
    }
  }
}
