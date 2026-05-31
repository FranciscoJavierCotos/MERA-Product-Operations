"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  updateProjectAction,
  archiveProjectAction,
  deleteProjectAction,
} from "@/app/(dashboard)/projects/actions";
import type { Project } from "@/types/project.types";
import type { Team } from "@/types/team.types";
import type { Profile } from "@/types/user.types";

interface Props {
  project: Project;
  teams: Team[];
  leadCandidates: Profile[];
  /** Pass the current user's role so we can hide the Delete button for non-admins. */
  currentUserRole?: string;
}

const NO_TEAM = "__none__";
const NO_LEAD = "__none__";

const SPRINT_DURATION_OPTIONS = [
  { value: 1, label: "1 week" },
  { value: 2, label: "2 weeks" },
  { value: 3, label: "3 weeks" },
  { value: 4, label: "4 weeks" },
] as const;

export function ProjectSettingsClient({
  project,
  teams,
  leadCandidates,
  currentUserRole,
}: Props) {
  const router = useRouter();
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [teamId, setTeamId] = useState<string>(project.team_id ?? NO_TEAM);
  const [leadId, setLeadId] = useState<string>(project.lead_id ?? NO_LEAD);
  const [sprintDurationWeeks, setSprintDurationWeeks] = useState<number>(
    project.sprint_duration_weeks ?? 2,
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // ── Delete dialog state ────────────────────────────────────────────────────
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmKey, setConfirmKey] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  // ── Handlers ───────────────────────────────────────────────────────────────

  const onSave = () => {
    setError(null);
    startTransition(async () => {
      const result = await updateProjectAction(project.id, {
        name,
        description: description || null,
        team_id: teamId === NO_TEAM ? null : teamId,
        lead_id: leadId === NO_LEAD ? null : leadId,
        sprint_duration_weeks: sprintDurationWeeks,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  const onArchive = () => {
    if (!confirm("Archive this project? It will be hidden from active lists.")) return;
    startTransition(async () => {
      const result = await archiveProjectAction(project.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/projects");
    });
  };

  const onDeleteConfirm = () => {
    setDeleteError(null);
    startDeleteTransition(async () => {
      const result = await deleteProjectAction(project.id);
      if (!result.ok) {
        setDeleteError(result.error);
        return;
      }
      router.push("/projects");
    });
  };

  const isAdmin = currentUserRole === "admin";

  return (
    <div className="space-y-6">
      {/* ── Main settings ───────────────────────────────────────────────────── */}
      <div className="max-w-2xl rounded-lg border bg-card p-6 space-y-4">
        <h2 className="text-lg font-semibold text-card-foreground">Project settings</h2>

        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Team</Label>
            <Select value={teamId} onValueChange={setTeamId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_TEAM}>— None —</SelectItem>
                {teams.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Lead</Label>
            <Select value={leadId} onValueChange={setLeadId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_LEAD}>— None —</SelectItem>
                {leadCandidates.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Sprint duration — only relevant for Scrum */}
        {project.methodology === "scrum" && (
          <div className="rounded-md border bg-muted/50 p-4 space-y-3">
            <h3 className="text-sm font-medium text-foreground">Scrum settings</h3>
            <div className="max-w-xs">
              <Label htmlFor="sprint-duration">Sprint duration</Label>
              <Select
                value={String(sprintDurationWeeks)}
                onValueChange={(v) => setSprintDurationWeeks(Number(v))}
              >
                <SelectTrigger id="sprint-duration"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SPRINT_DURATION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={String(opt.value)}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                When creating a sprint, picking a start date will automatically fill the end
                date based on this duration.
              </p>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="destructive"
            onClick={onArchive}
            disabled={isPending || project.status === "archived"}
          >
            Archive project
          </Button>
          <Button onClick={onSave} disabled={isPending}>
            {isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>

      {/* ── Danger zone (admin-only) ─────────────────────────────────────────── */}
      {isAdmin && (
        <div className="max-w-2xl rounded-lg border border-red-500/30 bg-red-500/10 p-6 space-y-3">
          <h2 className="text-lg font-semibold text-red-400">Danger zone</h2>
          <p className="text-sm text-red-400/80">
            Permanently delete this project and everything inside it — sprints, work
            items, comments, history, and all ticket links. <strong>This cannot be undone.</strong>
          </p>
          <Button
            variant="destructive"
            onClick={() => {
              setConfirmKey("");
              setDeleteError(null);
              setDeleteOpen(true);
            }}
          >
            Delete project
          </Button>
        </div>
      )}

      {/* ── Delete confirmation dialog ───────────────────────────────────────── */}
      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (!isDeleting) setDeleteOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete project</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  This will <strong>permanently delete</strong>{" "}
                  <span className="font-mono font-semibold text-foreground">
                    {project.key}
                  </span>{" "}
                  — <strong>{project.name}</strong> — and remove:
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>All sprints and their history</li>
                  <li>All work items, comments, and audit history</li>
                  <li>All links between tickets and work items in this project</li>
                </ul>
                <p className="font-medium text-foreground">
                  Type the project key{" "}
                  <span className="font-mono bg-muted px-1 rounded">
                    {project.key}
                  </span>{" "}
                  to confirm:
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Input
              placeholder={project.key}
              value={confirmKey}
              onChange={(e) => setConfirmKey(e.target.value.toUpperCase())}
              disabled={isDeleting}
              autoFocus
            />
            {deleteError && (
              <p className="text-sm text-red-600">{deleteError}</p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose asChild>
              <Button variant="outline" disabled={isDeleting}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              variant="destructive"
              disabled={confirmKey !== project.key || isDeleting}
              onClick={onDeleteConfirm}
            >
              {isDeleting ? "Deleting…" : "Delete project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
