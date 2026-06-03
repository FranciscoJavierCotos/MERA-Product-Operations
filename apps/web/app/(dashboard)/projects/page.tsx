import Link from "next/link";
import { api, ApiError } from "@/lib/api-client";
import type { ProjectListItem } from "@/types/project.types";
import { Button } from "@/components/ui/button";
import { ProjectCard } from "@/components/projects/project-card";
import { FolderKanban, Plus } from "lucide-react";

export default async function ProjectsPage() {
  let projects: ProjectListItem[] = [];
  let errorMessage: string | null = null;

  try {
    projects = await api.get<ProjectListItem[]>("/projects");
  } catch (err) {
    if (err instanceof ApiError && err.status === 429) {
      errorMessage = "Too many requests. Please wait a moment and refresh the page.";
    } else {
      errorMessage = "Failed to load projects. Please try again.";
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <FolderKanban className="h-6 w-6 text-gray-500" />
            Projects
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Scrum projects, sprints, and work items.
          </p>
        </div>
        <Link href="/projects/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" /> New project
          </Button>
        </Link>
      </header>

      {errorMessage ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-red-700 text-sm">{errorMessage}</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center">
          <p className="text-gray-500">No projects yet.</p>
          <Link href="/projects/new" className="text-primary text-sm underline mt-2 inline-block">
            Create the first one
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
