# Architecture

A comprehensive reference for the system architecture, data flow, API surface, and design system of Chamelelog.
 
---
 
## System overview
 
The application has two user-facing surfaces backed by a shared backend:
 
```
┌─────────────────────────────────────────────────────────────────┐
│                        Developer surface                        │
│                                                                 │
│  Dashboard: connect repos, generate changelogs, edit, publish   │
│  Trigger: manual (web UI) or automatic (GitHub webhook)         │
│  Auth: GitHub OAuth (required)                                  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                    Next.js API routes
                           │
              ┌────────────┼────────────┐
              │            │            │
         GitHub API    AI Pipeline    SQLite
         (Octokit)     (3 stages)    (Prisma)
              │            │            │
              └────────────┼────────────┘
                           │
┌──────────────────────────┴──────────────────────────────────────┐
│                        Public surface                           │
│                                                                 │
│  Changelog page: SSR feed of published entries, filterable      │
│  Feeds: RSS (XML) and JSON Feed endpoints                       │
│  Chat widget: AI-powered Q&A over changelog history             │
│  Auth: none (public)                                            │
└─────────────────────────────────────────────────────────────────┘
```
 
---
 
## Tech stack rationale
 
| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 14 (App Router) | Full-stack in one project. Server components for the public page, API routes for the backend, client components for the dashboard. No separate backend needed. |
| Language | TypeScript | Type safety across the full stack. Shared types between API and UI. |
| Styling | Tailwind CSS + shadcn/ui | Tailwind for utility-first speed. shadcn/ui provides accessible, unstyled primitives that we own (copied into the project, not a dependency). Produces the clean, minimal aesthetic the project targets. |
| Database | SQLite via Prisma | **Zero-config for the reviewer.** No Docker, no cloud DB, no connection string. `pnpm dev` just works. Prisma provides typed queries and makes swapping to Postgres a one-line change (`provider = "postgresql"` in schema.prisma). SQLite handles single-user workloads with no issues. |
| AI | OpenRouter → Claude Sonnet | OpenRouter provides model flexibility while defaulting to Claude, which is Greptile's own AI provider (they use the Claude Agent SDK). The Vercel AI SDK (`ai` package) gives us streaming, structured output via `generateObject`, and SSE helpers out of the box. |
| Auth | NextAuth.js + GitHub OAuth | GitHub OAuth is mandatory anyway — we need the user's access token to call the GitHub API for commits. NextAuth makes it a few lines of config. The Prisma adapter persists sessions in the same SQLite database. |
| GitHub API | Octokit | Official GitHub SDK. Typed responses, pagination helpers, auth handling. |
| Validation | Zod | Schema validation for API request bodies. Also used with `generateObject` from the AI SDK to enforce structured LLM output. |
 
---
 
## Data model
 
### Entity relationship
 
```
User (GitHub identity)
 ├── has many → Project (connected GitHub repos)
 │                └── has many → Changelog (generated entries)
 └── has many → Changelog (author relationship)
```
 
### Changelog lifecycle
 
```
                     ┌──────────────┐
  Manual generate    │              │   Webhook auto-generate
  ─────────────────► │    draft     │ ◄───────────────────────
                     │              │       (pending_review)
                     └──────┬───────┘
                            │
                     developer edits
                     clicks "Publish"
                            │
                     ┌──────▼───────┐
                     │              │
                     │  published   │──────► Public page
                     │              │──────► RSS / JSON feeds
                     └──────────────┘
```
 
### Key fields
 
**Changelog.content** (JSON string): Structured representation used for rendering category-grouped views in the UI.
 
```json
{
  "features": [
    {
      "title": "Added OAuth 2.0 support",
      "description": "Users can now sign in with Google, GitHub, or email magic links.",
      "commits": ["abc1234", "def5678"]
    }
  ],
  "improvements": [],
  "fixes": [
    {
      "title": "Fixed session timeout on mobile browsers",
      "description": null,
      "commits": ["ghi9012"]
    }
  ],
  "breaking": []
}
```
 
**Changelog.rawContent** (markdown string): Human-editable markdown version of the same content. This is what the developer sees in the editor and what gets exported.
 
**Changelog.classificationData** (JSON string, optional): Cached output from Stage 2 of the AI pipeline. Storing this enables tone regeneration (re-running only Stage 3 with a different audience) without re-fetching and re-classifying commits.
 
---
 
## AI pipeline
 
