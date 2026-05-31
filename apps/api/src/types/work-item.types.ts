import type { Profile } from "./user.types";
import type { TicketPriorityRow } from "./ticket.types";

export type WorkItemType = "epic" | "story" | "task" | "bug";
export type WorkItemStatus =
  | "todo"
  | "in_progress"
  | "in_review"
  | "done"
  | "rework";

export const WORK_ITEM_STATUSES: WorkItemStatus[] = [
  "todo",
  "in_progress",
  "in_review",
  "done",
  "rework",
];

export const WORK_ITEM_STATUS_LABELS: Record<WorkItemStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Done",
  rework: "Rework",
};

export const WORK_ITEM_TYPES: WorkItemType[] = ["epic", "story", "task", "bug"];

export const WORK_ITEM_TYPE_LABELS: Record<WorkItemType, string> = {
  epic: "Epic",
  story: "Story",
  task: "Task",
  bug: "Bug",
};

export interface WorkItem {
  id: string;
  project_id: string;
  sprint_id: string | null;
  item_key: string;
  type: WorkItemType;
  status: WorkItemStatus;
  priority_id: number | null;
  title: string;
  description: string | null;
  story_points: number | null;
  assigned_to: string | null;
  reporter_id: string | null;
  parent_id: string | null;
  rank: string;
  created_at: string;
  updated_at: string;
}

export interface WorkItemWithRelations extends WorkItem {
  priority?: TicketPriorityRow | null;
  assignee?: Profile | null;
  reporter?: Profile | null;
  parent?: Pick<WorkItem, "id" | "item_key" | "title" | "type"> | null;
}

export interface WorkItemHistoryEntry {
  id: string;
  work_item_id: string;
  user_id: string | null;
  action: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  user?: Profile | null;
}

export interface WorkItemComment {
  id: string;
  work_item_id: string;
  user_id: string;
  content: string;
  attachments: unknown[];
  created_at: string;
  updated_at: string;
  user?: Profile | null;
}

export interface BoardColumn {
  status: WorkItemStatus;
  label: string;
  items: WorkItemWithRelations[];
}

export interface CreateWorkItemInput {
  project_id: string;
  sprint_id?: string | null;
  type?: WorkItemType;
  title: string;
  description?: string | null;
  priority_id?: number | null;
  story_points?: number | null;
  assigned_to?: string | null;
  reporter_id?: string | null;
  parent_id?: string | null;
  rank: string;
}

export interface UpdateWorkItemInput {
  sprint_id?: string | null;
  type?: WorkItemType;
  status?: WorkItemStatus;
  title?: string;
  description?: string | null;
  priority_id?: number | null;
  story_points?: number | null;
  assigned_to?: string | null;
  parent_id?: string | null;
  rank?: string;
}
