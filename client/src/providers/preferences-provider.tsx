"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import {
  getIntlLocale,
  LOCALE_COOKIE_NAME,
  THEME_COOKIE_NAME,
  THEME_STORAGE_KEY,
  type Locale,
  type ResolvedTheme,
  type ThemePreference,
} from "@/lib/preferences";

interface PreferencesContextValue {
  locale: Locale;
  intlLocale: string;
  theme: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setLocale: (locale: Locale) => void;
  setTheme: (theme: ThemePreference) => void;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

const prefersDark = (): boolean =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-color-scheme: dark)").matches;

const resolveTheme = (theme: ThemePreference): ResolvedTheme =>
  theme === "system" ? (prefersDark() ? "dark" : "light") : theme;

const applyTheme = (theme: ThemePreference): ResolvedTheme => {
  const resolved = resolveTheme(theme);
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.dataset.theme = theme;
  root.style.colorScheme = resolved;
  return resolved;
};

const subscribeToSystemTheme = (onStoreChange: () => void): (() => void) => {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onStoreChange);
  return () => media.removeEventListener("change", onStoreChange);
};

const getSystemThemeSnapshot = (): boolean => prefersDark();
const getServerSystemThemeSnapshot = (): boolean => false;
const THEME_CHANGE_EVENT = "karino-theme-change";

const isThemePreference = (value: string | null): value is ThemePreference =>
  value === "light" || value === "dark" || value === "system";

const subscribeToThemePreference = (onStoreChange: () => void): (() => void) => {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY) onStoreChange();
  };
  window.addEventListener("storage", handleStorage);
  window.addEventListener(THEME_CHANGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(THEME_CHANGE_EVENT, onStoreChange);
  };
};

export function PreferencesProvider({
  children,
  initialLocale,
  initialTheme,
}: {
  children: ReactNode;
  initialLocale: Locale;
  initialTheme: ThemePreference;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const getThemeSnapshot = useCallback((): ThemePreference => {
    try {
      const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
      return isThemePreference(storedTheme) ? storedTheme : initialTheme;
    } catch {
      return initialTheme;
    }
  }, [initialTheme]);
  const getServerThemeSnapshot = useCallback(
    (): ThemePreference => initialTheme,
    [initialTheme],
  );
  const theme = useSyncExternalStore(
    subscribeToThemePreference,
    getThemeSnapshot,
    getServerThemeSnapshot,
  );
  const systemDark = useSyncExternalStore(
    subscribeToSystemTheme,
    getSystemThemeSnapshot,
    getServerSystemThemeSnapshot,
  );
  const resolvedTheme: ResolvedTheme =
    theme === "system" ? (systemDark ? "dark" : "light") : theme;

  useEffect(() => {
    applyTheme(theme);
  }, [theme, systemDark]);

  const setLocale = useCallback(
    (nextLocale: Locale) => {
      setLocaleState(nextLocale);
      document.documentElement.lang = nextLocale;
      document.documentElement.dir = "ltr";
      document.cookie = `${LOCALE_COOKIE_NAME}=${nextLocale}; Path=/; Max-Age=31536000; SameSite=Lax`;
      router.refresh();
    },
    [router],
  );

  const setTheme = useCallback((nextTheme: ThemePreference) => {
    document.cookie = `${THEME_COOKIE_NAME}=${nextTheme}; Path=/; Max-Age=31536000; SameSite=Lax`;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch {
      // Cookie persistence and immediate DOM application still work when storage is blocked.
    }
    applyTheme(nextTheme);
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }, []);

  const value = useMemo<PreferencesContextValue>(
    () => ({
      locale,
      intlLocale: getIntlLocale(locale),
      theme,
      resolvedTheme,
      setLocale,
      setTheme,
    }),
    [locale, theme, resolvedTheme, setLocale, setTheme],
  );

  return (
    <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>
  );
}

export const usePreferences = (): PreferencesContextValue => {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error("usePreferences must be used inside PreferencesProvider");
  }
  return context;
};
