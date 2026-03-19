import { CATEGORY_COLORS } from "@/lib/category-colors";

interface CategoryHeaderProps {
  category: string;
}

export function CategoryHeader({ category }: CategoryHeaderProps) {
  const colors = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.features;

  return (
    <div className="flex items-center gap-2">
      <div
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: colors.color }}
      />
      <span
        className="text-[13px] font-semibold"
        style={{ color: colors.color }}
      >
        {colors.label}
      </span>
    </div>
  );
}
