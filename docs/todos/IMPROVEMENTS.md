# Chamelelog — Code Review & Improvement Handoff

## Context

This is an AI-powered changelog generator built as a take-home project for Greptile (developer tools company). The submission is evaluated on: does it work, backend logic, user-centered design, visual quality, and developer UX. The codebase is ~6k lines of TypeScript across a Next.js 16 app with Prisma/SQLite, NextAuth, and OpenRouter for AI.

**Repository**: https://github.com/tdoan35/chamelelog

---

## Priority 1 — Fix before submitting (these would likely be caught by reviewers)

### 1.1 N+1 GitHub API calls in `src/lib/github/commits.ts`

**Problem**: `fetchFilteredCommits` fetches the commit list, then loops through each commit calling `octokit.rest.repos.getCommit()` individually to get file details. For 100 commits, that's 100 sequential HTTP requests to GitHub's API. This is slow (~30-60s) and burns through rate limits (5,000/hr for authenticated users).

**File**: `src/lib/github/commits.ts`, lines 92-133

**Fix**: Use `Promise.all` with a concurrency limiter (e.g., `p-limit` with concurrency of 10) to parallelize the detail fetches. Alternatively, switch to the GitHub GraphQL API which can return commits with file change data in a single request.

```typescript
// Example approach with p-limit:
import pLimit from "p-limit";

const limit = pLimit(10);

const detailPromises = toFetch
  .filter((item) => !isMergeCommit(item.parents) && !isNoiseCommit(item.commit.message.split("\n")[0]))
  .map((item) =>
    limit(async () => {
      const { data: full } = await octokit.rest.repos.getCommit({
        owner, repo, ref: item.sha,
      });
      // ... rest of processing
      return commitData;
    })
  );

const results = await Promise.all(detailPromises);
const commits = results.filter(Boolean);
```

**Same issue in**: `src/lib/github/tags.ts` — sequential API calls per tag in `getRecentTags`. Apply the same concurrency pattern.

### 1.2 Regeneration passes empty commits array

**Problem**: In `src/app/api/changelogs/[id]/regenerate/route.ts` line 55:

```typescript
const summarized = await summarizeChanges(classification, [], parsed.data.tone);
```

The empty array means `formatClustersForSummarization` in `summarize.ts` can't look up original commit messages by SHA. The LLM only gets cluster summaries from Stage 2, not the actual commit messages. This degrades regeneration quality compared to initial generation.

**Fix**: Either:
- Store the filtered commits (or at least their messages + SHAs) alongside `classificationData` in the changelog record, and pass them during regeneration.
- Or, accept this limitation but add a comment documenting why, so it doesn't look like a bug.

The first option is better — add a `commitData` JSON column to the Changelog model:

```prisma
model Changelog {
  // ... existing fields
  commitData         String? // JSON array of { sha, message } for regeneration
}
```

Save it during generation in `src/app/api/generate/route.ts`, then load and pass it during regeneration.

### 1.3 Autosave doesn't flush on unmount

**Problem**: In `src/components/dashboard/changelog-editor.tsx`, the autosave uses a 3-second debounce. The cleanup effect (line 140-143) clears the timer but doesn't trigger the pending save. If a user edits then immediately navigates away, their last edit is silently lost.

**Fix**: Flush the save on unmount:

```typescript
useEffect(() => {
  return () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      // Flush pending save — use the latest state via refs
      // (need to store latest categories/title/version in refs)
    }
  };
}, []);
```

You'll need to keep refs for the latest `categories`, `title`, and `version` values since the cleanup closure won't have access to current state. Use a pattern like:

```typescript
const latestRef = useRef({ categories, title, version });
useEffect(() => {
  latestRef.current = { categories, title, version };
}, [categories, title, version]);

useEffect(() => {
  return () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      const { categories, title, version } = latestRef.current;
      save(categories, title, version); // fire-and-forget
    }
  };
}, [save]);
```

---

## Priority 2 — Strengthen the submission

### 2.1 Add error resilience to SSE stream parsing

**Problem**: In `src/hooks/use-changelog-stream.ts` line 66, `JSON.parse(line.slice(6))` will throw if the server sends malformed JSON, killing the entire stream.

**Fix**: Wrap in try/catch:

```typescript
} else if (line.startsWith("data: ") && eventType) {
  try {
    const data = JSON.parse(line.slice(6));
    // ... handle events
  } catch {
    console.warn("Failed to parse SSE event:", line);
  }
  eventType = "";
}
```

### 2.2 Add pagination for GitHub commits API

**Problem**: `fetchFilteredCommits` only fetches one page (`per_page: 100`). Repos with high commit velocity over the selected date range will silently miss commits.

**Fix**: Use Octokit's pagination helper:

```typescript
const commitList = await octokit.paginate(
  octokit.rest.repos.listCommits,
  { owner, repo, since, until, per_page: 100 },
  (response, done) => {
    // Stop after MAX_COMMITS total
    if (response.data.length >= MAX_COMMITS) done();
    return response.data;
  }
);
```

