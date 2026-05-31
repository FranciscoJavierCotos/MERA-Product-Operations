"use client";

import {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Play,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Pencil,
  Search,
  ChevronsRight,
  Inbox,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { SprintStatusBadge } from "./sprint-status-badge";
import { SprintForm } from "./sprint-form";
import { SprintEditDialog } from "./sprint-edit-dialog";
import { WorkItemForm } from "@/components/work-items/work-item-form";
import { WorkItemDetailDialog } from "@/components/work-items/work-item-detail-dialog";
import { WorkItemStatusBadge } from "@/components/work-items/work-item-status-badge";
import { WorkItemStatusDropdown } from "@/components/work-items/work-item-status-dropdown";
import { WorkItemTypeBadge } from "@/components/work-items/work-item-type-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import {
  startSprintAction,
  completeSprintAction,
  updateWorkItemAction,
} from "@/app/(dashboard)/projects/actions";
import {
  WORK_ITEM_TYPES,
  WORK_ITEM_TYPE_LABELS,
  type WorkItemType,
  type WorkItemStatus,
  type WorkItemWithRelations,
} from "@/types/work-item.types";
import type { Project } from "@/types/project.types";
import type { SprintWithCounts } from "@/types/sprint.types";
import type { Profile } from "@/types/user.types";
import type { TicketPriorityRow } from "@/types/ticket.types";

interface Props {
  project: Project;
  initialSprints: SprintWithCounts[];
  /** Map of sprint_id → items in that sprint (all sprints, incl. completed). */
  sprintItems: Record<string, WorkItemWithRelations[]>;
  initialBacklog: WorkItemWithRelations[];
  profiles: Profile[];
  priorities: TicketPriorityRow[];
}

type BucketKey = string;
type Buckets = Record<BucketKey, WorkItemWithRelations[]>;

function bucketKey(sprintId: string | null): BucketKey {
  return sprintId ? `sprint_${sprintId}` : "backlog";
}

function sprintIdFromKey(key: BucketKey): string | null {
  return key.startsWith("sprint_") ? key.slice(7) : null;
}

function sumPoints(items: WorkItemWithRelations[]): number {
  return items.reduce((s, i) => s + (i.story_points ?? 0), 0);
}

