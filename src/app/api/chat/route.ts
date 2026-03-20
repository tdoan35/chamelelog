import { streamText, convertToModelMessages } from "ai";
import { model } from "@/lib/ai-client";
import { db } from "@/lib/db";

const MAX_CONTEXT_CHARS = 30_000;

export async function POST(req: Request) {
  const { messages, username } = await req.json();

  // Resolve userId from username if provided
  let userId: string | undefined;
  if (username) {
    const user = await db.user.findUnique({ where: { username } });
    if (user) userId = user.id;
  }

  // Load recent published changelogs as context
  const changelogs = await db.changelog.findMany({
    where: {
      status: "published",
      ...(userId ? { userId } : {}),
    },
    orderBy: { publishedAt: "desc" },
    take: 20,
    include: { project: true },
  });

  // Build context with a token budget to avoid overwhelming the model
  const parts: string[] = [];
  let charCount = 0;
  for (const cl of changelogs) {
    const date = cl.publishedAt?.toLocaleDateString() ?? "Unknown date";
    const repo = `${cl.project.repoOwner}/${cl.project.repoName}`;
    const part = `## ${cl.title} (${cl.version ?? "unversioned"}) — ${date} [${repo}]\n\n${cl.rawContent}`;
    if (charCount + part.length > MAX_CONTEXT_CHARS) break;
    parts.push(part);
    charCount += part.length;
  }
  const context = parts.join("\n\n---\n\n");

  const result = streamText({
    model,
    system: `You are a helpful assistant for a software changelog. Answer questions about recent changes, releases, and features based on the following published changelogs. Be concise and friendly. If you don't know something, say so.

PUBLISHED CHANGELOGS:
${context}`,
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
