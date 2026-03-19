import { db } from "@/lib/db";
import type { ChangelogCategory } from "@/lib/types";

function categoriesToText(content: string | null): string {
  if (!content) return "";
  try {
    const parsed = JSON.parse(content);
    const categories: ChangelogCategory[] = parsed.categories ?? [];
    return categories
      .map(
        (cat) =>
          `${cat.category.toUpperCase()}\n${cat.entries.map((e) => `- ${e.title}${e.description ? `: ${e.description}` : ""}`).join("\n")}`
      )
      .join("\n\n");
  } catch {
    return "";
  }
}

function categoriesToTags(content: string | null): string[] {
  if (!content) return [];
  try {
    const parsed = JSON.parse(content);
    const categories: ChangelogCategory[] = parsed.categories ?? [];
    return categories.map((cat) => cat.category);
  } catch {
    return [];
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("project");

  const changelogs = await db.changelog.findMany({
    where: {
      status: "published",
      ...(projectId ? { projectId } : {}),
    },
    orderBy: { publishedAt: "desc" },
    take: 50,
    include: { project: true },
  });

  const project = changelogs[0]?.project;
  const repoName = project
    ? `${project.repoOwner}/${project.repoName}`
    : "Chamelelog";

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const feedUrl = projectId
    ? `${baseUrl}/api/feed/json?project=${encodeURIComponent(projectId)}`
    : `${baseUrl}/api/feed/json`;

  const feed = {
    version: "https://jsonfeed.org/version/1.1",
    title: `${repoName} Changelog`,
    home_page_url: `${baseUrl}/changelog`,
    feed_url: feedUrl,
    description: `Latest changes to ${repoName}`,
    items: changelogs.map((cl) => ({
      id: cl.id,
      title: cl.title ?? cl.version ?? "Update",
      content_text: categoriesToText(cl.content),
      date_published: cl.publishedAt
        ? new Date(cl.publishedAt).toISOString()
        : new Date(cl.createdAt).toISOString(),
      url: `${baseUrl}/changelog`,
      tags: categoriesToTags(cl.content),
    })),
  };

  return Response.json(feed, {
    headers: {
      "Cache-Control": "s-maxage=3600, stale-while-revalidate",
    },
  });
}
