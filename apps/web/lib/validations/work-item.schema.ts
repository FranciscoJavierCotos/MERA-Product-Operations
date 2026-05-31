import { z } from "zod";

export const workItemSchema = z.object({
  project_id: z.string().uuid(),
  sprint_id: z.string().uuid().optional().nullable(),
  type: z.enum(["epic", "story", "task", "bug"]).default("story"),
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().max(20000).optional().nullable(),
  priority_id: z.number().int().positive().optional().nullable(),
  story_points: z
    .number()
    .int()
    .min(0)
    .max(100)
    .optional()
    .nullable(),
  assigned_to: z.string().uuid().optional().nullable(),
  parent_id: z.string().uuid().optional().nullable(),
});

export const updateWorkItemSchema = z.object({
  sprint_id: z.string().uuid().optional().nullable(),
  type: z.enum(["epic", "story", "task", "bug"]).optional(),
  status: z
    .enum(["todo", "in_progress", "in_review", "done", "rework"])
    .optional(),
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(20000).optional().nullable(),
  priority_id: z.number().int().positive().optional().nullable(),
  story_points: z.number().int().min(0).max(100).optional().nullable(),
  assigned_to: z.string().uuid().optional().nullable(),
  parent_id: z.string().uuid().optional().nullable(),
});

export const workItemCommentSchema = z.object({
  work_item_id: z.string().uuid(),
  content: z.string().trim().min(1, "Comment cannot be empty").max(10000),
});

export const reorderWorkItemSchema = z.object({
  item_id: z.string().uuid(),
  status: z
    .enum(["todo", "in_progress", "in_review", "done", "rework"])
    .optional(),
  sprint_id: z.string().uuid().nullable().optional(),
  before_rank: z.string().optional().nullable(),
  after_rank: z.string().optional().nullable(),
});

export type WorkItemFormData = z.infer<typeof workItemSchema>;
export type UpdateWorkItemFormData = z.infer<typeof updateWorkItemSchema>;
export type WorkItemCommentFormData = z.infer<typeof workItemCommentSchema>;
export type ReorderWorkItemFormData = z.infer<typeof reorderWorkItemSchema>;
