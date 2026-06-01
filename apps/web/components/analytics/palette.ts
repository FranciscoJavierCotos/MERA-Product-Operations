/**
 * Colorblind-safe categorical palette (Okabe-Ito) used across every analytics
 * chart. Per the a11y spec, color is never the *only* encoding — charts pair
 * these with labels/shape — but using a CVD-safe ramp keeps the fallback honest.
 */
export const OKABE_ITO = {
  blue: "#0072B2",
  orange: "#E69F00",
  green: "#009E73",
  red: "#D55E00",
  purple: "#CC79A7",
  sky: "#56B4E9",
  yellow: "#F0E442",
  grey: "#999999",
} as const;

/** Stable color per ticket priority. */
export const PRIORITY_COLORS: Record<string, string> = {
  low: OKABE_ITO.sky,
  medium: OKABE_ITO.blue,
  high: OKABE_ITO.orange,
  urgent: OKABE_ITO.red,
};

/** SLA outcome colors (met / at-risk / breached). */
export const SLA_COLORS = {
  met: OKABE_ITO.green,
  atRisk: OKABE_ITO.orange,
  breached: OKABE_ITO.red,
} as const;

export const PRIORITY_ORDER = ["urgent", "high", "medium", "low"] as const;

export function formatHours(h: number | null): string {
  if (h === null) return "—";
  if (h < 1) return `${Math.round(h * 60)}m`;
  if (h < 48) return `${h.toFixed(1)}h`;
  return `${(h / 24).toFixed(1)}d`;
}

export function formatPct(v: number | null, digits = 1): string {
  if (v === null) return "—";
  return `${v.toFixed(digits)}%`;
}

export function formatSigned(v: number | null): string {
  if (v === null) return "—";
  return v > 0 ? `+${v}` : `${v}`;
}
