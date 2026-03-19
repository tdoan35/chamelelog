import type { ChangelogCategory } from "@/lib/ai/pipeline";

const CATEGORY_LABELS: Record<string, string> = {
  breaking: "🚨 Breaking Changes",
  features: "✨ New Features",
  improvements: "💪 Improvements",
  fixes: "🐛 Bug Fixes",
};

const CATEGORY_ORDER = ["breaking", "features", "improvements", "fixes"];

export function contentToMarkdown(content: ChangelogCategory[]): string {
  const sorted = [...content].sort(
    (a, b) =>
      CATEGORY_ORDER.indexOf(a.category) -
      CATEGORY_ORDER.indexOf(b.category),
  );

  const sections = sorted.map((cat) => {
    const label = CATEGORY_LABELS[cat.category] ?? cat.category;
    const entries = cat.entries
      .map((e) => {
        let line = `- ${e.title}`;
        if (e.description) {
          line += `\n  ${e.description}`;
        }
        return line;
      })
      .join("\n");

    return `## ${label}\n\n${entries}`;
  });

  return sections.join("\n\n");
}

export function contentToJson(content: ChangelogCategory[]): object {
  return {
    categories: content.map((cat) => ({
      category: cat.category,
      entries: cat.entries.map((e) => ({
        title: e.title,
        description: e.description ?? null,
        commitShas: e.commitShas,
      })),
    })),
  };
}
