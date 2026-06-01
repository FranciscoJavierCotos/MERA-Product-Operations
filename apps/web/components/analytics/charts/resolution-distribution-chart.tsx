"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ResolutionDot } from "@/types/analytics.types";
import { OKABE_ITO } from "../palette";
import { axisTick, ChartTooltip, gridStroke } from "./chart-bits";

const BINS = [
  { label: "<1h", max: 1 },
  { label: "1-4h", max: 4 },
  { label: "4-8h", max: 8 },
  { label: "8-24h", max: 24 },
  { label: "1-3d", max: 72 },
  { label: "3-7d", max: 168 },
  { label: ">7d", max: Infinity },
];

/**
 * Histogram of resolution times — the spread a single "average" hides. The
 * median/P90 reference lines mark where the typical and tail-end tickets sit.
 */
export function ResolutionDistributionChart({
  points,
  median,
  p90,
}: {
  points: ResolutionDot[];
  median: number | null;
  p90: number | null;
}) {
  const bins = useMemo(() => {
    const counts = BINS.map((b) => ({ label: b.label, count: 0 }));
    for (const p of points) {
      const idx = BINS.findIndex((b) => p.hours < b.max);
      counts[idx === -1 ? BINS.length - 1 : idx].count += 1;
    }
    return counts;
  }, [points]);

  const binLabelFor = (hours: number | null): string | null => {
    if (hours === null) return null;
    const idx = BINS.findIndex((b) => hours < b.max);
    return BINS[idx === -1 ? BINS.length - 1 : idx].label;
  };

  const medianBin = binLabelFor(median);
  const p90Bin = binLabelFor(p90);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={bins} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
        <XAxis dataKey="label" tick={axisTick} tickLine={false} />
        <YAxis tick={axisTick} tickLine={false} axisLine={false} width={36} allowDecimals={false} />
        <Tooltip content={(p: any) => <ChartTooltip {...p} />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }} />
        {medianBin && (
          <ReferenceLine x={medianBin} stroke={OKABE_ITO.green} strokeDasharray="4 2" label={{ value: "median", position: "top", fontSize: 10, fill: OKABE_ITO.green }} />
        )}
        {p90Bin && p90Bin !== medianBin && (
          <ReferenceLine x={p90Bin} stroke={OKABE_ITO.red} strokeDasharray="4 2" label={{ value: "P90", position: "top", fontSize: 10, fill: OKABE_ITO.red }} />
        )}
        <Bar dataKey="count" name="Tickets" fill={OKABE_ITO.blue} radius={[2, 2, 0, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}
