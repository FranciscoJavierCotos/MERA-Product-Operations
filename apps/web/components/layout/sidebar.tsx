"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import {
  LayoutDashboard,
  BarChart3,
  Ticket,
  CheckSquare,
  Brain,
  FolderKanban,
  Users,
  Building2,
  Settings,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { apiBrowser } from "@/lib/api-client-browser";
import type { ProjectListItem } from "@/types/project.types";

type Role = "admin" | "support_lead" | "support_member" | "client";

const navigation: Array<{
  name: string;
  href: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
}> = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "My Tasks", href: "/tasks", icon: CheckSquare },
  { name: "Tickets", href: "/tickets", icon: Ticket },
  { name: "Projects", href: "/projects", icon: FolderKanban },
  { name: "Teams", href: "/teams", icon: Users },
  { name: "Companies", href: "/companies", icon: Building2 },
  { name: "AI Knowledge", href: "/knowledge", icon: Brain, adminOnly: true },
  { name: "Settings", href: "/settings", icon: Settings, adminOnly: true },
];

const METHODOLOGY_COLORS: Record<
  string,
  { bg: string; text: string }
> = {
  scrum:     { bg: "bg-indigo-500/20",  text: "text-indigo-400" },
  kanban:    { bg: "bg-emerald-500/20", text: "text-emerald-400" },
  waterfall: { bg: "bg-amber-500/20",   text: "text-amber-400" },
};

