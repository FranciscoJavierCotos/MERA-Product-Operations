"use server";

import { revalidatePath } from "next/cache";
import { api, ApiError } from "@/lib/api-client";
import { createClient } from "@/lib/supabase/server";
import {
  projectSchema,
  updateProjectSchema,
} from "@/lib/validations/project.schema";
import {
  sprintSchema,
  updateSprintSchema,
} from "@/lib/validations/sprint.schema";
import {
  workItemSchema,
  updateWorkItemSchema,
  workItemCommentSchema,
} from "@/lib/validations/work-item.schema";
import type { Project } from "@/types/project.types";
import type { Sprint } from "@/types/sprint.types";
import type { WorkItem } from "@/types/work-item.types";
import type { Profile } from "@/types/user.types";
import { rankBetween } from "@/lib/utils/rank";

type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { user };
}

function asError(err: unknown, fallback = "Failed"): string {
  if (err instanceof ApiError) {
    return err.message || fallback;
  }
  return err instanceof Error ? err.message : fallback;
}

// ────────────────────────────────────────────────
// Projects
// ────────────────────────────────────────────────

export async function createProjectAction(
  input: unknown,
): Promise<ActionResult<{ key: string }>> {
  try {
    const { user } = await requireUser();
    const parsed = projectSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Invalid input",
      };
    }

    const profile = await api.get<Profile | null>(`/users/${user.id}`);
    if (!profile) {
      return {
        ok: false,
        error: "Profile not found. Please contact an administrator.",
      };
    }
    if (profile.role === "client") {
      return {
        ok: false,
        error: "You do not have permission to create projects.",
      };
    }

    const projectInput = { ...parsed.data };

    // Support members without an explicit team or lead scoping fall back to
    // themselves as project lead (team_id is now resolved via team_members RLS).
    if (
      profile.role === "support_member" &&
      !projectInput.team_id &&
      !projectInput.lead_id
    ) {
      projectInput.lead_id = user.id;
    }

    const project = await api.post<Project>("/projects", projectInput);
    revalidatePath("/projects");
    return { ok: true, data: { key: project.key } };
  } catch (err) {
    console.error("[createProjectAction]", err);
    const message = asError(err);
    if (message.includes('row-level security policy for table "projects"')) {
      return {
        ok: false,
        error:
          "You are not allowed to create this project with the selected team/lead. Choose your own team or set yourself as project lead.",
      };
    }
    return { ok: false, error: message };
  }
}

export async function updateProjectAction(
  projectId: string,
  input: unknown,
): Promise<ActionResult> {
  try {
    await requireUser();
    const parsed = updateProjectSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Invalid input",
      };
    }
    const project = await api.patch<Project>(`/projects/${projectId}`, parsed.data);
    revalidatePath("/projects");
    revalidatePath(`/projects/${project.key}`);
    return { ok: true, data: project };
  } catch (err) {
    return { ok: false, error: asError(err) };
  }
}

export async function archiveProjectAction(
  projectId: string,
): Promise<ActionResult> {
  try {
    await requireUser();
    const project = await api.get<Project | null>(`/projects/${projectId}`);
    if (!project) return { ok: false, error: "Project not found" };
    await api.post(`/projects/${projectId}/archive`);
    revalidatePath("/projects");
    revalidatePath(`/projects/${project.key}`);
    return { ok: true, data: null };
  } catch (err) {
    return { ok: false, error: asError(err) };
  }
}

export async function deleteProjectAction(
  projectId: string,
): Promise<ActionResult> {
  try {
    const { user } = await requireUser();

    const profile = await api.get<Profile | null>(`/users/${user.id}`);
    if (!profile || profile.role !== "admin") {
      return { ok: false, error: "Only admins can delete projects." };
    }

    const project = await api.get<Project | null>(`/projects/${projectId}`);
    if (!project) return { ok: false, error: "Project not found." };

    await api.del(`/projects/${projectId}`);

    revalidatePath("/projects");
    return { ok: true, data: null };
  } catch (err) {
    return { ok: false, error: asError(err, "Failed to delete project.") };
  }
}

// ────────────────────────────────────────────────
// Sprints
// ────────────────────────────────────────────────

