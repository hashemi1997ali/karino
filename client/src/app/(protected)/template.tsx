"use client";

import { usePathname } from "next/navigation";

// A template only remounts when its direct child segment changes, so moving
// between /admin pages (all under "admin") would skip the transition. Keying
// by pathname replays it on every page while query-string changes (task
// filters) keep the page mounted. The shell (sidebar, header) never re-animates.
export default function ProtectedTemplate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="desk-reveal">
      {children}
    </div>
  );
}
