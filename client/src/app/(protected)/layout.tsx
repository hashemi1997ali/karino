import { cookies } from "next/headers";

import { AppShell } from "@/components/layout/app-shell";
import { AuthGate } from "@/features/auth/auth-gate";

const parseSidebarPreference = (
  value: string | undefined,
  fallback: boolean,
): boolean => {
  if (value === "collapsed") return true;
  if (value === "expanded") return false;
  return fallback;
};

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const initialTabletSidebarCollapsed = parseSidebarPreference(
    cookieStore.get("karino-sidebar-tablet")?.value,
    true,
  );
  const initialDesktopSidebarCollapsed = parseSidebarPreference(
    cookieStore.get("karino-sidebar-desktop")?.value,
    false,
  );

  return (
    <AuthGate>
      <AppShell
        initialTabletSidebarCollapsed={initialTabletSidebarCollapsed}
        initialDesktopSidebarCollapsed={initialDesktopSidebarCollapsed}
      >
        {children}
      </AppShell>
    </AuthGate>
  );
}
