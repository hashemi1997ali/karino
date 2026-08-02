export interface TrendChartPoint {
  key: string;
  value: number;
  shortLabel?: string;
  accessibleLabel: string;
}

export function TrendChart({
  data,
  label,
  className = "h-36",
  showLabels = false,
}: {
  data: TrendChartPoint[];
  label: string;
  className?: string;
  showLabels?: boolean;
}) {
  const width = 360;
  const height = 132;
  const horizontalPadding = 12;
  const topPadding = 14;
  const bottomPadding = showLabels ? 28 : 14;
  const max = Math.max(1, ...data.map((item) => item.value));
  const points = data.map((item, index) => ({
    ...item,
    x:
      horizontalPadding +
      (index * (width - horizontalPadding * 2)) / Math.max(data.length - 1, 1),
    y:
      height - bottomPadding - (item.value / max) * (height - topPadding - bottomPadding),
  }));
  const path = points.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className={`${className} w-full overflow-visible`}
        role="img"
        aria-label={label}
      >
        <polyline
          points={path}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((point) => (
          <g key={point.key}>
            <circle cx={point.x} cy={point.y} r="3.5" fill="var(--primary)">
              <title>{point.accessibleLabel}</title>
            </circle>
            {showLabels && (
              <text
                x={point.x}
                y={height - 4}
                textAnchor="middle"
                fontSize="10"
                fill="var(--muted)"
              >
                {point.shortLabel}
              </text>
            )}
          </g>
        ))}
      </svg>
      <ul className="sr-only">
        {data.map((item) => (
          <li key={item.key}>{item.accessibleLabel}</li>
        ))}
      </ul>
    </div>
  );
}
