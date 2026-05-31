"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import type { Project } from "@/types/project.types";

const TABS: Array<{ label: string; href: (k: string) => string; match: (p: string, k: string) => boolean; scrum?: boolean }> = [
  { label: "Sprint board",     href: (k) => `/projects/${k}`,           match: (p, k) => p === `/projects/${k}`,                      scrum: true },
  { label: "Project backlog",  href: (k) => `/projects/${k}/sprints`,   match: (p, k) => p.startsWith(`/projects/${k}/sprints`),      scrum: true },
  { label: "Project settings", href: (k) => `/projects/${k}/settings`,  match: (p, k) => p.startsWith(`/projects/${k}/settings`) },
];

export function ProjectHeader({ project }: { project: Project }) {
  const pathname = usePathname();
  const showScrumTabs = project.methodology === "scrum";

  return (
    <div className="border-b pb-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="font-mono">{project.key}</Badge>
          <h1 className="text-xl font-semibold text-foreground">{project.name}</h1>
          <span className="text-xs text-muted-foreground capitalize">{project.methodology}</span>
          {project.status === "archived" && (
            <Badge variant="secondary">archived</Badge>
          )}
        </div>
      </div>

      <nav className="mt-3 flex gap-4">
        {TABS.map((tab) => {
          const active = tab.match(pathname, project.key);
          const disabled = !showScrumTabs && !!tab.scrum;
          if (disabled) {
            return (
              <span
                key={tab.label}
                className="text-sm py-2 text-muted-foreground/40 cursor-not-allowed"
                title={`${project.methodology} workflow — coming soon`}
              >
                {tab.label}
              </span>
            );
          }
          return (
            <Link
              key={tab.label}
              href={tab.href(project.key)}
              className={cn(
                "text-sm py-2 border-b-2 -mb-2 transition-colors",
                active
                  ? "border-primary text-primary font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
