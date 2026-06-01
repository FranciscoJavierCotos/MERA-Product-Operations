/**
 * Response shapes for the /analytics API surface (mirrors
 * apps/api/src/services/analytics.ts). Kept here so both the server shell and
 * the client chart components share one contract.
 */

export type AnalyticsRange = "7d" | "30d" | "qtd" | "ytd";

export const RANGE_OPTIONS: { value: AnalyticsRange; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "qtd", label: "Quarter to date" },
  { value: "ytd", label: "Year to date" },
];

export function isAnalyticsRange(v: string | undefined): v is AnalyticsRange {
  return v === "7d" || v === "30d" || v === "qtd" || v === "ytd";
}

export interface KpiMetric {
  value: number | null;
  previous: number | null;
  delta: number | null;
}

export interface AnalyticsSummary {
  range: AnalyticsRange;
  window: { start: string; end: string };
  slaCompliance: KpiMetric;
  medianResolutionHours: KpiMetric;
  p90ResolutionHours: KpiMetric;
  netFlow: KpiMetric;
  reopenRate: KpiMetric;
  atRiskAccounts: KpiMetric;
}

export interface NetFlowPoint {
  date: string;
  created: number;
  resolved: number;
  net: number;
}
export interface NetFlowResponse {
  range: AnalyticsRange;
  series: NetFlowPoint[];
}

export interface SlaPriorityRow {
  priority: string;
  met: number;
  breached: number;
  atRisk: number;
  compliance: number | null;
}
export interface SlaComplianceResponse {
  range: AnalyticsRange;
  byPriority: SlaPriorityRow[];
}

export interface CfdPoint {
  date: string;
  open: number;
  resolved: number;
  closed: number;
}
export interface CfdResponse {
  range: AnalyticsRange;
  series: CfdPoint[];
}

export interface AgingRow {
  bucket: string;
  low: number;
  medium: number;
  high: number;
  urgent: number;
  total: number;
}
export interface BacklogAgingResponse {
  buckets: AgingRow[];
}

export interface ResolutionDot {
  hours: number;
  priority: string;
}
export interface ResolutionDistributionResponse {
  range: AnalyticsRange;
  points: ResolutionDot[];
  median: number | null;
  p90: number | null;
}

export interface HealthLevelRow {
  level: number;
  name: string;
  label: string;
  emoji: string;
  count: number;
}
export interface HealthDistributionResponse {
  range: AnalyticsRange;
  levels: HealthLevelRow[];
  netSlippage: number;
}

export interface VelocityRow {
  sprint: string;
  committed: number;
  completed: number;
}
export interface VelocityResponse {
  sprints: VelocityRow[];
  rollingAverage: number | null;
}
