# Phase 5: Dashboard Settings + Polish

## Deliverable

The dashboard settings page is fully functional, and all remaining nice-to-have features that time allows are implemented. The app is submission-ready with a complete README, handled edge cases, and ready for a screen recording.

## Dependencies

Phases 1-4 must be complete and working end-to-end.

## Design Reference

Design screens `12` (dark) and `12L` (light) in `docs/design/chamelelog-design.pen`.

---

## Dashboard: Settings Page

### 5.0a — Settings page shell

Create `src/app/(dashboard)/settings/page.tsx`:

Server component that fetches the current user's account info, connected projects, and user preferences. Requires authentication (redirect to `/login` if unauthenticated). Uses the existing dashboard layout — the sidebar already links to `/settings`.

**Layout** — scrollable single-column content:
- Header: "Settings" in DM Sans 700 24px (`$text-primary`)
- Four card sections stacked vertically with 32px gap (`settingsScroll`)
- Content area padding: 32px top/bottom, 40px left/right

### 5.0b — Linked Account section

Displays the authenticated user's GitHub identity.

**Section title**: "Linked Account" in 16px DM Sans 600

**Card** (`cornerRadius: 8`, `fill: #0F0F0F` dark / `#FFFFFF` light, `border: 1px #262626` dark / `#E4E4E7` light, `padding: 20px`, `gap: 16px` vertical):
- **Account row** (space-between, full width):
  - Left group (`gap: 12px`): avatar (40px rounded square, `#2A2A2A` placeholder bg), name (14px Inter 500 `$text-primary`), email (13px Inter 400 `$text-secondary`), GitHub badge (pill: `#10B98120` bg, `cornerRadius: 12`, `padding: 4px 10px`)
  - Right: "Sign out" button (13px Inter 500 `#A3A3A3` text, `border: 1px #262626`, `cornerRadius: 6`, `padding: 8px 16px`, no fill)
- **Note text**: "Authenticated via GitHub OAuth. Your access token is used to fetch commits from connected repositories." — 12px Inter 400 `#6B6B6B`, full width

Data source: `session.user` for name/email/image. Sign out action calls `signOut()` from next-auth.

### 5.0c — Connected Repository section

Shows the user's connected project(s).

**Section title**: "Connected Repository" in 16px DM Sans 600

**Card** (same card style as above, `gap: 20px`):
- **Repo row** (space-between, full width):
  - Left group (`gap: 12px`): `git-branch` icon (20px, `$accent-green`) + text group: repo name `owner/repo` (14px Inter 500 `$text-primary`) + status "Connected · Last synced X ago" (12px Inter 400 `$text-tertiary`)
  - Right: "Disconnect" button (13px Inter 500 `$accent-red` text, `border: 1px $border`, `cornerRadius: 6`, `padding: 8px 16px`)

Data source: `db.project.findMany({ where: { userId } })`. If no projects, show empty state.

**Disconnect action**: `DELETE /api/projects/[id]` — deletes the project and all its changelogs (Prisma cascade). Show a confirmation dialog before proceeding.

### 5.0d — Default Generation Preferences section

Lets the user configure defaults that pre-fill the "Generate new" form.

**Section title**: "Default Generation Preferences" in 16px DM Sans 600

**Card** (same card style, `gap: 20px`):
- **Description**: "These defaults will be pre-filled when generating a new changelog. You can always override them per generation." — 13px Inter 400 `#6B6B6B`, full width
- **Default tone field** (`gap: 8px` vertical, full width):
  - Label: "Default tone" — 13px Inter 400 `#A3A3A3`
  - Select: `cornerRadius: 8`, `fill: #0A0A0A`, `border: 1px #262626`, `padding: 10px 14px`, text 13px Inter 400 `#F5F5F5`, chevron-down icon 14px `#6B6B6B`
  - Options: "Technical", "Casual", "Marketing", "Minimal"
- **Default date range field** (same layout):
  - Options: "Since last release", "Last 7 days", "Last 30 days", "Custom"
- **Button row** (right-aligned):
  - "Save defaults" button: green→blue gradient fill (`#10B981` → `#3B82F6`, 225°), green glow shadow (`#10B98130`, blur 12, spread 2), `cornerRadius: 6`, `padding: 8px 16px`, text 13px Inter 500 `#022C22`

**Schema change** — add `UserPreferences` model:

```prisma
model User {
  // ... existing fields
  preferences UserPreferences?
}

model UserPreferences {
  id               String @id @default(cuid())
  userId           String @unique
  user             User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  defaultTone      String @default("technical")
  defaultDateRange String @default("since_last_release")
}
```

Run `npx prisma migrate dev --name add-user-preferences`.

**API**: `PUT /api/settings/preferences` — authenticate, validate `{ defaultTone, defaultDateRange }`, upsert `UserPreferences`.

### 5.0e — Danger Zone section

**Section title**: "Danger Zone" in 16px DM Sans 600 `$accent-red`

**Card** (`fill: $accent-red-bg` (`#FEF2F2` light), `border: 1px $accent-red` (`#EF4444`), `cornerRadius: 8`, `padding: 20px`, `gap: 16px`):
- **Row** (space-between, full width):
  - Left group (`gap: 4px` vertical): "Delete this project" (14px Inter 500 `$text-primary`) + description "Once you delete a project, there is no going back. All changelogs will be permanently removed." (13px Inter 400 `$text-secondary`, max-width ~600px)
  - Right: red delete button (`fill: $accent-red`, `cornerRadius: 6`, `padding: 8px 16px`, `gap: 6px`): `trash-2` icon (14px white) + "Delete project" (13px Inter 500 white)

**Delete action**: `DELETE /api/projects/[id]`. Confirmation dialog requiring project name to confirm. On success, redirect to `/changelogs`.

### 5.0f — API routes for settings

**`DELETE /api/projects/[id]/route.ts`** (new handler in existing route file):
- Authenticate user, verify project ownership (`project.userId === user.id`)
- Delete project (Prisma cascade handles changelogs)
- Return 204 No Content

**`PUT /api/settings/preferences/route.ts`** (new):
- Authenticate user
- Validate body with Zod: `{ defaultTone: z.enum([...]), defaultDateRange: z.enum([...]) }`
- Upsert `UserPreferences` for user
- Return updated preferences

---

## Nice-to-have features (implement in order, stop when time runs out)

Each feature below is self-contained. Implement them in priority order. The project is submission-ready after the Settings page — everything below is bonus.

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

**Client-side**: Uses AI SDK v6's `useChat` hook from `@ai-sdk/react`. The v6 API uses `sendMessage({ text })` instead of the older `input`/`handleInputChange`/`handleSubmit` pattern:

```typescript
"use client";

import { useChat } from "@ai-sdk/react";

export function ChatWidget() {
  const { messages, sendMessage, status } = useChat();
  const isLoading = status === "streaming" || status === "submitted";
  // ... render UI, call sendMessage({ text: userInput }) on submit
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
- [ ] **Final design check**: Do a full pass comparing every screen against `docs/design/chamelelog-design.pen` (all 12 screens: 01–11 + light mode variants). Verify: gradient logo icon, DM Sans/JetBrains Mono/Inter typography, emerald green accents with glow, dark sidebar depth, theme switcher, category-tinted cards, mesh gradient landing, chat widget bubble styling, toast notification, connect repo modal, mobile viewport. The .pen file is the source of truth for all visual decisions.
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