### 2.3 Add token budget to chat endpoint

**Problem**: `src/app/api/chat/route.ts` loads up to 20 full changelogs as context with no size limiting. Extensive changelogs could exceed the model's context window.

**Fix**: Add a character budget:

```typescript
const MAX_CONTEXT_CHARS = 30_000;

let context = "";
for (const cl of changelogs) {
  const entry = `## ${cl.title} (${cl.version ?? "unversioned"}) — ${date} [${repo}]\n\n${cl.rawContent}`;
  if (context.length + entry.length > MAX_CONTEXT_CHARS) break;
  context += entry + "\n\n---\n\n";
}
```

### 2.4 Deploy to Vercel (with database migration)

**Problem**: No live demo link. A working deployment significantly strengthens the submission. GitHub Pages won't work (static only). Vercel is the natural fit for Next.js.

**Steps**:
1. SQLite won't work on Vercel's serverless environment. Migrate to **Turso** (SQLite-compatible, has a free tier) or **Neon** (Postgres, also free tier).
2. For Turso: swap the Prisma datasource to `provider = "sqlite"` with `@prisma/adapter-libsql`, or use Drizzle.
3. For Neon: change Prisma provider to `postgresql` and update the schema (minimal changes — mainly DateTime handling).
4. Set environment variables in Vercel dashboard.
5. Update the GitHub OAuth callback URL to the Vercel domain.
6. Add the live URL to the README.

Turso is the easier migration since you're already on SQLite — the schema stays identical.

---

## Priority 3 — Polish and nice-to-haves

### 3.1 Extract duplicated `parseContent` utility

**Problem**: `parseContent` is copy-pasted in `changelog-editor.tsx` and `changelog-feed.tsx`.

**Fix**: Move to `src/lib/utils.ts` or a new `src/lib/content.ts`:

```typescript
export function parseContent(content: string | null): ChangelogCategory[] {
  if (!content) return [];
  try {
    const parsed = JSON.parse(content);
    return parsed.categories ?? [];
  } catch {
    return [];
  }
}
```

### 3.2 Reorder category priority

**Current**: features → fixes → improvements → breaking

**Suggested**: features → improvements → fixes → breaking

This matches the convention used by Stripe, Twilio (the examples in the project brief), and most popular changelogs. Breaking changes at the end is standard since they're the most disruptive and readers expect them flagged separately.

**File**: `src/lib/category-colors.ts`, update `CATEGORY_ORDER`.

### 3.3 Bump category background opacity

**Problem**: Category card backgrounds use `08` hex alpha (e.g., `#10B98108`) — that's 3% opacity, essentially invisible.

**Fix**: Bump to `12` or `15` (7-8% opacity) for light mode. In `src/lib/category-colors.ts`:

```typescript
features: { label: "New Features", color: "#10B981", bg: "#10B98115" },
fixes: { label: "Bug Fixes", color: "#F59E0B", bg: "#F59E0B15" },
improvements: { label: "Improvements", color: "#3B82F6", bg: "#3B82F615" },
breaking: { label: "Breaking Changes", color: "#EF4444", bg: "#EF444415" },
```

### 3.4 Add loading/error states for preferences fetch

**Problem**: In `src/app/(dashboard)/changelogs/new/page.tsx` line 73-84, the preferences fetch silently swallows errors with `.catch(() => {})`. If the fetch fails, the user gets default values with no indication anything went wrong.

**Fix**: This is fine for defaults, but add a comment explaining the intentional fallback behavior so it doesn't look like oversight.

### 3.5 Consider adding a `updatedAt` index to Changelog

For the public changelog page and feeds, you query `orderBy: { publishedAt: "desc" }`. As the changelog table grows, this benefits from an index. Add to the Prisma schema:

```prisma
model Changelog {
  // ... existing fields
  @@index([status, publishedAt])
}
```

---

## Summary of files to modify

| File | Changes |
|------|---------|
| `src/lib/github/commits.ts` | Add concurrent fetching with `p-limit` |
| `src/lib/github/tags.ts` | Same concurrency fix |
| `src/app/api/changelogs/[id]/regenerate/route.ts` | Pass stored commit data instead of empty array |
| `src/app/api/generate/route.ts` | Store commit data in changelog record |
| `prisma/schema.prisma` | Add `commitData` column, add index |
| `src/components/dashboard/changelog-editor.tsx` | Flush autosave on unmount |
| `src/hooks/use-changelog-stream.ts` | Try/catch around JSON.parse in SSE parsing |
| `src/app/api/chat/route.ts` | Add token/character budget for context |
| `src/lib/category-colors.ts` | Reorder categories, bump bg opacity |
| `src/lib/utils.ts` or new `src/lib/content.ts` | Extract shared `parseContent` |
| `package.json` | Add `p-limit` dependency |

---

## Dependencies to add

- `p-limit` — for concurrent GitHub API calls
- If deploying to Vercel: `@libsql/client` + `@prisma/adapter-libsql` (for Turso) or update to `pg` driver (for Neon)
