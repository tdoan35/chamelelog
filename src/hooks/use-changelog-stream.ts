"use client";

import { useCallback, useState } from "react";

export interface StreamEntry {
  category: string;
  title: string;
  description?: string;
  commitShas?: string[];
}

export interface CompletionData {
  changelogId: string | null;
  commitCount: number;
  filteredCount: number;
}

export function useChangelogStream() {
  const [status, setStatus] = useState<string>("");
  const [entries, setEntries] = useState<StreamEntry[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [changelogId, setChangelogId] = useState<string | null>(null);
  const [completionData, setCompletionData] =
    useState<CompletionData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (body: object) => {
    setIsStreaming(true);
    setEntries([]);
    setError(null);
    setChangelogId(null);
    setCompletionData(null);
    setStatus("");

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(data?.error ?? `Request failed (${response.status})`);
        setIsStreaming(false);
        return;
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        let eventType = "";
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            eventType = line.slice(7);
          } else if (line.startsWith("data: ") && eventType) {
            const data = JSON.parse(line.slice(6));
            if (eventType === "status") setStatus(data.message);
            if (eventType === "entry")
              setEntries((prev) => [...prev, data]);
            if (eventType === "complete") {
              setChangelogId(data.changelogId);
              setCompletionData({
                changelogId: data.changelogId,
                commitCount: data.commitCount,
                filteredCount: data.filteredCount,
              });
            }
            if (eventType === "error") setError(data.message);
            eventType = "";
          }
        }
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred",
      );
    } finally {
      setIsStreaming(false);
    }
  }, []);

  const reset = useCallback(() => {
    setStatus("");
    setEntries([]);
    setIsStreaming(false);
    setChangelogId(null);
    setCompletionData(null);
    setError(null);
  }, []);

  return {
    generate,
    reset,
    status,
    entries,
    isStreaming,
    changelogId,
    completionData,
    error,
  };
}
