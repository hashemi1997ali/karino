"use client";

import type { ReactNode, SyntheticEvent } from "react";

import { cn } from "@/lib/utils";

/**
 * Native popover (closes on outside click and Escape) placed under the button
 * that opens it: `<button popoverTarget={id}>` + `<AnchoredPopover id={id}>`.
 * With `sheet` it spans the screen width on phones (menus); otherwise it
 * stays right-aligned under its button.
 */
export function AnchoredPopover({
  id,
  sheet = false,
  className,
  children,
}: {
  id: string;
  sheet?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const place = (event: SyntheticEvent<HTMLDivElement>) => {
    const panel = event.currentTarget;
    if ((event.nativeEvent as ToggleEvent).newState !== "open") return;
    const trigger = document.querySelector(`[popovertarget="${id}"]`);
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const narrow = sheet && window.innerWidth < 640;
    panel.style.top = `${rect.bottom + 10}px`;
    panel.style.left = narrow ? "0.75rem" : "auto";
    panel.style.right = narrow
      ? "0.75rem"
      : `${Math.max(12, window.innerWidth - rect.right)}px`;
  };

  return (
    <div
      id={id}
      popover="auto"
      data-sheet={sheet || undefined}
      onToggle={place}
      className={cn("anchored-popover surface-shadow", className)}
    >
      {children}
    </div>
  );
}

/** Closes the popover a control lives in, e.g. after following a menu link. */
export const closePopover = (id: string): void => {
  document.getElementById(id)?.hidePopover();
};
