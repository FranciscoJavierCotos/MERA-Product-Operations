"use client";

import { useRef } from "react";
import {
  Search,
  X,
  List,
  Columns2,
  CalendarDays,
  TableProperties,
  Plus,
  Check,
  ChevronDown,
  ArrowUpDown,
} from "lucide-react";
import {
  TaskPriority,
  TaskActionTag,
  TaskStatus,
  TASK_PRIORITIES,
  TASK_ACTION_TAGS,
  ACTION_TAG_LABELS,
} from "@/types/task.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";

export type TaskView = "list" | "kanban" | "calendar" | "table";

export interface TaskFiltersState {
  search: string;
  statuses: TaskStatus[];
  priorities: TaskPriority[];
  tags: TaskActionTag[];
  dueDateFrom: string;
  dueDateTo: string;
  sortBy: "due_date" | "priority" | "created_at" | "title";
  sortDir: "asc" | "desc";
}

export const DEFAULT_FILTERS: TaskFiltersState = {
  search: "",
  statuses: [],
  priorities: [],
  tags: [],
  dueDateFrom: "",
  dueDateTo: "",
  sortBy: "due_date",
  sortDir: "asc",
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
};

const PRIORITY_DOTS: Record<TaskPriority, string> = {
  urgent: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-slate-400",
};

const SORT_LABELS: Record<TaskFiltersState["sortBy"], string> = {
  due_date: "Due Date",
  priority: "Priority",
  created_at: "Created",
  title: "Title",
};

const VIEW_OPTIONS: { id: TaskView; label: string; icon: React.ReactNode }[] = [
  { id: "list", label: "List", icon: <List className="h-4 w-4" /> },
  { id: "kanban", label: "Board", icon: <Columns2 className="h-4 w-4" /> },
  { id: "calendar", label: "Calendar", icon: <CalendarDays className="h-4 w-4" /> },
  { id: "table", label: "Table", icon: <TableProperties className="h-4 w-4" /> },
];

interface TaskFilterToolbarProps {
  filters: TaskFiltersState;
  onFiltersChange: (filters: TaskFiltersState) => void;
  view: TaskView;
  onViewChange: (view: TaskView) => void;
  totalCount: number;
  filteredCount: number;
  onNewTask: () => void;
}

