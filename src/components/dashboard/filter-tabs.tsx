"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

const tabs = [
  { value: "all", label: "All" },
  { value: "drafts", label: "Drafts" },
  { value: "published", label: "Published" },
];

export function FilterTabs({ active }: { active: string }) {
  return (
    <div className="mt-6 flex gap-0.5">
      {tabs.map((tab) => {
        const isActive = tab.value === active;
        return (
          <Link
            key={tab.value}
            href={tab.value === "all" ? "/changelogs" : `/changelogs?filter=${tab.value}`}
            className={cn(
              "rounded-md px-3 py-1.5 text-[13px] transition-colors",
              isActive
                ? "bg-surface font-medium text-text-primary dark:bg-[#141414]"
                : "font-normal text-text-secondary hover:text-text-primary"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
