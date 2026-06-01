"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { VelocityRow } from "@/types/analytics.types";
import { OKABE_ITO } from "../palette";
import { axisTick, ChartTooltip, gridStroke } from "./chart-bits";

/**
 * Committed vs completed points per sprint with a 3-sprint rolling completed
 * line — the honest predictability view (vs a single velocity number).
 */
export function VelocityChart({ data }: { data: VelocityRow[] }) {
  // Attach a trailing 3-sprint rolling average of completed points.
  const withRolling = data.map((row, i) => {
    const window = data.slice(Math.max(0, i - 2), i + 1);
    const avg = window.reduce((s, r) => s + r.completed, 0) / window.length;
    return { ...row, rolling: Number(avg.toFixed(1)) };
  });

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={withRolling} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
        <XAxis dataKey="sprint" tick={axisTick} tickLine={false} interval={0} angle={0} />
        <YAxis tick={axisTick} tickLine={false} axisLine={false} width={36} allowDecimals={false} />
        <Tooltip content={(p: any) => <ChartTooltip {...p} />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }} />
        <Bar dataKey="committed" name="Committed" fill={OKABE_ITO.sky} radius={[2, 2, 0, 0]} isAnimationActive={false} />
        <Bar dataKey="completed" name="Completed" fill={OKABE_ITO.blue} radius={[2, 2, 0, 0]} isAnimationActive={false} />
        <Line dataKey="rolling" name="3-sprint avg" stroke={OKABE_ITO.orange} strokeWidth={2} dot={false} isAnimationActive={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
