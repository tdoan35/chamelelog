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

export function detectBreakingSignals(commits: CommitData[]): string[] {
  const signals: string[] = [];

  for (const commit of commits) {
    const msg = commit.message.toLowerCase();

    // Commit message signals
    if (/breaking[- ]?change/i.test(commit.message) || msg.includes("!:")) {
      signals.push(
        `Commit ${commit.sha.slice(0, 7)}: message contains breaking change indicator`,
      );
    }

    for (const file of commit.filesChanged) {
      // Deleted public files
      if (file.status === "removed") {
        signals.push(
          `Commit ${commit.sha.slice(0, 7)}: deleted file ${file.filename}`,
        );
      }

      // API route changes (renamed/removed)
      if (
        file.filename.match(/\bapi\b/) &&
        (file.status === "removed" || file.status === "renamed")
      ) {
        signals.push(
          `Commit ${commit.sha.slice(0, 7)}: API route ${file.status} — ${file.filename}`,
        );
      }

      // Schema changes
      if (file.filename.match(/schema\.(prisma|graphql|sql|ts)$/)) {
        signals.push(
          `Commit ${commit.sha.slice(0, 7)}: schema file modified — ${file.filename}`,
        );
      }

      // Large deletions (>50 lines removed with few added)
      if (file.deletions > 50 && file.additions < file.deletions * 0.3) {
        signals.push(
          `Commit ${commit.sha.slice(0, 7)}: large deletion in ${file.filename} (-${file.deletions} lines)`,
        );
      }
    }
  }

  return signals;
}

export async function classifyCommits(
  commits: CommitData[],
): Promise<ClassificationResult> {
  const breakingSignals = detectBreakingSignals(commits);
  let prompt = formatCommitsForClassification(commits);

  if (breakingSignals.length > 0) {
    prompt += `\n\n⚠️ BREAKING SIGNALS:\n${breakingSignals.map((s) => `- ${s}`).join("\n")}`;
  }

  const { object } = await generateObject({
    model,
    schema: ClassificationSchema,
    system: CLASSIFY_SYSTEM_PROMPT,
    prompt,
  });

  return object;
}
