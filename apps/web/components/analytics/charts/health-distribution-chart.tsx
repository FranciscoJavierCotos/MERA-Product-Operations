"use client";

import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { HealthLevelRow } from "@/types/analytics.types";
import { axisTick, ChartTooltip, gridStroke } from "./chart-bits";

// Level 1 (critical) → 5 (thriving), red → green.
const LEVEL_COLORS = ["#D55E00", "#E69F00", "#F0E442", "#56B4E9", "#009E73"];

export function HealthDistributionChart({ data }: { data: HealthLevelRow[] }) {
  const sorted = [...data].sort((a, b) => a.level - b.level);
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={sorted} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
        <XAxis
          dataKey="label"
          tick={axisTick}
          tickLine={false}
          tickFormatter={(v: string, i: number) => `${sorted[i]?.emoji ?? ""} ${v}`}
          interval={0}
        />
        <YAxis tick={axisTick} tickLine={false} axisLine={false} width={36} allowDecimals={false} />
        <Tooltip content={(p: any) => <ChartTooltip {...p} />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }} />
        <Bar dataKey="count" name="Accounts" radius={[2, 2, 0, 0]} isAnimationActive={false}>
          {sorted.map((row) => (
            <Cell key={row.level} fill={LEVEL_COLORS[Math.min(row.level - 1, 4)] ?? LEVEL_COLORS[0]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
