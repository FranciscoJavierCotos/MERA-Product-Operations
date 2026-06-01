/**
 * Pure, side-effect-free helpers for the analytics service.
 *
 * Kept separate from `analytics.ts` so they can be unit-tested without a
 * Supabase client or any network access (see `src/unit/analytics-utils.test.ts`).
 * Every function here takes plain data and returns plain data.
 */

export type RangeKey = "7d" | "30d" | "qtd" | "ytd";

export interface TimeWindow {
  /** Inclusive start (UTC). */
  start: Date;
  /** Exclusive end (UTC). */
  end: Date;
}

export interface RangeWindows {
  current: TimeWindow;
  /** Equal-length window immediately preceding `current`, for delta comparison. */
  previous: TimeWindow;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Resolve a preset range key into a current window plus an equal-length
 * previous window. `now` is injectable for deterministic tests.
 */
export function resolveRange(range: RangeKey, now: Date = new Date()): RangeWindows {
  const end = now;
  let start: Date;

  switch (range) {
    case "7d":
      start = new Date(end.getTime() - 7 * DAY_MS);
      break;
    case "30d":
      start = new Date(end.getTime() - 30 * DAY_MS);
      break;
    case "qtd": {
      const q = Math.floor(now.getUTCMonth() / 3);
      start = new Date(Date.UTC(now.getUTCFullYear(), q * 3, 1));
      break;
    }
    case "ytd":
      start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
      break;
    default:
      start = new Date(end.getTime() - 30 * DAY_MS);
  }

  const lengthMs = end.getTime() - start.getTime();
  const previous: TimeWindow = {
    start: new Date(start.getTime() - lengthMs),
    end: new Date(start.getTime()),
  };

  return { current: { start, end }, previous };
}

/** Linear-interpolation percentile (p in [0,100]). Returns null for empty input. */
export function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 1) return sorted[0];
  const rank = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  if (lo === hi) return sorted[lo];
  const frac = rank - lo;
  return sorted[lo] + (sorted[hi] - sorted[lo]) * frac;
}

export function median(values: number[]): number | null {
  return percentile(values, 50);
}

/**
 * Percentage delta of `current` vs `previous`. Returns null when there is no
 * meaningful baseline (previous is 0) so callers can render "—" instead of ∞.
 */
export function pctDelta(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

/** Share of `met` over `total` as a percentage (0–100). Null when total is 0. */
export function complianceRate(met: number, total: number): number | null {
  if (total === 0) return null;
  return (met / total) * 100;
}

/**
 * Pause-aware resolution time in hours: wall-clock from creation to resolution
 * minus the minutes the SLA clock was paused (e.g. pending_customer).
 * Never returns negative.
 */
export function resolutionHours(
  createdAt: string,
  resolvedAt: string,
  pausedMinutes = 0,
): number {
  const wallMinutes =
    (new Date(resolvedAt).getTime() - new Date(createdAt).getTime()) / 60000;
  return Math.max(0, (wallMinutes - pausedMinutes) / 60);
}

export const AGE_BUCKETS = ["<1d", "1-3d", "4-7d", "8-30d", ">30d"] as const;
export type AgeBucket = (typeof AGE_BUCKETS)[number];

/** Map an age in days to one of the fixed backlog-aging buckets. */
export function ageBucket(ageDays: number): AgeBucket {
  if (ageDays < 1) return "<1d";
  if (ageDays <= 3) return "1-3d";
  if (ageDays <= 7) return "4-7d";
  if (ageDays <= 30) return "8-30d";
  return ">30d";
}

/** UTC `YYYY-MM-DD` key for bucketing timestamps by day. */
export function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Ordered list of `YYYY-MM-DD` day keys spanning [start, end]. */
export function dayRange(window: TimeWindow): string[] {
  const days: string[] = [];
  const cur = new Date(
    Date.UTC(
      window.start.getUTCFullYear(),
      window.start.getUTCMonth(),
      window.start.getUTCDate(),
    ),
  );
  const endDay = new Date(
    Date.UTC(window.end.getUTCFullYear(), window.end.getUTCMonth(), window.end.getUTCDate()),
  );
  while (cur <= endDay) {
    days.push(dayKey(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return days;
}

export interface NetFlowPoint {
  date: string;
  created: number;
  resolved: number;
  net: number;
}

/**
 * Build a daily net-flow series over `window`. `createdDates` / `resolvedDates`
 * are ISO timestamp strings; days with no activity appear as zeros so the
 * sparkline has a continuous x-axis.
 */
export function netFlowSeries(
  createdDates: string[],
  resolvedDates: string[],
  window: TimeWindow,
): NetFlowPoint[] {
  const days = dayRange(window);
  const created = new Map<string, number>();
  const resolved = new Map<string, number>();

  for (const ts of createdDates) {
    const k = ts.slice(0, 10);
    created.set(k, (created.get(k) ?? 0) + 1);
  }
  for (const ts of resolvedDates) {
    const k = ts.slice(0, 10);
    resolved.set(k, (resolved.get(k) ?? 0) + 1);
  }

  return days.map((date) => {
    const c = created.get(date) ?? 0;
    const r = resolved.get(date) ?? 0;
    return { date, created: c, resolved: r, net: c - r };
  });
}
