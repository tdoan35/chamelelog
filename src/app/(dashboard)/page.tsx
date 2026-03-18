import Link from "next/link";
import { Plus, FileText, Github } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ChangelogList } from "@/components/dashboard/changelog-list";
import { FilterTabs } from "@/components/dashboard/filter-tabs";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  const params = await searchParams;
  const filter = params.filter ?? "all";

  const projects = await db.project.findMany({
    where: { userId: user.id },
  });

  const whereClause: Record<string, unknown> = { userId: user.id };
  if (filter === "drafts") whereClause.status = "draft";
  if (filter === "published") whereClause.status = "published";

  const changelogs = await db.changelog.findMany({
    where: whereClause,
    include: { project: true },
    orderBy: { createdAt: "desc" },
  });

  // Empty state — no projects at all
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
          <h2 className="mt-5 font-display text-lg font-semibold text-text-primary">
            No changelogs yet
          </h2>
          <p
            className="mt-2 text-center text-sm text-text-secondary"
            style={{ lineHeight: 1.5, maxWidth: 380 }}
          >
            Connect a GitHub repository and generate your
            <br />
            first changelog from your Git commits.
          </p>
          <div className="mt-5 flex items-center gap-2.5">
            <Link
              href="/changelogs/new"
              className="inline-flex items-center gap-1.5 rounded-lg px-[18px] py-2.5 text-[13px] font-medium text-white"
              style={{
                background: "linear-gradient(135deg, #10B981, #3B82F6)",
                boxShadow: "0 0 16px 2px #10B98130",
              }}
            >
              <Github className="h-4 w-4" />
              Connect repository
            </Link>
            <span className="text-[13px] text-text-tertiary">or</span>
            <Link
              href="/changelogs/new"
              className="text-[13px] font-medium text-accent transition-colors hover:text-accent-hover"
            >
              generate from a public repo
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Has projects — show header with generate button + filter tabs
  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-text-primary">
          Changelogs
        </h1>
        <Link
          href="/changelogs/new"
          className="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-[13px] font-medium text-accent-text transition-colors hover:bg-accent-hover"
          style={{ boxShadow: "0 0 16px 2px #10B98130" }}
        >
          <Plus className="h-4 w-4" />
          Generate new
        </Link>
      </div>

      <FilterTabs active={filter} />

      {changelogs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-border-primary bg-surface">
            <FileText className="h-6 w-6 text-text-tertiary" />
          </div>
          <h2 className="mt-5 font-display text-lg font-semibold text-text-primary">
            No changelogs yet
          </h2>
          <p
            className="mt-2 text-center text-sm text-text-secondary"
            style={{ lineHeight: 1.5, maxWidth: 380 }}
          >
            Generate your first changelog from your Git commits.
          </p>
          <Link
            href="/changelogs/new"
            className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-accent px-[18px] py-2.5 text-[13px] font-medium text-accent-text transition-colors hover:bg-accent-hover"
            style={{ boxShadow: "0 0 16px 2px #10B98130" }}
          >
            <Plus className="h-4 w-4" />
            Generate changelog
          </Link>
        </div>
      ) : (
        <ChangelogList changelogs={changelogs} />
      )}
    </div>
  );
}
