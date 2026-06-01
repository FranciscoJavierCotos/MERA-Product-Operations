"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { apiBrowser } from "@/lib/api-client-browser";
import type {
  AnalyticsRange,
  BacklogAgingResponse,
  CfdResponse,
  HealthDistributionResponse,
  NetFlowResponse,
  ResolutionDistributionResponse,
  SlaComplianceResponse,
  VelocityResponse,
} from "@/types/analytics.types";
import { ChartCard } from "./chart-card";
import { InsightCallout, type InsightSeverity } from "./insight-callout";
import { formatHours, formatPct } from "./palette";
import { NetFlowChart } from "./charts/net-flow-chart";
import { SlaComplianceChart } from "./charts/sla-compliance-chart";
import { CfdChart } from "./charts/cfd-chart";
import { BacklogAgingChart } from "./charts/backlog-aging-chart";
import { ResolutionDistributionChart } from "./charts/resolution-distribution-chart";
import { HealthDistributionChart } from "./charts/health-distribution-chart";
import { VelocityChart } from "./charts/velocity-chart";

function useAnalytics<T>(key: string, path: string, range?: AnalyticsRange) {
  return useQuery({
    queryKey: ["analytics", key, range ?? "all"],
    queryFn: () =>
      apiBrowser.get<T>(path, range ? { range } : undefined),
  });
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
        {label}
      </h2>
      <div className="flex-1 border-t border-border/60" />
    </div>
  );
}

/** Common loading/error/empty flags pulled from a query result. */
function flags<T>(q: UseQueryResult<T>, empty: (d: T) => boolean) {
  return {
    isLoading: q.isLoading,
    isError: q.isError,
    isEmpty: !q.isLoading && !q.isError && q.data !== undefined && empty(q.data),
    onRetry: () => q.refetch(),
  };
}

