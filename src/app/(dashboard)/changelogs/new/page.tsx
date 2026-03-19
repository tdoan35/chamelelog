"use client";

import { useState, useEffect, useCallback } from "react";
import { format, subDays } from "date-fns";
import {
  GitBranch,
  Loader2,
  Sparkles,
  ChevronDown,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useChangelogStream } from "@/hooks/use-changelog-stream";
import { StreamingOutput } from "@/components/dashboard/streaming-output";
import { ConnectRepoDialog } from "@/components/dashboard/connect-repo-dialog";

interface Project {
  id: string;
  repoOwner: string;
  repoName: string;
}

interface TagInfo {
  name: string;
  sha: string;
  date: string;
}

type DatePreset =
  | "last-release"
  | "7-days"
  | "14-days"
  | "30-days"
  | "custom";
type Tone = "technical" | "product" | "enterprise";

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: "last-release", label: "Since last release" },
  { value: "7-days", label: "Last 7 days" },
  { value: "14-days", label: "Last 14 days" },
  { value: "30-days", label: "Last 30 days" },
  { value: "custom", label: "Custom" },
];

const TONE_OPTIONS: { value: Tone; label: string; desc: string }[] = [
  { value: "technical", label: "Technical", desc: "For developers" },
  { value: "product", label: "Product", desc: "For product teams" },
  { value: "enterprise", label: "Enterprise", desc: "For stakeholders" },
];

