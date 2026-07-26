"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { usePreferences } from "@/providers/preferences-provider";

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  const { locale } = usePreferences();
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-sm data-[state=closed]:animate-out data-[state=open]:animate-in" />
        <DialogPrimitive.Content
          className={cn(
            "surface-shadow fixed inset-x-3 top-1/2 z-50 max-h-[92vh] -translate-y-1/2 overflow-y-auto rounded-[var(--container-radius)] border bg-[var(--surface)] p-5 outline-none sm:inset-x-auto sm:left-1/2 sm:w-[min(92vw,36rem)] sm:-translate-x-1/2 sm:p-6",
            className,
          )}
        >
          <div className="mb-5 pr-10">
            <DialogPrimitive.Title className="text-lg font-bold text-slate-950">
              {title}
            </DialogPrimitive.Title>
            {description && (
              <DialogPrimitive.Description className="mt-1 text-sm leading-6 text-slate-500">
                {description}
              </DialogPrimitive.Description>
            )}
          </div>
          {children}
          <DialogPrimitive.Close className="focus-ring absolute right-4 top-4 grid size-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-white/8">
            <X className="size-4" />
            <span className="sr-only">{locale === "de" ? "Schließen" : "Close"}</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
