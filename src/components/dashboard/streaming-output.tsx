"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  Pencil,
  RotateCcw,
  AlertCircle,
  Check,
  X,
  SquarePen,
  Loader2,
} from "lucide-react";
import { CATEGORY_COLORS, CATEGORY_ORDER } from "@/lib/category-colors";
import type { StreamEntry, CompletionData } from "@/hooks/use-changelog-stream";

interface StreamingOutputProps {
  status: string;
  entries: StreamEntry[];
  isStreaming: boolean;
  changelogId: string | null;
  error: string | null;
  completionData: CompletionData | null;
  onGenerateAgain: () => void;
}

export function StreamingOutput({
  status,
  entries,
  isStreaming,
  changelogId,
  error,
  completionData,
  onGenerateAgain,
}: StreamingOutputProps) {
  const router = useRouter();
  const [navigating, setNavigating] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [localEdits, setLocalEdits] = useState<
    Map<string, { title: string; description?: string }>
  >(new Map());

  const grouped = useMemo(() => {
    const map = new Map<string, StreamEntry[]>();
    for (const entry of entries) {
      if (!map.has(entry.category)) {
        map.set(entry.category, []);
      }
      map.get(entry.category)!.push(entry);
    }
    return CATEGORY_ORDER.filter((cat) => map.has(cat)).map((cat) => ({
      category: cat,
      entries: map.get(cat)!,
    }));
  }, [entries]);

  const isComplete = !isStreaming && (completionData !== null || error !== null);
  const isEmpty =
    isComplete && !error && entries.length === 0;

  const startEdit = (key: string, entry: StreamEntry) => {
    const edited = localEdits.get(key);
    setEditingKey(key);
    setEditTitle(edited?.title ?? entry.title);
    setEditDesc(edited?.description ?? entry.description ?? "");
  };

  const saveEdit = () => {
    if (editingKey) {
      setLocalEdits((prev) => {
        const next = new Map(prev);
        next.set(editingKey, {
          title: editTitle,
          description: editDesc || undefined,
        });
        return next;
      });
    }
    setEditingKey(null);
  };

  const getEntry = (key: string, original: StreamEntry) => {
    const edited = localEdits.get(key);
    return edited
      ? { ...original, title: edited.title, description: edited.description }
      : original;
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4">
      {/* Status bar — fixed at top */}
      <div className="flex shrink-0 items-center gap-2.5">
        {isStreaming && (
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
        )}
        {isComplete && !error && !isEmpty && (
          <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
        )}
        {error && (
          <span className="inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
        )}
        <span
          className={
            isStreaming
              ? "font-mono text-[13px] text-text-secondary"
              : "font-display text-[14px] font-semibold text-text-primary"
          }
        >
          {error
            ? "Generation failed"
            : isEmpty
              ? "No meaningful commits found"
              : isComplete && completionData
                ? `Generated ${entries.length} entries from ${completionData.commitCount} commits`
                : status || "Starting..."}
        </span>
      </div>

      {/* Empty state */}
      {isEmpty && (
        <div className="flex flex-col items-center justify-center gap-4 py-16">
          <p className="text-center text-sm text-text-secondary">
            No meaningful commits were found within this date range.
            <br />
            Try adjusting your date range or selecting a different repository.
          </p>
          <button
            onClick={onGenerateAgain}
            className="inline-flex items-center gap-2 rounded-lg border border-border-primary px-5 py-2.5 text-[13px] font-medium text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Go back
          </button>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="flex shrink-0 items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/5 p-4">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <div className="flex flex-col gap-2">
            <p className="text-sm text-red-400">{error}</p>
            <button
              onClick={onGenerateAgain}
              className="inline-flex w-fit items-center gap-1.5 text-[13px] font-medium text-red-400 transition-colors hover:text-red-300"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Scrollable entry groups */}
      {entries.length > 0 && (
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="flex flex-col gap-6">
            <AnimatePresence mode="popLayout">
              {grouped.map((group) => {
                const colors = CATEGORY_COLORS[group.category];
                return (
                  <motion.div
                    key={group.category}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col gap-3"
                  >
                    {/* Category header */}
                    <div className="flex items-center gap-2.5">
                      <div
                        className="h-4 w-[3px] rounded-full"
                        style={{ backgroundColor: colors?.color }}
                      />
                      <span className="text-[14px] font-semibold text-text-primary">
                        {colors?.label ?? group.category}
                      </span>
                    </div>

                    {/* Entry cards */}
                    <div className="flex flex-col gap-2">
                      <AnimatePresence mode="popLayout">
                        {group.entries.map((originalEntry, i) => {
                          const key = `${group.category}-${i}`;
                          const entry = getEntry(key, originalEntry);
                          const isEditing = editingKey === key;

                          return (
                            <motion.div
                              key={key}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.2 }}
                              className="group overflow-hidden rounded-lg border border-border-primary"
                              style={{ backgroundColor: colors?.bg }}
                            >
                              <div className="flex">
                                <div
                                  className="w-[3px] shrink-0"
                                  style={{ backgroundColor: colors?.color }}
                                />
                                {isEditing ? (
                                  <div className="flex flex-1 flex-col gap-2 px-4 py-3">
                                    <input
                                      value={editTitle}
                                      onChange={(e) =>
                                        setEditTitle(e.target.value)
                                      }
                                      className="border-none bg-transparent text-[14px] font-medium text-text-primary outline-none placeholder:text-text-tertiary"
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") saveEdit();
                                        if (e.key === "Escape")
                                          setEditingKey(null);
                                      }}
                                    />
                                    <input
                                      value={editDesc}
                                      onChange={(e) =>
                                        setEditDesc(e.target.value)
                                      }
                                      placeholder="Description (optional)"
                                      className="border-none bg-transparent text-[13px] leading-relaxed text-text-secondary outline-none placeholder:text-text-tertiary"
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") saveEdit();
                                        if (e.key === "Escape")
                                          setEditingKey(null);
                                      }}
                                    />
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        onClick={saveEdit}
                                        className="inline-flex h-6 w-6 items-center justify-center rounded text-emerald-500 transition-colors hover:bg-emerald-500/10"
                                        title="Save"
                                      >
                                        <Check className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        onClick={() => setEditingKey(null)}
                                        className="inline-flex h-6 w-6 items-center justify-center rounded text-text-tertiary transition-colors hover:bg-surface-hover hover:text-text-secondary"
                                        title="Cancel"
                                      >
                                        <X className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex flex-1 items-start justify-between gap-2 px-4 py-3">
                                    <div className="flex flex-col gap-1">
                                      <p className="text-[14px] font-medium text-text-primary">
                                        {entry.title}
                                      </p>
                                      {entry.description && (
                                        <p className="text-[13px] leading-relaxed text-text-secondary">
                                          {entry.description}
                                        </p>
                                      )}
                                    </div>
                                    {!isStreaming && (
                                      <button
                                        onClick={() =>
                                          startEdit(key, entry)
                                        }
                                        className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-text-tertiary opacity-0 transition-all hover:bg-surface-hover hover:text-text-secondary group-hover:opacity-100"
                                        title="Edit"
                                      >
                                        <SquarePen className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Action buttons — fixed at bottom */}
      {isComplete && !error && changelogId && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.1 }}
          className="flex shrink-0 items-center gap-3 border-t border-border-muted pt-4"
        >
          <button
            onClick={() => {
              setNavigating(true);
              router.push(`/changelogs/${changelogId}`);
            }}
            disabled={navigating}
            className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-70"
            style={{
              background: "linear-gradient(135deg, #10B981, #3B82F6)",
              boxShadow: navigating ? "none" : "0 0 16px 2px #10B98125",
            }}
          >
            {navigating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Pencil className="h-3.5 w-3.5" />
            )}
            {navigating ? "Loading..." : "Edit & Review"}
          </button>
          <button
            onClick={onGenerateAgain}
            className="inline-flex items-center gap-2 rounded-lg border border-border-primary px-5 py-2.5 text-[13px] font-medium text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Generate again
          </button>
        </motion.div>
      )}
    </div>
  );
}
