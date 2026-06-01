"use client";

import { useEffect, useMemo, useState } from "react";
import { Task, TaskPriority, TaskStats as TaskStatsType } from "@/types/task.types";
import { Profile } from "@/types/user.types";
import { CreateTaskFormData } from "@/lib/validations/task.schema";
import {
  useMyTasks,
  useTaskStats,
  useCreateTask,
  useUpdateTask,
  useCompleteTask,
  useReopenTask,
  useDeleteTask,
} from "@/lib/hooks/use-tasks";
import { TaskStats } from "@/components/tasks/task-stats";
import { TaskForm } from "@/components/tasks/task-form";
import { TaskList } from "@/components/tasks/task-list";
import { TaskKanbanBoard } from "@/components/tasks/task-kanban-board";
import { TaskCalendarView } from "@/components/tasks/task-calendar-view";
import { TaskTableView } from "@/components/tasks/task-table-view";
import {
  TaskFilterToolbar,
  TaskFiltersState,
  TaskView,
  DEFAULT_FILTERS,
} from "@/components/tasks/task-filter-toolbar";
import { CompleteTaskDialog } from "@/components/tasks/complete-task-dialog";

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
};

interface TasksPageClientProps {
  initialTasks: Task[];
  initialStats: TaskStatsType;
  users: Profile[];
  currentUserId: string;
  initialCreateOpen?: boolean;
}

