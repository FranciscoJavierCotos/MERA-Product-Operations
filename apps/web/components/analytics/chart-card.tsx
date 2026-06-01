"use client";

import { useState, type ReactNode } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import { AlertTriangle, Info, RotateCw, Table2 } from "lucide-react";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  /** Plain-language explanation of the metric, shown in an info tooltip. */
  info?: string;
  className?: string;
  /** Tailwind height for the chart body (e.g. "h-64"). */
  bodyHeight?: string;
  isLoading?: boolean;
  isError?: boolean;
  isEmpty?: boolean;
  emptyMessage?: string;
  onRetry?: () => void;
  /** Accessible "view as table" fallback. When provided, a toggle is shown. */
  renderTable?: () => ReactNode;
  children: ReactNode;
}

export function ChartCard({
  title,
  subtitle,
  info,
  className,
  bodyHeight = "h-64",
  isLoading,
  isError,
  isEmpty,
  emptyMessage = "No data in this range",
  onRetry,
  renderTable,
  children,
}: ChartCardProps) {
  const [showTable, setShowTable] = useState(false);

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-semibold truncate">{title}</h3>
              {info && (
                <span
                  className="group relative inline-flex shrink-0"
                  tabIndex={0}
                  role="note"
                  aria-label={info}
                >
                  <Info className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                  <span className="pointer-events-none absolute left-1/2 top-5 z-20 hidden w-56 -translate-x-1/2 rounded-md border border-border bg-popover p-2 text-[11px] leading-snug text-popover-foreground shadow-md group-hover:block group-focus:block">
                    {info}
                  </span>
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</p>
            )}
          </div>
          {renderTable && !isLoading && !isError && !isEmpty && (
            <button
              type="button"
              onClick={() => setShowTable((s) => !s)}
              className="shrink-0 inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-pressed={showTable}
            >
              <Table2 className="h-3.5 w-3.5" aria-hidden="true" />
              {showTable ? "Chart" : "Table"}
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className={cn("pt-0 flex-1", bodyHeight)}>
        {isLoading ? (
          <Skeleton />
        ) : isError ? (
          <ErrorState onRetry={onRetry} />
        ) : isEmpty ? (
          <EmptyState message={emptyMessage} />
        ) : showTable && renderTable ? (
          <div className="h-full overflow-auto">{renderTable()}</div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

function Skeleton() {
  return (
    <div className="h-full w-full animate-pulse rounded-md bg-muted/50" aria-hidden="true" />
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-1 text-center text-muted-foreground">
      <p className="text-sm">{message}</p>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
      <AlertTriangle className="h-6 w-6 text-amber-500" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">Couldn&apos;t load this chart</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium hover:bg-muted transition-colors"
        >
          <RotateCw className="h-3 w-3" aria-hidden="true" /> Retry
        </button>
      )}
    </div>
  );
}
