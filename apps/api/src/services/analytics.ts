import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@stms/contracts";
import {
  AGE_BUCKETS,
  ageBucket,
  complianceRate,
  dayRange,
  median,
  netFlowSeries,
  type NetFlowPoint,
  pctDelta,
  percentile,
  resolutionHours,
  resolveRange,
  type RangeKey,
  type TimeWindow,
} from "./analytics-utils.js";

type Client = SupabaseClient<Database>;

// Lookup IDs (seeded, stable): see CLAUDE.md / 001_initial_schema.sql
const OPEN_STATUS_IDS = [1, 2, 3, 4];
const FINAL_STATUS_IDS = [5, 6]; // resolved, closed
const PRIORITIES: Array<{ id: number; name: string }> = [
  { id: 1, name: "low" },
  { id: 2, name: "medium" },
  { id: 3, name: "high" },
  { id: 4, name: "urgent" },
];
const FINAL_STATUS_NAMES = new Set(["resolved", "closed"]);

const iso = (d: Date) => d.toISOString();

/* ────────────────────────────────────────────────────────────────────────
 * Shared low-level fetches
 * ──────────────────────────────────────────────────────────────────────── */

interface ResolvedRow {
  created_at: string;
  resolved_at: string;
  priority_id: number;
  due: string | null;
  paused: number;
}

/** Resolved (or closed) tickets whose resolution fell inside `win`, joined to SLA. */
async function getResolvedWithSla(
  supabase: Client,
  win: TimeWindow,
): Promise<ResolvedRow[]> {
  const { data, error } = await (supabase as any)
    .from("tickets")
    .select(
      "created_at, resolved_at, priority_id, sla:sla_instances(resolution_due_at, total_paused_minutes)",
    )
    .in("status_id", FINAL_STATUS_IDS)
    .gte("resolved_at", iso(win.start))
    .lt("resolved_at", iso(win.end));
  if (error) throw error;

  return ((data ?? []) as any[])
    .filter((t) => t.created_at && t.resolved_at)
    .map((t) => {
      const sla = Array.isArray(t.sla) ? t.sla[0] : t.sla;
      return {
        created_at: t.created_at as string,
        resolved_at: t.resolved_at as string,
        priority_id: t.priority_id as number,
        due: (sla?.resolution_due_at ?? null) as string | null,
        paused: (sla?.total_paused_minutes ?? 0) as number,
      };
    });
}

/** Count of tickets created inside `win`. */
async function countCreated(supabase: Client, win: TimeWindow): Promise<number> {
  const { count } = await supabase
    .from("tickets")
    .select("*", { count: "exact", head: true })
    .gte("created_at", iso(win.start))
    .lt("created_at", iso(win.end));
  return count ?? 0;
}

/** Count of reopen events (final → non-final status transitions) inside `win`. */
async function countReopens(supabase: Client, win: TimeWindow): Promise<number> {
  const { data, error } = await (supabase as any)
    .from("ticket_history")
    .select("old_value, new_value")
    .eq("field_name", "status")
    .gte("created_at", iso(win.start))
    .lt("created_at", iso(win.end));
  if (error) throw error;
  return ((data ?? []) as any[]).filter(
    (h) =>
      FINAL_STATUS_NAMES.has(h.old_value) && !FINAL_STATUS_NAMES.has(h.new_value),
  ).length;
}

async function riskStatusIds(supabase: Client): Promise<number[]> {
  const { data } = await supabase
    .from("company_health_statuses")
    .select("id")
    .in("name", ["critical", "at_risk"]);
  return ((data ?? []) as Array<{ id: number }>).map((s) => s.id);
}

/* ────────────────────────────────────────────────────────────────────────
 * Primary KPI summary
 * ──────────────────────────────────────────────────────────────────────── */

export interface KpiMetric {
  value: number | null;
  previous: number | null;
  /** Percentage change vs previous window; null when no baseline. */
  delta: number | null;
}

export interface AnalyticsSummary {
  range: RangeKey;
  window: { start: string; end: string };
  slaCompliance: KpiMetric; // %
  medianResolutionHours: KpiMetric;
  p90ResolutionHours: KpiMetric;
  netFlow: KpiMetric; // signed count
  reopenRate: KpiMetric; // %
  atRiskAccounts: KpiMetric; // count (snapshot; delta = net movement)
}