export function TasksPageClient({
  initialTasks,
  initialStats,
  users,
  currentUserId,
  initialCreateOpen = false,
}: TasksPageClientProps) {
  const [view, setView] = useState<TaskView>("list");
  const [filters, setFilters] = useState<TaskFiltersState>(DEFAULT_FILTERS);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskToComplete, setTaskToComplete] = useState<Task | null>(null);

  const { data: allTasks = initialTasks } = useMyTasks(currentUserId);
  const { data: stats = initialStats, isLoading: statsLoading } = useTaskStats(currentUserId);

  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const completeTask = useCompleteTask();
  const reopenTask = useReopenTask();
  const deleteTask = useDeleteTask();

  useEffect(() => {
    if (initialCreateOpen) setIsFormOpen(true);
  }, [initialCreateOpen]);

  // Filtered + sorted tasks (shared across all views)
  const filteredTasks = useMemo(() => {
    let result = [...allTasks];

    if (filters.search) {
      const s = filters.search.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(s) ||
          t.description?.toLowerCase().includes(s)
      );
    }

    if (filters.statuses.length > 0) {
      result = result.filter((t) => filters.statuses.includes(t.status));
    }

    if (filters.priorities.length > 0) {
      result = result.filter((t) => filters.priorities.includes(t.priority));
    }

    if (filters.tags.length > 0) {
      result = result.filter((t) => filters.tags.includes(t.action_tag));
    }

    if (filters.dueDateFrom) {
      const from = new Date(filters.dueDateFrom);
      result = result.filter(
        (t) => t.due_date && new Date(t.due_date) >= from
      );
    }

    if (filters.dueDateTo) {
      const to = new Date(filters.dueDateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter(
        (t) => t.due_date && new Date(t.due_date) <= to
      );
    }

    result.sort((a, b) => {
      let cmp = 0;
      switch (filters.sortBy) {
        case "due_date":
          if (!a.due_date && !b.due_date) cmp = 0;
          else if (!a.due_date) cmp = 1;
          else if (!b.due_date) cmp = -1;
          else
            cmp =
              new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
          break;
        case "priority":
          cmp = PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority];
          break;
        case "created_at":
          cmp =
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime();
          break;
        case "title":
          cmp = a.title.localeCompare(b.title);
          break;
      }
      return filters.sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [allTasks, filters]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleCreate = (data: CreateTaskFormData) => {
    createTask.mutate({
      title: data.title,
      description: data.description || null,
      ticket_id: data.ticket_id || null,
      assigned_to: data.assigned_to,
      created_by: currentUserId,
      priority: data.priority || "medium",
      action_tag: data.action_tag || "other",
      due_date: data.due_date || null,
    });
    setIsFormOpen(false);
  };

  const handleEdit = (data: CreateTaskFormData) => {
    if (!editingTask) return;
    updateTask.mutate({
      id: editingTask.id,
      updates: {
        title: data.title,
        description: data.description || null,
        priority: data.priority,
        action_tag: data.action_tag,
        assigned_to: data.assigned_to,
        due_date: data.due_date || null,
      },
    });
    setEditingTask(null);
  };

  // Called when any view's checkbox/button is clicked for completion
  const handleCompleteClick = (task: Task) => {
    if (task.ticket_id) {
      setTaskToComplete(task);
    } else {
      completeTask.mutate({ id: task.id, timeSpentMinutes: undefined });
    }
  };

  const handleCompleteWithTime = (taskId: string, mins?: number) => {
    completeTask.mutate({ id: taskId, timeSpentMinutes: mins });
    setTaskToComplete(null);
  };

  const handleReopen = (task: Task) => reopenTask.mutate(task.id);

  const handleDelete = (task: Task) => {
    if (confirm("Delete this task?")) deleteTask.mutate(task.id);
  };

  const handleUpdatePriority = (taskId: string, priority: TaskPriority) => {
    updateTask.mutate({ id: taskId, updates: { priority } });
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">My Tasks</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your work across board, calendar, and table views
        </p>
      </div>

      {/* Stats strip */}
      <TaskStats stats={stats} isLoading={statsLoading} />

      {/* Persistent filter toolbar + view switcher */}
      <TaskFilterToolbar
        filters={filters}
        onFiltersChange={setFilters}
        view={view}
        onViewChange={setView}
        totalCount={allTasks.length}
        filteredCount={filteredTasks.length}
        onNewTask={() => setIsFormOpen(true)}
      />

      {/* Active view */}
      {view === "list" && (
        <TaskList
          tasks={filteredTasks}
          onComplete={handleCompleteWithTime}
          onEdit={setEditingTask}
          onDelete={handleDelete}
          onReopen={handleReopen}
          showFilters={false}
          emptyMessage="No tasks match your filters."
          isLoading={completeTask.isPending}
        />
      )}

      {view === "kanban" && (
        <TaskKanbanBoard
          tasks={filteredTasks}
          onCompleteClick={handleCompleteClick}
          onEdit={setEditingTask}
          onDelete={handleDelete}
          onReopen={handleReopen}
          onUpdatePriority={handleUpdatePriority}
        />
      )}

      {view === "calendar" && (
        <TaskCalendarView
          tasks={filteredTasks}
          onComplete={(taskId, mins) => handleCompleteWithTime(taskId, mins)}
          onEdit={setEditingTask}
          onDelete={handleDelete}
          onReopen={handleReopen}
        />
      )}

      {view === "table" && (
        <TaskTableView
          tasks={filteredTasks}
          onCompleteClick={handleCompleteClick}
          onEdit={setEditingTask}
          onDelete={handleDelete}
          onReopen={handleReopen}
        />
      )}

      {/* Create dialog */}
      <TaskForm
        users={users}
        currentUserId={currentUserId}
        onSubmit={handleCreate}
        isLoading={createTask.isPending}
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
      />

      {/* Edit dialog */}
      <TaskForm
        task={editingTask}
        users={users}
        currentUserId={currentUserId}
        onSubmit={handleEdit}
        isLoading={updateTask.isPending}
        open={!!editingTask}
        onOpenChange={(open) => !open && setEditingTask(null)}
      />

      {/* Complete with time-tracking dialog (shared across all views) */}
      <CompleteTaskDialog
        task={taskToComplete}
        open={!!taskToComplete}
        onOpenChange={(open) => !open && setTaskToComplete(null)}
        onComplete={handleCompleteWithTime}
        isLoading={completeTask.isPending}
      />
    </div>
  );
}
