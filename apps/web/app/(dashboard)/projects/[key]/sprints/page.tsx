import { notFound } from "next/navigation";
import { api } from "@/lib/api-client";
import type { Project } from "@/types/project.types";
import type { SprintWithCounts } from "@/types/sprint.types";
import type { WorkItemWithRelations } from "@/types/work-item.types";
import type { Profile } from "@/types/user.types";
import type { TicketPriorityRow } from "@/types/ticket.types";
import { SprintsClient } from "@/components/sprints/sprints-client";

interface PageProps {
  params: Promise<{ key: string }>;
}

export default async function SprintsPage({ params }: PageProps) {
  const { key } = await params;
  const project = await api.get<Project | null>(`/projects/by-key/${key}`);
  if (!project) notFound();

  const [sprints, profiles, priorities, backlog] = await Promise.all([
    api.get<SprintWithCounts[]>(`/projects/${project.id}/sprints`),
    api.getRevalidated<Profile[]>("/users", 300),
    api.getRevalidated<TicketPriorityRow[]>("/lookup/priorities", 3600),
    api.get<WorkItemWithRelations[]>("/work-items/backlog", { projectId: project.id }),
  ]);

  // Fetch items for ALL sprints (including completed) in parallel so the
  // planning board can show what shipped in each finished sprint.
  const itemArrays = await Promise.all(
    sprints.map((s) => api.get<WorkItemWithRelations[]>(`/work-items/sprint/${s.id}`)),
  );

  const sprintItems: Record<string, WorkItemWithRelations[]> = {};
  for (let i = 0; i < sprints.length; i++) {
    sprintItems[sprints[i].id] = itemArrays[i];
  }

  return (
    <SprintsClient
      project={project}
      initialSprints={sprints}
      sprintItems={sprintItems}
      initialBacklog={backlog}
      profiles={profiles.filter((p) => p.role !== "client")}
      priorities={priorities}
    />
  );
}
