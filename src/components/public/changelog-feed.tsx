import { CATEGORY_COLORS, CATEGORY_ORDER } from "@/lib/category-colors";
import type { ChangelogCategory } from "@/lib/types";
import { CategoryHeader } from "@/components/public/category-header";
import { ChangelogEntryCard } from "@/components/public/changelog-entry";

interface ChangelogWithProject {
  id: string;
  title: string;
  content: string | null;
  version: string | null;
  publishedAt: Date | null;
  project: {
    repoOwner: string;
    repoName: string;
  };
}

interface ChangelogFeedProps {
  changelogs: ChangelogWithProject[];
  categoryFilter?: string;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function parseContent(content: string | null): ChangelogCategory[] {
  if (!content) return [];
  try {
    const parsed = JSON.parse(content);
    return parsed.categories ?? [];
  } catch {
    return [];
  }
}

export function ChangelogFeed({
  changelogs,
  categoryFilter,
}: ChangelogFeedProps) {
  // Filter changelogs individually (no date grouping)
  const filteredChangelogs = changelogs.filter((cl) => {
    const categories = parseContent(cl.content);
    if (!categoryFilter) return categories.length > 0;
    return categories.some((cat) => cat.category === categoryFilter);
  });

  if (filteredChangelogs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <p className="text-sm text-text-secondary">
          No changelog entries found.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 flex flex-col">
      {filteredChangelogs.map((cl, idx) => {
        const categories = parseContent(cl.content);
        const sorted = [...categories].sort(
          (a, b) =>
            CATEGORY_ORDER.indexOf(
              a.category as (typeof CATEGORY_ORDER)[number]
            ) -
            CATEGORY_ORDER.indexOf(
              b.category as (typeof CATEGORY_ORDER)[number]
            )
        );
        const filtered = categoryFilter
          ? sorted.filter((cat) => cat.category === categoryFilter)
          : sorted;

        if (filtered.length === 0) return null;

        const dateStr = cl.publishedAt
          ? formatDate(cl.publishedAt)
          : "Unknown";

        return (
          <div key={cl.id}>
            {/* Date header row with dot — sticky below page header */}
            <div className="sticky top-[7.5rem] z-[5] -mt-10">
              <div className="bg-background pt-10">
              <div className="flex items-center gap-3 pb-4">
              <div className="flex w-7 shrink-0 items-center justify-center">
                <div className="h-2.5 w-2.5 rounded-full bg-accent" />
              </div>
              <h2 className="text-[17px] font-semibold text-text-primary">
                {dateStr}
              </h2>
              {cl.title && (
                <span className="text-[17px] text-text-secondary">
                  — {cl.title}
                </span>
              )}
              {cl.version && (
                <span className="rounded-sm border border-border-primary bg-surface px-2 py-[3px] font-mono text-xs text-text-secondary dark:bg-[#1A1A1A]">
                  {cl.version}
                </span>
              )}
              </div>
              </div>
              <div className="h-4 bg-gradient-to-b from-background to-transparent" />
            </div>

            {/* Timeline line + entries */}
            <div className="flex">
              {/* Timeline column */}
              <div className="flex w-7 shrink-0 flex-col items-center">
                {idx < filteredChangelogs.length - 1 && (
                  <div className="w-px flex-1 bg-border-primary" />
                )}
              </div>

              {/* Content column */}
              <div className="flex-1 pb-8 pl-5">
                <div className="flex flex-col gap-6">
                  {filtered.map((cat) => (
                    <div
                      key={cat.category}
                      className="flex flex-col gap-3"
                    >
                      <CategoryHeader category={cat.category} />
                      <div className="flex flex-col gap-3">
                        {cat.entries.map((entry, i) => (
                          <ChangelogEntryCard
                            key={i}
                            title={entry.title}
                            description={entry.description}
                            category={entry.category ?? cat.category}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
