"use client";

import { UserAvatar } from "@/components/shared/user-avatar";
import { Badge } from "@/components/ui/badge";
import { WorkItemTypeBadge } from "./work-item-type-badge";
import { WorkItemPriorityDropdown } from "./work-item-priority-dropdown";
import type { WorkItemWithRelations } from "@/types/work-item.types";
import type { TicketPriorityRow } from "@/types/ticket.types";

interface Props {
  item: WorkItemWithRelations;
  onOpen?: () => void;
  dragHandleProps?: Record<string, unknown>;
  isDragging?: boolean;
  /** When provided alongside `priorities`, the priority pill becomes an inline dropdown. */
  priorities?: TicketPriorityRow[];
  onPriorityChange?: (priorityId: number | null) => void;
}

export function WorkItemCard({
  item,
  onOpen,
  dragHandleProps,
  isDragging,
  priorities,
  onPriorityChange,
}: Props) {
  return (
    <div
      className={`rounded-md border bg-white dark:bg-card border-border p-3 shadow-sm hover:border-primary/40 transition-colors cursor-pointer ${
        isDragging ? "opacity-60" : ""
      }`}
      onClick={onOpen}
      {...dragHandleProps}
    >
      <div className="flex items-start justify-between gap-2">
        <WorkItemTypeBadge type={item.type} />
        <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">{item.item_key}</span>
      </div>

      <p className="text-sm text-gray-900 dark:text-gray-100 mt-2 line-clamp-3">{item.title}</p>

      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-2">
          {priorities && onPriorityChange ? (
            <WorkItemPriorityDropdown
              priority={item.priority}
              priorities={priorities}
              onChange={onPriorityChange}
            />
          ) : (
            item.priority && (
              <Badge className={item.priority.color_class}>{item.priority.label}</Badge>
            )
          )}
          {item.story_points != null && (
            <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-muted rounded-full px-2 py-0.5">
              {item.story_points}
            </span>
          )}
        </div>
        {item.assignee && (
          <UserAvatar
            name={item.assignee.full_name}
            avatarUrl={item.assignee.avatar_url}
            className="h-6 w-6"
          />
        )}
      </div>
    </div>
  );
}
