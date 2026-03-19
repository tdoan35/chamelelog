"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { format } from "date-fns";
import {
  Check,
  Loader2,
  Download,
  Send,
  Trash2,
  Plus,
  ArrowRight,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CATEGORY_COLORS, CATEGORY_ORDER } from "@/lib/category-colors";
import { contentToMarkdown, contentToJson } from "@/lib/markdown";
import type { ChangelogEntry, ChangelogCategory } from "@/lib/types";

interface ChangelogData {
  id: string;
  title: string;
  content: string;
  rawContent: string;
  status: string;
  version: string | null;
  commitCount: number;
  fromDate: string;
  toDate: string;
  publishedAt: string | null;
  project: {
    repoOwner: string;
    repoName: string;
  };
}

interface ChangelogEditorProps {
  changelog: ChangelogData;
}

function parseContent(content: string): ChangelogCategory[] {
  try {
    const parsed = JSON.parse(content);
    return parsed.categories ?? [];
  } catch {
    return [];
  }
}

export function ChangelogEditor({ changelog }: ChangelogEditorProps) {
  const [title, setTitle] = useState(changelog.title);
  const [version, setVersion] = useState(changelog.version ?? "");
  const [categories, setCategories] = useState<ChangelogCategory[]>(() =>
    parseContent(changelog.content),
  );
  const [status, setStatus] = useState(changelog.status);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "idle">(
    "idle",
  );
  const [publishing, setPublishing] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newEntryTitle, setNewEntryTitle] = useState("");
  const [newEntryDesc, setNewEntryDesc] = useState("");
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    new Set(),
  );
  const [openMoveMenu, setOpenMoveMenu] = useState<string | null>(null);

  const toggleSection = (category: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  // Get all categories, including empty ones in order
  const orderedCategories = useMemo(() => {
    const catMap = new Map(categories.map((c) => [c.category, c]));
    return CATEGORY_ORDER.map(
      (cat) =>
        catMap.get(cat) ?? {
          category: cat as ChangelogCategory["category"],
          entries: [],
        },
    ).filter(
      (cat) =>
        cat.entries.length > 0 ||
        categories.some((c) => c.category === cat.category),
    );
  }, [categories]);

  // Autosave
  const save = useCallback(
    async (cats: ChangelogCategory[], t: string, v: string) => {
      setSaveState("saving");
      const contentJson = JSON.stringify(contentToJson(cats));
      const rawContent = contentToMarkdown(cats);

      try {
        await fetch(`/api/changelogs/${changelog.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: t,
            content: contentJson,
            rawContent,
            version: v || undefined,
          }),
        });
        setSaveState("saved");
      } catch {
        setSaveState("idle");
      }
    },
    [changelog.id],
  );

  const scheduleSave = useCallback(
    (cats: ChangelogCategory[], t: string, v: string) => {
      setSaveState("idle");
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => save(cats, t, v), 3000);
    },
    [save],
  );

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  // Close move menu on outside click
  useEffect(() => {
    if (!openMoveMenu) return;
    const handler = () => setOpenMoveMenu(null);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, [openMoveMenu]);

  const updateEntry = (
    catIdx: number,
    entryIdx: number,
    field: "title" | "description",
    value: string,
  ) => {
    setCategories((prev) => {
      const next = prev.map((c, ci) =>
        ci === catIdx
          ? {
              ...c,
              entries: c.entries.map((e, ei) =>
                ei === entryIdx ? { ...e, [field]: value } : e,
              ),
            }
          : c,
      );
      scheduleSave(next, title, version);
      return next;
    });
  };

  const deleteEntry = (catIdx: number, entryIdx: number) => {
    setCategories((prev) => {
      const next = prev.map((c, ci) =>
        ci === catIdx
          ? { ...c, entries: c.entries.filter((_, ei) => ei !== entryIdx) }
          : c,
      );
      scheduleSave(next, title, version);
      return next;
    });
  };

  const moveEntry = (
    fromCatIdx: number,
    entryIdx: number,
    toCategoryName: string,
  ) => {
    setOpenMoveMenu(null);
    setCategories((prev) => {
      const entry = prev[fromCatIdx].entries[entryIdx];
      const movedEntry: ChangelogEntry = {
        ...entry,
        category: toCategoryName as ChangelogEntry["category"],
      };

      let next = prev.map((c, ci) =>
        ci === fromCatIdx
          ? { ...c, entries: c.entries.filter((_, ei) => ei !== entryIdx) }
          : c,
      );

      const targetIdx = next.findIndex((c) => c.category === toCategoryName);
      if (targetIdx >= 0) {
        next = next.map((c, ci) =>
          ci === targetIdx
            ? { ...c, entries: [...c.entries, movedEntry] }
            : c,
        );
      } else {
        next = [
          ...next,
          {
            category: toCategoryName as ChangelogCategory["category"],
            entries: [movedEntry],
          },
        ];
      }

      scheduleSave(next, title, version);
      return next;
    });
  };

  const addEntry = (categoryName: string) => {
    if (!newEntryTitle.trim()) return;
    const entry: ChangelogEntry = {
      category: categoryName as ChangelogEntry["category"],
      title: newEntryTitle.trim(),
      description: newEntryDesc.trim() || undefined,
      commitShas: [],
    };

    setCategories((prev) => {
      const idx = prev.findIndex((c) => c.category === categoryName);
      let next;
      if (idx >= 0) {
        next = prev.map((c, ci) =>
          ci === idx ? { ...c, entries: [...c.entries, entry] } : c,
        );
      } else {
        next = [
          ...prev,
          {
            category: categoryName as ChangelogCategory["category"],
            entries: [entry],
          },
        ];
      }
      scheduleSave(next, title, version);
      return next;
    });

    setNewEntryTitle("");
    setNewEntryDesc("");
    setAddingTo(null);
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    scheduleSave(categories, val, version);
  };

  const handleVersionChange = (val: string) => {
    setVersion(val);
    scheduleSave(categories, title, val);
  };

  const handlePublish = async () => {
    // Save pending changes first
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      await save(categories, title, version);
    }

    setPublishing(true);
    try {
      const res = await fetch(`/api/changelogs/${changelog.id}/publish`, {
        method: "POST",
      });
      if (res.ok) {
        setStatus("published");
        toast.success("Changelog published", {
          description: version
            ? `Release ${version} is now live on your public page.`
            : "Your changelog is now live.",
        });
      } else {
        toast.error("Failed to publish");
      }
    } catch {
      toast.error("Failed to publish");
    } finally {
      setPublishing(false);
    }
  };

  const handleExport = () => {
    const markdown = contentToMarkdown(categories);
    const fullMarkdown = `# ${title}\n\n${markdown}`;
    const blob = new Blob([fullMarkdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Listen for publish shortcut
  useEffect(() => {
    const handler = () => {
      if (status !== "published" && !publishing) {
        handlePublish();
      }
    };
    window.addEventListener("changelog:publish", handler);
    return () => window.removeEventListener("changelog:publish", handler);
  });

  const statusConfig: Record<string, { label: string; className: string }> = {
    draft: {
      label: "Draft",
      className: "bg-amber-500/10 text-amber-500 border border-amber-500/20",
    },
    published: {
      label: "Published",
      className:
        "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20",
    },
    pending_review: {
      label: "Pending review",
      className: "bg-blue-500/10 text-blue-500 border border-blue-500/20",
    },
  };

  const statusBadge = statusConfig[status] ?? statusConfig.draft;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background pt-8 pb-6 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex items-center gap-3">
              <input
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="min-w-0 flex-1 border-none bg-transparent font-display text-[22px] font-bold text-text-primary outline-none placeholder:text-text-tertiary"
                placeholder="Changelog title"
              />
              {/* Save indicator — left of status badge */}
              <span className="flex shrink-0 items-center gap-1 text-[12px] text-text-tertiary">
                {saveState === "saving" && (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Saving...
                  </>
                )}
                {saveState === "saved" && (
                  <>
                    <Check className="h-3 w-3 text-emerald-500" />
                    <span className="text-emerald-500">Saved</span>
                  </>
                )}
              </span>
              <span
                className={cn(
                  "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                  statusBadge.className,
                )}
              >
                {statusBadge.label}
              </span>
            </div>
            <div className="flex items-center gap-2 font-mono text-[11px] text-text-tertiary">
              <span>{changelog.commitCount} commits</span>
              <span>&middot;</span>
              <span>
                {format(new Date(changelog.fromDate), "MMM d")} &ndash;{" "}
                {format(new Date(changelog.toDate), "MMM d, yyyy")}
              </span>
              <span>&middot;</span>
              <span>
                {changelog.project.repoOwner}/{changelog.project.repoName}
              </span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {/* Version input */}
            <input
              value={version}
              onChange={(e) => handleVersionChange(e.target.value)}
              placeholder="v0.0.0"
              className="w-20 rounded-md border border-border-primary bg-surface px-2 py-1.5 font-mono text-[11px] text-text-secondary outline-none placeholder:text-text-tertiary focus:border-accent"
            />

            <button
              onClick={handleExport}
              className="inline-flex items-center gap-1.5 rounded-md border border-border-primary px-3 py-1.5 text-[13px] font-medium text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </button>

            {status !== "published" && (
              <button
                onClick={handlePublish}
                disabled={publishing}
                className="inline-flex items-center gap-1.5 rounded-md px-4 py-1.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, #10B981, #3B82F6)",
                  boxShadow: "0 0 12px 2px #10B98125",
                }}
              >
                {publishing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                Publish
              </button>
            )}
          </div>
        </div>

        <div className="h-px bg-border-muted" />
      </div>

      {/* Category sections */}
      <div className="flex flex-col gap-8">
        {orderedCategories.map((cat) => {
          const colors = CATEGORY_COLORS[cat.category];
          const actualCatIdx = categories.findIndex(
            (c) => c.category === cat.category,
          );
          const isCollapsed = collapsedSections.has(cat.category);

          return (
            <div key={cat.category} className="flex flex-col gap-3">
              {/* Category header */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => toggleSection(cat.category)}
                  className="flex items-center gap-2.5 transition-colors hover:opacity-80"
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-4 w-4 text-text-tertiary" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-text-tertiary" />
                  )}
                  <div
                    className="h-4 w-[3px] rounded-full"
                    style={{ backgroundColor: colors?.color }}
                  />
                  <span className="text-[15px] font-medium text-text-primary">
                    {colors?.label ?? cat.category}
                  </span>
                  {cat.entries.length > 0 && (
                    <span
                      className="inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-medium"
                      style={{
                        backgroundColor: colors?.bg,
                        color: colors?.color,
                      }}
                    >
                      {cat.entries.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() =>
                    setAddingTo(
                      addingTo === cat.category ? null : cat.category,
                    )
                  }
                  className="text-[13px] font-medium text-accent transition-colors hover:text-accent-hover"
                >
                  + Add entry
                </button>
              </div>

              {/* Entry cards — collapsible with animation */}
              <div
                className="grid transition-[grid-template-rows,opacity] duration-200"
                style={{
                  gridTemplateRows: isCollapsed ? "0fr" : "1fr",
                  opacity: isCollapsed ? 0 : 1,
                }}
              >
                <div className="overflow-hidden">
                  <div className="flex flex-col gap-3">
                    {cat.entries.map((entry, entryIdx) => {
                      const moveKey = `${cat.category}-${entryIdx}`;
                      return (
                        <div
                          key={entryIdx}
                          className="group relative overflow-visible rounded-lg border border-border-primary"
                          style={{ backgroundColor: colors?.bg }}
                        >
                          <div className="flex">
                            <div
                              className="w-[3px] shrink-0 rounded-l-lg"
                              style={{ backgroundColor: colors?.color }}
                            />
                            <div className="flex flex-1 flex-col gap-1 px-4 py-3">
                              <div className="flex items-start justify-between gap-2">
                                <input
                                  value={entry.title}
                                  onChange={(e) =>
                                    actualCatIdx >= 0 &&
                                    updateEntry(
                                      actualCatIdx,
                                      entryIdx,
                                      "title",
                                      e.target.value,
                                    )
                                  }
                                  className="min-w-0 flex-1 border-none bg-transparent text-[14px] font-medium text-text-primary outline-none placeholder:text-text-tertiary"
                                />
                                <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                  {/* Move dropdown */}
                                  <div className="relative">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenMoveMenu(
                                          openMoveMenu === moveKey
                                            ? null
                                            : moveKey,
                                        );
                                      }}
                                      className="inline-flex h-6 w-6 items-center justify-center rounded text-text-tertiary transition-colors hover:bg-surface-hover hover:text-text-secondary"
                                      title="Move to..."
                                    >
                                      <ArrowRight className="h-3.5 w-3.5" />
                                    </button>
                                    {openMoveMenu === moveKey && (
                                      <div
                                        className="absolute bottom-full right-0 z-50 mb-1 w-40 overflow-hidden rounded-lg border border-border-primary bg-surface shadow-lg"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        {CATEGORY_ORDER.filter(
                                          (c) => c !== cat.category,
                                        ).map((targetCat) => (
                                          <button
                                            key={targetCat}
                                            onClick={() => {
                                              if (actualCatIdx >= 0)
                                                moveEntry(
                                                  actualCatIdx,
                                                  entryIdx,
                                                  targetCat,
                                                );
                                            }}
                                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
                                          >
                                            <div
                                              className="h-2.5 w-2.5 rounded-full"
                                              style={{
                                                backgroundColor:
                                                  CATEGORY_COLORS[targetCat]?.color,
                                              }}
                                            />
                                            {CATEGORY_COLORS[targetCat]?.label}
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>

                                  <button
                                    onClick={() =>
                                      actualCatIdx >= 0 &&
                                      deleteEntry(actualCatIdx, entryIdx)
                                    }
                                    className="inline-flex h-6 w-6 items-center justify-center rounded text-text-tertiary transition-colors hover:bg-red-500/10 hover:text-red-500"
                                    title="Delete"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                              <input
                                value={entry.description ?? ""}
                                onChange={(e) =>
                                  actualCatIdx >= 0 &&
                                  updateEntry(
                                    actualCatIdx,
                                    entryIdx,
                                    "description",
                                    e.target.value,
                                  )
                                }
                                placeholder="Add a description..."
                                className="min-w-0 border-none bg-transparent text-[13px] leading-relaxed text-text-secondary outline-none placeholder:text-text-tertiary"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Inline add form */}
                    {addingTo === cat.category && (
                      <div className="overflow-hidden rounded-lg border border-dashed border-border-primary p-4">
                  <div className="flex flex-col gap-2">
                    <input
                      value={newEntryTitle}
                      onChange={(e) => setNewEntryTitle(e.target.value)}
                      placeholder="Entry title"
                      className="border-none bg-transparent text-[14px] font-medium text-text-primary outline-none placeholder:text-text-tertiary"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") addEntry(cat.category);
                        if (e.key === "Escape") setAddingTo(null);
                      }}
                    />
                    <input
                      value={newEntryDesc}
                      onChange={(e) => setNewEntryDesc(e.target.value)}
                      placeholder="Description (optional)"
                      className="border-none bg-transparent text-[13px] text-text-secondary outline-none placeholder:text-text-tertiary"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") addEntry(cat.category);
                        if (e.key === "Escape") setAddingTo(null);
                      }}
                    />
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        onClick={() => {
                          setAddingTo(null);
                          setNewEntryTitle("");
                          setNewEntryDesc("");
                        }}
                        className="rounded-md px-3 py-1.5 text-[13px] text-text-secondary transition-colors hover:text-text-primary"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => addEntry(cat.category)}
                        disabled={!newEntryTitle.trim()}
                        className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-[13px] font-medium text-accent-text transition-colors hover:bg-accent-hover disabled:opacity-50"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