export function AnalyticsSections({ range }: { range: AnalyticsRange }) {
  const sla = useAnalytics<SlaComplianceResponse>("sla-compliance", "/analytics/sla-compliance", range);
  const netFlow = useAnalytics<NetFlowResponse>("net-flow-section", "/analytics/net-flow", range);
  const cfd = useAnalytics<CfdResponse>("cfd", "/analytics/cfd", range);
  const aging = useAnalytics<BacklogAgingResponse>("backlog-aging", "/analytics/backlog-aging");
  const resolution = useAnalytics<ResolutionDistributionResponse>("resolution", "/analytics/resolution-distribution", range);
  const health = useAnalytics<HealthDistributionResponse>("health", "/analytics/health-distribution", range);
  const velocity = useAnalytics<VelocityResponse>("velocity", "/analytics/velocity");

  /* ── Section A: Service Health (SLA) ─────────────────────────────────── */
  const slaInsight = ((): { severity: InsightSeverity; text: string } => {
    const urgent = sla.data?.byPriority.find((p) => p.priority === "urgent");
    if (!urgent || urgent.compliance === null)
      return { severity: "info", text: "No resolved urgent-priority tickets in this range yet." };
    const c = urgent.compliance;
    if (c < 90)
      return {
        severity: "critical",
        text: `Urgent-priority SLA compliance is ${formatPct(c)} — below the 90% line. Breaches concentrate in the highest-stakes tier; review routing and coverage.`,
      };
    return {
      severity: c < 95 ? "warning" : "info",
      text: `Urgent-priority SLA compliance is ${formatPct(c)}. ${c >= 95 ? "Holding above the 95% enterprise target." : "Just under the 95% target — watch the trend."}`,
    };
  })();

  /* ── Section B: Ticket Flow & Backlog ────────────────────────────────── */
  const flowInsight = ((): { severity: InsightSeverity; text: string } => {
    const series = netFlow.data?.series ?? [];
    const positiveDays = series.filter((d) => d.net > 0).length;
    const net = series.reduce((s, d) => s + d.net, 0);
    if (series.length === 0) return { severity: "info", text: "No ticket flow recorded in this range." };
    if (net > 0)
      return {
        severity: positiveDays > series.length / 2 ? "warning" : "info",
        text: `Net flow is +${net} over the range (inflow exceeded resolution on ${positiveDays} of ${series.length} days) — backlog grew. Check the inflow mix below.`,
      };
    return { severity: "info", text: `Net flow is ${net} — the team cleared more than arrived. Backlog is shrinking.` };
  })();

  /* ── Section C: Resolution Performance ───────────────────────────────── */
  const resInsight = ((): { severity: InsightSeverity; text: string } => {
    const m = resolution.data?.median ?? null;
    const p = resolution.data?.p90 ?? null;
    if (m === null) return { severity: "info", text: "No tickets resolved in this range." };
    const tailRatio = p && m ? p / m : 0;
    if (tailRatio > 4)
      return {
        severity: "warning",
        text: `Median resolution is ${formatHours(m)} but P90 is ${formatHours(p)} — a long tail is forming. The typical ticket is fine; a minority are dragging.`,
      };
    return { severity: "info", text: `Median ${formatHours(m)}, P90 ${formatHours(p)} — spread is controlled.` };
  })();

  /* ── Section D: Account Health ───────────────────────────────────────── */
  const healthInsight = ((): { severity: InsightSeverity; text: string } => {
    const slip = health.data?.netSlippage ?? 0;
    const atRisk = (health.data?.levels ?? [])
      .filter((l) => l.level <= 2)
      .reduce((s, l) => s + l.count, 0);
    if (slip > 0)
      return {
        severity: slip >= 3 ? "critical" : "warning",
        text: `${slip} net account${slip === 1 ? "" : "s"} slipped to a lower health level this period (${atRisk} now at critical/at-risk). Prioritize save plays.`,
      };
    return { severity: "info", text: `Account health is stable or improving (${atRisk} at critical/at-risk).` };
  })();

  /* ── Section E: Delivery ─────────────────────────────────────────────── */
  const deliveryInsight = ((): { severity: InsightSeverity; text: string } => {
    const rolling = velocity.data?.rollingAverage ?? null;
    if (rolling === null) return { severity: "info", text: "No sprint data yet." };
    return { severity: "info", text: `Rolling 3-sprint velocity is ~${rolling} points — use it as the planning forecast.` };
  })();

  return (
    <div className="space-y-8">
      {/* ── Section A ── */}
      <section className="space-y-3">
        <SectionHeader label="Service Health (SLA)" />
        <InsightCallout severity={slaInsight.severity}>{slaInsight.text}</InsightCallout>
        <ChartCard
          title="SLA Compliance by Priority"
          subtitle="Resolved tickets met vs breached, plus open tickets at risk"
          info="Met = resolved before its resolution due time (pause-aware). At-risk counts currently-open tickets already past due."
          {...flags(sla, (d) => d.byPriority.every((p) => p.met + p.breached + p.atRisk === 0))}
          renderTable={() => <SlaTable data={sla.data} />}
        >
          {sla.data && <SlaComplianceChart data={sla.data.byPriority} />}
        </ChartCard>
      </section>

      {/* ── Section B ── */}
      <section className="space-y-3">
        <SectionHeader label="Ticket Flow & Backlog" />
        <InsightCallout severity={flowInsight.severity}>{flowInsight.text}</InsightCallout>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartCard
            title="Net Flow (Inflow − Resolved)"
            subtitle="Daily created vs resolved; bars show net"
            info="Positive net (bars above zero) means the backlog grew that day."
            {...flags(netFlow, (d) => d.series.every((p) => p.created === 0 && p.resolved === 0))}
          >
            {netFlow.data && <NetFlowChart data={netFlow.data.series} />}
          </ChartCard>
          <ChartCard
            title="Cumulative Flow"
            subtitle="Open / resolved / closed over time"
            info="A widening 'open' band signals a bottleneck — work entering faster than it leaves."
            {...flags(cfd, (d) => d.series.length === 0)}
          >
            {cfd.data && <CfdChart data={cfd.data.series} />}
          </ChartCard>
          <ChartCard
            title="Backlog Aging"
            subtitle="Open tickets by age bucket and priority (current snapshot)"
            info="Surfaces the '>30 days & urgent' cell that a simple open-count hides."
            className="lg:col-span-2"
            {...flags(aging, (d) => d.buckets.every((b) => b.total === 0))}
          >
            {aging.data && <BacklogAgingChart data={aging.data.buckets} />}
          </ChartCard>
        </div>
      </section>

      {/* ── Section C ── */}
      <section className="space-y-3">
        <SectionHeader label="Resolution Performance" />
        <InsightCallout severity={resInsight.severity}>{resInsight.text}</InsightCallout>
        <ChartCard
          title="Resolution-Time Distribution"
          subtitle="Histogram of pause-adjusted resolution times"
          info="Shows the spread an average hides. Reference lines mark the median and P90."
          {...flags(resolution, (d) => d.points.length === 0)}
        >
          {resolution.data && (
            <ResolutionDistributionChart
              points={resolution.data.points}
              median={resolution.data.median}
              p90={resolution.data.p90}
            />
          )}
        </ChartCard>
      </section>

      {/* ── Section D ── */}
      <section className="space-y-3">
        <SectionHeader label="Account Health (CRM)" />
        <InsightCallout severity={healthInsight.severity}>{healthInsight.text}</InsightCallout>
        <ChartCard
          title="Account Health Distribution"
          subtitle="Companies across the 5 health levels"
          info="Net slippage in this range is computed from company_health_history transitions."
          {...flags(health, (d) => d.levels.every((l) => l.count === 0))}
          renderTable={() => <HealthTable data={health.data} />}
        >
          {health.data && <HealthDistributionChart data={health.data.levels} />}
        </ChartCard>
      </section>

      {/* ── Section E ── */}
      <section className="space-y-3">
        <SectionHeader label="Delivery (Projects & Sprints)" />
        <InsightCallout severity={deliveryInsight.severity}>{deliveryInsight.text}</InsightCallout>
        <ChartCard
          title="Sprint Velocity"
          subtitle="Committed vs completed points, with 3-sprint rolling average"
          info="Committed = sum of story points in the sprint; completed = points of done items."
          {...flags(velocity, (d) => d.sprints.length === 0)}
          emptyMessage="No active or completed sprints"
          renderTable={() => <VelocityTable data={velocity.data} />}
        >
          {velocity.data && <VelocityChart data={velocity.data.sprints} />}
        </ChartCard>
      </section>
    </div>
  );
}

