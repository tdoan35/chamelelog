"use client";

import { useState, useEffect, useMemo } from "react";
import { X, Search, GitBranch, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Repo {
  owner: string;
  name: string;
  fullName: string;
  private: boolean;
}

interface ConnectRepoDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ConnectRepoDialog({
  open,
  onClose,
  onSuccess,
}: ConnectRepoDialogProps) {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Repo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setSearch("");
    setSelected(null);
    setError(null);

    fetch("/api/github/repos")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setRepos(data.data ?? []);
        }
      })
      .catch(() => setError("Failed to load repositories"))
      .finally(() => setLoading(false));
  }, [open]);

  const filtered = useMemo(() => {
    if (!search.trim()) return repos;
    const q = search.toLowerCase();
    return repos.filter((r) => r.fullName.toLowerCase().includes(q));
  }, [repos, search]);

  async function handleConnect() {
    if (!selected) return;
    setConnecting(true);
    setError(null);

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoOwner: selected.owner,
          repoName: selected.name,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to connect repository");
        return;
      }

      onSuccess();
      onClose();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setConnecting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/[0.38]" onClick={onClose} />
      <div
        className="relative z-50 flex flex-col overflow-hidden rounded-xl border border-border-primary shadow-2xl"
        style={{
          width: 480,
          backgroundColor: "#141414",
          boxShadow: "0 8px 32px #00000040",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-primary px-5 py-4">
          <h2 className="font-display text-base font-semibold text-text-primary">
            Connect repository
          </h2>
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center text-text-tertiary transition-colors hover:text-text-secondary"
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-5 p-5">
          {/* Search section */}
          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-medium text-text-secondary">
              Search your repositories
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search repositories..."
                className="w-full rounded-lg border border-border-primary bg-[#0A0A0A] py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                autoFocus
              />
            </div>
          </div>

          {/* Repo list */}
          <div className="flex max-h-56 flex-col gap-0.5 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-text-tertiary" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-8 text-center text-sm text-text-tertiary">
                {search
                  ? "No repositories match your search"
                  : "No repositories found"}
              </div>
            ) : (
              filtered.map((repo) => {
                const isSelected = selected?.fullName === repo.fullName;
                return (
                  <button
                    key={repo.fullName}
                    onClick={() => setSelected(isSelected ? null : repo)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors",
                      isSelected
                        ? "bg-accent/10 text-accent"
                        : "text-text-secondary hover:bg-[#1A1A1A] hover:text-text-primary"
                    )}
                  >
                    <GitBranch className="h-4 w-4 shrink-0" />
                    <span className="flex-1 truncate font-mono text-[13px]">
                      {repo.fullName}
                    </span>
                    {isSelected && (
                      <Check className="h-4 w-4 shrink-0 text-accent" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="px-5 pb-2">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-border-primary px-5 py-4">
          <button
            onClick={onClose}
            className="rounded-md border border-border-primary px-4 py-2 text-[13px] font-medium text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
          >
            Cancel
          </button>
          <button
            onClick={handleConnect}
            disabled={!selected || connecting}
            className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-[13px] font-medium text-accent-text transition-colors hover:bg-accent-hover disabled:opacity-50 disabled:shadow-none"
            style={{ boxShadow: "0 0 12px 2px #10B98130" }}
          >
            {connecting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Connect
          </button>
        </div>
      </div>
    </div>
  );
}
