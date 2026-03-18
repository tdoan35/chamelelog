# Phase 2: AI Pipeline

## Deliverable

The `/api/generate` endpoint accepts a repo + date range, fetches commits, analyzes diffs, classifies changes, and returns a structured changelog via SSE streaming. Can be tested with curl or a simple fetch call.

## Dependencies

Phase 1 must be complete: auth works, database schema is in place, projects can be connected.

## Tasks

### 2.1 — GitHub commit fetching

Create `src/lib/github/client.ts`:

```typescript
import { Octokit } from "octokit";

export function createGitHubClient(accessToken: string) {
  return new Octokit({ auth: accessToken });
}
```

Create `src/lib/github/commits.ts`:

```typescript
// Fetches commits for a repo within a date range
// Returns filtered, enriched commit objects

interface CommitData {
  sha: string;
  message: string;
  author: string;
  date: string;
  filesChanged: FileChange[];
  additions: number;
  deletions: number;
}

interface FileChange {
  filename: string;
  status: string; // "added" | "modified" | "removed" | "renamed"
  additions: number;
  deletions: number;
  patch?: string; // First 500 chars of the diff for context
}
```

The fetch function should:

1. Call `GET /repos/{owner}/{repo}/commits` with `since` and `until` params
2. For each commit, call `GET /repos/{owner}/{repo}/commits/{sha}` to get full details including files changed and diff stats
3. Apply filters to remove noise (see filtering rules below)
4. Return the filtered, enriched array

**Commit filtering rules** — remove commits where:
- It's a merge commit (2+ parents)
- ALL files changed are in the ignore list (see below)
- The commit message matches noise patterns (see below)

**File ignore patterns** (commit is only filtered if ALL its files match):
```
package-lock.json
yarn.lock
pnpm-lock.yaml
.gitignore
.env.example
*.md (except README.md and CHANGELOG.md)
.github/workflows/*
.eslintrc*
.prettierrc*
tsconfig.json (only if the diff is trivial — <5 lines changed)
```

**Commit message noise patterns** (regex):
```
/^Merge (branch|pull request)/i
/^(chore|ci|style)\(deps\)/i
/^bump /i
/^auto-merge/i
/^Initial commit$/i
```

**Important**: Do NOT over-filter. When in doubt, keep the commit. The LLM can ignore irrelevant commits during classification, but it can't recover commits you threw away. The filter should only remove things that are obviously noise.

**Rate limiting**: GitHub API has a rate limit of 5,000 requests/hour for authenticated users. Fetching full commit details requires 1 request per commit. For repos with many commits, implement a cap: fetch details for the first 100 commits, warn the user if there are more. In practice, a few days of commits rarely exceed 50-100 for most repos.

### 2.2 — Smart date range detection

Create `src/lib/github/tags.ts`:

```typescript
// Fetches the most recent tags for a repo
// Used to provide smart defaults for the date range picker

interface TagInfo {
  name: string;       // e.g. "v2.3.0"
  sha: string;
  date: string;       // ISO date of the tagged commit
}

export async function getRecentTags(
  octokit: Octokit,
  owner: string,
  repo: string,
  limit: number = 10
): Promise<TagInfo[]>
```

Use `GET /repos/{owner}/{repo}/tags` and then `GET /repos/{owner}/{repo}/git/tags/{sha}` for annotated tags to get dates. For lightweight tags, use the commit date.

This will power the smart defaults in the generate form:
- Default "from": date of the most recent tag
- Default "to": now
- Presets: "Since last release", "Last 7 days", "Last 14 days", "Last 30 days", "Custom"

### 2.3 — AI pipeline orchestrator

Create `src/lib/ai/pipeline.ts`:

```typescript
import { classifyCommits } from "./classify";
import { summarizeChanges } from "./summarize";
import { fetchFilteredCommits } from "../github/commits";

export interface PipelineInput {
  accessToken: string;
  repoOwner: string;
  repoName: string;
  fromDate: string;
  toDate: string;
  tone?: "technical" | "product" | "enterprise"; // Default: "technical"
}

export interface ChangelogCategory {
  category: "features" | "improvements" | "fixes" | "breaking";
  entries: ChangelogEntry[];
}

export interface ChangelogEntry {
  title: string;         // Short one-liner: "Added OAuth 2.0 support"
  description?: string;  // Optional elaboration
  commits: string[];     // SHAs of contributing commits
}

export interface PipelineResult {
  categories: ChangelogCategory[];
  rawMarkdown: string;
  commitCount: number;
  filteredCount: number; // How many commits were filtered out
}
```

