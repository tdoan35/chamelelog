"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  List,
  CirclePlus,
  Settings,
  LogOut,
  Menu,
  X,
  Monitor,
  PanelLeftClose,
  PanelLeftOpen,
  ScanEye,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
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
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border-primary bg-sidebar",
          "transition-all duration-200 md:static",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          collapsed ? "w-16" : "w-60"
        )}
      >
        {/* Logo row */}
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="shrink-0">
              <ScanEye
                className="h-5 w-5"
                style={{
                  color: "transparent",
                  background: "linear-gradient(135deg, #10B981, #3B82F6)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  stroke: "url(#logo-gradient)",
                }}
              />
              {/* SVG gradient definition for stroke */}
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
            {!collapsed && (
              <span className="font-display text-base font-bold text-text-primary">
                Chamelelog
              </span>
            )}
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-md text-text-tertiary transition-colors hover:bg-surface hover:text-text-secondary md:inline-flex"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 px-3 py-2">
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
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  collapsed && "justify-center px-0",
                  isActive
                    ? "bg-surface text-text-primary font-semibold dark:bg-[#111111]"
                    : "text-text-secondary hover:bg-surface hover:text-text-primary"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-border-primary p-3">
          {/* Theme switcher */}
          <div
            className={cn(
              "mb-3 flex",
              collapsed ? "justify-center" : "justify-start"
            )}
          >
            {collapsed ? (
              <button
                onClick={() => {
                  /* toggle would need theme context */
                }}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-tertiary hover:bg-surface hover:text-text-secondary"
              >
                <Monitor className="h-4 w-4" />
              </button>
            ) : (
              <ThemeToggle />
            )}
          </div>

          {/* User */}
          <div
            className={cn(
              "flex items-center",
              collapsed ? "justify-center" : "justify-between"
            )}
          >
            <div className="flex items-center gap-2 min-w-0">
              {session?.user?.image && (
                <img
                  src={session.user.image}
                  alt=""
                  className="h-7 w-7 shrink-0 rounded-full"
                />
              )}
              {!collapsed && (
                <span className="truncate text-sm text-text-secondary">
                  {session?.user?.name ?? "User"}
                </span>
              )}
            </div>
            {!collapsed && (
              <button
                onClick={() => signOut()}
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-text-tertiary transition-colors hover:bg-surface hover:text-text-primary"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
