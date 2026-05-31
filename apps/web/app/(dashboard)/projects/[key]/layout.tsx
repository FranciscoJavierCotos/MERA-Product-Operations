import Link from "next/link";
import { notFound } from "next/navigation";
import { api } from "@/lib/api-client";
import type { Project } from "@/types/project.types";
import { ProjectHeader } from "@/components/projects/project-header";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ key: string }>;
}

export default async function ProjectLayout({ children, params }: LayoutProps) {
  const { key } = await params;
  const project = await api.get<Project | null>(`/projects/by-key/${key}`);
  if (!project) notFound();

  return (
    <div className="space-y-4">
      <Link href="/projects" className="text-sm text-muted-foreground hover:text-foreground">
        ← All projects
      </Link>
      <ProjectHeader project={project} />
      {children}
    </div>
  );
}
