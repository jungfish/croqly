import { useState } from 'react';

interface DailyBarChartProps {
  data: { date: string; value: number }[];
  // Full literal Tailwind class, e.g. "bg-primary" — must be a static string
  // at each call site so Tailwind's build-time scanner picks it up.
  colorClass: string;
  formatValue: (value: number) => string;
}

// Minimal dependency-free bar chart — one series, thin bars, a hover
// tooltip, and first/last date labels only (not one per bar).
const DailyBarChart = ({ data, colorClass, formatValue }: DailyBarChartProps) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));

  const formatDateLabel = (iso: string) =>
    new Date(`${iso}T00:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

  return (
    <div>
      <div className="flex items-end gap-px h-36">
        {data.map((d, i) => {
          const heightPct = (d.value / max) * 100;
          return (
            <div
              key={d.date}
              className="relative flex-1 h-full flex items-end"
              onMouseEnter={() => setHoverIndex(i)}
              onMouseLeave={() => setHoverIndex((cur) => (cur === i ? null : cur))}
            >
              {hoverIndex === i && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-xs shadow-md z-10">
                  <div className="font-medium text-popover-foreground">{formatValue(d.value)}</div>
                  <div className="text-muted-foreground">{formatDateLabel(d.date)}</div>
                </div>
              )}
              <div
                className={`w-full rounded-t-sm transition-opacity ${colorClass} ${
                  hoverIndex === i ? 'opacity-100' : 'opacity-70'
                }`}
                style={{ height: `${d.value > 0 ? Math.max(heightPct, 3) : 0}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-xs text-muted-foreground">
        <span>{data[0] ? formatDateLabel(data[0].date) : ''}</span>
        <span>{data.length > 0 ? formatDateLabel(data[data.length - 1].date) : ''}</span>
      </div>
    </div>
  );
};

export default DailyBarChart;
