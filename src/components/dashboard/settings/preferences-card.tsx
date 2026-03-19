"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PreferencesCardProps {
  preferences: {
    defaultTone: string;
    defaultDateRange: string;
  } | null;
}

const TONE_OPTIONS = [
  { value: "technical", label: "Technical" },
  { value: "product", label: "Product" },
  { value: "enterprise", label: "Enterprise" },
];

const DATE_RANGE_OPTIONS = [
  { value: "last-release", label: "Since last release" },
  { value: "7-days", label: "Last 7 days" },
  { value: "14-days", label: "Last 14 days" },
  { value: "30-days", label: "Last 30 days" },
];

export function PreferencesCard({ preferences }: PreferencesCardProps) {
  const [tone, setTone] = useState(preferences?.defaultTone ?? "technical");
  const [dateRange, setDateRange] = useState(
    preferences?.defaultDateRange ?? "last-release",
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defaultTone: tone,
          defaultDateRange: dateRange,
        }),
      });
      if (res.ok) {
        toast.success("Preferences saved");
      } else {
        toast.error("Failed to save preferences");
      }
    } catch {
      toast.error("Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <h2 className="font-display text-base font-semibold text-text-primary">
        Default Generation Preferences
      </h2>
      <div className="rounded-lg border border-border-primary bg-surface p-5">
        <div className="flex flex-col gap-5">
          <p className="text-[13px] text-[#6B6B6B]">
            These defaults will be pre-filled when generating a new changelog.
            You can always override them per generation.
          </p>

          <div className="flex flex-col gap-2">
            <label className="text-[13px] text-text-secondary">
              Default tone
            </label>
            <Select value={tone} onValueChange={(v) => v && setTone(v)}>
              <SelectTrigger className="w-full border-border-primary bg-surface-hover/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TONE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[13px] text-text-secondary">
              Default date range
            </label>
            <Select value={dateRange} onValueChange={(v) => v && setDateRange(v)}>
              <SelectTrigger className="w-full border-border-primary bg-surface-hover/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_RANGE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-md px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, #10B981, #3B82F6)",
                boxShadow: "0 0 12px 2px #10B98130",
              }}
            >
              {saving ? "Saving..." : "Save defaults"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
