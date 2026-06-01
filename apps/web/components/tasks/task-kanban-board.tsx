"use client";

import { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { GripVertical, MoreHorizontal, Calendar, Pencil, Trash2, RotateCcw, ExternalLink } from "lucide-react";
import Link from "next/link";
import { format, isPast, isToday } from "date-fns";
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
import { cn } from "@/lib/utils/cn";

interface KanbanColumn {
  id: TaskPriority;
  label: string;
  headerBg: string;
  headerText: string;
  bodyBg: string;
  isOverBg: string;
  dot: string;
  countBg: string;
}

const COLUMNS: KanbanColumn[] = [
  {
    id: "urgent",
    label: "Urgent",
    headerBg: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900",
    headerText: "text-red-700 dark:text-red-400",
    bodyBg: "bg-red-50/40 dark:bg-red-950/10",
    isOverBg: "bg-red-100/60 dark:bg-red-950/30",
    dot: "bg-red-500",
    countBg: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400",
  },
  {
    id: "high",
    label: "High",
    headerBg: "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-900",
    headerText: "text-orange-700 dark:text-orange-400",
    bodyBg: "bg-orange-50/40 dark:bg-orange-950/10",
    isOverBg: "bg-orange-100/60 dark:bg-orange-950/30",
    dot: "bg-orange-500",
    countBg: "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400",
  },
  {
    id: "medium",
    label: "Medium",
    headerBg: "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-900",
    headerText: "text-yellow-700 dark:text-yellow-400",
    bodyBg: "bg-yellow-50/40 dark:bg-yellow-950/10",
    isOverBg: "bg-yellow-100/60 dark:bg-yellow-950/30",
    dot: "bg-yellow-500",
    countBg: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-400",
  },
  {
    id: "low",
    label: "Low",
    headerBg: "bg-slate-50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800",
    headerText: "text-slate-600 dark:text-slate-400",
    bodyBg: "bg-slate-50/40 dark:bg-slate-950/10",
    isOverBg: "bg-slate-100/60 dark:bg-slate-900/30",
    dot: "bg-slate-400",
    countBg: "bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400",
  },
];

// ── Draggable card ────────────────────────────────────────────────────────────

interface KanbanCardProps {
  task: Task;
  onCompleteClick: (task: Task) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (task: Task) => void;
  onReopen?: (task: Task) => void;
  isDragOverlay?: boolean;
}

function KanbanCard({
  task,
  onCompleteClick,
  onEdit,
  onDelete,
  onReopen,
  isDragOverlay = false,
}: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task },
    disabled: isDragOverlay,
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  const isCompleted = task.status === "completed";

  const dueDateDisplay = task.due_date
    ? (() => {
        const d = new Date(task.due_date);
        const overdue = isPast(d) && !isCompleted && !isToday(d);
        const today = isToday(d);
        return { label: format(d, "MMM d"), overdue, today };
      })()
    : null;

  return (
    <div
      ref={isDragOverlay ? undefined : setNodeRef}
      style={isDragOverlay ? undefined : style}
      className={cn(
        "group relative bg-white dark:bg-card border rounded-lg p-3 select-none",
        "border-border/60 dark:border-border/40",
        "shadow-sm hover:shadow-md dark:shadow-none",
        "transition-shadow",
        isDragging && !isDragOverlay && "opacity-30",
        isDragOverlay && "rotate-1 shadow-xl border-primary/30 ring-1 ring-primary/20",
        isCompleted && "opacity-60"
      )}
    >
      {/* Drag handle + actions row */}
      <div className="flex items-center justify-between mb-2">
        <div
          {...(isDragOverlay ? {} : { ...attributes, ...listeners })}
          className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors p-0.5 -ml-0.5 rounded"
        >
          <GripVertical className="h-4 w-4" />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
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
      </div>

      {/* Title */}
      <p
        className={cn(
          "text-sm font-medium leading-snug mb-2",
          isCompleted ? "line-through text-muted-foreground" : "text-foreground"
        )}
      >
        {task.title}
      </p>

      {/* Description */}
      {task.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
          {task.description}
        </p>
      )}

      {/* Tags row */}
      <div className="flex flex-wrap gap-1 mb-2">
        <TaskActionTagBadge actionTag={task.action_tag} className="text-[10px] px-1.5 py-0" />
      </div>

      {/* Footer: due date + assignee + ticket */}
      <div className="flex items-center justify-between gap-1 mt-2 pt-2 border-t border-border/40">
        <div className="flex items-center gap-1.5 min-w-0">
          {dueDateDisplay && (
            <span
              className={cn(
                "inline-flex items-center gap-1 text-[10px] font-medium whitespace-nowrap",
                dueDateDisplay.overdue
                  ? "text-red-600 dark:text-red-400"
                  : dueDateDisplay.today
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-muted-foreground"
              )}
            >
              <Calendar className="h-3 w-3" />
              {dueDateDisplay.today ? "Today" : dueDateDisplay.label}
            </span>
          )}

          {task.ticket_id && task.ticket && (
            <Link
              href={`/tickets/${task.ticket_id}`}
              className="inline-flex items-center gap-0.5 text-[10px] text-primary hover:underline truncate max-w-[120px]"
              onClick={(e) => e.stopPropagation()}
              title={`#${task.ticket.ticket_number} - ${task.ticket.title}`}
            >
              <ExternalLink className="h-2.5 w-2.5 flex-shrink-0" />
              #{task.ticket.ticket_number}
            </Link>
          )}
        </div>

        {task.assigned_user && (
          <UserAvatar
            name={task.assigned_user.full_name}
            avatarUrl={task.assigned_user.avatar_url}
            className="h-5 w-5 flex-shrink-0"
          />
        )}
      </div>
    </div>
  );
}

