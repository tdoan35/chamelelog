"use client";

import { signIn } from "next-auth/react";
import { Github, ScanEye } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mb-6 flex justify-center">
          <ScanEye className="h-10 w-10 text-accent" />
        </div>
        <h1 className="font-display text-3xl font-bold text-text-primary">
          Chamelelog
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-text-secondary">
          AI-powered changelogs from your Git commits.
          <br />
          Adapts to any audience, just like a chameleon.
        </p>
        <button
          onClick={() => signIn("github", { callbackUrl: "/" })}
          className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-text shadow-[0_0_16px_#10B98130] transition-colors hover:bg-accent-hover"
        >
          <Github className="h-4 w-4" />
          Sign in with GitHub
        </button>
        <Link
          href="/changelog"
          className="mt-4 inline-block text-sm text-text-tertiary transition-colors hover:text-text-secondary"
        >
          View example changelog &rarr;
        </Link>
      </div>
    </div>
  );
}