The pipeline orchestrator:
1. Calls Stage 1 (fetch + filter commits)
2. If no commits remain after filtering, return early with empty result
3. Calls Stage 2 (classify) with the filtered commits
4. Calls Stage 3 (summarize) with the classified groups, streaming the output
5. Assembles and returns the final structured result

### 2.4 — Stage 2: Classify commits

Create `src/lib/ai/classify.ts`:

This stage takes the filtered commits and asks the LLM to:
- Group them into categories (features, improvements, fixes, breaking)
- Cluster related commits together (e.g., 5 commits for "add OAuth" become 1 cluster)
- Exclude purely internal changes (refactors, test-only changes) unless they affect public behavior

**Input to LLM**: A formatted list of commits, each showing:
```
Commit: abc1234
Message: Add rate limiting to auth endpoints
Files: src/api/auth.ts (+45 -12), src/middleware/rateLimit.ts (+30 -0, new file)
```

**Expected output**: Structured JSON (use Zod for validation):

```typescript
const ClassificationSchema = z.object({
  groups: z.array(z.object({
    category: z.enum(["features", "improvements", "fixes", "breaking"]),
    clusters: z.array(z.object({
      summary: z.string(), // Brief description of the logical change
      commitShas: z.array(z.string()),
    })),
  })),
  excluded: z.array(z.object({
    commitShas: z.array(z.string()),
    reason: z.string(), // Why these were excluded (e.g., "internal refactor")
  })),
});
```

Create `src/lib/ai/prompts.ts` and put the classification prompt there:

```typescript
export const CLASSIFY_SYSTEM_PROMPT = `You are a changelog classifier for a software project. Your job is to analyze Git commits and group them into categories for a public changelog.

RULES:
1. Each commit belongs to exactly ONE category or is excluded.
2. Related commits should be clustered together. Multiple commits that contribute to the same logical change become a single cluster.
3. Categories:
   - features: New user-facing capabilities or endpoints
   - improvements: Enhancements to existing features (performance, UX, expanded functionality)  
   - fixes: Bug fixes
   - breaking: Changes that break backward compatibility (removed endpoints, changed behavior, renamed config)
4. Exclude commits that are purely internal: test-only changes, refactors with no user-facing impact, documentation updates, dependency bumps that don't change behavior.
5. When in doubt between "feature" and "improvement", ask: does this add something that didn't exist before (feature) or make something existing better (improvement)?
6. Pay attention to the FILES CHANGED, not just the commit message. A commit message saying "refactor" that changes API response shapes is a BREAKING change.

Respond with ONLY valid JSON matching the schema. No markdown, no explanation.`;
```

Use `generateObject` from the Vercel AI SDK with the Zod schema for guaranteed structured output:

```typescript
import { generateObject } from "ai";
import { model } from "@/lib/ai-client";

const result = await generateObject({
  model,
  schema: ClassificationSchema,
  system: CLASSIFY_SYSTEM_PROMPT,
  prompt: formatCommitsForClassification(commits),
});
```

### 2.5 — Stage 3: Summarize for users

Create `src/lib/ai/summarize.ts`:

This stage takes each classified cluster and generates user-facing changelog entries. This is the stage where tone matters.

**Tone prompts** in `src/lib/ai/prompts.ts`:

```typescript
export const TONE_PROMPTS = {
  technical: `Write changelog entries for developers who read API docs and source code.
Include: endpoint names, config property names, specific technical details.
Example: "Added rate limiting to /api/auth/* endpoints (default: 100 req/min, configurable via RATE_LIMIT_MAX env var)"`,

  product: `Write changelog entries for product managers and non-technical stakeholders.
Focus on user-facing outcomes and business value, not implementation.
Example: "Login is now faster and more secure with automatic session management"`,

  enterprise: `Write changelog entries for enterprise buyers and compliance teams.
Emphasize: security improvements, compliance implications, reliability, backward compatibility.
Example: "Authentication now supports PKCE flow, meeting SOC 2 session management requirements"`,
};

export function getSummarizeSystemPrompt(tone: string): string {
  const toneInstruction = TONE_PROMPTS[tone as keyof typeof TONE_PROMPTS] || TONE_PROMPTS.technical;
  
  return `You are a changelog writer. Your job is to turn classified commit clusters into clear, concise changelog entries for end users.

