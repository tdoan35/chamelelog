"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Github,
  Rss,
  Braces,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  ChevronDown,
  Check,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { CATEGORY_COLORS } from "@/lib/category-colors";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Project {
  id: string;
  repoOwner: string;
  repoName: string;
  repoUrl: string | null;
}

interface ProjectSidebarProps {
  projects: Project[];
}

const filterItems = [
  { label: "All changes", category: null },
  { label: "Features", category: "features" },
  { label: "Improvements", category: "improvements" },
  { label: "Fixes", category: "fixes" },
  { label: "Breaking", category: "breaking" },
] as const;

function buildHref(params: Record<string, string | null>): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) sp.set(key, value);
  }
  const qs = sp.toString();
  return `/changelog${qs ? `?${qs}` : ""}`;
}

export function ProjectSidebar({ projects }: ProjectSidebarProps) {
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get("category");
  const projectParam = searchParams.get("project");
  const [collapsed, setCollapsed] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const activeProject =
    projects?.find((p) => p.id === projectParam) ?? projects?.[0];
  const hasMultipleProjects = (projects?.length ?? 0) > 1;

  const repoOwner = activeProject?.repoOwner ?? "owner";
  const repoName = activeProject?.repoName ?? "repo";
  const repoUrl = activeProject?.repoUrl ?? "https://github.com";

  const projectParamForUrls =
    hasMultipleProjects && activeProject ? activeProject.id : null;

  const feedProjectParam = projectParamForUrls
    ? `?project=${projectParamForUrls}`
    : "";

  return (
    <aside
      className={cn(
        "sticky top-0 flex h-screen shrink-0 flex-col border-r border-border-primary bg-sidebar transition-all duration-200",
        collapsed ? "w-[72px]" : "w-[280px]"
      )}
    >
      <div className="flex flex-col gap-6 overflow-hidden px-4 pt-6">
        {/* Project info */}
        <div className="flex items-center justify-between">
          <div
            className={cn(
              "flex items-center gap-2.5 overflow-hidden",
              collapsed && "opacity-0"
            )}
          >
            <div className="h-9 w-9 shrink-0 rounded-lg bg-surface-hover dark:bg-[#1A1A1A]" />
            {hasMultipleProjects ? (
              <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                <PopoverTrigger className="flex items-center gap-1 truncate rounded-md text-[15px] font-semibold text-text-primary transition-colors hover:text-text-secondary">
                  <span className="truncate">
                    {repoOwner}/{repoName}
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 shrink-0 transition-transform",
                      popoverOpen && "rotate-180"
                    )}
                  />
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  sideOffset={8}
                  className="w-[248px] rounded-lg border border-border-primary bg-sidebar p-1 shadow-lg"
                >
                  {projects.map((p) => {
                    const isActive = p.id === activeProject?.id;
                    return (
                      <Link
                        key={p.id}
                        href={buildHref({ project: p.id })}
                        onClick={() => setPopoverOpen(false)}
                        className={cn(
                          "flex items-center justify-between rounded-md px-3 py-2 text-[13px] transition-colors",
                          isActive
                            ? "font-medium text-text-primary"
                            : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                        )}
                      >
                        <span className="truncate">
                          {p.repoOwner}/{p.repoName}
                        </span>
                        {isActive && (
                          <Check className="h-3.5 w-3.5 shrink-0 text-text-primary" />
                        )}
                      </Link>
                    );
                  })}
                </PopoverContent>
              </Popover>
            ) : (
              <span className="truncate text-[15px] font-semibold text-text-primary">
                {repoOwner}/{repoName}
              </span>
            )}
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-text-tertiary transition-colors hover:bg-surface-hover hover:text-text-secondary"
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
        </div>

        {!collapsed && (
          <>
            {/* Description */}
            <p
              className="text-[13px] text-text-secondary"
              style={{ lineHeight: 1.5 }}
            >
              AI-powered changelog generation from Git commits. Beautiful,
              categorized, and published in one click.
            </p>

            {/* Links */}
            <div className="flex flex-col">
              <a
                href={repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-md px-2.5 py-2 text-[13px] text-text-secondary transition-colors hover:text-text-primary"
              >
                <Github className="h-4 w-4 shrink-0" />
                View repository
              </a>
              <a
                href={`/api/feed/rss${feedProjectParam}`}
                className="flex items-center gap-2 rounded-md px-2.5 py-2 text-[13px] text-text-secondary transition-colors hover:text-text-primary"
              >
                <Rss className="h-4 w-4 shrink-0" />
                RSS Feed
              </a>
              <a
                href={`/api/feed/json${feedProjectParam}`}
                className="flex items-center gap-2 rounded-md px-2.5 py-2 text-[13px] text-text-secondary transition-colors hover:text-text-primary"
              >
                <Braces className="h-4 w-4 shrink-0" />
                JSON Feed
              </a>
            </div>

            {/* Filter */}
            <div className="flex flex-col gap-2">
              <span className="px-2.5 text-[11px] font-medium uppercase tracking-[1px] text-text-tertiary">
                Filter
              </span>
              <div className="flex flex-col gap-[3px]">
                {filterItems.map((item) => {
                  const isActive =
                    item.category === activeCategory ||
                    (item.category === null && !activeCategory);
                  const href = buildHref({
                    project: projectParamForUrls,
                    category: item.category,
                  });
                  const dotColor = item.category
                    ? CATEGORY_COLORS[item.category]?.color
                    : undefined;

                  return (
                    <Link
                      key={item.label}
                      href={href}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-2.5 py-[6px] text-[13px] transition-colors",
                        isActive
                          ? "bg-surface font-medium text-text-primary dark:bg-[#111111]"
                          : "text-text-secondary hover:text-text-primary"
                      )}
                    >
                      {dotColor && (
                        <div
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: dotColor }}
                        />
                      )}
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="flex-1" />

      {/* Bottom */}
      <div className="flex flex-col gap-3 px-4 pb-6">
        {!collapsed && <ThemeToggle />}
        <div
          className={cn(
            "flex items-center gap-1.5 px-1",
            collapsed && "justify-center"
          )}
        >
          <Sparkles className="h-3 w-3 shrink-0 text-text-tertiary" />
          {!collapsed && (
            <span className="text-[11px] text-text-tertiary">
              Powered by Chamelelog
            </span>
          )}
        </div>
      </div>
    </aside>
  );
}
