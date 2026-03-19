import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { summarizeChanges } from "@/lib/ai/summarize";
import { contentToJson, contentToMarkdown } from "@/lib/markdown";
import type { ClassificationResult } from "@/lib/ai/classify";
import type { ChangelogCategory } from "@/lib/types";

const RegenerateSchema = z.object({
  tone: z.enum(["technical", "product", "enterprise"]),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const changelog = await db.changelog.findFirst({
    where: { id, userId: user.id },
  });

  if (!changelog) {
    return NextResponse.json(
      { error: "Changelog not found" },
      { status: 404 },
    );
  }

  if (!changelog.classificationData) {
    return NextResponse.json(
      { error: "No classification data available for regeneration" },
      { status: 400 },
    );
  }

  const body = await req.json();
  const parsed = RegenerateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const classification: ClassificationResult = JSON.parse(
    changelog.classificationData,
  );

  // Re-run Stage 3 (summarization) with the new tone
  // We don't have original commits, so pass empty array — summarize uses classification clusters
  const summarized = await summarizeChanges(classification, [], parsed.data.tone);

  // Build categories
  const categoryMap = new Map<string, ChangelogCategory>();
  for (const entry of summarized.entries) {
    if (!categoryMap.has(entry.category)) {
      categoryMap.set(entry.category, {
        category: entry.category,
        entries: [],
      });
    }
    categoryMap.get(entry.category)!.entries.push(entry);
  }

  const categories = Array.from(categoryMap.values());
  const content = JSON.stringify(contentToJson(categories));
  const rawContent = contentToMarkdown(categories);

  const updated = await db.changelog.update({
    where: { id },
    data: { content, rawContent },
  });

  return NextResponse.json({ data: updated });
}
