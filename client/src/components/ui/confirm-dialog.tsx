"use client";

import { Button, type ButtonVariant } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { usePreferences } from "@/providers/preferences-provider";

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  confirmVariant = "danger",
  loading,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  confirmVariant?: ButtonVariant;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
}) {
  const { locale } = usePreferences();
  const resolvedConfirmLabel = confirmLabel ?? (locale === "de" ? "Löschen" : "Delete");
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      className="sm:max-w-md"
    >
      <div className="mt-6 flex justify-end gap-2">
        <Button
          variant="secondary"
          onClick={() => onOpenChange(false)}
          disabled={loading}
        >
          {locale === "de" ? "Abbrechen" : "Cancel"}
        </Button>
        <Button variant={confirmVariant} loading={loading} onClick={onConfirm}>
          {resolvedConfirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}
