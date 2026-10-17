export function PageHeading({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  /** Page-level controls, aligned to the heading's right edge on wide screens. */
  actions?: React.ReactNode;
}) {
  return (
    <header className="desk-page-header">
      <div className="min-w-0">
        {eyebrow && <p className="desk-eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </header>
  );
}
