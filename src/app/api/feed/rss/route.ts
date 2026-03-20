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
  const username = searchParams.get("user");

  // Resolve userId from username
  let userId: string | undefined;
  if (username) {
    const user = await db.user.findUnique({ where: { username } });
    if (!user) {
      return new Response("User not found", { status: 404 });
    }
    userId = user.id;
  }

  const changelogs = await db.changelog.findMany({
    where: {
      status: "published",
      ...(userId ? { userId } : {}),
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
  const changelogPath = username
    ? `/changelog/${username}`
    : "/changelog";

  const selfParams = new URLSearchParams();
  if (username) selfParams.set("user", username);
  if (projectId) selfParams.set("project", projectId);
  const selfQs = selfParams.toString();
  const selfUrl = `${baseUrl}/api/feed/rss${selfQs ? `?${selfQs}` : ""}`;

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
      <link>${escapeXml(`${baseUrl}${changelogPath}`)}</link>
      <guid isPermaLink="false">${escapeXml(cl.id)}</guid>
      <pubDate>${pubDate}</pubDate>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(repoName)} Changelog</title>
    <link>${escapeXml(`${baseUrl}${changelogPath}`)}</link>
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