function summarizeWindow(rows: ResolvedRow[]) {
  const met = rows.filter((r) => r.due && r.resolved_at <= r.due).length;
  const compliance = complianceRate(met, rows.length);
  const hrs = rows.map((r) =>
    resolutionHours(r.created_at, r.resolved_at, r.paused),
  );
  return {
    compliance,
    median: median(hrs),
    p90: percentile(hrs, 90),
    resolvedCount: rows.length,
  };
}

export async function getAnalyticsSummary(
  supabase: Client,
  range: RangeKey,
): Promise<AnalyticsSummary> {
  const { current, previous } = resolveRange(range);

  const [
    curRows,
    prevRows,
    curCreated,
    prevCreated,
    curReopens,
    prevReopens,
    riskIds,
  ] = await Promise.all([
    getResolvedWithSla(supabase, current),
    getResolvedWithSla(supabase, previous),
    countCreated(supabase, current),
    countCreated(supabase, previous),
    countReopens(supabase, current),
    countReopens(supabase, previous),
    riskStatusIds(supabase),
  ]);

  const cur = summarizeWindow(curRows);
  const prev = summarizeWindow(prevRows);

  // At-risk accounts: current snapshot count + net movement within the window.
  let atRiskNow = 0;
  let atRiskMovement = 0;
  if (riskIds.length > 0) {
    const { count } = await supabase
      .from("companies")
      .select("*", { count: "exact", head: true })
      .in("health_status_id", riskIds);
    atRiskNow = count ?? 0;

    const { data: moves } = await (supabase as any)
      .from("company_health_history")
      .select("from_status_id, to_status_id")
      .gte("changed_at", iso(current.start))
      .lt("changed_at", iso(current.end));
    for (const m of (moves ?? []) as any[]) {
      const intoRisk = riskIds.includes(m.to_status_id);
      const outOfRisk = riskIds.includes(m.from_status_id);
      if (intoRisk && !outOfRisk) atRiskMovement += 1;
      else if (outOfRisk && !intoRisk) atRiskMovement -= 1;
    }
  }

  const reopenRateCur = complianceRate(curReopens, cur.resolvedCount);
  const reopenRatePrev = complianceRate(prevReopens, prev.resolvedCount);

  const metric = (
    value: number | null,
    prevValue: number | null,
  ): KpiMetric => ({
    value,
    previous: prevValue,
    delta:
      value === null || prevValue === null ? null : pctDelta(value, prevValue),
  });

  const netCur = curCreated - cur.resolvedCount;
  const netPrev = prevCreated - prev.resolvedCount;

  return {
    range,
    window: { start: iso(current.start), end: iso(current.end) },
    slaCompliance: metric(cur.compliance, prev.compliance),
    medianResolutionHours: metric(cur.median, prev.median),
    p90ResolutionHours: metric(cur.p90, prev.p90),
    netFlow: { value: netCur, previous: netPrev, delta: pctDelta(netCur, netPrev) },
    reopenRate: metric(reopenRateCur, reopenRatePrev),
    atRiskAccounts: {
      value: atRiskNow,
      previous: atRiskNow - atRiskMovement,
      delta: atRiskMovement,
    },
  };
}

/* ────────────────────────────────────────────────────────────────────────
 * Net-flow daily series
 * ──────────────────────────────────────────────────────────────────────── */

export async function getNetFlow(
  supabase: Client,
  range: RangeKey,
): Promise<{ range: RangeKey; series: NetFlowPoint[] }> {
  const { current } = resolveRange(range);

  const [{ data: created }, { data: resolved }] = await Promise.all([
    (supabase as any)
      .from("tickets")
      .select("created_at")
      .gte("created_at", iso(current.start))
      .lt("created_at", iso(current.end)),
    (supabase as any)
      .from("tickets")
      .select("resolved_at")
      .in("status_id", FINAL_STATUS_IDS)
      .gte("resolved_at", iso(current.start))
      .lt("resolved_at", iso(current.end)),
  ]);

  const series = netFlowSeries(
    ((created ?? []) as any[]).map((t) => t.created_at).filter(Boolean),
    ((resolved ?? []) as any[]).map((t) => t.resolved_at).filter(Boolean),
    current,
  );
  return { range, series };
}

