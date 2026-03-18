"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import { triggerThemeTransition } from "@/lib/theme-transition";

const modes = [
  { value: "light", icon: Sun, label: "Light" },
  { value: "system", icon: Monitor, label: "System" },
  { value: "dark", icon: Moon, label: "Dark" },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="h-[34px] w-full rounded-lg bg-surface-hover dark:bg-[#111111]" />;

  const handleThemeChange = (value: string) => {
    triggerThemeTransition();
    setTheme(value);
  };

  return (
    <div data-theme-toggle className="flex w-full items-center gap-0.5 rounded-lg bg-surface-hover p-[3px] dark:bg-[#111111]">
      {modes.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => handleThemeChange(value)}
          className={cn(
            "inline-flex h-7 flex-1 items-center justify-center rounded-md transition-colors",
            theme === value
              ? "bg-white text-text-primary dark:bg-[#070707]"
              : "text-text-tertiary hover:text-text-secondary"
          )}
          aria-label={label}
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  );
}
