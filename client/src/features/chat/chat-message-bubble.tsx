import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

export function ChatMessageBubble({
  id,
  direction,
  content,
  name,
  nameHref,
  createdAt,
  markdown = false,
}: {
  id?: string;
  direction: "incoming" | "outgoing" | "system";
  content: string;
  name?: string | null;
  nameHref?: string | null;
  createdAt?: string | Date | null;
  markdown?: boolean;
}) {
  if (direction === "system") {
    return (
      <div id={id} className="flex justify-center px-2">
        <p
          className="w-fit max-w-[95%] rounded-full bg-[var(--surface-muted)] px-3 py-1.5 text-center text-xs leading-5 text-[var(--muted)]"
          dir="auto"
        >
          {content}
        </p>
      </div>
    );
  }

  const time = createdAt
    ? new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(
        new Date(createdAt),
      )
    : null;

  return (
    <div
      id={id}
      className={cn("flex", direction === "outgoing" ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "w-fit max-w-[85%] px-3 py-2.5 text-sm leading-5 shadow-sm",
          direction === "outgoing"
            ? "rounded-2xl rounded-br-sm bg-[var(--primary)] text-[var(--on-primary)]"
            : "rounded-2xl rounded-bl-sm bg-[var(--surface-muted)] text-[var(--foreground)]",
        )}
      >
        {name &&
          (nameHref ? (
            <Link
              href={nameHref}
              className={cn(
                "mb-1 block w-fit rounded text-xs font-black tracking-wide uppercase transition-colors hover:opacity-80",
                direction === "outgoing"
                  ? "text-current opacity-75"
                  : "text-[var(--primary)]",
              )}
            >
              {name}
            </Link>
          ) : (
            <p
              className={cn(
                "mb-1 text-xs font-black tracking-wide uppercase",
                direction === "outgoing"
                  ? "text-current opacity-75"
                  : "text-[var(--primary)]",
              )}
            >
              {name}
            </p>
          ))}
        {markdown ? (
          <div className="chat-markdown break-words [overflow-wrap:anywhere]" dir="auto">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                a: ({ href, children }) => {
                  const external = href?.startsWith("http");
                  return (
                    <a
                      href={href}
                      target={external ? "_blank" : undefined}
                      rel={external ? "noreferrer noopener" : undefined}
                    >
                      {children}
                    </a>
                  );
                },
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        ) : (
          <p
            className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]"
            dir="auto"
          >
            {content}
          </p>
        )}
        {time && (
          <p
            className={cn(
              "mt-1 text-right text-xs leading-none",
              direction === "outgoing"
                ? "text-current opacity-70"
                : "text-[var(--muted)]",
            )}
          >
            {time}
          </p>
        )}
      </div>
    </div>
  );
}
