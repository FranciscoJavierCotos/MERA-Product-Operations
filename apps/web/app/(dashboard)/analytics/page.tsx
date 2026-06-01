import { api } from "@/lib/api-client";
import {
  isAnalyticsRange,
  type AnalyticsRange,
  type AnalyticsSummary,
} from "@/types/analytics.types";
import { RangePicker } from "@/components/analytics/range-picker";
import { HeroStrip } from "@/components/analytics/hero-strip";
import { AnalyticsSections } from "@/components/analytics/analytics-sections";

export const metadata = {
  title: "Analytics · MERA",
  description: "Support operations & delivery analytics",
};

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const params = await searchParams;
  const range: AnalyticsRange = isAnalyticsRange(params.range)
    ? params.range
    : "30d";

  // Server-render the hero summary for a fast first paint; client components
  // refetch (keyed by range) and the chart sections stream in independently.
  let summary: AnalyticsSummary | null = null;
  try {
    summary = await api.get<AnalyticsSummary>("/analytics/summary", { range });
  } catch {
    // Degrade gracefully — the client HeroStrip will retry on mount.
  }

  return (
    <div className="space-y-6">
      {/* ── Sticky control bar ── */}
      <div className="sticky top-0 z-10 -mx-4 border-b border-border bg-background/80 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Analytics
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Support operations &amp; delivery — trended over your selected range.
            </p>
          </div>
          <RangePicker value={range} />
        </div>
      </div>

      {/* ── Hero KPI strip ── */}
      {summary ? (
        <HeroStrip range={range} initialSummary={summary} />
      ) : (
        <HeroFallback />
      )}

      {/* ── Sections ── */}
      <AnalyticsSections range={range} />
    </div>
  );
}

function HeroFallback() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="h-24 animate-pulse rounded-lg border border-border bg-muted/40"
          aria-hidden="true"
        />
      ))}
    </div>
  );
}
