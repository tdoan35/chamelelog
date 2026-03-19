"use client";

import { signOut } from "next-auth/react";
import { Github } from "lucide-react";

interface LinkedAccountCardProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export function LinkedAccountCard({ user }: LinkedAccountCardProps) {
  return (
    <div className="flex flex-col gap-5">
      <h2 className="font-display text-base font-semibold text-text-primary">
        Linked Account
      </h2>
      <div className="rounded-lg border border-border-primary bg-surface p-5">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {user.image ? (
                <img
                  src={user.image}
                  alt=""
                  className="h-10 w-10 rounded-lg"
                />
              ) : (
                <div className="h-10 w-10 rounded-lg bg-[#2A2A2A]" />
              )}
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-text-primary">
                  {user.name ?? "User"}
                </span>
                {user.email && (
                  <span className="text-[13px] text-text-secondary">
                    {user.email}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1">
                <Github className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-xs font-medium text-emerald-500">
                  Connected
                </span>
              </div>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="rounded-md border border-border-primary px-4 py-2 text-[13px] font-medium text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
            >
              Sign out
            </button>
          </div>
          <p className="text-xs text-[#6B6B6B]">
            Authenticated via GitHub OAuth. Your access token is used to fetch
            commits from connected repositories.
          </p>
        </div>
      </div>
    </div>
  );
}