// ── Droppable column ──────────────────────────────────────────────────────────

interface DroppableColumnProps {
  column: KanbanColumn;
  tasks: Task[];
  onCompleteClick: (task: Task) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (task: Task) => void;
  onReopen?: (task: Task) => void;
}

function DroppableColumn({
  column,
  tasks,
  onCompleteClick,
  onEdit,
  onDelete,
  onReopen,
}: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { priority: column.id },
  });

  return (
    <div className="flex flex-col min-w-[280px] max-w-[320px] flex-1">
      {/* Column header */}
      <div
        className={cn(
          "flex items-center justify-between px-3 py-2.5 rounded-t-xl border border-b-0",
          column.headerBg
        )}
      >
        <div className="flex items-center gap-2">
          <span className={cn("h-2.5 w-2.5 rounded-full", column.dot)} />
          <span className={cn("text-sm font-semibold", column.headerText)}>
            {column.label}
          </span>
        </div>
        <span
          className={cn(
            "text-xs font-bold rounded-full px-2 py-0.5 min-w-[1.5rem] text-center",
            column.countBg
          )}
        >
          {tasks.length}
        </span>
      </div>

      {/* Column body — droppable zone */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 rounded-b-xl border border-border/60 p-2 space-y-2 transition-colors min-h-[300px]",
          isOver ? column.isOverBg : column.bodyBg
        )}
      >
        {tasks.length === 0 ? (
          <div
            className={cn(
              "flex items-center justify-center h-20 rounded-lg border-2 border-dashed text-xs text-muted-foreground/50 transition-colors",
              isOver ? "border-primary/40 text-primary/60" : "border-border/30"
            )}
          >
            Drop here
          </div>
        ) : (
          tasks.map((task) => (
            <KanbanCard
              key={task.id}
              task={task}
              onCompleteClick={onCompleteClick}
              onEdit={onEdit}
              onDelete={onDelete}
              onReopen={onReopen}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ── Main board ────────────────────────────────────────────────────────────────

interface TaskKanbanBoardProps {
  tasks: Task[];
  onCompleteClick: (task: Task) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (task: Task) => void;
  onReopen?: (task: Task) => void;
  onUpdatePriority: (taskId: string, priority: TaskPriority) => void;
}

export function TaskKanbanBoard({
  tasks,
  onCompleteClick,
  onEdit,
  onDelete,
  onReopen,
  onUpdatePriority,
}: TaskKanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const tasksByPriority = COLUMNS.reduce(
    (acc, col) => {
      acc[col.id] = tasks.filter((t) => t.priority === col.id);
      return acc;
    },
    {} as Record<TaskPriority, Task[]>
  );

  function handleDragStart(event: DragStartEvent) {
    const task = event.active.data.current?.task as Task | undefined;
    setActiveTask(task ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;
    const newPriority = over.data.current?.priority as TaskPriority | undefined;
    if (!newPriority) return;

    const task = tasks.find((t) => t.id === active.id);
    if (task && task.priority !== newPriority) {
      onUpdatePriority(task.id, newPriority);
    }
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((col) => (
          <DroppableColumn
            key={col.id}
            column={col}
            tasks={tasksByPriority[col.id]}
            onCompleteClick={onCompleteClick}
            onEdit={onEdit}
            onDelete={onDelete}
            onReopen={onReopen}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask && (
          <KanbanCard
            task={activeTask}
            onCompleteClick={onCompleteClick}
            onEdit={onEdit}
            onDelete={onDelete}
            onReopen={onReopen}
            isDragOverlay
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}
