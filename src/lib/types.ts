export interface ChangelogEntry {
  category: "features" | "improvements" | "fixes" | "breaking";
  title: string;
  description?: string;
  commitShas: string[];
}

export interface ChangelogCategory {
  category: "features" | "improvements" | "fixes" | "breaking";
  entries: ChangelogEntry[];
}
