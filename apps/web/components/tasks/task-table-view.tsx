"use client";

import { useState } from "react";
import { format, isPast, isToday, parseISO } from "date-fns";
import {
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  MoreHorizontal,
  Pencil,
  Trash2,
  RotateCcw,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { Task, TaskPriority } from "@/types/task.types";
import { TaskPriorityBadge, TaskActionTagBadge } from "./task-badges";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils/cn";

type ColId = "title" | "priority" | "tag" | "status" | "due_date" | "assignee" | "created_at";

interface Column {
  id: ColId;
  label: string;
  sortable: boolean;
  className?: string;
}

const COLUMNS: Column[] = [
  { id: "title", label: "Task", sortable: true, className: "min-w-[240px]" },
  { id: "priority", label: "Priority", sortable: true, className: "w-28" },
  { id: "tag", label: "Tag", sortable: false, className: "w-36" },
  { id: "status", label: "Status", sortable: true, className: "w-28" },
  { id: "due_date", label: "Due Date", sortable: true, className: "w-32" },
  { id: "assignee", label: "Assignee", sortable: false, className: "w-36" },
  { id: "created_at", label: "Created", sortable: true, className: "w-28" },
];

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
};

interface TaskTableViewProps {
  tasks: Task[];
  onCompleteClick: (task: Task) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (task: Task) => void;
  onReopen?: (task: Task) => void;
}