/* ────────────────────────────────────────────────────────────────────────
 * SLA compliance by priority
 * ──────────────────────────────────────────────────────────────────────── */

export interface SlaPriorityRow {
  priority: string;
  met: number;
  breached: number;
  atRisk: number;
  compliance: number | null;
}

export async function getSlaCompliance(
  supabase: Client,
  range: RangeKey,
): Promise<{ range: RangeKey; byPriority: SlaPriorityRow[] }> {
  const { current } = resolveRange(range);
  const now = new Date().toISOString();

  const [resolved, openWithSla] = await Promise.all([
    getResolvedWithSla(supabase, current),
    // Currently-open tickets with an SLA instance → at-risk classification.
    (supabase as any)
      .from("tickets")
      .select("priority_id, sla:sla_instances(resolution_due_at)")
      .in("status_id", OPEN_STATUS_IDS),
  ]);

  const byPriority: SlaPriorityRow[] = PRIORITIES.map((p) => {
    const res = resolved.filter((r) => r.priority_id === p.id);
    const met = res.filter((r) => r.due && r.resolved_at <= r.due).length;
    const breached = res.length - met;
    const atRisk = ((openWithSla.data ?? []) as any[]).filter((t) => {
      if (t.priority_id !== p.id) return false;
      const sla = Array.isArray(t.sla) ? t.sla[0] : t.sla;
      return sla?.resolution_due_at && sla.resolution_due_at < now;
    }).length;
    return { priority: p.name, met, breached, atRisk, compliance: complianceRate(met, res.length) };
  });

  return { range, byPriority };
}

/* ────────────────────────────────────────────────────────────────────────
 * Cumulative flow (created / resolved / closed) per day
 * ──────────────────────────────────────────────────────────────────────── */

export interface CfdPoint {
  date: string;
  open: number;
  resolved: number;
  closed: number;
}

export async function getCfd(
  supabase: Client,
  range: RangeKey,
): Promise<{ range: RangeKey; series: CfdPoint[] }> {
  const { current } = resolveRange(range);

  // Pull lifecycle timestamps for all tickets created on/before the window end.
  const { data, error } = await (supabase as any)
    .from("tickets")
    .select("created_at, resolved_at, closed_at, status_id")
    .lt("created_at", iso(current.end));
  if (error) throw error;
  const rows = (data ?? []) as any[];

  const days = dayRange(current);

  const series: CfdPoint[] = days.map((date) => {
    const endOfDay = `${date}T23:59:59.999Z`;
    let created = 0;
    let resolved = 0;
    let closed = 0;
    for (const t of rows) {
      if (!t.created_at || t.created_at > endOfDay) continue;
      created += 1;
      if (t.closed_at && t.closed_at <= endOfDay) closed += 1;
      else if (t.resolved_at && t.resolved_at <= endOfDay) resolved += 1;
    }
    return { date, open: Math.max(0, created - resolved - closed), resolved, closed };
  });

  return { range, series };
}

/* ────────────────────────────────────────────────────────────────────────
 * Backlog aging (current snapshot)
 * ──────────────────────────────────────────────────────────────────────── */

export interface AgingRow {
  bucket: string;
  low: number;
  medium: number;
  high: number;
  urgent: number;
  total: number;
}

export async function getBacklogAging(
  supabase: Client,
): Promise<{ buckets: AgingRow[] }> {
  const { data, error } = await (supabase as any)
    .from("tickets")
    .select("created_at, priority_id")
    .in("status_id", OPEN_STATUS_IDS);
  if (error) throw error;

  const now = Date.now();
  const priorityName = (id: number) =>
    PRIORITIES.find((p) => p.id === id)?.name ?? "low";

  const buckets: AgingRow[] = AGE_BUCKETS.map((bucket) => ({
    bucket,
    low: 0,
    medium: 0,
    high: 0,
    urgent: 0,
    total: 0,
  }));

  for (const t of (data ?? []) as any[]) {
    if (!t.created_at) continue;
    const ageDays = (now - new Date(t.created_at).getTime()) / 86_400_000;
    const b = buckets.find((x) => x.bucket === ageBucket(ageDays));
    if (!b) continue;
    const name = priorityName(t.priority_id) as "low" | "medium" | "high" | "urgent";
    b[name] += 1;
    b.total += 1;
  }

  return { buckets };
}