async function postReorder(payload: {
  item_id: string;
  sprint_id?: string | null;
  status?: WorkItemStatus;
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

const STATUS_ORDER: Record<SprintWithCounts["status"], number> = {
  active: 0,
  planned: 1,
  completed: 2,
};

/** How items are ordered *within* each section. "manual" keeps the saved rank. */
type SortKey = "manual" | "type" | "priority" | "points";
type SortDir = "asc" | "desc";

const SORT_LABELS: Record<SortKey, string> = {
  manual: "Manual order",
  type: "By type",
  priority: "By priority",
  points: "By points",
};

export function SprintsClient({
  project,
  initialSprints,
  sprintItems,
  initialBacklog,
  profiles,
  priorities,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Sort: active first, then planned (by start date), then completed (most
  // recent first). Completed sprints sit at the very bottom of the board.
  const sprints = useMemo<SprintWithCounts[]>(() => {
    return [...initialSprints].sort((a, b) => {
      if (STATUS_ORDER[a.status] !== STATUS_ORDER[b.status])
        return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      if (a.status === "completed") {
        const ad = a.end_date ?? a.start_date ?? "";
        const bd = b.end_date ?? b.start_date ?? "";
        return bd.localeCompare(ad);
      }
      if (a.start_date && b.start_date)
        return a.start_date.localeCompare(b.start_date);
      if (a.start_date) return -1;
      if (b.start_date) return 1;
      return 0;
    });
  }, [initialSprints]);

  const buildBuckets = (): Buckets => {
    const b: Buckets = { backlog: [...initialBacklog] };
    for (const s of sprints) b[bucketKey(s.id)] = [...(sprintItems[s.id] ?? [])];
    return b;
  };

  const [buckets, setBuckets] = useState<Buckets>(buildBuckets);
  const committed = useRef<Buckets>(buildBuckets());
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  // Default expand state: active & planned sprints + backlog open; completed
  // sprints collapsed (they're still drop targets when expanded).
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const e: Record<string, boolean> = { backlog: true };
    for (const s of sprints) e[bucketKey(s.id)] = s.status !== "completed";
    return e;
  });

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<WorkItemType | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortKey>("manual");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const [newSprintOpen, setNewSprintOpen] = useState(false);
  const [createForSprint, setCreateForSprint] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<WorkItemWithRelations | null>(
    null,
  );
  const [editSprint, setEditSprint] = useState<SprintWithCounts | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const b = buildBuckets();
    committed.current = b;
    setBuckets(b);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialBacklog, sprintItems]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  // Sprints offered as move targets in forms / quick-add (no completed).
  const nonCompletedSprints = useMemo(
    () => sprints.filter((s) => s.status !== "completed"),
    [sprints],
  );

  // Lookup of bucket key → sprint status, used to detect when an item is being
  // pulled out of a *completed* sprint (so a finished item can be reworked).
  const sprintStatusByBucket = useMemo(() => {
    const m: Record<BucketKey, SprintWithCounts["status"]> = {};
    for (const s of sprints) m[bucketKey(s.id)] = s.status;
    return m;
  }, [sprints]);

  const findItemBucket = (itemId: string): BucketKey | null => {
    for (const [key, items] of Object.entries(buckets)) {
      if (items.some((i) => i.id === itemId)) return key;
    }
    return null;
  };

  const findItem = (itemId: string): WorkItemWithRelations | null => {
    for (const items of Object.values(buckets)) {
      const found = items.find((i) => i.id === itemId);
      if (found) return found;
    }
    return null;
  };

  const resolveBucket = (overId: string): BucketKey | null => {
    if (overId in buckets) return overId;
    return findItemBucket(overId);
  };

  const onDragStart = (e: DragStartEvent) =>
    setActiveDragId(String(e.active.id));

  const onDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveDragId(null);
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    const fromBucket = findItemBucket(activeId);
    const toBucket = resolveBucket(overId);
    if (!fromBucket || !toBucket) return;

    const sourceItems = [...(buckets[fromBucket] ?? [])];
    const targetItems =
      fromBucket === toBucket ? sourceItems : [...(buckets[toBucket] ?? [])];

    const activeIndex = sourceItems.findIndex((i) => i.id === activeId);
    if (activeIndex === -1) return;
    const [moved] = sourceItems.splice(activeIndex, 1);

    let overIndex = targetItems.findIndex((i) => i.id === overId);
    if (overIndex === -1) overIndex = targetItems.length;

    const crossBucket = fromBucket !== toBucket;

    // Reworking a shipped item: when a "done" item is dragged out of a
    // *completed* sprint into the backlog or another sprint, it is no longer
    // done — flag it as "rework" so it re-enters the flow as redo work.
    const reworked =
      crossBucket &&
      sprintStatusByBucket[fromBucket] === "completed" &&
      moved.status === "done";
    const newStatus: WorkItemStatus | undefined = reworked ? "rework" : undefined;

    const updatedItem: WorkItemWithRelations = {
      ...moved,
      sprint_id: sprintIdFromKey(toBucket),
      ...(newStatus ? { status: newStatus } : {}),
    };
    targetItems.splice(overIndex, 0, updatedItem);

    const next: Buckets = { ...buckets };
    if (fromBucket === toBucket) {
      next[fromBucket] = targetItems;
    } else {
      next[fromBucket] = sourceItems;
      next[toBucket] = targetItems;
      if (!expanded[toBucket]) {
        setExpanded((prev) => ({ ...prev, [toBucket]: true }));
      }
    }
    setBuckets(next);

    const before = targetItems[overIndex - 1]?.rank ?? null;
    const after = targetItems[overIndex + 1]?.rank ?? null;

    try {
      await postReorder({
        item_id: activeId,
        ...(crossBucket ? { sprint_id: sprintIdFromKey(toBucket) } : {}),
        ...(newStatus ? { status: newStatus } : {}),
        before_rank: before,
        after_rank: after,
      });
      committed.current = next;
      router.refresh();
    } catch {
      setBuckets(committed.current);
    }
  };

  const quickAddToSprint = async (
    item: WorkItemWithRelations,
    targetSprintId: string,
  ) => {
    const fromBucket = findItemBucket(item.id);
    if (!fromBucket) return;
    const toBucket = bucketKey(targetSprintId);
    if (fromBucket === toBucket) return;

    const sourceItems = [...(buckets[fromBucket] ?? [])];
    const targetItems = [...(buckets[toBucket] ?? [])];

    const fromIndex = sourceItems.findIndex((i) => i.id === item.id);
    if (fromIndex === -1) return;
    const [moved] = sourceItems.splice(fromIndex, 1);
    const updatedItem: WorkItemWithRelations = {
      ...moved,
      sprint_id: targetSprintId,
    };
    const before = targetItems[targetItems.length - 1]?.rank ?? null;
    targetItems.push(updatedItem);

    const next: Buckets = {
      ...buckets,
      [fromBucket]: sourceItems,
      [toBucket]: targetItems,
    };
    setBuckets(next);
    if (!expanded[toBucket]) {
      setExpanded((prev) => ({ ...prev, [toBucket]: true }));
    }

    try {
      await postReorder({
        item_id: item.id,
        sprint_id: targetSprintId,
        before_rank: before,
        after_rank: null,
      });
      committed.current = next;
      router.refresh();
    } catch {
      setBuckets(committed.current);
    }
  };

  // Inline status change from the status pill on a row. Optimistically updates
  // the item in place, then persists; rolls back to the last committed state on
  // failure.
  const changeStatus = async (itemId: string, status: WorkItemStatus) => {
    const fromBucket = findItemBucket(itemId);
    if (!fromBucket) return;
    const next: Buckets = {
      ...buckets,
      [fromBucket]: (buckets[fromBucket] ?? []).map((i) =>
        i.id === itemId ? { ...i, status } : i,
      ),
    };
    setBuckets(next);
    setError(null);
    const result = await updateWorkItemAction(project.key, itemId, { status });
    if (!result.ok) {
      setError(result.error);
      setBuckets(committed.current);
      return;
    }
    committed.current = next;
    router.refresh();
  };

  const onStart = (id: string) => {
    setError(null);
    startTransition(async () => {
      const result = await startSprintAction(project.key, id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  const onComplete = (id: string) => {
    if (!confirm("Complete sprint? Unfinished items return to the backlog."))
      return;
    setError(null);
    startTransition(async () => {
      const result = await completeSprintAction(project.key, id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  const toggleExpanded = (key: BucketKey) =>
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  // Shared search + type + priority + assignee filter. Applied to every section
  // on the board (each sprint AND the backlog) so one global filter bar narrows
  // the whole planning view at once.
  const matchesFilters = useCallback(
    (item: WorkItemWithRelations) => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !item.title.toLowerCase().includes(q) &&
          !item.item_key.toLowerCase().includes(q)
        )
          return false;
      }
      if (typeFilter !== "all" && item.type !== typeFilter) return false;
      if (
        priorityFilter !== "all" &&
        String(item.priority_id) !== priorityFilter
      )
        return false;
      if (assigneeFilter !== "all") {
        if (assigneeFilter === "unassigned") {
          if (item.assigned_to) return false;
        } else if (item.assigned_to !== assigneeFilter) {
          return false;
        }
      }
      return true;
    },
    [search, typeFilter, priorityFilter, assigneeFilter],
  );

  // Order items *within* a section. Items never leave their bucket — only the
  // display order inside it changes. "manual" preserves the saved rank order.
  const sortItems = useCallback(
    (items: WorkItemWithRelations[]) => {
      if (sortBy === "manual") return items;
      const dir = sortDir === "asc" ? 1 : -1;
      return [...items].sort((a, b) => {
        switch (sortBy) {
          case "type":
            return (WORK_ITEM_TYPES.indexOf(a.type) - WORK_ITEM_TYPES.indexOf(b.type)) * dir;
          case "priority": {
            // Lower display_order = higher priority; unprioritised items always last.
            const ao = a.priority?.display_order ?? Number.MAX_SAFE_INTEGER;
            const bo = b.priority?.display_order ?? Number.MAX_SAFE_INTEGER;
            if (ao === Number.MAX_SAFE_INTEGER && bo === Number.MAX_SAFE_INTEGER) return 0;
            if (ao === Number.MAX_SAFE_INTEGER) return 1;
            if (bo === Number.MAX_SAFE_INTEGER) return -1;
            return (ao - bo) * dir;
          }
          case "points": {
            // Unpointed items always last regardless of direction.
            const ap = a.story_points ?? -1;
            const bp = b.story_points ?? -1;
            if (ap === -1 && bp === -1) return 0;
            if (ap === -1) return 1;
            if (bp === -1) return -1;
            return (ap - bp) * dir;
          }
          default:
            return 0;
        }
      });
    },
    [sortBy, sortDir],
  );

  // Filter then order — the prepared list is what each section renders/drags.
  const prepareItems = useCallback(
    (items: WorkItemWithRelations[]) => sortItems(items.filter(matchesFilters)),
    [matchesFilters, sortItems],
  );

  const hasActiveFilters =
    search !== "" ||
    typeFilter !== "all" ||
    priorityFilter !== "all" ||
    assigneeFilter !== "all" ||
    sortBy !== "manual";

  const clearFilters = () => {
    setSearch("");
    setTypeFilter("all");
    setPriorityFilter("all");
    setAssigneeFilter("all");
    setSortBy("manual");
    setSortDir("asc");
  };

  const dragItem = activeDragId ? findItem(activeDragId) : null;

  const openCreateForSprint = (sprintId: string) => {
    setCreateForSprint(sprintId);
    setCreateOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Sprints &amp; Backlog</h2>
        <Button size="sm" onClick={() => setNewSprintOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> New sprint
        </Button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Global filter bar — narrows every sprint and the backlog at once. */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-white dark:bg-card px-3 py-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search all items…"
            className="pl-8 h-8 w-56 text-sm"
          />
        </div>
        <Select
          value={typeFilter}
          onValueChange={(v) => setTypeFilter(v as WorkItemType | "all")}
        >
          <SelectTrigger className="h-8 w-32 text-sm">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {WORK_ITEM_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {WORK_ITEM_TYPE_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="h-8 w-36 text-sm">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            {priorities.map((p) => (
              <SelectItem key={p.id} value={String(p.id)}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
          <SelectTrigger className="h-8 w-40 text-sm">
            <SelectValue placeholder="Assignee" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All assignees</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {profiles.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={sortBy}
          onValueChange={(v) => setSortBy(v as SortKey)}
        >
          <SelectTrigger className="h-8 w-40 text-sm">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
              <SelectItem key={key} value={key}>
                {SORT_LABELS[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {sortBy !== "manual" && (
          <Button
            size="sm"
            variant="outline"
            className="h-8 w-8 p-0 flex-shrink-0"
            onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
            title={
              sortDir === "asc"
                ? "Ascending — click to switch to descending"
                : "Descending — click to switch to ascending"
            }
          >
            {sortDir === "asc" ? (
              <ArrowUp className="h-3.5 w-3.5" />
            ) : (
              <ArrowDown className="h-3.5 w-3.5" />
            )}
          </Button>
        )}
        {hasActiveFilters && (
          <Button
            size="sm"
            variant="ghost"
            onClick={clearFilters}
            className="h-8"
          >
            Clear
          </Button>
        )}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div className="space-y-3">
          {/* Active + planned sprints */}
          {sprints
            .filter((s) => s.status !== "completed")
            .map((sprint) => (
              <SprintSection
                key={sprint.id}
                sprint={sprint}
                bKey={bucketKey(sprint.id)}
                items={prepareItems(buckets[bucketKey(sprint.id)] ?? [])}
                totalCount={(buckets[bucketKey(sprint.id)] ?? []).length}
                totalPoints={sumPoints(buckets[bucketKey(sprint.id)] ?? [])}
                isExpanded={!!expanded[bucketKey(sprint.id)]}
                isPending={isPending}
                onToggle={() => toggleExpanded(bucketKey(sprint.id))}
                onStart={() => onStart(sprint.id)}
                onComplete={() => onComplete(sprint.id)}
                onAddItem={() => openCreateForSprint(sprint.id)}
                onEdit={() => setEditSprint(sprint)}
                onOpen={setDetailItem}
                onStatusChange={changeStatus}
              />
            ))}

          {/* Backlog */}
          <BacklogSection
            items={prepareItems(buckets.backlog ?? [])}
            totalCount={buckets.backlog?.length ?? 0}
            totalPoints={sumPoints(buckets.backlog ?? [])}
            isExpanded={!!expanded.backlog}
            onToggle={() => toggleExpanded("backlog")}
            onAddItem={() => {
              setCreateForSprint(null);
              setCreateOpen(true);
            }}
            onOpen={setDetailItem}
            onStatusChange={changeStatus}
            sprints={nonCompletedSprints}
            onQuickAddToSprint={quickAddToSprint}
          />

          {/* Completed sprints (collapsed by default, still drag targets) */}
          {sprints
            .filter((s) => s.status === "completed")
            .map((sprint) => (
              <SprintSection
                key={sprint.id}
                sprint={sprint}
                bKey={bucketKey(sprint.id)}
                items={prepareItems(buckets[bucketKey(sprint.id)] ?? [])}
                totalCount={(buckets[bucketKey(sprint.id)] ?? []).length}
                totalPoints={sumPoints(buckets[bucketKey(sprint.id)] ?? [])}
                isExpanded={!!expanded[bucketKey(sprint.id)]}
                isPending={isPending}
                onToggle={() => toggleExpanded(bucketKey(sprint.id))}
                onStart={() => onStart(sprint.id)}
                onComplete={() => onComplete(sprint.id)}
                onAddItem={() => openCreateForSprint(sprint.id)}
                onEdit={() => setEditSprint(sprint)}
                onOpen={setDetailItem}
                onStatusChange={changeStatus}
              />
            ))}
        </div>

        <DragOverlay>
          {dragItem ? (
            <div className="rotate-1 flex items-center gap-3 rounded-md border border-border bg-white dark:bg-card px-3 py-2 shadow-lg">
              <ItemRowContent item={dragItem} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* New sprint form */}
      <SprintForm
        open={newSprintOpen}
        onOpenChange={setNewSprintOpen}
        projectId={project.id}
        projectKey={project.key}
        sprintDurationWeeks={project.sprint_duration_weeks ?? 2}
        existingSprints={initialSprints.map((s) => ({
          id: s.id,
          name: s.name,
          start_date: s.start_date,
          end_date: s.end_date,
          status: s.status,
        }))}
      />

      {/* Create / add item */}
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
        sprints={nonCompletedSprints}
        profiles={profiles}
        priorities={priorities}
      />

      {/* Item detail / edit dialog */}
      <WorkItemDetailDialog
        open={detailItem != null}
        onOpenChange={(o) => {
          if (!o) setDetailItem(null);
        }}
        projectKey={project.key}
        item={detailItem}
        profiles={profiles}
        priorities={priorities}
        sprints={nonCompletedSprints}
      />

      {/* Sprint edit / delete dialog */}
      {editSprint && (
        <SprintEditDialog
          open={editSprint != null}
          onOpenChange={(o) => {
            if (!o) setEditSprint(null);
          }}
          projectKey={project.key}
          sprint={editSprint}
          sprintDurationWeeks={project.sprint_duration_weeks ?? 2}
          allSprints={initialSprints}
        />
      )}
    </div>
  );
}

// ─── Sprint Section ───────────────────────────────────────────────────────────

function SprintSection({
  sprint,
  bKey,
  items,
  totalCount,
  totalPoints,
  isExpanded,
  isPending,
  onToggle,
  onStart,
  onComplete,
  onAddItem,
  onEdit,
  onOpen,
  onStatusChange,
}: {
  sprint: SprintWithCounts;
  bKey: BucketKey;
  /** Items after the global filter — what actually renders/drags. */
  items: WorkItemWithRelations[];
  /** Unfiltered count/points for this sprint (header stats stay stable). */
  totalCount: number;
  totalPoints: number;
  isExpanded: boolean;
  isPending: boolean;
  onToggle: () => void;
  onStart: () => void;
  onComplete: () => void;
  onAddItem: () => void;
  onEdit: () => void;
  onOpen: (item: WorkItemWithRelations) => void;
  onStatusChange: (itemId: string, status: WorkItemStatus) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: bKey });
  const isCompleted = sprint.status === "completed";
  const progress =
    sprint.total_items === 0
      ? 0
      : Math.round((sprint.done_items / sprint.total_items) * 100);

  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg border bg-white dark:bg-card transition-colors ${
        isOver ? "border-primary ring-1 ring-primary/30" : "border-border"
      } ${isCompleted ? "opacity-90" : ""}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button
            type="button"
            className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 flex-shrink-0"
            onClick={onToggle}
            aria-label={isExpanded ? "Collapse sprint" : "Expand sprint"}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
          <button
            type="button"
            className="flex items-center gap-2 text-left min-w-0"
            onClick={onToggle}
          >
            <span className="font-medium text-sm truncate">{sprint.name}</span>
            <SprintStatusBadge status={sprint.status} />
          </button>
          <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
            {totalCount} items · {totalPoints} pts · {sprint.done_items}/
            {sprint.total_items} done ({progress}%)
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {sprint.status === "planned" && (
            <Button size="sm" onClick={onStart} disabled={isPending}>
              <Play className="h-3.5 w-3.5 mr-1" /> Start
            </Button>
          )}
          {sprint.status === "active" && (
            <Button
              size="sm"
              variant="outline"
              onClick={onComplete}
              disabled={isPending}
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Complete
            </Button>
          )}
          {!isCompleted && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onAddItem}
              title="Add item to this sprint"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={onEdit}
            title="Edit sprint"
            aria-label="Edit sprint"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Date range */}
      {(sprint.start_date || sprint.end_date) && isExpanded && (
        <div className="px-4 pb-2 -mt-1 text-xs text-gray-400 dark:text-gray-500">
          {sprint.start_date}
          {sprint.start_date && sprint.end_date && " → "}
          {sprint.end_date}
        </div>
      )}

      {/* Items */}
      {isExpanded && (
        <div className="border-t px-2 pb-2 pt-2 min-h-[56px]">
          {totalCount === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
              Drag items here or use the + button to add.
            </p>
          ) : items.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
              No items match the current filters.
            </p>
          ) : (
            <SortableContext
              items={items.map((i) => i.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-0.5">
                {items.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    onOpen={() => onOpen(item)}
                    onStatusChange={onStatusChange}
                  />
                ))}
              </div>
            </SortableContext>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Backlog Section ──────────────────────────────────────────────────────────

function BacklogSection({
  items,
  totalCount,
  totalPoints,
  isExpanded,
  onToggle,
  onAddItem,
  onOpen,
  onStatusChange,
  sprints,
  onQuickAddToSprint,
}: {
  /** Items after the global filter — what actually renders/drags. */
  items: WorkItemWithRelations[];
  /** Unfiltered count/points (header stats stay stable while filtering). */
  totalCount: number;
  totalPoints: number;
  isExpanded: boolean;
  onToggle: () => void;
  onAddItem: () => void;
  onOpen: (item: WorkItemWithRelations) => void;
  onStatusChange: (itemId: string, status: WorkItemStatus) => void;
  sprints: SprintWithCounts[];
  onQuickAddToSprint: (
    item: WorkItemWithRelations,
    sprintId: string,
  ) => Promise<void>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: "backlog" });

  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg border bg-white dark:bg-card transition-colors ${
        isOver ? "border-primary ring-1 ring-primary/30" : "border-border"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            onClick={onToggle}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
          <button
            type="button"
            className="flex items-center gap-2 font-medium text-sm"
            onClick={onToggle}
          >
            <Inbox className="h-4 w-4 text-gray-400" />
            Backlog
          </button>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {totalCount} items · {totalPoints} pts
          </span>
        </div>

        <Button size="sm" onClick={onAddItem}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add item
        </Button>
      </div>

      {/* Items */}
      {isExpanded && (
        <div className="border-t px-2 pb-2 pt-2 min-h-[56px]">
          {totalCount === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">
              Backlog is empty. Add your first work item.
            </p>
          ) : items.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
              No items match the current filters.
            </p>
          ) : (
            <SortableContext
              items={items.map((i) => i.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-0.5">
                {items.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    onOpen={() => onOpen(item)}
                    onStatusChange={onStatusChange}
                    sprints={sprints}
                    onQuickAddToSprint={onQuickAddToSprint}
                  />
                ))}
              </div>
            </SortableContext>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Thin item row ────────────────────────────────────────────────────────────

/**
 * Presentational row body — shared by the sortable row and the drag overlay.
 * When `onStatusChange` is provided the status pill becomes an interactive
 * dropdown; the drag overlay omits it and renders a plain badge.
 */
function ItemRowContent({
  item,
  onStatusChange,
}: {
  item: WorkItemWithRelations;
  onStatusChange?: (itemId: string, status: WorkItemStatus) => void;
}) {
  return (
    <>
      <div className="flex-shrink-0">
        {onStatusChange ? (
          <WorkItemStatusDropdown
            status={item.status}
            onChange={(status) => onStatusChange(item.id, status)}
          />
        ) : (
          <WorkItemStatusBadge status={item.status} />
        )}
      </div>
      <div className="flex-shrink-0 hidden sm:block">
        <WorkItemTypeBadge type={item.type} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-mono text-gray-400 dark:text-gray-500 flex-shrink-0">
            {item.item_key}
          </span>
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {item.title}
          </span>
        </div>
        {item.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5 max-w-[40ch]">
            {item.description}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {item.priority && (
          <span
            className={`text-xs px-1.5 py-0.5 rounded font-medium ${item.priority.color_class}`}
          >
            {item.priority.label}
          </span>
        )}
        {item.story_points != null && (
          <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-muted rounded-full px-2 py-0.5 font-medium tabular-nums">
            {item.story_points} pts
          </span>
        )}
        {item.assignee && (
          <UserAvatar
            name={item.assignee.full_name}
            avatarUrl={item.assignee.avatar_url}
            className="h-6 w-6 flex-shrink-0"
          />
        )}
      </div>
    </>
  );
}

function ItemRow({
  item,
  onOpen,
  onStatusChange,
  sprints,
  onQuickAddToSprint,
}: {
  item: WorkItemWithRelations;
  onOpen: () => void;
  onStatusChange: (itemId: string, status: WorkItemStatus) => void;
  sprints?: SprintWithCounts[];
  onQuickAddToSprint?: (
    item: WorkItemWithRelations,
    sprintId: string,
  ) => Promise<void>;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });
  const { "aria-describedby": _aria, ...stableAttrs } = attributes;
  void _aria;

  const quickAddTargets =
    sprints && sprints.length > 0 && onQuickAddToSprint ? sprints : null;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-2 rounded-md ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <div
        className="flex items-center gap-3 flex-1 min-w-0 px-2 py-2 rounded-md cursor-pointer hover:bg-gray-50 dark:hover:bg-muted/40"
        onClick={onOpen}
        {...stableAttrs}
        {...listeners}
      >
        <ItemRowContent item={item} onStatusChange={onStatusChange} />
      </div>
      {quickAddTargets && onQuickAddToSprint && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="flex-shrink-0 h-8 w-8 p-0"
              title="Add to sprint"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {quickAddTargets.map((s) => (
              <DropdownMenuItem
                key={s.id}
                onSelect={() => onQuickAddToSprint(item, s.id)}
              >
                {s.name}
                {s.status === "active" && (
                  <span className="ml-1 text-xs text-green-600">(active)</span>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
