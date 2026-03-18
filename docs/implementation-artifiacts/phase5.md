# Phase 5: Polish + Nice-to-Haves

## Deliverable

The app is submission-ready: all nice-to-have features that time allows are implemented, the README is complete, edge cases are handled, and the app is ready for a screen recording.

## Dependencies

Phases 1-4 must be complete and working end-to-end.

## Nice-to-have features (implement in order, stop when time runs out)

Each feature below is self-contained. Implement them in priority order. The project is submission-ready after Phase 4 — everything here is bonus.

---

### 5.1 — AI chat widget on public changelog page

**Why**: Greptile has this exact feature on their own changelog page. Building it shows you did your homework and can build the features they value.

**Implementation**:

Create `src/components/public/chat-widget.tsx`:

A collapsible chat widget pinned to the bottom-right of the public changelog page.

**UI** (see design screens 06 and 07):

- **Collapsed state**: Green-to-blue gradient FAB pill (`#10B981` → `#3B82F6`, 135°) with `message-circle` icon + "Ask about changes" text. Green glow shadow. On mobile: circle with icon only (56px).
- **Expanded state**: A floating chat panel (420px wide, ~520px tall) with:
  - `$bg-surface` background, 12px corner radius, 1px `$border` stroke, large drop shadow
  - Header: green `message-circle` icon + "Ask about changes" text + close X button, separated by bottom border
  - Message list with scroll:
    - User messages: right-aligned, green (`$accent-green`) rounded bubbles with dark green text (`#022C22`). Asymmetric corner radius (top-right sharp).
    - AI messages: left-aligned with gradient avatar (24px circle, sparkles icon), dark bubble (`$bg-page`) with 1px border. Asymmetric corner radius (bottom-left sharp).
  - Input bar at bottom: bordered separator, input field with "Ask a question..." placeholder, green send button (32px square, `arrow-up` icon)
- Smooth open/close animation (scale + opacity, 200ms)

**Backend**:

Create `src/app/api/chat/route.ts`:

This endpoint:
1. Loads the last 20 published changelog entries from the database
2. Formats them as context in the system prompt
3. Streams a response using the Vercel AI SDK's `streamText`

```typescript
import { streamText } from "ai";
import { model } from "@/lib/ai-client";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const { messages } = await req.json();

  // Load changelog context
  const changelogs = await db.changelog.findMany({
    where: { status: "published" },
    orderBy: { publishedAt: "desc" },
    take: 20,
  });

  const context = changelogs
    .map((cl) => `[${cl.publishedAt?.toISOString().split("T")[0]}] ${cl.title}\n${cl.rawContent}`)
    .join("\n\n---\n\n");

  const result = streamText({
    model,
    system: `You are a helpful assistant that answers questions about a software project's changelog. Here are the recent changelog entries:\n\n${context}\n\nAnswer questions based ONLY on this changelog data. If the answer isn't in the changelogs, say so. Be concise.`,
    messages,
  });

  return result.toDataStreamResponse();
}
```

**Client-side**: Use the Vercel AI SDK's `useChat` hook for the chat interface:

```typescript
"use client";

import { useChat } from "ai/react";

export function ChatWidget() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: "/api/chat",
  });
  // ... render UI
}
```

**Design**: The widget should feel lightweight — not like a full support chat. Uses the same dark surface treatment as the rest of the app. The gradient FAB and AI avatar tie it to the Chamelelog brand. Fast to open, fast to respond.

---

### 5.2 — Webhook agent (auto-generate on new tag)

**Why**: Turns the tool from "developer has to remember to use it" to "it works automatically." Strong signal for Greptile — their product is about automating developer workflows.

**Implementation**:

Create `src/app/api/webhook/route.ts`:

Handles GitHub webhook events for the `create` event (fired when a tag is pushed).

