import { Octokit } from "octokit";

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
  // Fetch commit list
  const { data: commitList } = await octokit.rest.repos.listCommits({
    owner,
    repo,
    since,
    until,
    per_page: 100,
  });

  const totalCount = commitList.length;
  const capped = totalCount > MAX_COMMITS;
  const toFetch = commitList.slice(0, MAX_COMMITS);

  const commits: CommitData[] = [];

  for (const item of toFetch) {
    // Skip merge commits
    if (isMergeCommit(item.parents)) continue;

    // Skip noise messages
    const message = item.commit.message.split("\n")[0]; // First line only
    if (isNoiseCommit(message)) continue;

    // Fetch full commit details
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
    if (filesChanged.length > 0 && nonIgnoredFiles.length === 0) continue;

    commits.push({
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
    });
  }

  return { commits, totalCount, capped };
}
