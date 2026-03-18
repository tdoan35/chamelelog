import Link from "next/link";
import { CirclePlus, FileText, Github } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ChangelogList } from "@/components/dashboard/changelog-list";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const projects = await db.project.findMany({
    where: { userId: user.id },
  });

  const changelogs = await db.changelog.findMany({
    where: { userId: user.id },
    include: { project: true },
    orderBy: { createdAt: "desc" },
  });

  if (projects.length === 0) {
    return (
      <div>
        <h1 className="font-display text-2xl font-bold text-text-primary">
          Changelogs
        </h1>
        <div className="flex flex-col items-center justify-center py-24">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-border-primary bg-surface">
            <FileText className="h-6 w-6 text-text-tertiary" />
          </div>
          <h2 className="mt-5 font-display text-lg font-bold text-text-primary">
            No changelogs yet
          </h2>
          <p className="mt-2 max-w-sm text-center text-sm text-text-secondary">
            Connect a GitHub repository and generate your first changelog from
            your Git commits.
          </p>
          <Link
            href="/changelogs/new"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-text shadow-[0_0_16px_#10B98130] transition-colors hover:bg-accent-hover"
          >
            <Github className="h-4 w-4" />
            Connect repository
          </Link>
          <Link
            href="/changelogs/new"
            className="mt-3 text-sm text-text-tertiary transition-colors hover:text-text-secondary"
          >
            or generate from a public repo
          </Link>
        </div>
      </div>
    );
  }

  if (changelogs.length === 0) {
    return (
      <div>
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold text-text-primary">
            Changelogs
          </h1>
          <Link
            href="/changelogs/new"
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-text shadow-[0_0_16px_#10B98130] transition-colors hover:bg-accent-hover"
          >
            <CirclePlus className="h-4 w-4" />
            Generate new
          </Link>
        </div>
        <div className="flex flex-col items-center justify-center py-24">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-border-primary bg-surface">
            <FileText className="h-6 w-6 text-text-tertiary" />
          </div>
          <h2 className="mt-5 font-display text-lg font-bold text-text-primary">
            No changelogs yet
          </h2>
          <p className="mt-2 max-w-sm text-center text-sm text-text-secondary">
            Generate your first changelog from your Git commits.
          </p>
          <Link
            href="/changelogs/new"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-text shadow-[0_0_16px_#10B98130] transition-colors hover:bg-accent-hover"
          >
            <CirclePlus className="h-4 w-4" />
            Generate changelog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-text-primary">
          Changelogs
        </h1>
        <Link
          href="/changelogs/new"
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-text shadow-[0_0_16px_#10B98130] transition-colors hover:bg-accent-hover"
        >
          <CirclePlus className="h-4 w-4" />
          Generate new
        </Link>
      </div>
      <ChangelogList changelogs={changelogs} />
    </div>
  );
}
