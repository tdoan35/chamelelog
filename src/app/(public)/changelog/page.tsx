import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/lib/db";
import { FileText } from "lucide-react";

const DEFAULT_USERNAME = "tdoan35";

export default async function ChangelogRedirectPage() {
  // If signed in, redirect to current user's changelog
  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { username: true },
    });
    if (user?.username) {
      redirect(`/changelog/${user.username}`);
    }
  }

  // Default: try the canonical Chamelelog author
  const defaultUser = await db.user.findUnique({
    where: { username: DEFAULT_USERNAME },
    select: { username: true },
  });
  if (defaultUser) {
    redirect(`/changelog/${defaultUser.username}`);
  }

  // Fallback: first user with published changelogs
  const firstChangelog = await db.changelog.findFirst({
    where: { status: "published" },
    orderBy: { publishedAt: "desc" },
    select: { user: { select: { username: true } } },
  });
  if (firstChangelog?.user?.username) {
    redirect(`/changelog/${firstChangelog.user.username}`);
  }

  // No published changelogs anywhere
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center justify-center py-24">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-border-primary bg-surface">
          <FileText className="h-6 w-6 text-text-tertiary" />
        </div>
        <h2 className="mt-5 font-display text-lg font-semibold text-text-primary">
          No published changelogs yet
        </h2>
        <p
          className="mt-2 text-center text-sm text-text-secondary"
          style={{ lineHeight: 1.5, maxWidth: 380 }}
        >
          Changelogs will appear here once they are published.
        </p>
      </div>
    </div>
  );
}