export default function GeneratePage() {
  const [phase, setPhase] = useState<"form" | "streaming">("form");

  // Form state
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const [tags, setTags] = useState<TagInfo[]>([]);
  const [loadingTags, setLoadingTags] = useState(false);
  const [datePreset, setDatePreset] = useState<DatePreset>("last-release");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState(
    format(new Date(), "yyyy-MM-dd"),
  );
  const [tone, setTone] = useState<Tone>("technical");
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);

  const stream = useChangelogStream();

  // Fetch projects on mount
  useEffect(() => {
    fetch("/api/projects")
      .then((res) => res.json())
      .then((data) => setProjects(data.data ?? []))
      .catch(() => {})
      .finally(() => setLoadingProjects(false));
  }, []);

  // Fetch tags when project changes
  useEffect(() => {
    if (!selectedProject) {
      setTags([]);
      return;
    }
    setLoadingTags(true);
    fetch(`/api/projects/${selectedProject.id}/tags`)
      .then((res) => res.json())
      .then((data) => setTags(data.data ?? []))
      .catch(() => setTags([]))
      .finally(() => setLoadingTags(false));
  }, [selectedProject]);

  const getDateRange = useCallback((): {
    fromDate: string;
    toDate: string;
  } => {
    const now = new Date();
    const toDate = now.toISOString();

    switch (datePreset) {
      case "last-release":
        if (tags.length > 0) {
          return { fromDate: new Date(tags[0].date).toISOString(), toDate };
        }
        return { fromDate: subDays(now, 30).toISOString(), toDate };
      case "7-days":
        return { fromDate: subDays(now, 7).toISOString(), toDate };
      case "14-days":
        return { fromDate: subDays(now, 14).toISOString(), toDate };
      case "30-days":
        return { fromDate: subDays(now, 30).toISOString(), toDate };
      case "custom":
        return {
          fromDate: customFrom
            ? new Date(customFrom).toISOString()
            : subDays(now, 30).toISOString(),
          toDate: customTo
            ? new Date(customTo).toISOString()
            : toDate,
        };
    }
  }, [datePreset, tags, customFrom, customTo]);

  const handleGenerate = useCallback(() => {
    if (!selectedProject) return;
    const { fromDate, toDate } = getDateRange();
    setPhase("streaming");
    stream.generate({
      projectId: selectedProject.id,
      fromDate,
      toDate,
      tone,
    });
  }, [selectedProject, getDateRange, stream, tone]);

  const handleGenerateAgain = useCallback(() => {
    stream.reset();
    setPhase("form");
  }, [stream]);

  // Listen for keyboard shortcut
  useEffect(() => {
    const handler = () => {
      if (phase === "form" && selectedProject && !stream.isStreaming) {
        handleGenerate();
      }
    };
    window.addEventListener("changelog:submit", handler);
    return () => window.removeEventListener("changelog:submit", handler);
  }, [phase, selectedProject, stream.isStreaming, handleGenerate]);

  if (phase === "streaming") {
    return (
      <div className="mx-auto max-w-2xl">
        <StreamingOutput
          status={stream.status}
          entries={stream.entries}
          isStreaming={stream.isStreaming}
          changelogId={stream.changelogId}
          error={stream.error}
          completionData={stream.completionData}
          onGenerateAgain={handleGenerateAgain}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-2xl font-bold text-text-primary">
        Generate changelog
      </h1>
      <p className="mt-2 text-sm text-text-secondary">
        Select a repository and date range to generate a changelog from your
        commits.
      </p>

      <div className="mt-10 flex flex-col gap-8">
        {/* Repository selector */}
        <div className="flex flex-col gap-2.5">
          <label className="text-[13px] font-medium text-text-secondary">
            Repository
          </label>
          <div className="relative">
            <button
              onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
              className={cn(
                "flex w-full items-center justify-between rounded-lg border border-border-primary px-3 py-2.5 text-sm transition-colors",
                "bg-surface hover:bg-surface-hover",
                selectedProject
                  ? "text-text-primary"
                  : "text-text-tertiary",
              )}
            >
              <span className="flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-text-tertiary" />
                {loadingProjects ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Loading...
                  </span>
                ) : selectedProject ? (
                  <span className="font-mono text-[13px]">
                    {selectedProject.repoOwner}/{selectedProject.repoName}
                  </span>
                ) : (
                  "Select a repository"
                )}
              </span>
              <ChevronDown className="h-4 w-4 text-text-tertiary" />
            </button>

            {projectDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setProjectDropdownOpen(false)}
                />
                <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-border-primary bg-surface shadow-lg">
                  {projects.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedProject(p);
                        setProjectDropdownOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-surface-hover",
                        selectedProject?.id === p.id
                          ? "text-accent"
                          : "text-text-secondary hover:text-text-primary",
                      )}
                    >
                      <GitBranch className="h-4 w-4 shrink-0" />
                      <span className="font-mono text-[13px]">
                        {p.repoOwner}/{p.repoName}
                      </span>
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      setProjectDropdownOpen(false);
                      setConnectDialogOpen(true);
                    }}
                    className="flex w-full items-center gap-2 border-t border-border-primary px-3 py-2.5 text-left text-sm text-accent transition-colors hover:bg-surface-hover"
                  >
                    <Plus className="h-4 w-4" />
                    Connect new repo
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Date range */}
        <div className="flex flex-col gap-2.5">
          <label className="text-[13px] font-medium text-text-secondary">
            Date range
          </label>
          <div className="flex flex-wrap gap-2">
            {DATE_PRESETS.map((preset) => (
              <button
                key={preset.value}
                onClick={() => setDatePreset(preset.value)}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors",
                  datePreset === preset.value
                    ? "bg-accent/15 text-accent"
                    : "border border-border-primary text-text-secondary hover:bg-surface-hover hover:text-text-primary",
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Tag info for "Since last release" */}
          {datePreset === "last-release" && selectedProject && (
            <div className="mt-1 text-[13px] text-text-tertiary">
              {loadingTags ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Detecting latest release...
                </span>
              ) : tags.length > 0 ? (
                <span>
                  Since{" "}
                  <span className="font-mono text-text-secondary">
                    {tags[0].name}
                  </span>{" "}
                  ({format(new Date(tags[0].date), "MMMM d, yyyy")})
                </span>
              ) : (
                <span>No tags found — using last 30 days</span>
              )}
            </div>
          )}

          {/* Custom date inputs */}
          {datePreset === "custom" && (
            <div className="mt-1 flex items-center gap-3">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="rounded-lg border border-border-primary bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <span className="text-sm text-text-tertiary">to</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="rounded-lg border border-border-primary bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          )}
        </div>

        {/* Tone selector */}
        <div className="flex flex-col gap-2.5">
          <label className="text-[13px] font-medium text-text-secondary">
            Tone
          </label>
          <div className="grid grid-cols-3 gap-3">
            {TONE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTone(opt.value)}
                className={cn(
                  "flex flex-col items-start gap-1 rounded-lg border px-4 py-3 text-left transition-colors",
                  tone === opt.value
                    ? "border-accent/40 bg-accent/5"
                    : "border-border-primary bg-surface hover:bg-surface-hover",
                )}
              >
                <span
                  className={cn(
                    "text-sm font-medium",
                    tone === opt.value
                      ? "text-accent"
                      : "text-text-primary",
                  )}
                >
                  {opt.label}
                </span>
                <span className="text-[12px] text-text-tertiary">
                  {opt.desc}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={!selectedProject || stream.isStreaming}
          className="flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          style={{
            background: "linear-gradient(135deg, #10B981, #3B82F6)",
            boxShadow:
              !selectedProject || stream.isStreaming
                ? "none"
                : "0 0 20px 4px #10B98125",
          }}
        >
          {stream.isStreaming ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Generate changelog
            </>
          )}
        </button>
      </div>

      <ConnectRepoDialog
        open={connectDialogOpen}
        onClose={() => setConnectDialogOpen(false)}
        onSuccess={() => {
          setConnectDialogOpen(false);
          // Refresh projects
          fetch("/api/projects")
            .then((res) => res.json())
            .then((data) => setProjects(data.data ?? []));
        }}
      />
    </div>
  );
}