The core differentiator. Three decoupled stages, each with a single responsibility.
 
### Why three stages instead of one prompt
 
A single prompt ("here are commits, write a changelog") produces mediocre results because it conflates three different cognitive tasks: filtering noise, understanding relationships between commits, and writing for a specific audience. Separating these lets each stage focus and lets us re-run Stage 3 with different tones without repeating the expensive Stages 1-2.
 
### Stage 1: Fetch and filter
 
**Input:** Repository, date range (or tag-to-tag range)
**Output:** Array of enriched commit objects with diff stats
**AI involved:** No — this is pure data fetching and heuristic filtering
 
```
GitHub API
    │
    ├── GET /repos/{owner}/{repo}/commits?since=...&until=...
    │   └── Returns: list of commit SHAs + messages
    │
    └── For each commit:
        GET /repos/{owner}/{repo}/commits/{sha}
        └── Returns: files changed, additions, deletions, patch snippets
 
    │
    ▼
Filter out noise:
    - Merge commits (2+ parents)
    - Lockfile-only changes (package-lock.json, yarn.lock, pnpm-lock.yaml)
    - CI/config-only changes (.github/workflows/*, .eslintrc*, .prettierrc*)
    - Message pattern matches: /^Merge/, /^bump/, /^chore(deps)/
    │
    ▼
Output: CommitData[] (enriched, filtered)
```
 
**Why diff stats matter:** Commit messages are unreliable. A message saying "wip" that changes `src/api/auth.ts (+45 -12)` is clearly an auth-related change. Passing file-level context to the LLM in Stage 2 dramatically improves classification accuracy.
 
**Rate limit handling:** GitHub allows 5,000 authenticated requests/hour. Fetching commit details requires 1 request per commit. We cap at 100 commits per generation and warn the user if more exist.
 
### Stage 2: Classify and group
 
**Input:** Filtered CommitData[]
**Output:** Structured JSON — commits grouped by category and clustered by logical change
**AI involved:** Yes — single LLM call with structured output (Zod schema)
 
```
CommitData[]
    │
    ▼
LLM classifies each commit:
    - features: new user-facing capabilities
    - improvements: enhancements to existing features
    - fixes: bug fixes
    - breaking: backward-incompatible changes
    - (excluded): internal-only changes, excluded from output
    │
    ▼
LLM clusters related commits:
    - 5 commits for "add OAuth" → 1 cluster
    - 3 commits for "fix login bug" → 1 cluster
    │
    ▼
Output: ClassificationResult (structured JSON via generateObject + Zod)
```
 
**Breaking change signals:** Before sending to the LLM, heuristics scan for breaking change indicators (deleted public files, modified API routes, commit messages containing "BREAKING", large deletions in public-facing code). These signals are included in the prompt as hints, improving the LLM's classification accuracy.
 
### Stage 3: Summarize for humans
 
**Input:** ClassificationResult + tone selection
**Output:** User-facing changelog entries, streamed via SSE
**AI involved:** Yes — LLM call with tone-specific system prompt
 
```
ClassificationResult
    │
    ├── tone = "technical"  → prompt emphasizes API details, config changes
    ├── tone = "product"    → prompt emphasizes user outcomes, business value
    └── tone = "enterprise" → prompt emphasizes security, compliance, stability
    │
    ▼
LLM generates one changelog entry per cluster:
    - Title: active verb, one sentence, max 100 chars
    - Description: optional 1-2 sentence elaboration
    │
    ▼
Streamed to client via SSE as entries are generated
```
 
### Tone examples (same commits, different output)
 
| Tone | Output for an OAuth implementation |
|---|---|
| Technical | "Added OAuth 2.0 PKCE flow with refresh token rotation for `/api/auth/*` endpoints" |
| Product | "You can now sign in with Google and stay logged in across sessions" |
| Enterprise | "SSO authentication now supports PKCE, meeting SOC 2 session management requirements" |
 
---
 
## API surface
 
All API routes live under `src/app/api/`. Authentication is required for all routes except the public feed and webhook endpoints.
 
### Core endpoints
 
| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/generate` | Yes | Runs the AI pipeline. Returns SSE stream. |
| `GET` | `/api/changelogs` | Yes | List changelogs for the current user. Query: `?status=draft\|published\|pending_review` |
| `POST` | `/api/changelogs` | Yes | Create a changelog manually (bypass AI pipeline). |
| `GET` | `/api/changelogs/[id]` | Yes | Get a single changelog with full content. |
| `PATCH` | `/api/changelogs/[id]` | Yes | Update title, content, rawContent, version. Used by autosave. |
| `DELETE` | `/api/changelogs/[id]` | Yes | Delete a changelog. |
| `POST` | `/api/changelogs/[id]/publish` | Yes | Set status to "published", set publishedAt. |
 
### Project management
 
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/projects` | Yes | List connected repos for the current user. |
| `POST` | `/api/projects` | Yes | Connect a new GitHub repo. Body: `{ repoOwner, repoName }` |
| `GET` | `/api/projects/[id]/tags` | Yes | Fetch recent tags for smart date range defaults. |
 
### Public endpoints
 
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/feed/rss` | No | RSS 2.0 XML feed of published changelogs. Cached 1 hour. |
| `GET` | `/api/feed/json` | No | JSON Feed 1.1 of published changelogs. Cached 1 hour. |
| `POST` | `/api/chat` | No | AI chat endpoint for the public changelog widget. Accepts `{ messages }`. Returns streaming response. |
 
### Webhook
 
| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/webhook` | Signature | GitHub webhook receiver. Verified via `x-hub-signature-256`. Triggers auto-generation on tag creation. |
 
### SSE event protocol (`/api/generate`)
 
The generate endpoint streams Server-Sent Events during pipeline execution:
 
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
 
Clients consume this with the native `EventSource` API or a `ReadableStream` reader for more control over reconnection and error handling.
 
### API response format
 
All JSON endpoints follow a consistent envelope:
 
```typescript
// Success
{ "data": T }
 
// Error
{ "error": "Human-readable error message" }
```
 
HTTP status codes: 200 (success), 201 (created), 400 (validation error), 401 (unauthorized), 404 (not found), 500 (server error).
 
---
 
## Frontend architecture
 
### Route groups
 
Next.js App Router route groups separate authenticated and public pages without affecting URL paths:
 
```
(dashboard)/           →  /                     (dashboard home)
(dashboard)/changelogs/new  →  /changelogs/new  (generate)
(dashboard)/changelogs/[id] →  /changelogs/abc  (edit)
(public)/changelog     →  /changelog            (public feed)
```
 
Each route group has its own `layout.tsx`:
- `(dashboard)/layout.tsx`: Sidebar nav, auth gate, user context provider
- `(public)/layout.tsx`: Minimal header, no sidebar, no auth required
 
### Server vs. client components
 
Default to server components. Use `"use client"` only for:
- The generate form (controlled inputs, SSE streaming)
- The changelog editor (contentEditable, drag-and-drop, autosave)
- The chat widget (useChat hook, real-time messages)
- Any component using React hooks or browser APIs
 
The public changelog page is entirely server-rendered for SEO and performance.
 
### State management
 
No global state library. State lives where it's used:
- **Server components** fetch data directly via Prisma (no API call needed server-side)
- **Generate form** uses local `useState` + the custom `useChangelogStream` hook
- **Editor** uses local state with debounced autosave via `PATCH`
- **Chat widget** uses Vercel AI SDK's `useChat` hook (manages message history internally)
 
### Key client-side patterns
 
**SSE consumption** (`useChangelogStream` hook): Connects to `/api/generate` via `fetch`, reads the response as a `ReadableStream`, parses SSE events, and updates local state. Entries are appended to an array as they arrive, triggering re-renders that animate new cards in.
 
**Autosave** (editor): A `useEffect` with a debounce timer. On any content change, reset the timer. After 3 seconds of inactivity, fire a `PATCH` request. Show "Saving..." / "Saved" indicator in the header.
 
**Optimistic updates** (publish): When the user clicks "Publish", immediately update the local status badge to "Published" and fire the `POST` request. Roll back on failure.
 
---
 
## Design system
 
### Philosophy
 
Minimal, clean, developer-oriented. The design should feel like a tool built by someone who uses Linear, Vercel, and Notion daily. Restraint is the goal — every visual element should earn its place.
 
### Color palette
 
**Neutrals** (primary palette — used for 90% of the UI):
 
| Token | Light | Dark | Usage |
|---|---|---|---|
| Background | white | zinc-950 | Page background |
| Surface | zinc-50 | zinc-900 | Cards, sidebar |
| Border | zinc-200 | zinc-800 | Dividers, card borders |
| Text primary | zinc-900 | zinc-50 | Headings, body text |
| Text secondary | zinc-500 | zinc-400 | Descriptions, metadata |
| Text tertiary | zinc-400 | zinc-500 | Timestamps, hints |
 
