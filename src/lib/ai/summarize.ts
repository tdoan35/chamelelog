import { generateObject } from "ai";
import { z } from "zod";
import { model } from "@/lib/ai-client";
import { getSummarizeSystemPrompt } from "./prompts";
import type { ClassificationResult } from "./classify";
import type { CommitData } from "@/lib/github/commits";
import type { ChangelogEntry } from "@/lib/types";

export type { ChangelogEntry };

export const SummarizeSchema = z.object({
  entries: z.array(
    z.object({
      category: z.enum(["features", "improvements", "fixes", "breaking"]),
      title: z.string(),
      description: z.string().optional(),
      commitShas: z.array(z.string()),
    }),
  ),
});

export type SummarizeResult = z.infer<typeof SummarizeSchema>;

function formatClustersForSummarization(
  classification: ClassificationResult,
  commits: CommitData[],
): string {
  const commitMap = new Map(commits.map((c) => [c.sha.slice(0, 7), c]));

  return classification.groups
    .flatMap((group) =>
      group.clusters.map((cluster) => {
        const clusterCommits = cluster.commitShas
          .map((sha) => commitMap.get(sha.slice(0, 7)))
          .filter(Boolean);

        const commitDetails = clusterCommits
          .map((c) => `  - ${c!.message}`)
          .join("\n");

        return `Category: ${group.category}
Summary: ${cluster.summary}
Commits:
${commitDetails}`;
      }),
    )
    .join("\n\n---\n\n");
}

export async function summarizeChanges(
  classification: ClassificationResult,
  commits: CommitData[],
  tone: string = "technical",
): Promise<SummarizeResult> {
  const { object } = await generateObject({
    model,
    schema: SummarizeSchema,
    system: getSummarizeSystemPrompt(tone),
    prompt: formatClustersForSummarization(classification, commits),
  });

  return object;
}
