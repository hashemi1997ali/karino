"use client";

import { ArrowUp, LoaderCircle, type LucideIcon } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * The one message box used by every chat surface (landing page, assistant,
 * chat widget, support inbox, contact replies): the text sits on top and a
 * toolbar below holds the draft tools on the left and send on the right.
 */
export function ChatComposer({
  value,
  onValueChange,
  onSubmit,
  placeholder,
  sendLabel,
  disabled = false,
  sending = false,
  allowEmpty = false,
  submitOnEnter = true,
  tools,
  className,
}: {
  value: string;
  onValueChange: (value: string) => void;
  onSubmit: () => void;
  placeholder: string;
  sendLabel: string;
  disabled?: boolean;
  sending?: boolean;
  /** Keep send active with an empty box (the landing page then opens the assistant). */
  allowEmpty?: boolean;
  /** Enter sends and Shift+Enter adds a line. Off for long-form replies such as email. */
  submitOnEnter?: boolean;
  /** Draft tools shown at the bottom left, usually {@link ChatToolButton}s. */
  tools?: ReactNode;
  className?: string;
}) {
  const canSend = !disabled && !sending && (allowEmpty || value.trim().length > 0);

  return (
    <form
      className={cn("chat-composer-shell", className)}
      onSubmit={(event) => {
        event.preventDefault();
        if (canSend) onSubmit();
      }}
    >
      <textarea
        value={value}
        disabled={disabled}
        onChange={(event) => onValueChange(event.target.value)}
        onKeyDown={(event) => {
          if (submitOnEnter && event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            if (canSend) onSubmit();
          }
        }}
        placeholder={placeholder}
        aria-label={placeholder}
        rows={2}
        dir="auto"
        className="chat-composer-input"
      />
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">{tools}</div>
        <button
          type="submit"
          disabled={!canSend}
          aria-label={sendLabel}
          title={sendLabel}
          aria-busy={sending || undefined}
          className="chat-send-button focus-ring"
        >
          {sending ? (
            <LoaderCircle
              className="size-4 animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
          ) : (
            <ArrowUp className="size-4" strokeWidth={2.5} aria-hidden="true" />
          )}
        </button>
      </div>
    </form>
  );
}

/**
 * Small pill used in the composer toolbar and the conversation action row.
 * Without children it renders as a round icon button (label via aria-label).
 */
export function ChatToolButton({
  icon: Icon,
  loading = false,
  pressed,
  className,
  children,
  type = "button",
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: LucideIcon;
  loading?: boolean;
  /** Toggle state, e.g. an open suggestions panel. */
  pressed?: boolean;
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-pressed={pressed}
      aria-busy={loading || undefined}
      className={cn("chat-tool focus-ring", !children && "chat-tool-icon", className)}
      {...props}
    >
      {loading ? (
        <LoaderCircle
          className="size-3.5 animate-spin motion-reduce:animate-none"
          aria-hidden="true"
        />
      ) : (
        <Icon className="size-3.5" aria-hidden="true" />
      )}
      {children}
    </button>
  );
}