export async function createSprintAction(
  projectKey: string,
  input: unknown,
): Promise<ActionResult> {
  try {
    await requireUser();
    const parsed = sprintSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Invalid input",
      };
    }
    const { project_id, ...body } = parsed.data;
    const sprint = await api.post<Sprint>(`/projects/${project_id}/sprints`, body);
    revalidatePath(`/projects/${projectKey}/sprints`);
    revalidatePath(`/projects/${projectKey}`);
    return { ok: true, data: sprint };
  } catch (err) {
    return { ok: false, error: asError(err) };
  }
}

export async function updateSprintAction(
  projectKey: string,
  sprintId: string,
  input: unknown,
): Promise<ActionResult> {
  try {
    await requireUser();
    const parsed = updateSprintSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Invalid input",
      };
    }
    const sprint = await api.patch<Sprint>(`/sprints/${sprintId}`, parsed.data);
    revalidatePath(`/projects/${projectKey}/sprints`);
    revalidatePath(`/projects/${projectKey}`);
    return { ok: true, data: sprint };
  } catch (err) {
    return { ok: false, error: asError(err) };
  }
}

export async function deleteSprintAction(
  projectKey: string,
  sprintId: string,
): Promise<ActionResult> {
  try {
    await requireUser();
    await api.del(`/sprints/${sprintId}`);
    revalidatePath(`/projects/${projectKey}/sprints`);
    revalidatePath(`/projects/${projectKey}`);
    return { ok: true, data: null };
  } catch (err) {
    return { ok: false, error: asError(err) };
  }
}

export async function startSprintAction(
  projectKey: string,
  sprintId: string,
): Promise<ActionResult> {
  try {
    await requireUser();
    await api.post(`/sprints/${sprintId}/start`);
    revalidatePath(`/projects/${projectKey}/sprints`);
    revalidatePath(`/projects/${projectKey}`);
    return { ok: true, data: null };
  } catch (err) {
    return { ok: false, error: asError(err) };
  }
}

export async function completeSprintAction(
  projectKey: string,
  sprintId: string,
): Promise<ActionResult> {
  try {
    await requireUser();
    await api.post(`/sprints/${sprintId}/complete`);
    revalidatePath(`/projects/${projectKey}/sprints`);
    revalidatePath(`/projects/${projectKey}`);
    return { ok: true, data: null };
  } catch (err) {
    return { ok: false, error: asError(err) };
  }
}

// ────────────────────────────────────────────────
// Work items
// ────────────────────────────────────────────────

export async function createWorkItemAction(
  projectKey: string,
  input: unknown,
): Promise<ActionResult<{ item_key: string }>> {
  try {
    await requireUser();
    const parsed = workItemSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Invalid input",
      };
    }

    // Append to bottom of the target bucket (backlog or sprint).
    const { rank: lastRank } = await api.get<{ rank: string | null }>(
      "/work-items/rank/last",
      {
        projectId: parsed.data.project_id,
        sprintId: parsed.data.sprint_id ?? undefined,
      },
    );
    const rank = rankBetween(lastRank, null);

    const item = await api.post<WorkItem>("/work-items", {
      ...parsed.data,
      rank,
    });

    revalidatePath(`/projects/${projectKey}`);
    revalidatePath(`/projects/${projectKey}/sprints`);
    return { ok: true, data: { item_key: item.item_key } };
  } catch (err) {
    return { ok: false, error: asError(err) };
  }
}

export async function updateWorkItemAction(
  projectKey: string,
  workItemId: string,
  input: unknown,
): Promise<ActionResult> {
  try {
    await requireUser();
    const parsed = updateWorkItemSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Invalid input",
      };
    }
    const item = await api.patch<WorkItem>(`/work-items/${workItemId}`, parsed.data);
    revalidatePath(`/projects/${projectKey}`);
    revalidatePath(`/projects/${projectKey}/sprints`);
    return { ok: true, data: item };
  } catch (err) {
    return { ok: false, error: asError(err) };
  }
}

// ────────────────────────────────────────────────
// Comments
// ────────────────────────────────────────────────

export async function createWorkItemCommentAction(
  projectKey: string,
  input: unknown,
): Promise<ActionResult> {
  try {
    await requireUser();
    const parsed = workItemCommentSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Invalid input",
      };
    }
    const comment = await api.post(
      `/work-items/${parsed.data.work_item_id}/comments`,
      { content: parsed.data.content },
    );
    revalidatePath(`/projects/${projectKey}`);
    return { ok: true, data: comment };
  } catch (err) {
    return { ok: false, error: asError(err) };
  }
}
