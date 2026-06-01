"use client";

import { useState } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  isToday,
  isPast,
  parseISO,
} from "date-fns";
import { ChevronLeft, ChevronRight, CalendarX2 } from "lucide-react";
import { Task, TaskPriority } from "@/types/task.types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { TaskItem } from "./task-item";
import { CompleteTaskDialog } from "./complete-task-dialog";

type CalSubView = "month" | "week" | "day";

const PRIORITY_CHIP: Record<TaskPriority, string> = {
  urgent: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-400",
  low: "bg-slate-400",
};

const PRIORITY_CARD_BORDER: Record<TaskPriority, string> = {
  urgent: "border-l-red-500",
  high: "border-l-orange-500",
  medium: "border-l-yellow-400",
  low: "border-l-slate-400",
};

interface TaskCalendarViewProps {
  tasks: Task[];
  onComplete: (taskId: string, timeSpentMinutes?: number) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (task: Task) => void;
  onReopen?: (task: Task) => void;
}

export function TaskCalendarView({
  tasks,
  onComplete,
  onEdit,
  onDelete,
  onReopen,
}: TaskCalendarViewProps) {
  const [subView, setSubView] = useState<CalSubView>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [taskToComplete, setTaskToComplete] = useState<Task | null>(null);

  const tasksWithDate = tasks.filter((t) => !!t.due_date);
  const tasksWithoutDate = tasks.filter((t) => !t.due_date);

  const handleCompleteClick = (task: Task) => {
    if (task.ticket_id) {
      setTaskToComplete(task);
    } else {
      onComplete(task.id, undefined);
    }
  };

  const navigate = (dir: -1 | 1) => {
    if (subView === "month")
      setCurrentDate((d) => (dir === 1 ? addMonths(d, 1) : subMonths(d, 1)));
    else if (subView === "week")
      setCurrentDate((d) => (dir === 1 ? addWeeks(d, 1) : subWeeks(d, 1)));
    else setCurrentDate((d) => (dir === 1 ? addDays(d, 1) : subDays(d, 1)));
  };

  const goToday = () => setCurrentDate(new Date());

  const headerLabel = () => {
    if (subView === "month") return format(currentDate, "MMMM yyyy");
    if (subView === "week") {
      const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
      const we = endOfWeek(currentDate, { weekStartsOn: 1 });
      return isSameMonth(ws, we)
        ? `${format(ws, "MMM d")} – ${format(we, "d, yyyy")}`
        : `${format(ws, "MMM d")} – ${format(we, "MMM d, yyyy")}`;
    }
    return format(currentDate, "EEEE, MMMM d, yyyy");
  };

  const getTasksForDay = (day: Date) =>
    tasksWithDate.filter((t) => isSameDay(parseISO(t.due_date!), day));

  return (
    <div className="space-y-4">
      {/* Calendar toolbar */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={goToday} className="h-8">
          Today
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(1)}
          className="h-8 w-8 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <h2 className="text-sm font-semibold flex-1">{headerLabel()}</h2>
        <div className="flex rounded-md border border-border overflow-hidden">
          {(["month", "week", "day"] as CalSubView[]).map((v) => (
            <button
              key={v}
              onClick={() => setSubView(v)}
              className={cn(
                "px-3 h-8 text-xs font-medium border-r last:border-r-0 border-border transition-colors",
                subView === v
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted text-muted-foreground"
              )}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Month view */}
      {subView === "month" && (
        <MonthView
          currentDate={currentDate}
          getTasksForDay={getTasksForDay}
          onDayClick={(d) => {
            setCurrentDate(d);
            setSubView("day");
          }}
        />
      )}

      {/* Week view */}
      {subView === "week" && (
        <WeekView
          currentDate={currentDate}
          getTasksForDay={getTasksForDay}
          onCompleteClick={handleCompleteClick}
          onEdit={onEdit}
          onDelete={onDelete}
          onReopen={onReopen}
          onDayClick={(d) => {
            setCurrentDate(d);
            setSubView("day");
          }}
        />
      )}

      {/* Day view */}
      {subView === "day" && (
        <DayView
          currentDate={currentDate}
          tasks={getTasksForDay(currentDate)}
          onCompleteClick={handleCompleteClick}
          onEdit={onEdit}
          onDelete={onDelete}
          onReopen={onReopen}
        />
      )}

      {/* Tasks without due dates */}
      {tasksWithoutDate.length > 0 && (
        <div className="border border-dashed border-border/60 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <CalendarX2 className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium text-muted-foreground">
              No due date ({tasksWithoutDate.length})
            </p>
          </div>
          <div className="space-y-2">
            {tasksWithoutDate.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onComplete={handleCompleteClick}
                onEdit={onEdit}
                onDelete={onDelete}
                onReopen={onReopen}
              />
            ))}
          </div>
        </div>
      )}

      <CompleteTaskDialog
        task={taskToComplete}
        open={!!taskToComplete}
        onOpenChange={(open) => !open && setTaskToComplete(null)}
        onComplete={(id, mins) => {
          onComplete(id, mins);
          setTaskToComplete(null);
        }}
      />
    </div>
  );
}

