"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Plus, Inbox } from "lucide-react";
import Link from "next/link";
import { WorkItemCard } from "./work-item-card";
import { WorkItemForm } from "./work-item-form";
import { WorkItemDetailDialog } from "./work-item-detail-dialog";
import { updateWorkItemAction } from "@/app/(dashboard)/projects/actions";
import {
  WORK_ITEM_STATUSES,
  WORK_ITEM_STATUS_LABELS,
} from "@/types/work-item.types";
import type {
  BoardColumn,
  WorkItemStatus,
  WorkItemWithRelations,
} from "@/types/work-item.types";
import type { Project } from "@/types/project.types";
import type { Sprint } from "@/types/sprint.types";
import type { SprintWithCounts } from "@/types/sprint.types";
import type { Profile } from "@/types/user.types";
import type { TicketPriorityRow } from "@/types/ticket.types";

interface Props {
  project: Project;
  activeSprint: Sprint | null;
  nextSprint: Sprint | null;
  initialBoard: BoardColumn[];
  nextSprintBoard: BoardColumn[];
  initialBacklog: WorkItemWithRelations[];
  sprints: SprintWithCounts[];
  profiles: Profile[];
  priorities: TicketPriorityRow[];
  focusedItem: WorkItemWithRelations | null;
}

interface ItemMap {
  [status: string]: WorkItemWithRelations[];
}

function toMap(board: BoardColumn[]): ItemMap {
  const map: ItemMap = {};
  for (const col of board) map[col.status] = col.items;
  return map;
}

async function postReorder(payload: {
  item_id: string;
  status?: WorkItemStatus;
  sprint_id?: string | null;
  before_rank: string | null;
  after_rank: string | null;
}) {
  const res = await fetch("/api/work-items/reorder", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok)
    throw new Error(
      ((await res.json()) as { error?: string }).error ?? "Reorder failed",
    );
  return res.json();
}

