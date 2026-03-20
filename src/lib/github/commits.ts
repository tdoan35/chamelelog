import { Octokit } from "octokit";
import pLimit from "p-limit";

export interface CommitData {
  sha: string;
  message: string;
  author: string;
  date: string;
  filesChanged: FileChange[];
  additions: number;
  deletions: number;
}

export interface FileChange {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  patch?: string;
}

const FILE_IGNORE_PATTERNS = [
  /^package-lock\.json$/,
  /^yarn\.lock$/,
  /^pnpm-lock\.yaml$/,
  /^\.gitignore$/,
  /^\.env\.example$/,
  /\.md$/,  // Will exclude README.md and CHANGELOG.md separately
  /^\.github\/workflows\//,
  /^\.eslintrc/,
  /^\.prettierrc/,
];

const FILE_KEEP_PATTERNS = [
  /^README\.md$/,
  /^CHANGELOG\.md$/,
];

const NOISE_MESSAGE_PATTERNS = [
  /^Merge (branch|pull request)/i,
  /^(chore|ci|style)\(deps\)/i,
  /^bump /i,
  /^auto-merge/i,
  /^Initial commit$/i,
];

const MAX_COMMITS = 100;

function shouldIgnoreFile(filename: string, patch?: string): boolean {
  // Always keep these files
  if (FILE_KEEP_PATTERNS.some((p) => p.test(filename))) return false;

  // tsconfig.json: only ignore if trivial (<5 lines changed)
  if (/^tsconfig\.json$/.test(filename)) {
    if (!patch) return true;
    const lines = patch.split("\n").length;
    return lines < 5;
  }

  return FILE_IGNORE_PATTERNS.some((p) => p.test(filename));
}

function isNoiseCommit(message: string): boolean {
  return NOISE_MESSAGE_PATTERNS.some((p) => p.test(message));
}

function isMergeCommit(parents: unknown[]): boolean {
  return parents.length >= 2;
}

export async function fetchFilteredCommits(
  octokit: Octokit,
  owner: string,
  repo: string,
  since: string,
  until: string,
): Promise<{ commits: CommitData[]; totalCount: number; capped: boolean }> {
  // Fetch commits, paginating until we have enough meaningful ones or exhaust the range.
  // We keep fetching pages until we have MAX_COMMITS non-merge, non-noise commits
  // or we run out of pages. Cap total API pages to avoid runaway pagination.
  const MAX_PAGES = 5;
  type CommitListItem = Awaited<ReturnType<typeof octokit.rest.repos.listCommits>>["data"][number];
  const raw: CommitListItem[] = [];
  const meaningful: CommitListItem[] = [];
  let page = 1;
  let hasMore = true;

  while (meaningful.length < MAX_COMMITS && hasMore && page <= MAX_PAGES) {
    const { data: pageData } = await octokit.rest.repos.listCommits({
      owner,
      repo,
      since,
      until,
      per_page: 100,
      page,
    });

    raw.push(...pageData);
    hasMore = pageData.length === 100;

    for (const item of pageData) {
      if (meaningful.length >= MAX_COMMITS) break;
      if (isMergeCommit(item.parents)) continue;
      const message = item.commit.message.split("\n")[0];
      if (isNoiseCommit(message)) continue;
      meaningful.push(item);
    }

    page++;
  }

  const totalCount = raw.length;
  const capped = meaningful.length >= MAX_COMMITS || (hasMore && page > MAX_PAGES);

  const toFetch = meaningful.slice(0, MAX_COMMITS);

  // Fetch commit details concurrently with concurrency limit
  const limit = pLimit(10);
  const results = await Promise.all(
    toFetch.map((item) =>
      limit(async (): Promise<CommitData | null> => {
        const { data: full } = await octokit.rest.repos.getCommit({
          owner,
          repo,
          ref: item.sha,
        });

        const filesChanged: FileChange[] = (full.files ?? []).map((f) => ({
          filename: f.filename,
          status: f.status ?? "modified",
          additions: f.additions,
          deletions: f.deletions,
          patch: f.patch ? f.patch.slice(0, 500) : undefined,
        }));

        // Skip if ALL files are ignorable
        const nonIgnoredFiles = filesChanged.filter(
          (f) => !shouldIgnoreFile(f.filename, f.patch),
        );
        if (filesChanged.length > 0 && nonIgnoredFiles.length === 0) return null;

        const message = item.commit.message.split("\n")[0];
        return {
          sha: item.sha,
          message,
          author:
            item.commit.author?.name ??
            item.author?.login ??
            "Unknown",
          date: item.commit.author?.date ?? new Date().toISOString(),
          filesChanged,
          additions: full.stats?.additions ?? 0,
          deletions: full.stats?.deletions ?? 0,
        };
      }),
    ),
  );

  const commits = results.filter((c): c is CommitData => c !== null);
  return { commits, totalCount, capped };
}
