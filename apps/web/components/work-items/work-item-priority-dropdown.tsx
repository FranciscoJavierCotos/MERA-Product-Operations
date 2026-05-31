"use client";

import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { TicketPriorityRow } from "@/types/ticket.types";

/** Stop drag/open handlers on the parent card from firing when the pill is used. */
const stop = (e: { stopPropagation: () => void }) => e.stopPropagation();

/**
 * Interactive priority pill: renders the priority badge as a dropdown trigger
 * so the work item's priority can be changed inline from the board.
 */
export function WorkItemPriorityDropdown({
  priority,
  priorities,
  onChange,
  disabled,
}: {
  priority: TicketPriorityRow | null | undefined;
  priorities: TicketPriorityRow[];
  onChange: (priorityId: number | null) => void;
  disabled?: boolean;
}) {
  const currentId = priority?.id ?? null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        asChild
        disabled={disabled}
        onClick={stop}
        onPointerDown={stop}
      >
        <button type="button" className="cursor-pointer rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {priority ? (
            <Badge className={priority.color_class}>{priority.label}</Badge>
          ) : (
            <Badge variant="outline" className="text-gray-400 dark:text-gray-500">
              Priority
            </Badge>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" onClick={stop}>
        <DropdownMenuItem onSelect={() => onChange(null)}>
          <Check
            className={`h-3.5 w-3.5 mr-2 ${currentId === null ? "opacity-100" : "opacity-0"}`}
          />
          — None —
        </DropdownMenuItem>
        {priorities.map((p) => (
          <DropdownMenuItem
            key={p.id}
            onSelect={() => {
              if (p.id !== currentId) onChange(p.id);
            }}
          >
            <Check
              className={`h-3.5 w-3.5 mr-2 ${p.id === currentId ? "opacity-100" : "opacity-0"}`}
            />
            {p.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
