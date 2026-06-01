"use client";

import { useQuery } from "@tanstack/react-query";
import { apiBrowser } from "@/lib/api-client-browser";
import type {
  AnalyticsRange,
  AnalyticsSummary,
  NetFlowResponse,
} from "@/types/analytics.types";
import { KpiCard, type KpiTone } from "./kpi-card";
import { formatHours, formatPct, formatSigned } from "./palette";

function complianceTone(v: number | null): KpiTone {
  if (v === null) return "neutral";
  if (v >= 95) return "good";
  if (v < 90) return "bad";
  return "neutral";
}

function reopenTone(v: number | null): KpiTone {
  if (v === null) return "neutral";
  if (v > 8) return "bad";
  if (v < 5) return "good";
  return "neutral";
}

export function HeroStrip({
  range,
  initialSummary,
}: {
  range: AnalyticsRange;
  initialSummary: AnalyticsSummary;
}) {
  const { data: summary } = useQuery({
    queryKey: ["analytics", "summary", range],
    queryFn: () =>
      apiBrowser.get<AnalyticsSummary>("/analytics/summary", { range }),
    initialData: range === initialSummary.range ? initialSummary : undefined,
  });

  const { data: netFlow } = useQuery({
    queryKey: ["analytics", "net-flow", range],
    queryFn: () => apiBrowser.get<NetFlowResponse>("/analytics/net-flow", { range }),
  });

  const s = summary ?? initialSummary;
  const netSpark = (netFlow?.series ?? []).map((p) => p.net);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <KpiCard
        label="SLA Resolution Compliance"
        value={formatPct(s.slaCompliance.value)}
        sub="resolved within target"
        delta={s.slaCompliance.delta}
        higherIsBetter
        tone={complianceTone(s.slaCompliance.value)}
      />
      <KpiCard
        label="Resolution Time"
        value={formatHours(s.medianResolutionHours.value)}
        sub={`P90 ${formatHours(s.p90ResolutionHours.value)}`}
        delta={s.medianResolutionHours.delta}
        higherIsBetter={false}
      />
      <KpiCard
        label="Net Flow"
        value={formatSigned(s.netFlow.value)}
        sub="inflow − resolved"
        delta={
          s.netFlow.value !== null && s.netFlow.previous !== null
            ? s.netFlow.value - s.netFlow.previous
            : null
        }
        deltaFormat="abs"
        higherIsBetter={false}
        spark={netSpark}
        tone={(s.netFlow.value ?? 0) > 0 ? "bad" : "good"}
      />
      <KpiCard
        label="Reopen / Rework Rate"
        value={formatPct(s.reopenRate.value)}
        sub="resolved then reopened"
        delta={s.reopenRate.delta}
        higherIsBetter={false}
        tone={reopenTone(s.reopenRate.value)}
      />
      <KpiCard
        label="At-Risk Accounts"
        value={String(s.atRiskAccounts.value ?? 0)}
        sub={`net move ${formatSigned(s.atRiskAccounts.delta)}`}
        delta={s.atRiskAccounts.delta}
        deltaFormat="abs"
        higherIsBetter={false}
        tone={(s.atRiskAccounts.delta ?? 0) > 0 ? "bad" : "neutral"}
      />
    </div>
  );
}