/* ── Accessible table fallbacks ──────────────────────────────────────────── */

function MiniTable({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <table className="w-full text-xs tabular-nums">
      <thead className="sticky top-0 bg-card">
        <tr className="text-left text-muted-foreground">
          {head.map((h) => (
            <th key={h} className="py-1 pr-3 font-medium">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-t border-border/60">
            {r.map((c, j) => (
              <td key={j} className="py-1 pr-3">{c}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SlaTable({ data }: { data?: SlaComplianceResponse }) {
  if (!data) return null;
  return (
    <MiniTable
      head={["Priority", "Met", "Breached", "At risk", "Compliance"]}
      rows={data.byPriority.map((p) => [p.priority, p.met, p.breached, p.atRisk, formatPct(p.compliance)])}
    />
  );
}

function HealthTable({ data }: { data?: HealthDistributionResponse }) {
  if (!data) return null;
  return (
    <MiniTable
      head={["Level", "Status", "Accounts"]}
      rows={data.levels.map((l) => [l.level, `${l.emoji} ${l.label}`, l.count])}
    />
  );
}

function VelocityTable({ data }: { data?: VelocityResponse }) {
  if (!data) return null;
  return (
    <MiniTable
      head={["Sprint", "Committed", "Completed"]}
      rows={data.sprints.map((s) => [s.sprint, s.committed, s.completed])}
    />
  );
}
