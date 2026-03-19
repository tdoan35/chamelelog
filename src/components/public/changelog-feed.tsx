import { CATEGORY_COLORS, CATEGORY_ORDER } from "@/lib/category-colors";
import type { ChangelogCategory } from "@/lib/types";
import { CategoryHeader } from "@/components/public/category-header";
import { ChangelogEntryCard } from "@/components/public/changelog-entry";

interface ChangelogWithProject {
  id: string;
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
  // Group by publishedAt date
  const grouped = new Map<string, ChangelogWithProject[]>();
  for (const cl of changelogs) {
    const key = cl.publishedAt ? formatDate(cl.publishedAt) : "Unknown";
    const list = grouped.get(key) ?? [];
    list.push(cl);
    grouped.set(key, list);
  }

  const dateGroups = Array.from(grouped.entries());

  // Filter out empty groups after category filtering
  const filteredGroups = dateGroups.filter(([, entries]) => {
    return entries.some((cl) => {
      const categories = parseContent(cl.content);
      if (!categoryFilter) return categories.length > 0;
      return categories.some((cat) => cat.category === categoryFilter);
    });
  });

  if (filteredGroups.length === 0) {
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
      {filteredGroups.map(([date, entries], groupIdx) => (
        <div key={date} className="flex">
          {/* Timeline column */}
          <div className="flex w-7 shrink-0 flex-col items-center">
            <div className="mt-[6px] h-2.5 w-2.5 rounded-full bg-accent" />
            {groupIdx < filteredGroups.length - 1 && (
              <div className="flex-1 w-px bg-border-primary" />
            )}
          </div>

          {/* Content column */}
          <div className="flex-1 pb-8 pl-5">
            {entries.map((cl) => {
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

              return (
                <div key={cl.id}>
                  {/* Date + version */}
                  <div className="flex items-center gap-3">
                    <h2 className="text-[17px] font-semibold text-text-primary">
                      {date}
                    </h2>
                    {cl.version && (
                      <span className="rounded-sm border border-border-primary bg-surface px-2 py-[3px] font-mono text-xs text-text-secondary dark:bg-[#1A1A1A]">
                        {cl.version}
                      </span>
                    )}
                  </div>

                  {/* Category sections */}
                  <div className="mt-5 flex flex-col gap-6">
                    {filtered.map((cat) => (
                      <div key={cat.category} className="flex flex-col gap-3">
                        <CategoryHeader category={cat.category} />
                        <div className="flex flex-col gap-3">
                          {cat.entries.map((entry, i) => (
                            <ChangelogEntryCard
                              key={i}
                              title={entry.title}
                              description={entry.description}
                              category={entry.category}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