/* ────────────────────────────────────────────────────────────────────────
 * Resolution-time distribution (histogram-ready)
 * ──────────────────────────────────────────────────────────────────────── */

export interface ResolutionDot {
  hours: number;
  priority: string;
}

export async function getResolutionDistribution(
  supabase: Client,
  range: RangeKey,
): Promise<{ range: RangeKey; points: ResolutionDot[]; median: number | null; p90: number | null }> {
  const { current } = resolveRange(range);
  const rows = await getResolvedWithSla(supabase, current);
  const points = rows.map((r) => ({
    hours: Number(resolutionHours(r.created_at, r.resolved_at, r.paused).toFixed(2)),
    priority: PRIORITIES.find((p) => p.id === r.priority_id)?.name ?? "low",
  }));
  const hrs = points.map((p) => p.hours);
  return { range, points, median: median(hrs), p90: percentile(hrs, 90) };
}

/* ────────────────────────────────────────────────────────────────────────
 * Account-health distribution + movement
 * ──────────────────────────────────────────────────────────────────────── */

export interface HealthLevelRow {
  level: number;
  name: string;
  label: string;
  emoji: string;
  count: number;
}

export async function getHealthDistribution(
  supabase: Client,
  range: RangeKey,
): Promise<{ range: RangeKey; levels: HealthLevelRow[]; netSlippage: number }> {
  const { current } = resolveRange(range);

  const [{ data: statuses }, { data: companies }, { data: moves }] =
    await Promise.all([
      supabase
        .from("company_health_statuses")
        .select("id, name, label, emoji, level")
        .order("level"),
      supabase.from("companies").select("health_status_id"),
      (supabase as any)
        .from("company_health_history")
        .select("from_status_id, to_status_id")
        .gte("changed_at", iso(current.start))
        .lt("changed_at", iso(current.end)),
    ]);

  const statusList = (statuses ?? []) as Array<{
    id: number;
    name: string;
    label: string;
    emoji: string;
    level: number;
  }>;
  const levelById = new Map(statusList.map((s) => [s.id, s.level]));

  const counts = new Map<number, number>();
  for (const c of (companies ?? []) as Array<{ health_status_id: number | null }>) {
    if (c.health_status_id == null) continue;
    counts.set(c.health_status_id, (counts.get(c.health_status_id) ?? 0) + 1);
  }

  const levels: HealthLevelRow[] = statusList.map((s) => ({
    level: s.level,
    name: s.name,
    label: s.label,
    emoji: s.emoji,
    count: counts.get(s.id) ?? 0,
  }));

  // Net slippage: count of downward level moves minus upward moves in window.
  let netSlippage = 0;
  for (const m of (moves ?? []) as any[]) {
    const from = levelById.get(m.from_status_id);
    const to = levelById.get(m.to_status_id);
    if (from == null || to == null) continue;
    if (to < from) netSlippage += 1;
    else if (to > from) netSlippage -= 1;
  }

  return { range, levels, netSlippage };
}

/* ────────────────────────────────────────────────────────────────────────
 * Sprint velocity
 * ──────────────────────────────────────────────────────────────────────── */

export interface VelocityRow {
  sprint: string;
  committed: number;
  completed: number;
}

export async function getVelocity(
  supabase: Client,
  limit = 8,
): Promise<{ sprints: VelocityRow[]; rollingAverage: number | null }> {
  const { data: sprints, error } = await (supabase as any)
    .from("sprints")
    .select("id, name, status, end_date, work_items(status, story_points)")
    .in("status", ["active", "completed"])
    .order("end_date", { ascending: true, nullsFirst: true })
    .limit(limit);
  if (error) throw error;

  const rows: VelocityRow[] = ((sprints ?? []) as any[]).map((s) => {
    const items = (s.work_items ?? []) as Array<{
      status: string;
      story_points: number | null;
    }>;
    const committed = items.reduce((sum, i) => sum + (i.story_points ?? 0), 0);
    const completed = items
      .filter((i) => i.status === "done")
      .reduce((sum, i) => sum + (i.story_points ?? 0), 0);
    return { sprint: s.name as string, committed, completed };
  });

  const recent = rows.slice(-3).map((r) => r.completed);
  const rollingAverage =
    recent.length > 0
      ? recent.reduce((a, b) => a + b, 0) / recent.length
      : null;

  return { sprints: rows, rollingAverage };
}