export function SprintBoardClient({
  project,
  activeSprint,
  nextSprint,
  initialBoard,
  nextSprintBoard,
  initialBacklog,
  sprints,
  profiles,
  priorities,
  focusedItem,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ── Active sprint board state ──
  const [columns, setColumns] = useState<ItemMap>(() => toMap(initialBoard));
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  // Tracks the last successfully committed state so error rollback doesn't
  // undo prior successful drags within the same session.
  const committedColumns = useRef<ItemMap>(toMap(initialBoard));

  // ── Next sprint board state ──
  const [nextColumns, setNextColumns] = useState<ItemMap>(() =>
    toMap(nextSprintBoard),
  );
  const [nextActiveDragId, setNextActiveDragId] = useState<string | null>(null);
  const committedNextColumns = useRef<ItemMap>(toMap(nextSprintBoard));

  // ── Shared detail + create state ──
  const [createOpen, setCreateOpen] = useState(false);
  const [createForSprint, setCreateForSprint] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<WorkItemWithRelations | null>(
    focusedItem,
  );
  const [detailOpen, setDetailOpen] = useState(focusedItem != null);

  useEffect(() => {
    const m = toMap(initialBoard);
    committedColumns.current = m;
    setColumns(m);
  }, [initialBoard]);
  useEffect(() => {
    const m = toMap(nextSprintBoard);
    committedNextColumns.current = m;
    setNextColumns(m);
  }, [nextSprintBoard]);
  useEffect(() => {
    setDetailItem(focusedItem);
    setDetailOpen(focusedItem != null);
  }, [focusedItem?.id]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  // ── Active sprint helpers ──
  const allActiveItems = useMemo(() => {
    const list: WorkItemWithRelations[] = [];
    for (const status of WORK_ITEM_STATUSES)
      list.push(...(columns[status] ?? []));
    return list;
  }, [columns]);
  const findActiveItem = (id: string) =>
    allActiveItems.find((i) => i.id === id) ?? null;
  const findActiveColumn = (id: string): WorkItemStatus | null => {
    for (const s of WORK_ITEM_STATUSES) {
      if ((columns[s] ?? []).some((i) => i.id === id)) return s;
    }
    return null;
  };

  // ── Next sprint helpers ──
  const allNextItems = useMemo(() => {
    const list: WorkItemWithRelations[] = [];
    for (const status of WORK_ITEM_STATUSES)
      list.push(...(nextColumns[status] ?? []));
    return list;
  }, [nextColumns]);
  const findNextItem = (id: string) =>
    allNextItems.find((i) => i.id === id) ?? null;
  const findNextColumn = (id: string): WorkItemStatus | null => {
    for (const s of WORK_ITEM_STATUSES) {
      if ((nextColumns[s] ?? []).some((i) => i.id === id)) return s;
    }
    return null;
  };

  // ── DnD handlers (active sprint) ──
  const onActiveDragStart = (e: DragStartEvent) =>
    setActiveDragId(String(e.active.id));
  const onActiveDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveDragId(null);
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    const fromCol = findActiveColumn(activeId);
    if (!fromCol) return;
    let toCol: WorkItemStatus | null = WORK_ITEM_STATUSES.includes(
      overId as WorkItemStatus,
    )
      ? (overId as WorkItemStatus)
      : findActiveColumn(overId);
    if (!toCol) return;
    const sourceItems = [...(columns[fromCol] ?? [])];
    const targetItems =
      fromCol === toCol ? sourceItems : [...(columns[toCol] ?? [])];
    const activeIndex = sourceItems.findIndex((i) => i.id === activeId);
    if (activeIndex === -1) return;
    const [moved] = sourceItems.splice(activeIndex, 1);
    let overIndex = targetItems.findIndex((i) => i.id === overId);
    if (overIndex === -1) overIndex = targetItems.length;
    const updated: WorkItemWithRelations = { ...moved, status: toCol };
    targetItems.splice(overIndex, 0, updated);
    const next: ItemMap = { ...columns };
    next[fromCol] = fromCol === toCol ? targetItems : sourceItems;
    if (fromCol !== toCol) next[toCol] = targetItems;
    setColumns(next);
    const before = targetItems[overIndex - 1]?.rank ?? null;
    const after = targetItems[overIndex + 1]?.rank ?? null;
    try {
      await postReorder({
        item_id: activeId,
        status: toCol,
        before_rank: before,
        after_rank: after,
      });
      committedColumns.current = next;
      router.refresh();
    } catch {
      setColumns(committedColumns.current);
    }
  };

  // ── DnD handlers (next sprint) ──
  const onNextDragStart = (e: DragStartEvent) =>
    setNextActiveDragId(String(e.active.id));
  const onNextDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    setNextActiveDragId(null);
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    const fromCol = findNextColumn(activeId);
    if (!fromCol) return;
    let toCol: WorkItemStatus | null = WORK_ITEM_STATUSES.includes(
      overId as WorkItemStatus,
    )
      ? (overId as WorkItemStatus)
      : findNextColumn(overId);
    if (!toCol) return;
    const sourceItems = [...(nextColumns[fromCol] ?? [])];
    const targetItems =
      fromCol === toCol ? sourceItems : [...(nextColumns[toCol] ?? [])];
    const activeIndex = sourceItems.findIndex((i) => i.id === activeId);
    if (activeIndex === -1) return;
    const [moved] = sourceItems.splice(activeIndex, 1);
    let overIndex = targetItems.findIndex((i) => i.id === overId);
    if (overIndex === -1) overIndex = targetItems.length;
    const updated: WorkItemWithRelations = { ...moved, status: toCol };
    targetItems.splice(overIndex, 0, updated);
    const next: ItemMap = { ...nextColumns };
    next[fromCol] = fromCol === toCol ? targetItems : sourceItems;
    if (fromCol !== toCol) next[toCol] = targetItems;
    setNextColumns(next);
    const before = targetItems[overIndex - 1]?.rank ?? null;
    const after = targetItems[overIndex + 1]?.rank ?? null;
    try {
      await postReorder({
        item_id: activeId,
        status: toCol,
        before_rank: before,
        after_rank: after,
      });
      committedNextColumns.current = next;
      router.refresh();
    } catch {
      setNextColumns(committedNextColumns.current);
    }
  };

  // ── Inline priority change from a card's priority pill ──
  const priorityById = (id: number | null): TicketPriorityRow | null =>
    id == null ? null : (priorities.find((p) => p.id === id) ?? null);

  const applyPriority = (
    map: ItemMap,
    itemId: string,
    priorityId: number | null,
  ): ItemMap => {
    const next: ItemMap = {};
    for (const [status, items] of Object.entries(map)) {
      next[status] = items.map((i) =>
        i.id === itemId
          ? { ...i, priority_id: priorityId, priority: priorityById(priorityId) }
          : i,
      );
    }
    return next;
  };

  const changePriority = async (itemId: string, priorityId: number | null) => {
    const nextActive = applyPriority(columns, itemId, priorityId);
    const nextNext = applyPriority(nextColumns, itemId, priorityId);
    setColumns(nextActive);
    setNextColumns(nextNext);
    const result = await updateWorkItemAction(project.key, itemId, {
      priority_id: priorityId,
    });
    if (!result.ok) {
      setColumns(committedColumns.current);
      setNextColumns(committedNextColumns.current);
      return;
    }
    committedColumns.current = nextActive;
    committedNextColumns.current = nextNext;
    router.refresh();
  };

  const openCreate = (sprintId: string | null) => {
    setCreateForSprint(sprintId);
    setCreateOpen(true);
  };

  const openDetail = (item: WorkItemWithRelations) => {
    setDetailItem(item);
    setDetailOpen(true);
    const params = new URLSearchParams(searchParams.toString());
    params.set("item", item.item_key);
    router.replace(`/projects/${project.key}?${params.toString()}`, {
      scroll: false,
    });
  };

  const closeDetail = (open: boolean) => {
    setDetailOpen(open);
    if (!open) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("item");
      const qs = params.toString();
      router.replace(`/projects/${project.key}${qs ? `?${qs}` : ""}`, {
        scroll: false,
      });
    }
  };

  // ── Empty state ──
  if (!activeSprint && !nextSprint) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-dashed border-gray-300 dark:border-border bg-white dark:bg-card p-10 text-center">
          <Inbox className="h-8 w-8 mx-auto text-gray-400 dark:text-gray-500" />
          <p className="text-gray-600 dark:text-gray-400 mt-2">No active sprint.</p>
          <p className="text-sm text-gray-500">
            Plan items and start a sprint from{" "}
            <Link
              className="text-primary underline"
              href={`/projects/${project.key}/sprints`}
            >
              Sprints
            </Link>
            .
          </p>
        </div>
        {initialBacklog.length > 0 && (
          <BacklogPreview
            project={project}
            items={initialBacklog.slice(0, 5)}
            onOpen={openDetail}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ──────────────────── ACTIVE SPRINT ──────────────────── */}
      {activeSprint && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-muted-foreground">
                Active sprint
              </p>
              <h2 className="text-lg font-semibold">{activeSprint.name}</h2>
              {activeSprint.goal && (
                <p className="text-sm text-gray-600 dark:text-gray-400">{activeSprint.goal}</p>
              )}
            </div>
            <Button size="sm" onClick={() => openCreate(activeSprint.id)}>
              <Plus className="h-4 w-4 mr-1" /> Add item
            </Button>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={onActiveDragStart}
            onDragEnd={onActiveDragEnd}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
              {WORK_ITEM_STATUSES.map((status) => (
                <BoardColumnUI
                  key={status}
                  status={status}
                  items={columns[status] ?? []}
                  onOpen={openDetail}
                  priorities={priorities}
                  onPriorityChange={changePriority}
                />
              ))}
            </div>
            <DragOverlay>
              {activeDragId ? (
                <div className="rotate-1">
                  {(() => {
                    const item = findActiveItem(activeDragId);
                    return item ? (
                      <WorkItemCard item={item} isDragging />
                    ) : null;
                  })()}
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </section>
      )}

      {/* ──────────────────── NEXT SPRINT ──────────────────── */}
      {nextSprint && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-muted-foreground">
                Next sprint
              </p>
              <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                {nextSprint.name}
              </h2>
              {nextSprint.goal && (
                <p className="text-sm text-gray-500 dark:text-gray-400">{nextSprint.goal}</p>
              )}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => openCreate(nextSprint.id)}
            >
              <Plus className="h-4 w-4 mr-1" /> Add item
            </Button>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={onNextDragStart}
            onDragEnd={onNextDragEnd}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
              {WORK_ITEM_STATUSES.map((status) => (
                <BoardColumnUI
                  key={status}
                  status={status}
                  items={nextColumns[status] ?? []}
                  onOpen={openDetail}
                  priorities={priorities}
                  onPriorityChange={changePriority}
                  muted
                />
              ))}
            </div>
            <DragOverlay>
              {nextActiveDragId ? (
                <div className="rotate-1">
                  {(() => {
                    const item = findNextItem(nextActiveDragId);
                    return item ? (
                      <WorkItemCard item={item} isDragging />
                    ) : null;
                  })()}
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </section>
      )}

      {/* ──────────────────── SHARED DIALOGS ──────────────────── */}
      <WorkItemForm
        open={createOpen}
        onOpenChange={(o) => {
          if (!o) {
            setCreateOpen(false);
            setCreateForSprint(null);
          } else setCreateOpen(o);
        }}
        projectId={project.id}
        projectKey={project.key}
        sprintId={createForSprint}
        sprints={sprints}
        profiles={profiles}
        priorities={priorities}
      />

      <WorkItemDetailDialog
        open={detailOpen}
        onOpenChange={closeDetail}
        projectKey={project.key}
        item={detailItem}
        profiles={profiles}
        priorities={priorities}
        sprints={sprints}
      />
    </div>
  );
}

