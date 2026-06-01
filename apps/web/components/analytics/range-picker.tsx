"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { cn } from "@/lib/utils/cn";
import { RANGE_OPTIONS, type AnalyticsRange } from "@/types/analytics.types";

/**
 * Date-range control. Selection is serialized to `?range=` so any analytics
 * view is shareable / bookmarkable (essential for "send me that screen").
 */
export function RangePicker({ value }: { value: AnalyticsRange }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const onSelect = useCallback(
    (next: AnalyticsRange) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("range", next);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  return (
    <div
      className="inline-flex items-center rounded-lg border border-border bg-card p-0.5"
      role="group"
      aria-label="Date range"
    >
      {RANGE_OPTIONS.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onSelect(opt.value)}
            aria-pressed={active}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
