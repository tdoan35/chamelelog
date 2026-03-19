export const CATEGORY_COLORS: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  features: { label: "New Features", color: "#10B981", bg: "#10B98108" },
  fixes: { label: "Bug Fixes", color: "#F59E0B", bg: "#F59E0B08" },
  improvements: { label: "Improvements", color: "#3B82F6", bg: "#3B82F608" },
  breaking: { label: "Breaking Changes", color: "#EF4444", bg: "#EF444408" },
};

export const CATEGORY_ORDER = [
  "features",
  "fixes",
  "improvements",
  "breaking",
] as const;
