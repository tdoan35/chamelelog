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
  Monitor,
  Moon,
  Sun,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { CATEGORY_COLORS } from "@/lib/category-colors";
import { ThemeToggle } from "@/components/theme-toggle";
import { triggerThemeTransition } from "@/lib/theme-transition";
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
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const cycleTheme = () => {
    const order = ["light", "system", "dark"];
    const idx = order.indexOf(theme ?? "system");
    triggerThemeTransition();
    setTheme(order[(idx + 1) % order.length]);
  };

  const ThemeIcon = mounted
    ? theme === "light" ? Sun : theme === "dark" ? Moon : Monitor
    : Monitor;

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
        "sticky top-0 flex h-screen shrink-0 flex-col overflow-hidden border-r border-border-primary bg-sidebar transition-all duration-200",
        collapsed ? "w-[72px]" : "w-[280px]"
      )}
    >
      <div className="flex flex-col gap-6 px-4 pt-6">
        {/* Project info — logo always visible, text fades */}
        {hasMultipleProjects ? (
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger className="flex h-9 items-center gap-2.5 overflow-hidden rounded-md transition-colors hover:opacity-80">
              <img
                src="/images/generic-logo.png"
                alt=""
                className="h-9 w-9 shrink-0 rounded-lg"
              />
              <span
                className={cn(
                  "flex items-center gap-1 truncate text-[15px] font-semibold text-text-primary whitespace-nowrap transition-opacity duration-200",
                  collapsed ? "opacity-0" : "opacity-100"
                )}
              >
                <span className="truncate">
                  {repoOwner}/{repoName}
                </span>
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 shrink-0 transition-transform",
                    popoverOpen && "rotate-180"
                  )}
                />
              </span>
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
          <div className="flex h-9 items-center gap-2.5 overflow-hidden">
            <img
              src="/images/generic-logo.png"
              alt=""
              className="h-9 w-9 shrink-0 rounded-lg"
            />
            <span
              className={cn(
                "truncate text-[15px] font-semibold text-text-primary whitespace-nowrap transition-opacity duration-200",
                collapsed ? "opacity-0" : "opacity-100"
              )}
            >
              {repoOwner}/{repoName}
            </span>
          </div>
        )}

        {/* Description — animates height + opacity on collapse */}
        <div
          className={cn(
            "overflow-hidden transition-all duration-200",
            collapsed ? "max-h-0 opacity-0 -mt-6" : "max-h-24 opacity-100"
          )}
        >
          <p
            className="text-[13px] text-text-secondary"
            style={{ lineHeight: 1.5 }}
          >
            AI-powered changelog generation from Git commits. Beautiful,
            categorized, and published in one click.
          </p>
        </div>

        {/* Links — icon always visible, text fades */}
        <div className="flex flex-col">
          <a
            href={repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={collapsed ? "View repository" : undefined}
            className="flex h-9 items-center gap-2 overflow-hidden whitespace-nowrap rounded-md px-2.5 py-2 text-[13px] text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
          >
            <Github className="h-4 w-4 shrink-0" />
            <span
              className={cn(
                "whitespace-nowrap transition-opacity duration-200",
                collapsed ? "opacity-0" : "opacity-100"
              )}
            >
              View repository
            </span>
          </a>
          <a
            href={`/api/feed/rss${feedProjectParam}`}
            title={collapsed ? "RSS Feed" : undefined}
            className="flex h-9 items-center gap-2 overflow-hidden whitespace-nowrap rounded-md px-2.5 py-2 text-[13px] text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
          >
            <Rss className="h-4 w-4 shrink-0" />
            <span
              className={cn(
                "whitespace-nowrap transition-opacity duration-200",
                collapsed ? "opacity-0" : "opacity-100"
              )}
            >
              RSS Feed
            </span>
          </a>
          <a
            href={`/api/feed/json${feedProjectParam}`}
            title={collapsed ? "JSON Feed" : undefined}
            className="flex h-9 items-center gap-2 overflow-hidden whitespace-nowrap rounded-md px-2.5 py-2 text-[13px] text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
          >
            <Braces className="h-4 w-4 shrink-0" />
            <span
              className={cn(
                "whitespace-nowrap transition-opacity duration-200",
                collapsed ? "opacity-0" : "opacity-100"
              )}
            >
              JSON Feed
            </span>
          </a>
        </div>

        {/* Filter — label fades, dots always visible, text fades */}
        <div className="flex flex-col gap-2">
          <span
            className={cn(
              "px-2.5 text-[11px] font-medium uppercase tracking-[1px] text-text-tertiary whitespace-nowrap transition-opacity duration-200",
              collapsed ? "opacity-0" : "opacity-100"
            )}
          >
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
                : "#a1a1aa";

              return (
                <Link
                  key={item.label}
                  href={href}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "flex h-9 items-center gap-2 overflow-hidden whitespace-nowrap rounded-md px-2.5 py-[6px] text-[13px] transition-colors",
                    isActive
                      ? "bg-surface font-medium text-text-primary dark:bg-[#111111]"
                      : "text-text-secondary hover:text-text-primary"
                  )}
                >
                  <div
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: dotColor }}
                  />
                  <span
                    className={cn(
                      "whitespace-nowrap transition-opacity duration-200",
                      collapsed ? "opacity-0" : "opacity-100"
                    )}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex-1" />

      {/* Bottom */}
      <div className="flex flex-col gap-3 px-4 pb-6">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-text-tertiary transition-colors hover:bg-surface-hover hover:text-text-secondary"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>

        {/* Theme switcher — both always rendered, crossfade with opacity */}
        <div className="relative h-[34px]">
          {/* Expanded: full 3-button toggle */}
          <div
            className={cn(
              "absolute inset-0 transition-opacity duration-200",
              collapsed ? "pointer-events-none opacity-0" : "opacity-100"
            )}
          >
            <ThemeToggle />
          </div>
          {/* Collapsed: single cycle button */}
          <div
            className={cn(
              "absolute inset-y-0 left-0 flex items-center transition-opacity duration-200",
              collapsed ? "opacity-100" : "pointer-events-none opacity-0"
            )}
          >
            <div
              data-theme-toggle
              className="flex h-[34px] w-[34px] items-center justify-center rounded-lg bg-surface-hover p-[3px] dark:bg-[#111111]"
            >
              <button
                onClick={cycleTheme}
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white text-text-primary transition-colors dark:bg-[#070707]"
                aria-label="Cycle theme"
              >
                <ThemeIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex h-4 items-center gap-1.5 overflow-hidden px-1">
          <Sparkles className="h-3 w-3 shrink-0 text-text-tertiary" />
          <span
            className={cn(
              "text-[11px] text-text-tertiary whitespace-nowrap transition-opacity duration-200",
              collapsed ? "opacity-0" : "opacity-100"
            )}
          >
            Powered by Chamelelog
          </span>
        </div>
      </div>
    </aside>
  );
}
