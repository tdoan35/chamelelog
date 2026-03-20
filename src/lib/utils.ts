import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { ChangelogCategory } from "@/lib/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function parseContent(content: string | null): ChangelogCategory[] {
  if (!content) return [];
  try {
    const parsed = JSON.parse(content);
    return parsed.categories ?? [];
  } catch {
    return [];
  }
}
