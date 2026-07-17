"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  getMeRequest,
  loginRequest,
  logoutRequest,
  registerRequest,
  type LoginValues,
  type RegisterValues,
} from "@/features/auth/api";
import {
  clearAccessToken,
  setAccessToken,
  subscribeToAuthEvents,
} from "@/features/auth/token-vault";
import { refreshAccessToken } from "@/lib/api-client";
import type { User } from "@/lib/types";

type AuthStatus = "loading" | "authenticated" | "anonymous";

interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  login: (values: LoginValues) => Promise<User>;
  register: (values: RegisterValues) => Promise<User>;
  logout: () => Promise<void>;
  endSessionLocally: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<User | null>(null);

  const endSessionLocally = useCallback(() => {
    clearAccessToken({ broadcast: true });
    setUser(null);
    setStatus("anonymous");
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      try {
        const hintResponse = await fetch("/api/session-hint", {
          cache: "no-store",
          credentials: "include",
        });
        const hint = (await hintResponse.json()) as { hasSession?: boolean };

        if (!hint.hasSession) {
          if (active) setStatus("anonymous");
          return;
        }

        await refreshAccessToken();
        const currentUser = await getMeRequest();
        if (active) {
          setUser(currentUser);
          setStatus("authenticated");
        }
      } catch {
        if (active) {
          setUser(null);
          setStatus("anonymous");
        }
      }
    };

    void bootstrap();
    return () => {
      active = false;
    };
  }, []);

  useEffect(
    () =>
      subscribeToAuthEvents((event) => {
        if (event.type === "signed-out") {
          setUser(null);
          setStatus("anonymous");
          queryClient.clear();
          return;
        }

        if (event.remote) {
          setStatus("loading");
          void getMeRequest()
            .then((currentUser) => {
              setUser(currentUser);
              setStatus("authenticated");
            })
            .catch(() => {
              setUser(null);
              setStatus("anonymous");
            });
        }
      }),
    [queryClient],
  );

  const login = useCallback(async (values: LoginValues) => {
    const result = await loginRequest(values);
    setAccessToken(result.accessToken, { broadcast: true });
    setUser(result.user);
    setStatus("authenticated");
    return result.user;
  }, []);

  const register = useCallback(async (values: RegisterValues) => {
    const result = await registerRequest(values);
    setAccessToken(result.accessToken, { broadcast: true });
    setUser(result.user);
    setStatus("authenticated");
    return result.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      endSessionLocally();
    }
  }, [endSessionLocally]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      isAdmin:
        user?.roles.some((role) => role === "admin" || role === "super_admin") ?? false,
      isSuperAdmin: user?.roles.includes("super_admin") ?? false,
      login,
      register,
      logout,
      endSessionLocally,
      updateUser: setUser,
    }),
    [status, user, login, register, logout, endSessionLocally],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
};
