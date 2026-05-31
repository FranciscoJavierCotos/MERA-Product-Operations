"use client";

import { Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { WorkItemStatusBadge } from "./work-item-status-badge";
import {
  WORK_ITEM_STATUSES,
  WORK_ITEM_STATUS_LABELS,
} from "@/types/work-item.types";
import type { WorkItemStatus } from "@/types/work-item.types";

/** Stop drag/open handlers on the parent row from firing when the pill is used. */
const stop = (e: { stopPropagation: () => void }) => e.stopPropagation();

/**
 * Interactive status pill: renders the {@link WorkItemStatusBadge} as a
 * dropdown trigger so the work item's status can be changed inline.
 */
export function WorkItemStatusDropdown({
  status,
  onChange,
  disabled,
}: {
  status: WorkItemStatus;
  onChange: (status: WorkItemStatus) => void;
  disabled?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        asChild
        disabled={disabled}
        onClick={stop}
        onPointerDown={stop}
      >
        <button type="button" className="cursor-pointer rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <WorkItemStatusBadge status={status} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" onClick={stop}>
        {WORK_ITEM_STATUSES.map((s) => (
          <DropdownMenuItem
            key={s}
            onSelect={() => {
              if (s !== status) onChange(s);
            }}
          >
            <Check
              className={`h-3.5 w-3.5 mr-2 ${s === status ? "opacity-100" : "opacity-0"}`}
            />
            {WORK_ITEM_STATUS_LABELS[s]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
