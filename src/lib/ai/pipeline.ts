import { classifyCommits, type ClassificationResult } from "./classify";
import { summarizeChanges, type ChangelogEntry } from "./summarize";
import { fetchFilteredCommits } from "@/lib/github/commits";
import { createGitHubClient } from "@/lib/github/client";

export interface PipelineInput {
  accessToken: string;
  repoOwner: string;
  repoName: string;
  fromDate: string;
  toDate: string;
  tone?: "technical" | "product" | "enterprise";
}

export interface ChangelogCategory {
  category: "features" | "improvements" | "fixes" | "breaking";
  entries: ChangelogEntry[];
}

export interface PipelineResult {
  categories: ChangelogCategory[];
  rawMarkdown: string;
  commitCount: number;
  filteredCount: number;
  classificationData: ClassificationResult;
}

export type PipelineEvent =
  | { type: "status"; stage: string; message: string }
  | { type: "entry"; entry: ChangelogEntry }
  | { type: "complete"; result: PipelineResult }
  | { type: "error"; message: string };

export async function runPipeline(
  input: PipelineInput,
  onEvent: (event: PipelineEvent) => void,
): Promise<PipelineResult | null> {
  const tone = input.tone ?? "technical";
  const octokit = createGitHubClient(input.accessToken);

  // Stage 1: Fetch commits
  onEvent({
    type: "status",
    stage: "fetching",
    message: "Fetching commits...",
  });

  const { commits, totalCount, capped } = await fetchFilteredCommits(
    octokit,
    input.repoOwner,
    input.repoName,
    input.fromDate,
    input.toDate,
  );

  const filteredCount = totalCount - commits.length;

  if (capped) {
    onEvent({
      type: "status",
      stage: "fetching",
      message: `Found ${totalCount} commits, analyzing the first 100.`,
    });
  }

  if (commits.length === 0) {
    onEvent({
      type: "status",
      stage: "complete",
      message: "No meaningful commits found in this date range.",
    });
    return null;
  }

  // Stage 2: Classify
  onEvent({
    type: "status",
    stage: "classifying",
    message: `Analyzing ${commits.length} commits...`,
  });

  const classification = await classifyCommits(commits);

  // Stage 3: Summarize
  onEvent({
    type: "status",
    stage: "summarizing",
    message: "Writing changelog entries...",
  });

  const summarized = await summarizeChanges(classification, commits, tone);

  // Group entries by category and emit each
  const categoryMap = new Map<string, ChangelogEntry[]>();
  for (const entry of summarized.entries) {
    onEvent({ type: "entry", entry });

    if (!categoryMap.has(entry.category)) {
      categoryMap.set(entry.category, []);
    }
    categoryMap.get(entry.category)!.push(entry);
  }

  const categories: ChangelogCategory[] = [];
  for (const [category, entries] of categoryMap) {
    categories.push({
      category: category as ChangelogCategory["category"],
      entries,
    });
  }

  // Build markdown
  const { contentToMarkdown } = await import("@/lib/markdown");
  const rawMarkdown = contentToMarkdown(categories);

  const result: PipelineResult = {
    categories,
    rawMarkdown,
    commitCount: commits.length,
    filteredCount,
    classificationData: classification,
  };

  onEvent({ type: "complete", result });
  return result;
}
