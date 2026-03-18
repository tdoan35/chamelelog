"use client";
import { cn } from "@/lib/utils";
import React, { ReactNode } from "react";

interface AuroraBackgroundProps extends React.HTMLProps<HTMLDivElement> {
  children: ReactNode;
  showRadialGradient?: boolean;
}

export const AuroraBackground = ({
  className,
  children,
  showRadialGradient = true,
  ...props
}: AuroraBackgroundProps) => {
  return (
    <div
      className={cn(
        "relative flex h-[100vh] flex-col items-center justify-center",
        className,
      )}
      {...props}
    >
      <div className="absolute inset-0 overflow-hidden">
        {/* Multiple radial gradient layers that animate independently */}
        <div
          className="animate-aurora-radial-1 pointer-events-none absolute -inset-[20%] opacity-[0.15] blur-[60px] dark:opacity-[0.2]"
          style={{
            background:
              "radial-gradient(ellipse 50% 50% at 50% 50%, #10B981 0%, transparent 70%)",
          }}
        />
        <div
          className="animate-aurora-radial-2 pointer-events-none absolute -inset-[20%] opacity-[0.12] blur-[60px] dark:opacity-[0.18]"
          style={{
            background:
              "radial-gradient(ellipse 40% 40% at 50% 50%, #3B82F6 0%, transparent 70%)",
          }}
        />
        <div
          className="animate-aurora-radial-3 pointer-events-none absolute -inset-[20%] opacity-[0.1] blur-[60px] dark:opacity-[0.15]"
          style={{
            background:
              "radial-gradient(ellipse 45% 45% at 50% 50%, #6366F1 0%, transparent 70%)",
          }}
        />
        <div
          className="animate-aurora-radial-4 pointer-events-none absolute -inset-[20%] opacity-[0.12] blur-[60px] dark:opacity-[0.18]"
          style={{
            background:
              "radial-gradient(ellipse 35% 35% at 50% 50%, #0D9488 0%, transparent 70%)",
          }}
        />
        <div
          className="animate-aurora-radial-5 pointer-events-none absolute -inset-[20%] opacity-[0.1] blur-[60px] dark:opacity-[0.15]"
          style={{
            background:
              "radial-gradient(ellipse 40% 40% at 50% 50%, #14B8A6 0%, transparent 70%)",
          }}
        />
      </div>
      {children}
    </div>
  );
};