**Category accents** (used sparingly for changelog categories):
 
| Category | Color | Usage |
|---|---|---|
| Features | green-500 / green-50 bg | Left border accent, badge |
| Improvements | blue-500 / blue-50 bg | Left border accent, badge |
| Fixes | amber-500 / amber-50 bg | Left border accent, badge |
| Breaking | red-500 / red-50 bg | Left border accent, badge |
 
**Accents are applied as left borders on cards**, not as backgrounds. This keeps the interface calm while still providing visual grouping. The only place category colors appear as backgrounds is in small pill badges.
 
### Typography
 
System font stack via Tailwind defaults. No custom fonts to load.
 
| Element | Size | Weight | Class |
|---|---|---|---|
| Page title | text-2xl (24px) | font-semibold (600) | `text-2xl font-semibold` |
| Section header | text-lg (18px) | font-medium (500) | `text-lg font-medium` |
| Card title | text-base (16px) | font-medium (500) | `text-base font-medium` |
| Body text | text-sm (14px) | font-normal (400) | `text-sm` |
| Metadata | text-xs (12px) | font-normal (400) | `text-xs text-zinc-500` |
| Code / mono | text-sm (14px) | font-normal (400) | `text-sm font-mono` |
 
### Spacing
 
- Page padding: `px-6 py-8` (dashboard), `px-4 py-8` (public)
- Card padding: `p-4` or `p-6`
- Stack gap: `space-y-4` for cards, `space-y-6` for sections, `space-y-8` for page sections
- Max content width: `max-w-2xl` (public page), `max-w-3xl` (editor), `max-w-5xl` (dashboard list)
 
### Component patterns
 
**Cards**: Subtle border (`border border-zinc-200 dark:border-zinc-800`), no shadow by default, slight hover shadow on interactive cards (`hover:shadow-sm`). Rounded corners: `rounded-lg`.
 
**Buttons**: Primary is solid zinc-900 on light / white on dark. Secondary is ghost/outline. Destructive is red, only in dropdown menus (never as standalone). All buttons: `rounded-md`, `text-sm`, `font-medium`.
 
**Badges**: Small pills for status. Draft = amber-100 text-amber-700. Published = green-100 text-green-700. Pending review = blue-100 text-blue-700. All: `rounded-full px-2 py-0.5 text-xs font-medium`.
 
**Empty states**: Centered vertically in the content area. An icon or subtle illustration (optional), a heading ("No changelogs yet"), a description ("Generate your first changelog from your Git commits"), and a primary CTA button. Keep it warm and encouraging, not clinical.
 
**Loading states**: Skeleton loaders that match the shape of the content they replace. Use Tailwind's `animate-pulse` on zinc-200 rectangles. Never use spinners. During AI generation, show streaming output instead of any loading state.
 
### Dashboard layout
 
```
┌──────────┬───────────────────────────────────────────┐
│          │                                           │
│  Logo    │  Page Title              [Action Button]  │
│          │                                           │
│  Nav     │  ─────────────────────────────────────    │
│  items   │                                           │
│          │  Content area                             │
│          │  (server-rendered or client component)    │
│          │                                           │
│          │                                           │
│          │                                           │
│  ────    │                                           │
│  User    │                                           │
│  avatar  │                                           │
└──────────┴───────────────────────────────────────────┘
```
 
Sidebar: fixed, 240px wide, `border-r`. Collapses to a top bar with hamburger on screens < 768px.
 
### Public changelog layout
 
```
┌─────────────────────────────────────────────────────┐
│  Project Name                            [RSS icon] │
│  The latest updates and improvements                │
│                                                     │
│  [All] [Features] [Improvements] [Fixes] [Breaking] │
│                                                     │
│  ●  March 17, 2026 · v2.3.0                        │
│  │                                                  │
│  │  ✨ New features                                 │
│  │                                                  │
│  │  Added OAuth 2.0 support                         │
│  │  Users can now sign in with Google...            │
│  │                                                  │
│  │  🐛 Bug fixes                                    │
│  │                                                  │
│  │  Fixed session timeout on mobile browsers        │
│  │                                                  │
│  ●  March 10, 2026                                  │
│  │                                                  │
│  │  ...                                             │
└─────────────────────────────────────────────────────┘
```
 
