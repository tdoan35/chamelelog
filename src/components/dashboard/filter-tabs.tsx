"use client";

import { useState } from "react";
import Link from "next/link";
import { GitBranch, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { value: "all", label: "All" },
  { value: "drafts", label: "Drafts" },
  { value: "published", label: "Published" },
];

interface Project {
  id: string;
  repoOwner: string;
  repoName: string;
}

interface FilterTabsProps {
  active: string;
  projects: Project[];
  activeProject: string;
}

function buildHref(filter: string, project?: string) {
  const params = new URLSearchParams();
  if (filter !== "all") params.set("filter", filter);
  if (project && project !== "all") params.set("project", project);
  const qs = params.toString();
  return qs ? `/changelogs?${qs}` : "/changelogs";
}

export function FilterTabs({ active, projects, activeProject }: FilterTabsProps) {
  const [open, setOpen] = useState(false);
  const selected = projects.find((p) => p.id === activeProject);

  return (
    <div className="mt-6 flex items-center justify-between">
      <div className="flex gap-0.5">
        {tabs.map((tab) => {
          const isActive = tab.value === active;
          return (
            <Link
              key={tab.value}
              href={buildHref(tab.value, activeProject)}
              className={cn(
                "rounded-md px-3 py-1.5 text-[13px] transition-colors",
                isActive
                  ? "bg-surface font-medium text-text-primary dark:bg-[#141414]"
                  : "font-normal text-text-secondary hover:text-text-primary"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {projects.length > 1 && (
        <div className="relative">
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-2 rounded-md border border-border-primary px-3 py-2 text-[13px] transition-colors hover:bg-surface-hover"
          >
            <GitBranch className="h-3.5 w-3.5 text-text-tertiary" />
            <span className="text-text-secondary">
              {selected
                ? `${selected.repoOwner}/${selected.repoName}`
                : "All projects"}
            </span>
            <ChevronDown className="h-3 w-3 text-text-tertiary" />
          </button>

          {open && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setOpen(false)}
              />
              <div className="absolute right-0 top-full z-20 mt-1 min-w-[200px] overflow-hidden rounded-lg border border-border-primary bg-surface shadow-lg">
                <Link
                  href={buildHref(active)}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2.5 text-[13px] transition-colors hover:bg-surface-hover",
                    activeProject === "all"
                      ? "text-accent"
                      : "text-text-secondary hover:text-text-primary"
                  )}
                >
                  All projects
                </Link>
                {projects.map((p) => (
                  <Link
                    key={p.id}
                    href={buildHref(active, p.id)}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2.5 font-mono text-[13px] transition-colors hover:bg-surface-hover",
                      activeProject === p.id
                        ? "text-accent"
                        : "text-text-secondary hover:text-text-primary"
                    )}
                  >
                    {p.repoOwner}/{p.repoName}
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
