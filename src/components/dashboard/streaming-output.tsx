"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { Pencil, RotateCcw, AlertCircle } from "lucide-react";
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

  return (
    <div className="flex flex-col gap-6">
      {/* Status bar */}
      <div className="flex items-center gap-2.5">
        {isStreaming && (
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
        )}
        {isComplete && !error && (
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
            : isComplete && completionData
              ? `Generated ${entries.length} entries from ${completionData.commitCount} commits`
              : status || "Starting..."}
        </span>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/5 p-4">
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

      {/* Entry groups */}
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
                  {group.entries.map((entry, i) => (
                    <motion.div
                      key={`${group.category}-${i}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden rounded-lg border border-border-primary"
                      style={{ backgroundColor: colors?.bg }}
                    >
                      <div className="flex">
                        <div
                          className="w-[3px] shrink-0"
                          style={{ backgroundColor: colors?.color }}
                        />
                        <div className="flex flex-col gap-1 px-4 py-3">
                          <p className="text-[14px] font-medium text-text-primary">
                            {entry.title}
                          </p>
                          {entry.description && (
                            <p className="text-[13px] leading-relaxed text-text-secondary">
                              {entry.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Action buttons */}
      {isComplete && !error && changelogId && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.1 }}
          className="flex items-center gap-3 pt-2"
        >
          <Link
            href={`/changelogs/${changelogId}`}
            className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
            style={{
              background: "linear-gradient(135deg, #10B981, #3B82F6)",
              boxShadow: "0 0 16px 2px #10B98125",
            }}
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit & Review
          </Link>
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