Timeline: a thin vertical line (`border-l border-zinc-200`) on the left with small dot markers for each date group. Content indented to the right. On mobile (< 640px), the timeline line is hidden and entries stack with date headers only.
 
---
 
## Data flow diagrams
 
### Manual generation flow
 
```
User clicks "Generate"
    │
    ▼
POST /api/generate (SSE stream opens)
    │
    ├── 1. Validate request (Zod)
    ├── 2. Get user's GitHub access token from DB
    ├── 3. Stage 1: Fetch commits via GitHub API
    │       └── SSE: status "Fetching commits..."
    ├── 4. Stage 1: Filter noise commits
    │       └── SSE: status "Analyzing N commits..."
    ├── 5. Stage 2: LLM classifies and clusters (generateObject)
    │       └── SSE: status "Writing changelog entries..."
    ├── 6. Stage 3: LLM summarizes per cluster
    │       └── SSE: entry events (one per changelog bullet)
    ├── 7. Save draft changelog to SQLite
    │       └── SSE: complete event with changelogId
    └── Stream closes
    │
    ▼
User sees entries appear in real time
    │
    ▼
User clicks "Edit & Review"
    │
    ▼
GET /api/changelogs/{id} → loads editor
    │
    ├── Edit titles, descriptions inline
    ├── Reorder, delete, add entries
    ├── Autosave via PATCH /api/changelogs/{id} (debounced 3s)
    │
    ▼
User clicks "Publish"
    │
    ▼
POST /api/changelogs/{id}/publish
    │
    ▼
Entry appears on /changelog (public page)
```
 
### Webhook auto-generation flow
 
```
Developer pushes a Git tag (e.g., v2.3.0)
    │
    ▼
GitHub sends POST /api/webhook
    │
    ├── Verify x-hub-signature-256
    ├── Check event type = "create", ref_type = "tag"
    ├── Look up Project by repoOwner + repoName
    ├── Get user's GitHub token
    ├── Determine date range (previous tag → this tag)
    ├── Run pipeline (non-streaming, background)
    ├── Save as status = "pending_review"
    │
    ▼
Developer sees "1 draft ready for review" on dashboard
    │
    ▼
Normal edit → publish flow
```
 
---
 
## Security considerations
 
- **GitHub tokens**: Stored in the database by NextAuth's Prisma adapter (Account table, `access_token` field). In a production system these should be encrypted at rest. For this take-home, they're stored as plain text in SQLite — acceptable for local development.
- **Webhook verification**: GitHub webhook payloads are verified using HMAC-SHA256 signatures before processing. Unverified payloads are rejected with 401.
- **API auth**: All dashboard API routes check for a valid NextAuth session. Unauthorized requests return 401.
- **Public endpoints**: Feed and chat endpoints require no auth but are rate-limited via response caching (1 hour `s-maxage` on feeds).
- **LLM prompt injection**: Commit messages are user-generated content passed to the LLM. The system prompts instruct the model to treat them as data to classify, not instructions to follow. This is defense-in-depth, not bulletproof — acceptable for a take-home.
 
---
 
## Performance considerations
 
- **Public page**: Server-rendered via React Server Components. No client JS needed for the feed itself. Feed data is fetched directly from Prisma (no API hop).
- **Feed caching**: RSS and JSON feeds return `Cache-Control: s-maxage=3600, stale-while-revalidate` — CDN-cacheable for 1 hour.
- **Commit fetching**: The most expensive operation (N+1 GitHub API calls). Mitigated by capping at 100 commits and filtering before detailed fetches where possible.
- **AI calls**: Two LLM calls per generation (classify + summarize). Stage 3 is streamed so perceived latency is low. Total generation time is typically 15-30 seconds depending on commit count.
- **Database**: SQLite with Prisma. No connection pooling needed. WAL mode enabled by default for concurrent reads during writes.
 
---
 
## Future directions (out of scope)
 
Ideas mentioned in the README to show vision without over-scoping:
 
- **GitHub Action / PR bot**: Instead of just creating a draft in the dashboard, open a PR with a `CHANGELOG.md` update. The developer reviews and merges the PR like any other code change.
- **Multi-repo support**: Aggregate changelogs across multiple repositories into a single feed (useful for monorepo-adjacent setups).
- **Custom templates**: Let developers define their own changelog format (markdown template, category names, emoji preferences).
- **Analytics**: Track which changelog entries get the most views or clicks on the public page.
- **Slack/Discord notifications**: Notify a channel when a new changelog is published.
