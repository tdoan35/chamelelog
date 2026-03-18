"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  List,
  CirclePlus,
  Settings,
  Menu,
  X,
  Monitor,
  Moon,
  Sun,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  ScanEye,
} from "lucide-react";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { triggerThemeTransition } from "@/lib/theme-transition";
import { ThemeToggle } from "@/components/theme-toggle";

const navItems = [
  { href: "/", label: "Changelogs", icon: List },
  { href: "/changelogs/new", label: "Generate new", icon: CirclePlus },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const cycleTheme = () => {
    const order = ["light", "system", "dark"];
    const idx = order.indexOf(theme ?? "system");
    triggerThemeTransition();
    setTheme(order[(idx + 1) % order.length]);
  };

  const ThemeIcon = mounted
    ? theme === "light" ? Sun : theme === "dark" ? Moon : Monitor
    : Monitor;

  return (
    <>
      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b border-border-primary bg-sidebar px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <ScanEye className="h-5 w-5 text-accent" />
          <span className="font-display text-base font-bold text-text-primary">
            Chamelelog
          </span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-tertiary hover:bg-surface hover:text-text-primary"
        >
          {mobileOpen ? (
            <X className="h-4 w-4" />
          ) : (
            <Menu className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col overflow-hidden border-r border-border-primary bg-sidebar",
          "transition-all duration-200 md:static",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          collapsed ? "w-[72px]" : "w-60"
        )}
      >
        {/* Top section: logo + nav */}
        <div className="flex flex-col gap-6 px-4 pt-6">
          {/* Logo row — pl-[9px] centers 22px icon at 36px in 72px collapsed sidebar */}
          <div className="flex h-[22px] items-center gap-2 overflow-hidden pl-[9px]">
            <div className="shrink-0">
              <ScanEye
                className="h-[22px] w-[22px]"
                style={{
                  color: "transparent",
                  background: "linear-gradient(135deg, #10B981, #3B82F6)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  stroke: "url(#logo-gradient)",
                }}
              />
              <svg width="0" height="0" className="absolute">
                <defs>
                  <linearGradient
                    id="logo-gradient"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor="#10B981" />
                    <stop offset="100%" stopColor="#3B82F6" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <span
              className={cn(
                "font-display text-base font-bold text-text-primary whitespace-nowrap transition-opacity duration-200",
                collapsed ? "opacity-0" : "opacity-100"
              )}
            >
              Chamelelog
            </span>
          </div>

          {/* Nav */}
          <nav>
            <div className="flex flex-col gap-0.5">
              {navItems.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "flex h-9 items-center gap-2 overflow-hidden whitespace-nowrap rounded-md px-3 py-2 text-[13px] font-medium transition-colors",
                      isActive
                        ? "bg-surface text-text-primary font-semibold dark:bg-[#111111]"
                        : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span
                      className={cn(
                        "whitespace-nowrap transition-opacity duration-200",
                        collapsed ? "opacity-0" : "opacity-100"
                      )}
                    >
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>

        <div className="flex-1" />

        {/* Footer */}
        <div className="flex flex-col gap-3 px-4 pb-6">
          {/* Expand/collapse toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-tertiary transition-colors hover:bg-surface-hover hover:text-text-secondary"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>

          {/* Theme switcher — both always rendered, crossfade with opacity */}
          <div className="relative h-[34px]">
            {/* Expanded: full 3-button toggle */}
            <div
              className={cn(
                "absolute inset-0 transition-opacity duration-200",
                collapsed ? "pointer-events-none opacity-0" : "opacity-100"
              )}
            >
              <ThemeToggle />
            </div>
            {/* Collapsed: single cycle button */}
            <div
              className={cn(
                "absolute inset-y-0 left-0 flex items-center transition-opacity duration-200",
                collapsed ? "opacity-100" : "pointer-events-none opacity-0"
              )}
            >
              <div data-theme-toggle className="flex h-[34px] w-[34px] items-center justify-center rounded-lg bg-surface-hover p-[3px] dark:bg-[#111111]">
                <button
                  onClick={cycleTheme}
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white text-text-primary transition-colors dark:bg-[#070707]"
                  aria-label="Cycle theme"
                >
                  <ThemeIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* User — clickable with popover menu */}
          <div className="pt-3">
            <button
              onClick={(e) => {
                setMenuPos({ x: e.clientX, y: e.clientY });
                setUserMenuOpen(!userMenuOpen);
              }}
              className="flex w-full items-center gap-2.5 overflow-hidden rounded-md pl-1 transition-colors hover:bg-surface-hover"
            >
              {session?.user?.image ? (
                <img
                  src={session.user.image}
                  alt=""
                  className="h-8 w-8 min-h-8 min-w-8 shrink-0 rounded-full"
                />
              ) : (
                <div className="h-8 w-8 min-h-8 min-w-8 shrink-0 rounded-full bg-[#2A2A2A]" />
              )}
              <div
                className={cn(
                  "flex min-w-0 flex-col gap-0.5 whitespace-nowrap transition-opacity duration-200",
                  collapsed ? "opacity-0" : "opacity-100"
                )}
              >
                <span className="truncate text-left text-sm font-medium text-text-primary">
                  {session?.user?.name ?? "User"}
                </span>
                {session?.user?.email && (
                  <span className="truncate text-left font-mono text-[11px] text-text-tertiary">
                    {session.user.email}
                  </span>
                )}
              </div>
            </button>

            {/* Popover menu — rendered in a portal to escape sidebar overflow */}
            {userMenuOpen &&
              mounted &&
              createPortal(
                <>
                  <div
                    className="fixed inset-0 z-[100]"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div
                    className="fixed z-[100] w-48 overflow-hidden rounded-lg border border-border-primary bg-surface shadow-lg dark:bg-[#141414]"
                    style={{
                      left: menuPos.x,
                      top: menuPos.y,
                      transform: "translateY(-100%)",
                    }}
                  >
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        signOut({ callbackUrl: "/login" });
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-[13px] text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </div>
                </>,
                document.body
              )}
          </div>
        </div>
      </aside>
    </>
  );
}
