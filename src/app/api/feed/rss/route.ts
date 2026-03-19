import { db } from "@/lib/db";
import type { ChangelogCategory } from "@/lib/types";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

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
  const selfUrl = projectId
    ? `${baseUrl}/api/feed/rss?project=${encodeURIComponent(projectId)}`
    : `${baseUrl}/api/feed/rss`;

  const items = changelogs
    .map((cl) => {
      const title = cl.title ?? `${cl.version ?? "Update"}`;
      const description = categoriesToText(cl.content);
      const pubDate = cl.publishedAt
        ? new Date(cl.publishedAt).toUTCString()
        : new Date(cl.createdAt).toUTCString();

      return `    <item>
      <title>${escapeXml(title)}</title>
      <description>${escapeXml(description)}</description>
      <link>${escapeXml(`${baseUrl}/changelog`)}</link>
      <guid isPermaLink="false">${escapeXml(cl.id)}</guid>
      <pubDate>${pubDate}</pubDate>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(repoName)} Changelog</title>
    <link>${escapeXml(`${baseUrl}/changelog`)}</link>
    <description>Latest changes to ${escapeXml(repoName)}</description>
    <atom:link href="${escapeXml(selfUrl)}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml",
      "Cache-Control": "s-maxage=3600, stale-while-revalidate",
    },
  });
}