// ── Month grid ────────────────────────────────────────────────────────────────

function MonthView({
  currentDate,
  getTasksForDay,
  onDayClick,
}: {
  currentDate: Date;
  getTasksForDay: (d: Date) => Task[];
  onDayClick: (d: Date) => void;
}) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  return (
    <div className="border border-border/60 rounded-xl overflow-hidden">
      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 bg-muted/40">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div
            key={d}
            className="px-2 py-2.5 text-center text-xs font-medium text-muted-foreground border-r last:border-r-0 border-b border-border/40"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          const dayTasks = getTasksForDay(day);
          const inMonth = isSameMonth(day, currentDate);
          const todayDay = isToday(day);
          const maxVisible = 3;
          const overflow = dayTasks.length - maxVisible;

          return (
            <div
              key={i}
              onClick={() => onDayClick(day)}
              className={cn(
                "min-h-[90px] p-1.5 border-r last:border-r-0 border-b border-border/40 cursor-pointer transition-colors",
                "hover:bg-muted/30",
                !inMonth && "bg-muted/10",
                todayDay && "bg-primary/5"
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={cn(
                    "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full",
                    todayDay
                      ? "bg-primary text-primary-foreground"
                      : inMonth
                        ? "text-foreground"
                        : "text-muted-foreground/40"
                  )}
                >
                  {format(day, "d")}
                </span>
              </div>

              <div className="space-y-0.5">
                {dayTasks.slice(0, maxVisible).map((task) => (
                  <div
                    key={task.id}
                    className={cn(
                      "flex items-center gap-1 px-1 py-0.5 rounded text-[10px] font-medium truncate",
                      task.status === "completed"
                        ? "bg-muted/60 text-muted-foreground line-through"
                        : "bg-primary/10 text-primary"
                    )}
                    title={task.title}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full flex-shrink-0",
                        PRIORITY_CHIP[task.priority]
                      )}
                    />
                    <span className="truncate">{task.title}</span>
                  </div>
                ))}
                {overflow > 0 && (
                  <p className="text-[10px] text-muted-foreground px-1">
                    +{overflow} more
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Week view ─────────────────────────────────────────────────────────────────

function WeekView({
  currentDate,
  getTasksForDay,
  onCompleteClick,
  onEdit,
  onDelete,
  onReopen,
  onDayClick,
}: {
  currentDate: Date;
  getTasksForDay: (d: Date) => Task[];
  onCompleteClick: (t: Task) => void;
  onEdit?: (t: Task) => void;
  onDelete?: (t: Task) => void;
  onReopen?: (t: Task) => void;
  onDayClick: (d: Date) => void;
}) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });

  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map((day) => {
        const dayTasks = getTasksForDay(day);
        const todayDay = isToday(day);

        return (
          <div key={day.toISOString()} className="flex flex-col gap-1.5">
            {/* Day header */}
            <button
              onClick={() => onDayClick(day)}
              className={cn(
                "flex flex-col items-center p-2 rounded-xl border transition-colors",
                todayDay
                  ? "bg-primary/10 border-primary/30"
                  : "bg-muted/20 border-border/40 hover:bg-muted/40"
              )}
            >
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                {format(day, "EEE")}
              </span>
              <span
                className={cn(
                  "text-sm font-bold mt-0.5",
                  todayDay ? "text-primary" : "text-foreground"
                )}
              >
                {format(day, "d")}
              </span>
              {dayTasks.length > 0 && (
                <span className="text-[10px] text-muted-foreground mt-0.5">
                  {dayTasks.length} task{dayTasks.length !== 1 ? "s" : ""}
                </span>
              )}
            </button>

            {/* Task cards */}
            <div className="space-y-1.5">
              {dayTasks.map((task) => (
                <WeekTaskCard
                  key={task.id}
                  task={task}
                  onCompleteClick={onCompleteClick}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onReopen={onReopen}
                />
              ))}
              {dayTasks.length === 0 && (
                <div className="h-16 border-2 border-dashed border-border/20 rounded-lg" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WeekTaskCard({
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

  return (
    <div
      className={cn(
        "group relative p-2 rounded-lg border-l-2 bg-card border border-border/40 shadow-sm",
        PRIORITY_CARD_BORDER[task.priority],
        isCompleted && "opacity-60"
      )}
    >
      <p
        className={cn(
          "text-[11px] font-medium leading-snug",
          isCompleted ? "line-through text-muted-foreground" : "text-foreground"
        )}
      >
        {task.title}
      </p>
      <div className="flex items-center justify-between mt-1">
        <span
          className={cn(
            "text-[10px] px-1.5 py-0 rounded-full border font-medium",
            task.priority === "urgent"
              ? "bg-red-100 text-red-700 border-red-200"
              : task.priority === "high"
                ? "bg-orange-100 text-orange-700 border-orange-200"
                : task.priority === "medium"
                  ? "bg-yellow-100 text-yellow-700 border-yellow-200"
                  : "bg-slate-100 text-slate-600 border-slate-200"
          )}
        >
          {task.priority}
        </span>
        {!isCompleted && (
          <button
            onClick={() => onCompleteClick(task)}
            className="opacity-0 group-hover:opacity-100 text-[10px] text-primary hover:underline transition-opacity"
          >
            Done
          </button>
        )}
      </div>
    </div>
  );
}

// ── Day view ──────────────────────────────────────────────────────────────────

function DayView({
  currentDate,
  tasks,
  onCompleteClick,
  onEdit,
  onDelete,
  onReopen,
}: {
  currentDate: Date;
  tasks: Task[];
  onCompleteClick: (t: Task) => void;
  onEdit?: (t: Task) => void;
  onDelete?: (t: Task) => void;
  onReopen?: (t: Task) => void;
}) {
  const todayDay = isToday(currentDate);

  return (
    <div
      className={cn(
        "rounded-xl border p-4 space-y-3",
        todayDay ? "border-primary/30 bg-primary/5" : "border-border/60"
      )}
    >
      <div className="flex items-center gap-2 pb-2 border-b border-border/40">
        {todayDay && (
          <span className="text-xs font-semibold bg-primary text-primary-foreground rounded-full px-2 py-0.5">
            Today
          </span>
        )}
        <h3 className="text-sm font-semibold">
          {format(currentDate, "EEEE, MMMM d, yyyy")}
        </h3>
        <span className="text-xs text-muted-foreground ml-auto">
          {tasks.length} task{tasks.length !== 1 ? "s" : ""}
        </span>
      </div>

      {tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          No tasks due this day
        </p>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onComplete={onCompleteClick}
              onEdit={onEdit}
              onDelete={onDelete}
              onReopen={onReopen}
            />
          ))}
        </div>
      )}
    </div>
  );
}
