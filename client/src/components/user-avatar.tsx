import { Crown, ShieldCheck } from "lucide-react";
import Image from "next/image";

import type { User, UserRole } from "@/lib/types";
import { cn, initials } from "@/lib/utils";

export const avatarFrameClassName = (className?: string): string =>
  cn(
    "relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-full border border-[color-mix(in_srgb,var(--foreground)_8%,var(--border))] bg-[var(--primary-soft)] text-sm font-black text-[var(--primary-dark)]",
    className,
  );

// Without a photo, the initials take the role's colour, so staff stand out in
// lists. Regular users keep the brand violet from avatarFrameClassName.
const roleLooks = {
  super_admin: {
    frame:
      "bg-gradient-to-br from-amber-200 to-orange-300 text-amber-900 dark:from-amber-400/40 dark:to-orange-500/25 dark:text-amber-200",
    badge: "bg-amber-500",
    Icon: Crown,
  },
  admin: {
    frame:
      "bg-gradient-to-br from-sky-100 to-cyan-200 text-sky-800 dark:from-sky-400/35 dark:to-cyan-500/20 dark:text-sky-200",
    badge: "bg-sky-500",
    Icon: ShieldCheck,
  },
} as const;

const staffRole = (roles?: UserRole[]) =>
  roles?.includes("super_admin")
    ? "super_admin"
    : roles?.includes("admin")
      ? "admin"
      : null;

export function UserAvatar({
  user,
  className,
  imageSizes = "48px",
  imageUrl,
  showRole = false,
}: {
  user:
    | (Pick<User, "firstName" | "lastName" | "profileImage"> & { roles?: UserRole[] })
    | null
    | undefined;
  className?: string;
  imageSizes?: string;
  imageUrl?: string | null;
  /** Adds a small crown/shield badge for staff. Meant for avatars of 40px and up. */
  showRole?: boolean;
}) {
  const label = user ? `${user.firstName} ${user.lastName}`.trim() : "User";
  const resolvedImageUrl = imageUrl === undefined ? user?.profileImage?.url : imageUrl;
  const role = staffRole(user?.roles);
  const look = role ? roleLooks[role] : null;

  const avatar = (
    <span
      className={avatarFrameClassName(cn(!resolvedImageUrl && look?.frame, className))}
      aria-label={`${label} profile image`}
    >
      {resolvedImageUrl ? (
        <Image
          src={resolvedImageUrl}
          alt=""
          fill
          sizes={imageSizes}
          unoptimized={resolvedImageUrl.startsWith("blob:")}
          className="object-cover"
        />
      ) : (
        initials(user?.firstName, user?.lastName)
      )}
    </span>
  );

  if (!showRole || !look) return avatar;

  return (
    <span className="relative inline-flex shrink-0">
      {avatar}
      <span
        className={cn(
          "absolute -right-0.5 -bottom-0.5 grid size-[38%] min-w-4 min-h-4 place-items-center rounded-full text-white ring-2 ring-[var(--surface)]",
          look.badge,
        )}
        aria-hidden="true"
      >
        <look.Icon className="size-[62%]" strokeWidth={2.5} />
      </span>
    </span>
  );
}
