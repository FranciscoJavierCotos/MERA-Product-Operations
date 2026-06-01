"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CfdPoint } from "@/types/analytics.types";
import { OKABE_ITO } from "../palette";
import { axisTick, ChartTooltip, gridStroke } from "./chart-bits";

const shortDay = (iso: string) => iso.slice(5);

/**
 * Cumulative flow: closed (bottom) → resolved → open (top). A widening "open"
 * band is a bottleneck made visible — the canonical Kanban flow-health view.
 */
export function CfdChart({ data }: { data: CfdPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
        <XAxis dataKey="date" tickFormatter={shortDay} tick={axisTick} tickLine={false} minTickGap={24} />
        <YAxis tick={axisTick} tickLine={false} axisLine={false} width={36} />
        <Tooltip content={(p: any) => <ChartTooltip {...p} labelFmt={shortDay} />} />
        <Area type="monotone" dataKey="closed" name="Closed" stackId="1" stroke={OKABE_ITO.grey} fill={OKABE_ITO.grey} fillOpacity={0.5} isAnimationActive={false} />
        <Area type="monotone" dataKey="resolved" name="Resolved" stackId="1" stroke={OKABE_ITO.green} fill={OKABE_ITO.green} fillOpacity={0.5} isAnimationActive={false} />
        <Area type="monotone" dataKey="open" name="Open" stackId="1" stroke={OKABE_ITO.blue} fill={OKABE_ITO.blue} fillOpacity={0.5} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
