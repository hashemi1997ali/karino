import { ArrowUpRight } from "lucide-react";

export function ChatSuggestionPanel({
  suggestions,
  onSelect,
}: {
  suggestions: readonly string[];
  onSelect: (suggestion: string) => void;
}) {
  if (suggestions.length === 0) return null;

  return (
    <div className="desk-grid-glow absolute inset-0 z-30 flex flex-col overflow-hidden bg-[color-mix(in_srgb,var(--surface)_96%,transparent)] backdrop-blur-xl">
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain p-3 sm:p-4">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => onSelect(suggestion)}
            className="focus-ring group flex min-h-14 w-full items-start gap-3 whitespace-pre-wrap rounded-2xl border bg-[color-mix(in_srgb,var(--surface)_90%,var(--surface-muted))] p-3.5 text-left text-sm leading-6 shadow-sm transition-[border-color,background-color,transform] hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--primary)_36%,var(--border))] hover:bg-[var(--surface)]"
          >
            <span className="min-w-0 flex-1">{suggestion}</span>
            <ArrowUpRight className="mt-1 size-4 shrink-0 text-[var(--muted)] transition-colors group-hover:text-[var(--primary)]" />
          </button>
        ))}
      </div>
    </div>
  );
}