RULES:
1. Each cluster becomes exactly ONE changelog entry.
2. Start each entry with an active verb: "Added", "Fixed", "Improved", "Removed", "Changed".
3. The title should be ONE sentence, max 100 characters.
4. Optionally add a description (1-2 sentences) with more detail. Only add a description if the change is significant enough to warrant it.
5. Write for people who USE this software but DON'T know the codebase.
6. Never mention commit SHAs, file paths, or internal function names in the title.
7. If a cluster's commits are trivial (typo fix, minor style change), keep the entry brief.

TONE:
${toneInstruction}

Respond with ONLY valid JSON matching the schema. No markdown, no explanation.`;
}
```

Output schema:

```typescript
const SummarizeSchema = z.object({
  entries: z.array(z.object({
    category: z.enum(["features", "improvements", "fixes", "breaking"]),
    title: z.string(),
    description: z.string().optional(),
    commitShas: z.array(z.string()),
  })),
});
```

### 2.6 — Streaming API endpoint

Create `src/app/api/generate/route.ts`:

This is the main generation endpoint. It:
1. Validates the request (Zod)
2. Gets the user's GitHub token
3. Runs the pipeline
4. Streams Stage 3 results back via SSE
5. After streaming completes, saves the draft changelog to the database

**Request body**:
```typescript
const GenerateRequestSchema = z.object({
  projectId: z.string(),
  fromDate: z.string().datetime(),
  toDate: z.string().datetime(),
  fromRef: z.string().optional(),
  toRef: z.string().optional(),
  tone: z.enum(["technical", "product", "enterprise"]).default("technical"),
});
```

**SSE event format**:
```
event: status
data: {"stage": "fetching", "message": "Fetching commits..."}

event: status
data: {"stage": "classifying", "message": "Analyzing 47 commits..."}

event: status  
data: {"stage": "summarizing", "message": "Writing changelog entries..."}

event: entry
data: {"category": "features", "title": "Added OAuth 2.0 support", "description": "..."}

event: entry
data: {"category": "fixes", "title": "Fixed session timeout on mobile", "description": null}

event: complete
data: {"changelogId": "cl_abc123", "commitCount": 47, "filteredCount": 12}

event: error
data: {"message": "GitHub API rate limit exceeded"}
```

Use the Next.js streaming response pattern:

```typescript
export async function POST(req: Request) {
  // ... validation, auth ...
  
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: object) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };
      
      try {
        send("status", { stage: "fetching", message: "Fetching commits..." });
        const commits = await fetchFilteredCommits(/* ... */);
        
        send("status", { stage: "classifying", message: `Analyzing ${commits.length} commits...` });
        const classified = await classifyCommits(commits);
        
        send("status", { stage: "summarizing", message: "Writing changelog entries..." });
        const entries = await summarizeChanges(classified, tone);
        
        // Send each entry as it's generated
        for (const entry of entries) {
          send("entry", entry);
        }
        
        // Save to database
        const changelog = await saveChangelog(/* ... */);
        
        send("complete", { changelogId: changelog.id, commitCount: commits.length });
      } catch (error) {
        send("error", { message: error.message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
```

### 2.7 — Markdown rendering

Create a utility function that converts the structured JSON content into markdown:

```typescript
// src/lib/markdown.ts

const CATEGORY_LABELS: Record<string, string> = {
  breaking: "🚨 Breaking Changes",
  features: "✨ New Features",
  improvements: "💪 Improvements",
  fixes: "🐛 Bug Fixes",
};

const CATEGORY_ORDER = ["breaking", "features", "improvements", "fixes"];

export function contentToMarkdown(content: ChangelogCategory[]): string {
  // Renders grouped entries as markdown with category headers
  // Used for rawContent storage and markdown export
}

export function contentToJson(content: ChangelogCategory[]): object {
  // Returns the structured JSON for storage in content field
}
```

## Acceptance criteria

- [ ] `POST /api/generate` accepts a projectId + date range and streams SSE events
- [ ] Commits are fetched from GitHub with full diff stats
- [ ] Merge commits, lockfile-only changes, and noise patterns are filtered out
- [ ] LLM correctly classifies commits into categories
- [ ] Related commits are clustered into single changelog entries
- [ ] LLM generates user-facing summaries (not developer-facing commit messages)
- [ ] Results are saved as a draft changelog in the database
- [ ] SSE events can be consumed by a client (test with EventSource in browser console)
- [ ] Errors (bad repo, auth failure, rate limit) are handled gracefully with error events
- [ ] Pipeline works on a real public GitHub repo (test with a well-known repo)

> **Note**: Phase 2 is backend-only (no UI). No design check needed. The SSE event format defined here will be consumed by the streaming output UI in Phase 3 — refer to `docs/design/chamelelog-design.pen` screen 04 for the expected visual output of those events.
