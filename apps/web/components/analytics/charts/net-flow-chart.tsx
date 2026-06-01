"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { NetFlowPoint } from "@/types/analytics.types";
import { OKABE_ITO } from "../palette";
import { axisTick, ChartTooltip, gridStroke } from "./chart-bits";

const shortDay = (iso: string) => iso.slice(5); // MM-DD

export function NetFlowChart({ data }: { data: NetFlowPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
        <XAxis dataKey="date" tickFormatter={shortDay} tick={axisTick} tickLine={false} minTickGap={24} />
        <YAxis tick={axisTick} tickLine={false} axisLine={false} width={36} />
        <ReferenceLine y={0} stroke={gridStroke} />
        <Tooltip
          content={(p: any) => <ChartTooltip {...p} labelFmt={shortDay} />}
          cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
        />
        <Bar dataKey="net" name="Net" fill={OKABE_ITO.purple} radius={[2, 2, 0, 0]} isAnimationActive={false} />
        <Line dataKey="created" name="Created" stroke={OKABE_ITO.orange} dot={false} strokeWidth={1.5} isAnimationActive={false} />
        <Line dataKey="resolved" name="Resolved" stroke={OKABE_ITO.green} dot={false} strokeWidth={1.5} isAnimationActive={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
