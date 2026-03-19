import { db } from "@/lib/db";
import { ChangelogFeed } from "@/components/public/changelog-feed";
import { FileText } from "lucide-react";

export default async function ChangelogPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; project?: string }>;
}) {
  const params = await searchParams;
  const category = params.category;

  // Resolve project ID: use param, or fall back to first project with published changelogs
  let projectId = params.project;
  if (!projectId) {
    const defaultProject = await db.project.findFirst({
      where: { changelogs: { some: { status: "published" } } },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    projectId = defaultProject?.id;
  }

  const changelogs = await db.changelog.findMany({
    where: {
      status: "published",
      ...(projectId ? { projectId } : {}),
    },
    orderBy: { publishedAt: "desc" },
    include: { project: true },
  });

  const project = changelogs[0]?.project;
  const repoName = project
    ? `${project.repoOwner}/${project.repoName}`
    : null;

  return (
    <div className="mx-auto max-w-3xl px-8 pb-10">
      <div className="sticky top-0 z-10 bg-background pt-10 pb-6">
        <h1
          className="font-display text-[28px] font-extrabold text-text-primary"
          style={{ letterSpacing: "-0.5px" }}
        >
          Changelog
        </h1>
        {repoName && (
          <p className="mt-1 text-sm text-text-secondary">
            All notable changes to {repoName}
          </p>
        )}
      </div>

      {changelogs.length === 0 ? (
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
      ) : (
        <ChangelogFeed changelogs={changelogs} categoryFilter={category} />
      )}
    </div>
  );
}
