import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ChangelogEditor } from "@/components/dashboard/changelog-editor";

export default async function ChangelogEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return notFound();

  const { id } = await params;

  const changelog = await db.changelog.findFirst({
    where: { id, userId: user.id },
    include: { project: true },
  });

  if (!changelog) return notFound();

  return (
    <ChangelogEditor
      changelog={{
        id: changelog.id,
        title: changelog.title,
        content: changelog.content,
        rawContent: changelog.rawContent,
        status: changelog.status,
        version: changelog.version,
        commitCount: changelog.commitCount,
        fromDate: changelog.fromDate.toISOString(),
        toDate: changelog.toDate.toISOString(),
        publishedAt: changelog.publishedAt?.toISOString() ?? null,
        project: {
          repoOwner: changelog.project.repoOwner,
          repoName: changelog.project.repoName,
        },
      }}
    />
  );
}