// ────────────────────────────────────────────────
// Column
// ────────────────────────────────────────────────

function BoardColumnUI({
  status,
  items,
  onOpen,
  priorities,
  onPriorityChange,
  muted = false,
}: {
  status: WorkItemStatus;
  items: WorkItemWithRelations[];
  onOpen: (item: WorkItemWithRelations) => void;
  priorities: TicketPriorityRow[];
  onPriorityChange: (itemId: string, priorityId: number | null) => void;
  muted?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const itemIds = items.map((i) => i.id);

  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg border p-3 min-h-[200px] ${
        muted ? "bg-gray-50/50 dark:bg-muted/20" : "bg-gray-50 dark:bg-muted/40"
      } ${isOver ? "border-primary" : "border-gray-200 dark:border-border"}`}
    >
      <div className="flex items-center justify-between mb-3">
        <h3
          className={`text-xs font-semibold uppercase tracking-wide ${muted ? "text-gray-400 dark:text-gray-500" : "text-gray-600 dark:text-gray-400"}`}
        >
          {WORK_ITEM_STATUS_LABELS[status]}
        </h3>
        <span className="text-xs text-gray-400 dark:text-gray-500">{items.length}</span>
      </div>
      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {items.map((item) => (
            <SortableItem
              key={item.id}
              item={item}
              onOpen={() => onOpen(item)}
              priorities={priorities}
              onPriorityChange={onPriorityChange}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

function SortableItem({
  item,
  onOpen,
  priorities,
  onPriorityChange,
}: {
  item: WorkItemWithRelations;
  onOpen: () => void;
  priorities: TicketPriorityRow[];
  onPriorityChange: (itemId: string, priorityId: number | null) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });
  // dnd-kit generates this id from an internal counter, which can differ
  // between server and client during hydration.
  const { "aria-describedby": ariaDescribedBy, ...stableAttributes } =
    attributes;
  void ariaDescribedBy;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...stableAttributes} {...listeners}>
      <WorkItemCard
        item={item}
        onOpen={onOpen}
        isDragging={isDragging}
        priorities={priorities}
        onPriorityChange={(priorityId) => onPriorityChange(item.id, priorityId)}
      />
    </div>
  );
}

// ────────────────────────────────────────────────
// Inline backlog preview for the "no sprint" state
// ────────────────────────────────────────────────

function BacklogPreview({
  project,
  items,
  onOpen,
}: {
  project: Project;
  items: WorkItemWithRelations[];
  onOpen: (item: WorkItemWithRelations) => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-white dark:bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium">Backlog preview</h3>
        <Link
          href={`/projects/${project.key}/sprints`}
          className="text-xs text-primary hover:underline"
        >
          See all →
        </Link>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <WorkItemCard key={item.id} item={item} onOpen={() => onOpen(item)} />
        ))}
      </div>
    </div>
  );
}
