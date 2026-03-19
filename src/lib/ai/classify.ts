import { generateObject } from "ai";
import { z } from "zod";
import { model } from "@/lib/ai-client";
import { CLASSIFY_SYSTEM_PROMPT } from "./prompts";
import type { CommitData } from "@/lib/github/commits";

export const ClassificationSchema = z.object({
  groups: z.array(
    z.object({
      category: z.enum(["features", "improvements", "fixes", "breaking"]),
      clusters: z.array(
        z.object({
          summary: z.string(),
          commitShas: z.array(z.string()),
        }),
      ),
    }),
  ),
  excluded: z.array(
    z.object({
      commitShas: z.array(z.string()),
      reason: z.string(),
    }),
  ),
});

export type ClassificationResult = z.infer<typeof ClassificationSchema>;

function formatCommitsForClassification(commits: CommitData[]): string {
  return commits
    .map((c) => {
      const files = c.filesChanged
        .map((f) => {
          const status = f.status === "added" ? "new file" : f.status;
          return `  ${f.filename} (+${f.additions} -${f.deletions}, ${status})`;
        })
        .join("\n");

      return `Commit: ${c.sha.slice(0, 7)}
Message: ${c.message}
Author: ${c.author}
Date: ${c.date}
Files:
${files}`;
    })
    .join("\n\n---\n\n");
}

export async function classifyCommits(
  commits: CommitData[],
): Promise<ClassificationResult> {
  const { object } = await generateObject({
    model,
    schema: ClassificationSchema,
    system: CLASSIFY_SYSTEM_PROMPT,
    prompt: formatCommitsForClassification(commits),
  });

  return object;
}
