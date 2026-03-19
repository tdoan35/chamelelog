import { streamText, convertToModelMessages } from "ai";
import { model } from "@/lib/ai-client";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const { messages } = await req.json();

  // Load recent published changelogs as context
  const changelogs = await db.changelog.findMany({
    where: { status: "published" },
    orderBy: { publishedAt: "desc" },
    take: 20,
    include: { project: true },
  });

  const context = changelogs
    .map((cl) => {
      const date = cl.publishedAt?.toLocaleDateString() ?? "Unknown date";
      const repo = `${cl.project.repoOwner}/${cl.project.repoName}`;
      return `## ${cl.title} (${cl.version ?? "unversioned"}) — ${date} [${repo}]\n\n${cl.rawContent}`;
    })
    .join("\n\n---\n\n");

  const result = streamText({
    model,
    system: `You are a helpful assistant for a software changelog. Answer questions about recent changes, releases, and features based on the following published changelogs. Be concise and friendly. If you don't know something, say so.

PUBLISHED CHANGELOGS:
${context}`,
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
