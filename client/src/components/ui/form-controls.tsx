import {
  createContext,
  forwardRef,
  useContext,
  useId,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { ChevronDown, CircleAlert } from "lucide-react";

import { cn } from "@/lib/utils";

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

export function Field({
  label,
  error,
  hint,
  controlId,
  compact = false,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  controlId?: string;
  compact?: boolean;
  children: React.ReactNode;
}) {
  const generatedId = useId();
  const resolvedControlId = controlId ?? generatedId;
  const descriptionId = error || hint ? `${resolvedControlId}-description` : undefined;

  return (
    <div
      className={cn(
        "grid gap-1.5 text-[0.8125rem] font-semibold text-[var(--foreground)]",
        compact ? null : "pb-1",
      )}
    >
      <label
        htmlFor={resolvedControlId}
        className={cn("transition-colors", error && "text-rose-600 dark:text-rose-300")}
      >
        {label}
      </label>
      <FieldContext.Provider
        value={{
          controlId: resolvedControlId,
          descriptionId,
          invalid: Boolean(error),
        }}
      >
        <div className="relative">{children}</div>
      </FieldContext.Provider>
      <div className={cn("px-1", compact ? "min-h-0" : "min-h-5")}>
        {error ? (
          <span
            id={descriptionId}
            className="flex items-start gap-1 text-xs leading-5 font-medium text-rose-700 dark:text-rose-300"
            role="alert"
            title={error}
          >
            <CircleAlert className="size-3 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </span>
        ) : hint ? (
          <span
            id={descriptionId}
            className="block text-xs leading-5 font-normal text-[var(--muted)]"
          >
            {hint}
          </span>
        ) : null}
      </div>
    </div>
  );
}
