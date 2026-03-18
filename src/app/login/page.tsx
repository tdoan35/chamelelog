"use client";

import { signIn } from "next-auth/react";
import { Github, ScanEye, Sun, Moon, Loader2 } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { triggerThemeTransition } from "@/lib/theme-transition";
import { BackgroundRippleEffect } from "@/components/ui/background-ripple-effect";
import { AuroraBackground } from "@/components/ui/aurora-background";
import Link from "next/link";
import { cn } from "@/lib/utils";

function LandingThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const isDark = resolvedTheme === "dark";

  const handleToggle = (mode: "light" | "dark") => {
    triggerThemeTransition();
    setTheme(mode);
  };

  return (
    <div data-theme-toggle className="flex items-center gap-0.5 rounded-lg bg-surface-hover p-[3px] dark:bg-[#111111]">
      <button
        onClick={() => handleToggle("light")}
        className={cn(
          "inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors",
          !isDark
            ? "bg-white text-text-primary"
            : "text-text-tertiary hover:text-text-secondary"
        )}
        aria-label="Light mode"
      >
        <Sun className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => handleToggle("dark")}
        className={cn(
          "inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors",
          isDark
            ? "bg-[#070707] text-text-primary"
            : "text-text-tertiary hover:text-text-secondary"
        )}
        aria-label="Dark mode"
      >
        <Moon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export default function LoginPage() {
  const [signingIn, setSigningIn] = useState(false);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden">
      {/* Theme toggle — top right */}
      <div className="absolute right-6 top-6 z-20">
        <LandingThemeToggle />
      </div>

      {/* Interactive grid background */}
      <BackgroundRippleEffect rows={16} cols={27} cellSize={60} />

      {/* Aurora gradient — above ripple, pointer-events-none so clicks pass through */}
      <div className="pointer-events-none absolute inset-0 z-[4] opacity-50 dark:opacity-60">
        <AuroraBackground
          className="h-full w-full bg-transparent"
          showRadialGradient={true}
        >
          <></>
        </AuroraBackground>
      </div>

      {/* Radial overlay — different per theme */}
      <div
        className="pointer-events-none absolute inset-0 hidden dark:block"
        style={{
          background:
            "radial-gradient(ellipse 140% 140% at center, #0A0A0A99 0%, #0A0A0A00 60%, #0A0A0ADD 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 block dark:hidden"
        style={{
          background:
            "radial-gradient(ellipse 140% 140% at center, #FFFFFF99 0%, #FFFFFF00 60%, #FFFFFFDD 100%)",
        }}
      />

      {/* Content */}
      <div className="pointer-events-none relative z-10 flex flex-col items-center gap-8 px-4 [&_a]:pointer-events-auto [&_button]:pointer-events-auto">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <ScanEye
            className="h-7 w-7"
            style={{ stroke: "url(#login-logo-gradient)" }}
          />
          <svg width="0" height="0" className="absolute">
            <defs>
              <linearGradient
                id="login-logo-gradient"
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
          <span className="font-display text-2xl font-bold text-text-primary">
            Chamelelog
          </span>
        </div>

        {/* Hero block */}
        <div className="flex flex-col items-center gap-4">
          {/* Title */}
          <div className="flex flex-col items-center">
            {/* Line 1: "AI-powered changelogs" inline with 12px gap */}
            <div
              className="flex items-end justify-center gap-3"
              style={{ lineHeight: 1.1 }}
            >
              <span
                className="font-display text-[48px] font-extrabold text-text-primary"
                style={{ letterSpacing: "-1px" }}
              >
                AI-powered
              </span>
              <span
                className="font-display text-[48px] font-extrabold"
                style={{
                  letterSpacing: "-1px",
                  background: "linear-gradient(180deg, #10B981, #3B82F6)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                changelogs
              </span>
            </div>
            {/* Line 2: "in seconds" */}
            <span
              className="font-display text-[48px] font-extrabold text-text-primary"
              style={{ letterSpacing: "-1px", lineHeight: 1.1 }}
            >
              in seconds
            </span>
          </div>

          {/* Subtitle */}
          <p
            className="text-center text-base text-text-secondary"
            style={{ lineHeight: 1.6, maxWidth: 500 }}
          >
            Generate beautiful, categorized changelogs from your Git commits.
            <br />
            Published in one click.
          </p>
        </div>

        {/* CTA button — gradient fill, dark green text */}
        <button
          onClick={() => {
            setSigningIn(true);
            signIn("github", { callbackUrl: "/" });
          }}
          disabled={signingIn}
          className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-[15px] font-medium text-[#022C22] disabled:opacity-80"
          style={{
            background: "linear-gradient(135deg, #10B981, #3B82F6)",
            boxShadow: "0 0 24px 4px #10B98140",
          }}
        >
          {signingIn ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Github className="h-5 w-5" />
          )}
          {signingIn ? "Redirecting..." : "Sign in with GitHub"}
        </button>

        {/* Link */}
        <div className="flex items-center gap-1">
          <Link
            href="/changelog"
            className="text-sm text-text-secondary transition-colors hover:text-text-primary"
          >
            View example changelog
          </Link>
          <span className="text-sm text-text-secondary">&rarr;</span>
        </div>
      </div>
    </div>
  );
}
