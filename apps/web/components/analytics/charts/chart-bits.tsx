"use client";

import type { ReactNode } from "react";

/** Shared axis styling for compact, dense B2B charts (tabular labels). */
export const axisTick = {
  fontSize: 11,
  fill: "hsl(var(--muted-foreground))",
} as const;

export const gridStroke = "hsl(var(--border))";

interface TooltipEntry {
  name?: ReactNode;
  value?: number | string;
  color?: string;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  /** Render units (h, %, pts) per chart. */
  valueFmt?: (v: number, name: string) => string;
  /** Reformat the header label (e.g. ISO date → MM-DD). */
  labelFmt?: (label: string) => string;
}

/**
 * Themed tooltip matching the popover surface. Typed loosely because recharts
 * v3's generic `content` signature fights extra props — recharts hands us the
 * payload at runtime regardless.
 */
export function ChartTooltip({
  active,
  payload,
  label,
  valueFmt,
  labelFmt,
}: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs shadow-md">
      {label !== undefined && (
        <p className="mb-1 font-medium text-popover-foreground">
          {labelFmt ? labelFmt(String(label)) : String(label)}
        </p>
      )}
      <ul className="space-y-0.5">
        {payload.map((entry, i) => (
          <li key={i} className="flex items-center gap-1.5 tabular-nums">
            <span
              className="inline-block h-2 w-2 rounded-sm"
              style={{ backgroundColor: entry.color }}
              aria-hidden="true"
            />
            <span className="text-muted-foreground">{entry.name}</span>
            <span className="ml-auto font-medium text-popover-foreground">
              {valueFmt && typeof entry.value === "number"
                ? valueFmt(entry.value, String(entry.name))
                : entry.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