```typescript
import crypto from "crypto";
import { db } from "@/lib/db";
import { runPipeline } from "@/lib/ai/pipeline";
import { getGitHubToken } from "@/lib/auth";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("x-hub-signature-256");

  // Verify webhook signature
  const expected = `sha256=${crypto
    .createHmac("sha256", process.env.GITHUB_WEBHOOK_SECRET!)
    .update(body)
    .digest("hex")}`;

  if (signature !== expected) {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = req.headers.get("x-github-event");
  const payload = JSON.parse(body);

  // Only handle tag creation events
  if (event !== "create" || payload.ref_type !== "tag") {
    return Response.json({ ok: true, skipped: true });
  }

  const repoOwner = payload.repository.owner.login;
  const repoName = payload.repository.name;
  const tagName = payload.ref; // e.g., "v2.3.0"

  // Find the project in our database
  const project = await db.project.findFirst({
    where: { repoOwner, repoName },
    include: { user: true },
  });

  if (!project) {
    return Response.json({ ok: true, skipped: true, reason: "Project not tracked" });
  }

  // Get the user's GitHub token
  const accessToken = await getGitHubToken(project.userId);
  if (!accessToken) {
    return Response.json({ error: "No GitHub token" }, { status: 500 });
  }

  // Determine the date range: from previous tag to this tag
  // Fetch the previous tag's date, or use 14 days ago as fallback
  // ... (use getRecentTags from Phase 2)

  // Run the pipeline (non-streaming — this is a background job)
  const result = await runPipeline({
    accessToken,
    repoOwner,
    repoName,
    fromDate: previousTagDate,
    toDate: new Date().toISOString(),
    tone: "technical",
  });

  // Save as a pending_review draft
  const changelog = await db.changelog.create({
    data: {
      projectId: project.id,
      userId: project.userId,
      title: `Release ${tagName}`,
      content: JSON.stringify(result.categories),
      rawContent: result.rawMarkdown,
      status: "pending_review",
      fromDate: new Date(previousTagDate),
      toDate: new Date(),
      fromRef: previousTagName,
      toRef: tagName,
      commitCount: result.commitCount,
      version: tagName,
    },
  });

  return Response.json({ ok: true, changelogId: changelog.id });
}
```

**Dashboard integration**:
- On the changelog list page, `pending_review` changelogs should appear with a distinct badge: "Auto-generated · Needs review"
- Add a filter tab for "Pending review" alongside "All", "Drafts", "Published"
- Clicking opens the normal editor where the dev can review and publish

**Setup instructions** (for the README):
1. In your GitHub repo settings → Webhooks → Add webhook
2. Payload URL: `https://your-domain/api/webhook`
3. Content type: `application/json`
4. Secret: your `GITHUB_WEBHOOK_SECRET` value
5. Events: select "Branch or tag creation"

---

### 5.3 — Tone/audience configuration

**Why**: Shows product thinking — the same commits tell different stories to different audiences.

If not already implemented in Phase 3 (the form has the UI but may only have "Technical"), complete the full implementation:

1. Enable all three tone options in the generate form: Technical, Product, Enterprise
2. Ensure the tone is passed through to Stage 3 of the pipeline
3. Add a "Regenerate with different tone" feature on the editor page:
   - Three buttons or a dropdown: "Regenerate as Technical / Product / Enterprise"
   - This only re-runs Stage 3 (summarize), NOT Stages 1-2
   - The classified commit groups are cached/saved, so regeneration is fast
   - Show a confirmation dialog: "This will replace the current entries. Continue?"

**Implementation detail for re-running Stage 3 only**:

Store the Stage 2 classification result alongside the changelog:

Add to the Prisma schema:
```prisma
model Changelog {
  // ... existing fields ...
  classificationData String? // JSON string of Stage 2 output, used for tone regeneration
}
```

When generating, save the classification output. When regenerating with a new tone, load it and skip to Stage 3.

---

### 5.4 — Breaking change detection

**Why**: Shows deep understanding of developer tool workflows. Breaking changes are the most important thing in a changelog.

Enhance Stage 2 classification with heuristic signals before sending to the LLM:

```typescript
function detectBreakingSignals(commit: CommitData): string[] {
  const signals: string[] = [];

  for (const file of commit.filesChanged) {
    // Deleted files in public-facing directories
    if (file.status === "removed" && isPublicFacing(file.filename)) {
      signals.push(`Deleted public file: ${file.filename}`);
    }
    // Changes to API route files
    if (file.filename.match(/\/(api|routes|endpoints)\//)) {
      signals.push(`Modified API surface: ${file.filename}`);
    }
    // Changes to config/schema files
    if (file.filename.match(/(schema|config|openapi|swagger)\.(ts|js|json|yaml|yml)$/)) {
      signals.push(`Modified schema/config: ${file.filename}`);
    }
    // Large deletions in public files
    if (file.deletions > 20 && isPublicFacing(file.filename)) {
      signals.push(`Large deletion (${file.deletions} lines) in ${file.filename}`);
    }
  }

  // Commit message signals
  if (commit.message.match(/\bBREAKING\b/i)) {
    signals.push("Commit message contains BREAKING");
  }
  if (commit.message.match(/\bremov(e|ed|ing)\b/i) && commit.message.match(/\b(api|endpoint|field|param)/i)) {
    signals.push("Commit message suggests API removal");
  }

  return signals;
}
```

