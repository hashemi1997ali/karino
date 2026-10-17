import {
  createContext,
  forwardRef,
  useContext,
  useId,
  useState,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { ChevronDown, CircleAlert, Eye, EyeOff } from "lucide-react";

import { cn } from "@/lib/utils";
import { usePreferences } from "@/providers/preferences-provider";

// Look, hover, focus ring, error and disabled states live in `.field-control`
// (globals.css) so every input, select and textarea behaves identically.
const fieldClass = "field-control";

interface FieldContextValue {
  controlId: string;
  descriptionId?: string;
  invalid: boolean;
}

const FieldContext = createContext<FieldContextValue | null>(null);

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    const field = useContext(FieldContext);
    return (
      <input
        ref={ref}
        className={cn(fieldClass, "h-11", className)}
        {...props}
        id={props.id ?? field?.controlId}
        aria-describedby={props["aria-describedby"] ?? field?.descriptionId}
        aria-invalid={props["aria-invalid"] ?? (field?.invalid || undefined)}
      />
    );
  },
);

/**
 * Password field with its own show/hide button. Browser-native reveal buttons
 * are hidden in globals.css, so there is exactly one eye in every browser.
 */
export const PasswordInput = forwardRef<
  HTMLInputElement,
  Omit<InputHTMLAttributes<HTMLInputElement>, "type">
>(function PasswordInput({ className, ...props }, ref) {
  const { locale } = usePreferences();
  const [visible, setVisible] = useState(false);
  const label =
    locale === "de"
      ? visible
        ? "Passwort verbergen"
        : "Passwort anzeigen"
      : visible
        ? "Hide password"
        : "Show password";

  return (
    <div className="relative">
      <Input
        ref={ref}
        type={visible ? "text" : "password"}
        dir="ltr"
        className={cn("pr-11", className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-label={label}
        title={label}
        aria-pressed={visible}
        className="focus-ring absolute top-1/2 right-1 grid size-9 -translate-y-1/2 place-items-center rounded-full text-[var(--muted)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
});

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  const field = useContext(FieldContext);
  return (
    <textarea
      ref={ref}
      className={cn(fieldClass, "min-h-28 resize-y py-2.5 leading-6", className)}
      {...props}
      id={props.id ?? field?.controlId}
      aria-describedby={props["aria-describedby"] ?? field?.descriptionId}
      aria-invalid={props["aria-invalid"] ?? (field?.invalid || undefined)}
    />
  );
});

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, ...props }, ref) {
  const field = useContext(FieldContext);
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn(fieldClass, "h-11 cursor-pointer appearance-none pr-10", className)}
        {...props}
        id={props.id ?? field?.controlId}
        aria-describedby={props["aria-describedby"] ?? field?.descriptionId}
        aria-invalid={props["aria-invalid"] ?? (field?.invalid || undefined)}
      />
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-[var(--muted)]"
      />
    </div>
  );
});

/**
 * Label + control. The error sits at the end of the label row, so the form
 * keeps the same height whether or not a field is invalid. Keep messages
 * short: the label already names the field. `after` renders below the
 * control (e.g. a password checklist); `hint` is a quiet line under it.
 */
export function Field({
  label,
  error,
  hint,
  after,
  controlId,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  after?: React.ReactNode;
  controlId?: string;
  children: React.ReactNode;
}) {
  const generatedId = useId();
  const resolvedControlId = controlId ?? generatedId;
  const errorId = error ? `${resolvedControlId}-error` : undefined;
  const hintId = hint ? `${resolvedControlId}-hint` : undefined;
  const descriptionId = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="field grid gap-1.5 text-[0.8125rem] font-semibold text-[var(--foreground)]">
      <div className="flex min-w-0 items-baseline justify-between gap-3">
        <label htmlFor={resolvedControlId} className="shrink-0">
          {label}
        </label>
        {error && (
          <span
            key={error}
            id={errorId}
            role="alert"
            title={error}
            className="field-error flex min-w-0 items-center gap-1 text-xs font-medium text-rose-600 dark:text-rose-300"
          >
            <CircleAlert className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{error}</span>
          </span>
        )}
      </div>
      <FieldContext.Provider
        value={{
          controlId: resolvedControlId,
          descriptionId,
          invalid: Boolean(error),
        }}
      >
        <div className="relative">{children}</div>
      </FieldContext.Provider>
      {after}
      {hint && (
        <span id={hintId} className="text-xs leading-5 font-normal text-[var(--muted)]">
          {hint}
        </span>
      )}
    </div>
  );
}
