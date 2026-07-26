export function PageHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <header className="shrink-0">
      <p className="eyebrow text-[var(--primary)]">{eyebrow}</p>
      <h1 className="mt-2 text-3xl font-black">{title}</h1>
      {description && (
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">
          {description}
        </p>
      )}
    </header>
  );
}
