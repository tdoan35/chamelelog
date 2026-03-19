import { CATEGORY_COLORS } from "@/lib/category-colors";

interface ChangelogEntryCardProps {
  title: string;
  description?: string;
  category: string;
}

export function ChangelogEntryCard({
  title,
  description,
  category,
}: ChangelogEntryCardProps) {
  const colors = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.features;

  return (
    <div
      className="flex overflow-hidden rounded-lg"
      style={{ backgroundColor: colors.bg }}
    >
      <div
        className="w-[3px] shrink-0"
        style={{ backgroundColor: colors.color }}
      />
      <div className="px-4 py-3">
        <p className="text-sm font-medium text-text-primary">{title}</p>
        {description && (
          <p
            className="mt-1 text-[13px] text-text-secondary"
            style={{ lineHeight: 1.5 }}
          >
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
