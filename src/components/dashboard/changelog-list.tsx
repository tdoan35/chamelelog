"use client";

import Link from "next/link";
import { formatDistanceToNow, format } from "date-fns";
import { cn } from "@/lib/utils";

interface ChangelogWithProject {
  id: string;
  title: string;
  status: string;
  version: string | null;
  commitCount: number;
  fromDate: Date;
  toDate: Date;
  createdAt: Date;
  project: {
    repoOwner: string;
    repoName: string;
  };
}

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: {
    label: "Draft",
    className:
      "bg-amber-500/10 text-amber-500 border border-amber-500/20",
  },
  published: {
    label: "Published",
    className:
      "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20",
  },
  pending_review: {
    label: "Pending review",
    className:
      "bg-blue-500/10 text-blue-500 border border-blue-500/20",
  },
};

export function ChangelogList({
  changelogs,
}: {
  changelogs: ChangelogWithProject[];
}) {
  return (
    <div className="mt-6 space-y-3">
      {changelogs.map((changelog) => {
        const status = statusConfig[changelog.status] ?? statusConfig.draft;
        return (
          <Link
            key={changelog.id}
            href={`/changelogs/${changelog.id}`}
            className="block rounded-lg border border-border-primary bg-surface p-4 transition-all hover:border-border-primary/80 hover:shadow-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2.5">
                  <h3 className="truncate font-display text-base font-bold text-text-primary">
                    {changelog.title}
                  </h3>
                  <span
                    className={cn(
                      "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                      status.className
                    )}
                  >
                    {status.label}
                  </span>
                  {changelog.version && (
                    <span className="shrink-0 font-mono text-[11px] text-text-tertiary">
                      {changelog.version}
                    </span>
                  )}
                </div>
                <div className="mt-1.5 flex items-center gap-3 font-mono text-[11px] text-text-tertiary">
                  <span>
                    {changelog.project.repoOwner}/{changelog.project.repoName}
                  </span>
                  <span>
                    {format(new Date(changelog.fromDate), "MMM d")} &ndash;{" "}
                    {format(new Date(changelog.toDate), "MMM d, yyyy")}
                  </span>
                  <span>{changelog.commitCount} commits</span>
                </div>
              </div>
              <span className="shrink-0 font-mono text-[11px] text-text-tertiary">
                {formatDistanceToNow(new Date(changelog.createdAt), {
                  addSuffix: true,
                })}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