export function TaskTableView({
  tasks,
  onCompleteClick,
  onEdit,
  onDelete,
  onReopen,
}: TaskTableViewProps) {
  const [sortCol, setSortCol] = useState<ColId>("due_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const handleSort = (col: ColId) => {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  };

  const sorted = [...tasks].sort((a, b) => {
    let cmp = 0;
    switch (sortCol) {
      case "title":
        cmp = a.title.localeCompare(b.title);
        break;
      case "priority":
        cmp = PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority];
        break;
      case "status":
        cmp = a.status.localeCompare(b.status);
        break;
      case "due_date":
        if (!a.due_date && !b.due_date) cmp = 0;
        else if (!a.due_date) cmp = 1;
        else if (!b.due_date) cmp = -1;
        else cmp = new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        break;
      case "created_at":
        cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        break;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  if (sorted.length === 0) {
    return (
      <div className="rounded-xl border border-border/60 bg-card">
        <div className="text-center py-12 text-muted-foreground text-sm">
          No tasks to display
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/60 overflow-hidden bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {/* Complete checkbox column */}
            <TableHead className="w-10 pl-4 pr-0" />
            {COLUMNS.map((col) => (
              <TableHead key={col.id} className={cn("px-3 py-3", col.className)}>
                {col.sortable ? (
                  <button
                    onClick={() => handleSort(col.id)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors group"
                  >
                    {col.label}
                    {sortCol === col.id ? (
                      sortDir === "asc" ? (
                        <ArrowUp className="h-3 w-3 text-primary" />
                      ) : (
                        <ArrowDown className="h-3 w-3 text-primary" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-0 group-hover:opacity-40" />
                    )}
                  </button>
                ) : (
                  <span className="text-xs font-medium text-muted-foreground">
                    {col.label}
                  </span>
                )}
              </TableHead>
            ))}
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((task) => (
            <TableRowItem
              key={task.id}
              task={task}
              onCompleteClick={onCompleteClick}
              onEdit={onEdit}
              onDelete={onDelete}
              onReopen={onReopen}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function TableRowItem({
  task,
  onCompleteClick,
  onEdit,
  onDelete,
  onReopen,
}: {
  task: Task;
  onCompleteClick: (t: Task) => void;
  onEdit?: (t: Task) => void;
  onDelete?: (t: Task) => void;
  onReopen?: (t: Task) => void;
}) {
  const isCompleted = task.status === "completed";

  const dueDateDisplay = task.due_date
    ? (() => {
        const d = parseISO(task.due_date);
        const overdue = isPast(d) && !isCompleted && !isToday(d);
        const today = isToday(d);
        return { label: format(d, "MMM d, yyyy"), overdue, today };
      })()
    : null;

  return (
    <TableRow
      className={cn(
        "group transition-colors",
        isCompleted && "opacity-60 bg-muted/5"
      )}
    >
      {/* Checkbox */}
      <TableCell className="pl-4 pr-0 py-2.5">
        <input
          type="checkbox"
          checked={isCompleted}
          onChange={() => {
            if (!isCompleted) onCompleteClick(task);
            else onReopen?.(task);
          }}
          className="h-4 w-4 rounded border-border text-primary focus:ring-ring cursor-pointer"
        />
      </TableCell>

      {/* Title */}
      <TableCell className="px-3 py-2.5">
        <div className="space-y-0.5">
          <p
            className={cn(
              "text-sm font-medium leading-snug",
              isCompleted ? "line-through text-muted-foreground" : "text-foreground"
            )}
          >
            {task.title}
          </p>
          {task.description && (
            <p className="text-xs text-muted-foreground truncate max-w-[300px]">
              {task.description}
            </p>
          )}
          {task.ticket_id && task.ticket && (
            <Link
              href={`/tickets/${task.ticket_id}`}
              className="inline-flex items-center gap-0.5 text-xs text-primary hover:underline"
              title={`#${task.ticket.ticket_number} - ${task.ticket.title}`}
            >
              <ExternalLink className="h-3 w-3" />
              #{task.ticket.ticket_number}
            </Link>
          )}
        </div>
      </TableCell>

      {/* Priority */}
      <TableCell className="px-3 py-2.5">
        <TaskPriorityBadge priority={task.priority} className="text-xs" />
      </TableCell>

      {/* Tag */}
      <TableCell className="px-3 py-2.5">
        <TaskActionTagBadge actionTag={task.action_tag} className="text-xs" />
      </TableCell>

      {/* Status */}
      <TableCell className="px-3 py-2.5">
        <span
          className={cn(
            "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
            isCompleted
              ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-900"
              : "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900"
          )}
        >
          {isCompleted ? "Completed" : "Pending"}
        </span>
      </TableCell>

      {/* Due date */}
      <TableCell className="px-3 py-2.5">
        {dueDateDisplay ? (
          <span
            className={cn(
              "text-xs font-medium",
              dueDateDisplay.overdue
                ? "text-red-600 dark:text-red-400"
                : dueDateDisplay.today
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-muted-foreground"
            )}
          >
            {dueDateDisplay.today ? "Today" : dueDateDisplay.label}
            {dueDateDisplay.overdue && (
              <span className="ml-1 text-[10px] opacity-80">overdue</span>
            )}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground/50">—</span>
        )}
      </TableCell>

      {/* Assignee */}
      <TableCell className="px-3 py-2.5">
        {task.assigned_user ? (
          <div className="flex items-center gap-1.5">
            <UserAvatar
              name={task.assigned_user.full_name}
              avatarUrl={task.assigned_user.avatar_url}
              className="h-5 w-5"
            />
            <span className="text-xs text-muted-foreground truncate max-w-[100px]">
              {task.assigned_user.full_name.split(" ")[0]}
            </span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground/50">—</span>
        )}
      </TableCell>

      {/* Created */}
      <TableCell className="px-3 py-2.5">
        <span className="text-xs text-muted-foreground">
          {format(parseISO(task.created_at), "MMM d")}
        </span>
      </TableCell>

      {/* Actions */}
      <TableCell className="px-2 py-2.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            {!isCompleted && (
              <DropdownMenuItem onClick={() => onCompleteClick(task)}>
                Complete
              </DropdownMenuItem>
            )}
            {isCompleted && onReopen && (
              <DropdownMenuItem onClick={() => onReopen(task)}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reopen
              </DropdownMenuItem>
            )}
            {onEdit && (
              <DropdownMenuItem onClick={() => onEdit(task)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
            )}
            {onDelete && (
              <DropdownMenuItem
                onClick={() => onDelete(task)}
                className="text-red-600 dark:text-red-400"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}