Include these signals in the Stage 2 prompt as additional context:
```
Commit: abc1234
Message: Remove deprecated v1 endpoints
Files: src/api/v1/users.ts (removed), src/api/v1/posts.ts (removed)
⚠️ BREAKING SIGNALS: Deleted public file: src/api/v1/users.ts, Deleted public file: src/api/v1/posts.ts, Commit message suggests API removal
```

This helps the LLM make better classification decisions and reduces false negatives for breaking changes.

---

### 5.5 — Markdown export

Add a "Copy as markdown" button to the changelog editor that copies the rendered markdown to the clipboard.

Add a "Download as markdown" option that downloads a `.md` file.

The markdown format:
```markdown
# v2.3.0 — March 17, 2026

## 🚨 Breaking Changes

- **Removed v1 API endpoints** — The deprecated `/api/v1/*` endpoints have been removed. Migrate to `/api/v2/*`.

## ✨ New Features

- **Added OAuth 2.0 support** — Users can now sign in with Google, GitHub, or email magic links.

## 🐛 Bug Fixes

- **Fixed session timeout on mobile browsers** — Sessions now persist correctly across app backgrounding.
```

---

### 5.6 — Semantic version suggestion

After the classification in Stage 2, suggest a version number based on the types of changes:
- If any `breaking` entries: suggest major bump (v2.x.x → v3.0.0)
- If any `features` entries: suggest minor bump (v2.3.x → v2.4.0)
- Otherwise (only fixes/improvements): suggest patch bump (v2.3.0 → v2.3.1)

Display the suggestion in the editor as a subtle hint next to the version field: "Suggested: v2.4.0 (new features detected)"

---

## Final polish checklist

Before recording the demo:

- [ ] All pages have proper `<title>` and meta tags
- [ ] Loading states use skeletons, not spinners
- [ ] Error states are handled with clear messages (not raw error objects)
- [ ] Empty states have proper illustrations or messaging
- [ ] Dark mode works consistently across all pages
- [ ] Mobile responsive: dashboard sidebar collapses, public page adapts
- [ ] No console errors in production build
- [ ] `pnpm build` succeeds without warnings
- [ ] `.env.example` is accurate and well-commented
- [ ] Seed script creates compelling demo data
- [ ] README has: setup instructions, architecture explanation, screen recording, AI tools mention

## README template

```markdown
# Chamelelog

AI-powered changelog generation from Git commits. Adapts to any audience — just like a chameleon.

[Screenshot or GIF here]

## Quick start

\`\`\`bash
git clone https://github.com/your-username/chamelelog
cd chamelelog
cp .env.example .env.local    # Fill in your API keys
pnpm install
pnpm db:push
pnpm db:seed                  # Optional: load sample data
pnpm dev
\`\`\`

## How it works

1. Connect your GitHub repository
2. Select a date range (auto-detects your last release)
3. AI analyzes your commits and generates a categorized changelog
4. Review, edit, and publish to a public changelog page

## Architecture

### AI Pipeline

[Brief description of the 3-stage pipeline and why it matters]

### Tech decisions

- **SQLite**: Zero-config for local development. Swap to Postgres via `DATABASE_URL` for production.
- **OpenRouter**: Model flexibility while defaulting to Claude (Greptile's own AI provider).
- **Vercel AI SDK**: Built-in streaming and structured output support.

### AI tools used

[List any AI tools used during development, e.g., Claude, Cursor, etc.]
\`\`\`
```

## Screen recording tips

- Keep it to ~30-60 seconds
- Show the happy path: connect repo → generate (show streaming) → quick edit → publish → view public page
- Use a clean browser with no extensions visible
- If you implemented the chat widget, show a quick question at the end
- Use a real repo with real commits for an authentic demo