interface SidebarProps {
  role?: Role;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({
  role,
  isCollapsed = false,
  onToggleCollapse,
}: SidebarProps = {}) {
  const pathname = usePathname();
  const [isToggleHovered, setIsToggleHovered] = useState(false);
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [isProjectsOpen, setIsProjectsOpen] = useState(false);

  const isOnProjectsRoute = pathname.startsWith("/projects");
  const prevRouteRef = useRef(isOnProjectsRoute);

  // ── Auto open/close based on route boundary crossings ──────────────────
  useEffect(() => {
    const wasOnProjects = prevRouteRef.current;
    prevRouteRef.current = isOnProjectsRoute;

    if (isOnProjectsRoute && !wasOnProjects) {
      // Crossing INTO /projects section → open
      setIsProjectsOpen(true);
    } else if (!isOnProjectsRoute && wasOnProjects) {
      // Crossing OUT of /projects section → close
      setIsProjectsOpen(false);
    }
  }, [isOnProjectsRoute]);

  // ── Initialize open state on first mount ───────────────────────────────
  useEffect(() => {
    if (pathname.startsWith("/projects")) {
      setIsProjectsOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Fetch project list ─────────────────────────────────────────────────
  useEffect(() => {
    apiBrowser
      .get<ProjectListItem[]>("/projects")
      .then(setProjects)
      .catch(() => setProjects([]));
  }, []);

  const items = navigation.filter(
    (item) => !item.adminOnly || role === "admin",
  );

  return (
    <div
      className={cn(
        "hidden md:flex md:flex-col md:fixed md:inset-y-0 transition-[width] duration-200",
        isCollapsed ? "md:w-20" : "md:w-64",
      )}
    >
      <div className="flex-1 flex flex-col min-h-0 bg-gray-800 dark:bg-card dark:border-r dark:border-border">
        {/* ── Logo / Brand ─────────────────────────────────────────────── */}
        <div
          className={cn(
            "relative flex items-center h-16 flex-shrink-0 bg-gray-900 dark:bg-transparent dark:border-b dark:border-border",
            isCollapsed ? "justify-center px-2" : "px-4",
          )}
        >
          {isCollapsed ? (
            <h1
              className={cn(
                "text-white text-xl font-bold tracking-tight transition-transform duration-300 ease-out",
                isToggleHovered ? "-translate-x-3" : "translate-x-0",
              )}
            >
              M
            </h1>
          ) : (
            <div className="flex flex-col">
              <h1 className="text-white text-xl font-bold tracking-tight">
                MERA
              </h1>
              <span className="text-gray-400 text-[11px] leading-none mt-0.5 dark:text-muted-foreground">
                Product Operations
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={onToggleCollapse}
            onMouseEnter={() => setIsToggleHovered(true)}
            onMouseLeave={() => setIsToggleHovered(false)}
            onFocus={() => setIsToggleHovered(true)}
            onBlur={() => setIsToggleHovered(false)}
            className="absolute right-2 inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-300 transition-colors hover:bg-gray-800 hover:text-white"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={isCollapsed ? "Expand menu" : "Collapse menu"}
          >
            {isCollapsed ? (
              <ChevronsRight className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ChevronsLeft className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>

        {/* ── Navigation ───────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          <nav className="flex-1 px-2 py-4 space-y-1">
            {items.map((item) => {
              const isProjectsItem = item.href === "/projects";

              /* ── Projects item (special: folder hierarchy) ─────────── */
              if (isProjectsItem) {
                const isListActive = pathname === "/projects";
                const isInsideProject = pathname.startsWith("/projects/");
                const isAnyProjectsActive = isListActive || isInsideProject;

                return (
                  <div key={item.name}>
                    {/* Row: icon + label + chevron */}
                    <div
                      className={cn(
                        "group relative flex items-center py-2 text-sm font-medium rounded-md transition-colors duration-150",
                        isAnyProjectsActive
                          ? "bg-gray-900 text-white border-l-2 border-primary-400 dark:bg-secondary dark:border-primary dark:text-gray-100"
                          : "text-gray-300 hover:bg-gray-700 hover:text-white border-l-2 border-transparent dark:text-gray-400 dark:hover:bg-white/[0.04] dark:hover:text-gray-100",
                        isCollapsed ? "justify-center px-2" : "pl-[7px] pr-1",
                      )}
                    >
                      {/* Clickable link area (icon + label) */}
                      <Link
                        href={item.href}
                        title={isCollapsed ? item.name : undefined}
                        className="flex items-center flex-1 min-w-0"
                        onClick={() => setIsProjectsOpen(true)}
                      >
                        <item.icon
                          className={cn(
                            isAnyProjectsActive
                              ? "text-primary-300 dark:text-primary-400"
                              : "text-gray-400 group-hover:text-gray-300 dark:text-gray-500 dark:group-hover:text-gray-300",
                            isCollapsed ? "mr-0 h-6 w-6" : "mr-3 h-6 w-6",
                            "flex-shrink-0 transition-colors",
                          )}
                          aria-hidden="true"
                        />
                        {!isCollapsed && (
                          <span className="transition-colors truncate">
                            {item.name}
                          </span>
                        )}
                      </Link>

                      {/* Chevron toggle — only when sidebar is expanded */}
                      {!isCollapsed && projects.length > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            setIsProjectsOpen((prev) => !prev)
                          }
                          className={cn(
                            "flex-shrink-0 p-1 rounded transition-colors ml-1 cursor-pointer",
                            isAnyProjectsActive
                              ? "hover:bg-gray-700 dark:hover:bg-white/10"
                              : "hover:bg-gray-600 dark:hover:bg-white/10",
                          )}
                          aria-label={
                            isProjectsOpen
                              ? "Collapse projects"
                              : "Expand projects"
                          }
                        >
                          <ChevronDown
                            className={cn(
                              "h-3.5 w-3.5 transition-transform duration-300 ease-in-out",
                              isProjectsOpen ? "rotate-0" : "-rotate-90",
                              isAnyProjectsActive
                                ? "text-gray-300"
                                : "text-gray-400 group-hover:text-gray-300",
                            )}
                            aria-hidden="true"
                          />
                        </button>
                      )}
                    </div>

                    {/* ── Animated sub-list ─────────────────────────── */}
                    {!isCollapsed && projects.length > 0 && (
                      <div
                        className="grid transition-[grid-template-rows] duration-300 ease-in-out"
                        style={{
                          gridTemplateRows: isProjectsOpen ? "1fr" : "0fr",
                        }}
                      >
                        <div className="overflow-hidden">
                          <div className="pt-0.5 pb-1 space-y-0.5">
                            {projects.map((project) => {
                              const isProjectActive =
                                pathname === `/projects/${project.key}` ||
                                pathname.startsWith(`/projects/${project.key}/`);
                              const colors =
                                METHODOLOGY_COLORS[project.methodology] ??
                                METHODOLOGY_COLORS.kanban;

                              return (
                                <Link
                                  key={project.id}
                                  href={`/projects/${project.key}`}
                                  className={cn(
                                    "group/proj flex items-center gap-2 pl-9 pr-2 py-1.5 rounded-md text-xs font-medium",
                                    "transition-colors duration-150 cursor-pointer",
                                    isProjectActive
                                      ? "bg-gray-900/80 text-white dark:bg-secondary dark:text-gray-100"
                                      : "text-gray-400 hover:bg-gray-700/60 hover:text-white dark:text-gray-500 dark:hover:bg-white/[0.04] dark:hover:text-gray-200",
                                  )}
                                >
                                  {/* Methodology key badge */}
                                  <span
                                    className={cn(
                                      "inline-flex items-center justify-center text-[9px] font-bold",
                                      "rounded px-1 py-0.5 flex-shrink-0 leading-none tracking-wide",
                                      colors.bg,
                                      colors.text,
                                    )}
                                  >
                                    {project.key}
                                  </span>
                                  {/* Project name */}
                                  <span className="truncate leading-snug">
                                    {project.name}
                                  </span>
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              /* ── Regular nav items ─────────────────────────────────── */
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  title={isCollapsed ? item.name : undefined}
                  className={cn(
                    isActive
                      ? "bg-gray-900 text-white border-l-2 border-primary-400 dark:bg-secondary dark:border-primary dark:text-gray-100"
                      : "text-gray-300 hover:bg-gray-700 hover:text-white border-l-2 border-transparent dark:text-gray-400 dark:hover:bg-white/[0.04] dark:hover:text-gray-100",
                    isCollapsed ? "justify-center px-2" : "pl-[7px] pr-2",
                    "group relative flex items-center py-2 text-sm font-medium rounded-md transition-colors duration-150",
                  )}
                >
                  <item.icon
                    className={cn(
                      isActive
                        ? "text-primary-300 dark:text-primary-400"
                        : "text-gray-400 group-hover:text-gray-300 dark:text-gray-500 dark:group-hover:text-gray-300",
                      isCollapsed ? "mr-0 h-6 w-6" : "mr-3 h-6 w-6",
                      "flex-shrink-0 transition-colors",
                    )}
                    aria-hidden="true"
                  />
                  {!isCollapsed && (
                    <span className="transition-colors">{item.name}</span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}
