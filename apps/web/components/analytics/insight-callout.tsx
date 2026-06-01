import { cn } from "@/lib/utils/cn";
import { Lightbulb, TrendingDown, TriangleAlert } from "lucide-react";

export type InsightSeverity = "info" | "warning" | "critical";

const styles: Record<
  InsightSeverity,
  { wrap: string; icon: typeof Lightbulb; iconColor: string }
> = {
  info: {
    wrap: "border-blue-500/30 bg-blue-50/60 dark:bg-blue-500/10",
    icon: Lightbulb,
    iconColor: "text-blue-500",
  },
  warning: {
    wrap: "border-amber-500/30 bg-amber-50/60 dark:bg-amber-500/10",
    icon: TrendingDown,
    iconColor: "text-amber-500",
  },
  critical: {
    wrap: "border-red-500/30 bg-red-50/60 dark:bg-red-500/10",
    icon: TriangleAlert,
    iconColor: "text-red-500",
  },
};

/**
 * Plain-language takeaway shown at the top of each analytics section.
 * States what the numbers *mean* and the recommended action — generated from
 * the same aggregates the charts render, so it stays auditable.
 */
export function InsightCallout({
  severity = "info",
  children,
}: {
  severity?: InsightSeverity;
  children: React.ReactNode;
}) {
  const s = styles[severity];
  const Icon = s.icon;
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm",
        s.wrap,
      )}
      role="note"
    >
      <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", s.iconColor)} aria-hidden="true" />
      <p className="text-foreground/90 leading-snug">{children}</p>
    </div>
  );
}
