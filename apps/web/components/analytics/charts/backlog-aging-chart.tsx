"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AgingRow } from "@/types/analytics.types";
import { PRIORITY_COLORS } from "../palette";
import { axisTick, ChartTooltip, gridStroke } from "./chart-bits";

export function BacklogAgingChart({ data }: { data: AgingRow[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart layout="vertical" data={data} margin={{ top: 4, right: 8, bottom: 0, left: 8 }} barCategoryGap="20%">
        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
        <XAxis type="number" tick={axisTick} tickLine={false} axisLine={false} allowDecimals={false} />
        <YAxis type="category" dataKey="bucket" tick={axisTick} tickLine={false} axisLine={false} width={48} />
        <Tooltip content={(p: any) => <ChartTooltip {...p} />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }} />
        <Bar dataKey="urgent" name="Urgent" stackId="p" fill={PRIORITY_COLORS.urgent} isAnimationActive={false} />
        <Bar dataKey="high" name="High" stackId="p" fill={PRIORITY_COLORS.high} isAnimationActive={false} />
        <Bar dataKey="medium" name="Medium" stackId="p" fill={PRIORITY_COLORS.medium} isAnimationActive={false} />
        <Bar dataKey="low" name="Low" stackId="p" fill={PRIORITY_COLORS.low} radius={[0, 2, 2, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}
