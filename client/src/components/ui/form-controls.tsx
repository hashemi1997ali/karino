import {
  createContext,
  forwardRef,
  useContext,
  useId,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { CircleAlert } from "lucide-react";

import { cn } from "@/lib/utils";

const fieldClass =
  "focus-ring block w-full rounded-2xl border bg-[var(--surface)] px-4 text-sm text-[var(--foreground)] placeholder:text-slate-400 focus:border-[var(--primary)] disabled:bg-[var(--surface-muted)]";
const invalidFieldClass =
  "border-rose-400 focus:border-rose-500 focus:shadow-[0_0_0_3px_rgba(244,63,94,.12)] dark:border-rose-400/80";

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
        className={cn(fieldClass, "h-12", field?.invalid && invalidFieldClass, className)}
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
      className={cn(
        fieldClass,
        "min-h-28 resize-y py-3",
        field?.invalid && invalidFieldClass,
        className,
      )}
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
    <select
      ref={ref}
      className={cn(fieldClass, "h-12", field?.invalid && invalidFieldClass, className)}
      {...props}
      id={props.id ?? field?.controlId}
      aria-describedby={props["aria-describedby"] ?? field?.descriptionId}
      aria-invalid={props["aria-invalid"] ?? (field?.invalid || undefined)}
    />
  );
});

export function Field({
  label,
  error,
  hint,
  controlId,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  controlId?: string;
  children: React.ReactNode;
}) {
  const generatedId = useId();
  const resolvedControlId = controlId ?? generatedId;
  const descriptionId = error || hint ? `${resolvedControlId}-description` : undefined;

  return (
    <div className="grid grid-rows-[auto_auto_1rem] gap-0.5 text-sm font-medium text-[var(--foreground)]">
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
      <div className="h-4 overflow-hidden px-1">
        {error ? (
          <span
            id={descriptionId}
            className="flex h-4 items-center gap-1 text-[10px] leading-4 font-medium text-rose-600 dark:text-rose-300"
            role="alert"
            title={error}
          >
            <CircleAlert className="size-3 shrink-0" aria-hidden="true" />
            <span className="truncate">{error}</span>
          </span>
        ) : hint ? (
          <span
            id={descriptionId}
            className="block h-4 truncate text-[10px] leading-4 font-normal text-[var(--muted)]"
            title={hint}
          >
            {hint}
          </span>
        ) : null}
      </div>
    </div>
  );
}
