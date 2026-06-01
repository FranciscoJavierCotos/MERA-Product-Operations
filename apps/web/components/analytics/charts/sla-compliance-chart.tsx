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
import type { SlaPriorityRow } from "@/types/analytics.types";
import { SLA_COLORS } from "../palette";
import { axisTick, ChartTooltip, gridStroke } from "./chart-bits";

export function SlaComplianceChart({ data }: { data: SlaPriorityRow[] }) {
  // Order urgent → low for a top-down read of the highest-stakes tier first.
  const ordered = [...data].reverse();
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        layout="vertical"
        data={ordered}
        margin={{ top: 4, right: 8, bottom: 0, left: 8 }}
        barCategoryGap="20%"
      >
        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
        <XAxis type="number" tick={axisTick} tickLine={false} axisLine={false} />
        <YAxis
          type="category"
          dataKey="priority"
          tick={axisTick}
          tickLine={false}
          axisLine={false}
          width={64}
          tickFormatter={(v: string) => v.charAt(0).toUpperCase() + v.slice(1)}
        />
        <Tooltip content={(p: any) => <ChartTooltip {...p} />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }} />
        <Bar dataKey="met" name="Met" stackId="s" fill={SLA_COLORS.met} isAnimationActive={false} />
        <Bar dataKey="breached" name="Breached" stackId="s" fill={SLA_COLORS.breached} isAnimationActive={false} />
        <Bar dataKey="atRisk" name="At risk (open)" stackId="s" fill={SLA_COLORS.atRisk} radius={[0, 2, 2, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}
