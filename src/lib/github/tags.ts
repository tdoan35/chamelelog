import { Octokit } from "octokit";

export interface TagInfo {
  name: string;
  sha: string;
  date: string;
}

export async function getRecentTags(
  octokit: Octokit,
  owner: string,
  repo: string,
  limit: number = 10,
): Promise<TagInfo[]> {
  const { data: tags } = await octokit.rest.repos.listTags({
    owner,
    repo,
    per_page: limit,
  });

  const tagInfos: TagInfo[] = [];

  for (const tag of tags) {
    let date: string;

    try {
      // Try to get annotated tag info
      const { data: gitTag } = await octokit.rest.git.getTag({
        owner,
        repo,
        tag_sha: tag.commit.sha,
      });
      date = gitTag.tagger?.date ?? new Date().toISOString();
    } catch {
      // Lightweight tag — use the commit date instead
      try {
        const { data: commit } = await octokit.rest.repos.getCommit({
          owner,
          repo,
          ref: tag.commit.sha,
        });
        date = commit.commit.author?.date ?? new Date().toISOString();
      } catch {
        date = new Date().toISOString();
      }
    }

    tagInfos.push({
      name: tag.name,
      sha: tag.commit.sha,
      date,
    });
  }

  // Sort by date descending
  tagInfos.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  return tagInfos;
}
