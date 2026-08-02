export function PageHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <header className="min-w-0">
      {eyebrow && <p className="text-xs font-semibold text-[var(--muted)]">{eyebrow}</p>}
      <h1
        className={`${eyebrow ? "mt-1" : ""} text-[1.625rem] leading-8 font-bold tracking-[-0.025em]`}
      >
        {title}
      </h1>
      {description && (
        <p className="mt-1 max-w-3xl text-sm leading-5 text-[var(--muted)]">
          {description}
        </p>
      )}
    </header>
  );
}