export function TaskFilterToolbar({
  filters,
  onFiltersChange,
  view,
  onViewChange,
  totalCount,
  filteredCount,
  onNewTask,
}: TaskFilterToolbarProps) {
  const searchRef = useRef<HTMLInputElement>(null);

  const set = (partial: Partial<TaskFiltersState>) =>
    onFiltersChange({ ...filters, ...partial });

  const toggleStatus = (s: TaskStatus) => {
    const cur = filters.statuses;
    set({ statuses: cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s] });
  };

  const togglePriority = (p: TaskPriority) => {
    const cur = filters.priorities;
    set({
      priorities: cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p],
    });
  };

  const toggleTag = (t: TaskActionTag) => {
    const cur = filters.tags;
    set({ tags: cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t] });
  };

  const clearAll = () => onFiltersChange(DEFAULT_FILTERS);

  const hasActiveFilters =
    filters.search ||
    filters.statuses.length > 0 ||
    filters.priorities.length > 0 ||
    filters.tags.length > 0 ||
    filters.dueDateFrom ||
    filters.dueDateTo;

  const activeChips: { label: string; onRemove: () => void }[] = [];

  filters.statuses.forEach((s) =>
    activeChips.push({
      label: s === "pending" ? "Pending" : "Completed",
      onRemove: () => toggleStatus(s),
    })
  );
  filters.priorities.forEach((p) =>
    activeChips.push({
      label: PRIORITY_LABELS[p],
      onRemove: () => togglePriority(p),
    })
  );
  filters.tags.forEach((t) =>
    activeChips.push({
      label: ACTION_TAG_LABELS[t],
      onRemove: () => toggleTag(t),
    })
  );
  if (filters.dueDateFrom)
    activeChips.push({
      label: `From ${filters.dueDateFrom}`,
      onRemove: () => set({ dueDateFrom: "" }),
    });
  if (filters.dueDateTo)
    activeChips.push({
      label: `To ${filters.dueDateTo}`,
      onRemove: () => set({ dueDateTo: "" }),
    });

  return (
    <div className="space-y-2">
      {/* Main toolbar row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            ref={searchRef}
            placeholder="Search tasks…"
            value={filters.search}
            onChange={(e) => set({ search: e.target.value })}
            className="pl-9 pr-8 h-9"
          />
          {filters.search && (
            <button
              onClick={() => set({ search: "" })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Status filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-9 gap-1.5",
                filters.statuses.length > 0 &&
                  "border-primary/60 bg-primary/5 text-primary"
              )}
            >
              Status
              {filters.statuses.length > 0 && (
                <span className="ml-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold w-4 h-4 flex items-center justify-center">
                  {filters.statuses.length}
                </span>
              )}
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-40">
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Filter by status
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {(["pending", "completed"] as TaskStatus[]).map((s) => (
              <DropdownMenuItem
                key={s}
                onClick={() => toggleStatus(s)}
                className="gap-2"
              >
                <span
                  className={cn(
                    "flex h-4 w-4 items-center justify-center rounded border",
                    filters.statuses.includes(s)
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-border"
                  )}
                >
                  {filters.statuses.includes(s) && <Check className="h-3 w-3" />}
                </span>
                {s === "pending" ? "Pending" : "Completed"}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Priority filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-9 gap-1.5",
                filters.priorities.length > 0 &&
                  "border-primary/60 bg-primary/5 text-primary"
              )}
            >
              Priority
              {filters.priorities.length > 0 && (
                <span className="ml-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold w-4 h-4 flex items-center justify-center">
                  {filters.priorities.length}
                </span>
              )}
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-44">
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Filter by priority
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {TASK_PRIORITIES.slice().reverse().map((p) => (
              <DropdownMenuItem
                key={p}
                onClick={() => togglePriority(p)}
                className="gap-2"
              >
                <span
                  className={cn(
                    "flex h-4 w-4 items-center justify-center rounded border",
                    filters.priorities.includes(p)
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-border"
                  )}
                >
                  {filters.priorities.includes(p) && <Check className="h-3 w-3" />}
                </span>
                <span className={cn("h-2 w-2 rounded-full", PRIORITY_DOTS[p])} />
                {PRIORITY_LABELS[p]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Tag filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-9 gap-1.5",
                filters.tags.length > 0 &&
                  "border-primary/60 bg-primary/5 text-primary"
              )}
            >
              Tag
              {filters.tags.length > 0 && (
                <span className="ml-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold w-4 h-4 flex items-center justify-center">
                  {filters.tags.length}
                </span>
              )}
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52 max-h-72 overflow-y-auto">
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Filter by tag
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {TASK_ACTION_TAGS.map((t) => (
              <DropdownMenuItem
                key={t}
                onClick={() => toggleTag(t)}
                className="gap-2"
              >
                <span
                  className={cn(
                    "flex h-4 w-4 items-center justify-center rounded border",
                    filters.tags.includes(t)
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-border"
                  )}
                >
                  {filters.tags.includes(t) && <Check className="h-3 w-3" />}
                </span>
                {ACTION_TAG_LABELS[t]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Date range */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-9 gap-1.5",
                (filters.dueDateFrom || filters.dueDateTo) &&
                  "border-primary/60 bg-primary/5 text-primary"
              )}
            >
              Date
              {(filters.dueDateFrom || filters.dueDateTo) && (
                <span className="ml-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold w-4 h-4 flex items-center justify-center">
                  {(filters.dueDateFrom ? 1 : 0) + (filters.dueDateTo ? 1 : 0)}
                </span>
              )}
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-60 p-3 space-y-2">
            <p className="text-xs font-medium text-muted-foreground mb-1">
              Due date range
            </p>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">From</label>
              <Input
                type="date"
                value={filters.dueDateFrom}
                onChange={(e) => set({ dueDateFrom: e.target.value })}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">To</label>
              <Input
                type="date"
                value={filters.dueDateTo}
                onChange={(e) => set({ dueDateTo: e.target.value })}
                className="h-8 text-sm"
              />
            </div>
            {(filters.dueDateFrom || filters.dueDateTo) && (
              <button
                onClick={() => set({ dueDateFrom: "", dueDateTo: "" })}
                className="text-xs text-muted-foreground hover:text-foreground underline mt-1"
              >
                Clear dates
              </button>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Sort */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-1.5">
              <ArrowUpDown className="h-3.5 w-3.5" />
              {SORT_LABELS[filters.sortBy]}
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Sort by
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup
              value={filters.sortBy}
              onValueChange={(v) =>
                set({ sortBy: v as TaskFiltersState["sortBy"] })
              }
            >
              <DropdownMenuRadioItem value="due_date">Due Date</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="priority">Priority</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="created_at">Created</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="title">Title</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup
              value={filters.sortDir}
              onValueChange={(v) =>
                set({ sortDir: v as "asc" | "desc" })
              }
            >
              <DropdownMenuRadioItem value="asc">Ascending</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="desc">Descending</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Task count */}
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {hasActiveFilters && filteredCount !== totalCount
            ? `${filteredCount} of ${totalCount}`
            : `${totalCount} task${totalCount !== 1 ? "s" : ""}`}
        </span>

        {/* View switcher */}
        <div className="flex items-center rounded-md border border-border overflow-hidden">
          {VIEW_OPTIONS.map((v) => (
            <button
              key={v.id}
              title={v.label}
              onClick={() => onViewChange(v.id)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 h-9 text-sm transition-colors border-r last:border-r-0 border-border",
                view === v.id
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {v.icon}
              <span className="hidden sm:inline text-xs font-medium">{v.label}</span>
            </button>
          ))}
        </div>

        {/* New task */}
        <Button size="sm" className="h-9 gap-1.5" onClick={onNewTask}>
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New Task</span>
        </Button>
      </div>

      {/* Active filter chips */}
      {activeChips.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-muted-foreground">Filters:</span>
          {activeChips.map((chip, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-xs font-medium px-2.5 py-0.5 border border-primary/20"
            >
              {chip.label}
              <button
                onClick={chip.onRemove}
                className="ml-0.5 hover:text-primary/60"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <button
            onClick={clearAll}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
