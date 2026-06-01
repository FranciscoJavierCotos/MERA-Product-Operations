"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";

export type KpiTone = "good" | "bad" | "neutral";

interface KpiCardProps {
  label: string;
  value: string;
  /** Secondary figure shown beneath the value (e.g. "P90 41h"). */
  sub?: string;
  /** Percentage / absolute delta vs comparison period. */
  delta: number | null;
  /** How to format the delta. "pct" appends %, "abs" shows a signed integer. */
  deltaFormat?: "pct" | "abs";
  /** Whether a positive delta is good (▲ green) or bad (▲ red). */
  higherIsBetter: boolean;
  /** Sparkline values for the selected range (optional). */
  spark?: number[];
  /** Threshold tint applied to the value. */
  tone?: KpiTone;
}

const toneText: Record<KpiTone, string> = {
  good: "text-emerald-600 dark:text-emerald-400",
  bad: "text-red-600 dark:text-red-400",
  neutral: "text-foreground",
};

export function KpiCard({
  label,
  value,
  sub,
  delta,
  deltaFormat = "pct",
  higherIsBetter,
  spark,
  tone = "neutral",
}: KpiCardProps) {
  const deltaPositive = delta !== null && delta > 0;
  const deltaZero = delta === null || delta === 0;
  // Good direction = sign matches "higher is better".
  const deltaGood = deltaZero ? null : deltaPositive === higherIsBetter;

  const deltaColor = deltaZero
    ? "text-muted-foreground"
    : deltaGood
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-red-600 dark:text-red-400";

  const DeltaIcon = deltaZero ? Minus : deltaPositive ? ArrowUp : ArrowDown;

  const deltaText =
    delta === null
      ? "—"
      : deltaFormat === "pct"
        ? `${Math.abs(delta).toFixed(1)}%`
        : `${delta > 0 ? "+" : ""}${delta}`;

  const sparkData = (spark ?? []).map((v, i) => ({ i, v }));
  const sparkColor =
    tone === "bad" ? "#D55E00" : tone === "good" ? "#009E73" : "#0072B2";

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground truncate">
          {label}
        </p>
        <div className="mt-1 flex items-end justify-between gap-2">
          <p
            className={cn(
              "text-2xl font-bold tabular-nums leading-none",
              toneText[tone],
            )}
          >
            {value}
          </p>
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-xs font-medium tabular-nums",
              deltaColor,
            )}
            aria-label={
              delta === null
                ? "no comparison data"
                : `${deltaGood ? "improved" : "worsened"} by ${deltaText}`
            }
          >
            <DeltaIcon className="h-3 w-3" aria-hidden="true" />
            {deltaText}
          </span>
        </div>
        {sub && (
          <p className="mt-1 text-[11px] text-muted-foreground tabular-nums truncate">
            {sub}
          </p>
        )}
        {sparkData.length > 1 && (
          <div className="mt-2 h-8" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparkData} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id={`spark-${label}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={sparkColor} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={sparkColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke={sparkColor}
                  strokeWidth={1.5}
                  fill={`url(#spark-${label})`}
                  isAnimationActive={false}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
