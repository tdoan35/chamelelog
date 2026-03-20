# Chamelelog

AI-powered changelog generation from Git commits. Adapts to any audience — just like a chameleon.

**Live demo**: [chamelelog.vercel.app](https://chamelelog.vercel.app)

**Public changelog**: [chamelelog.vercel.app/changelog](https://chamelelog.vercel.app/changelog)

## Quick start

```bash
git clone https://github.com/tdoan35/chamelelog.git
cd chamelelog
cp .env.example .env.local    # Fill in your API keys
pnpm install
pnpm db:push
pnpm db:seed                  # Optional: load sample data
pnpm dev                      # Starts on http://localhost:3002
```

## Environment setup

1. Create a GitHub OAuth App at https://github.com/settings/developers
   - **Homepage URL**: `http://localhost:3002`
   - **Callback URL**: `http://localhost:3002/api/auth/callback/github`
2. Copy the Client ID and Client Secret into `.env.local`
3. Generate a `NEXTAUTH_SECRET` (any random string works for local dev)
4. Add an `OPENROUTER_API_KEY` from [openrouter.ai](https://openrouter.ai) for AI-powered generation
5. (Optional) Add a `GITHUB_WEBHOOK_SECRET` for automatic changelog generation on tag push

## How it works

1. **Connect** your GitHub repository via OAuth
2. **Select** a date range — auto-detects your last release tag
3. **Generate** — AI analyzes commits through a 3-stage pipeline and produces a categorized changelog
4. **Review & edit** — inline editing with autosave, reorder entries, change tone
5. **Publish** — goes live on your public changelog page with RSS/JSON feeds

## Architecture

### 3-Stage AI Pipeline

Each stage has a single responsibility:

| Stage | What it does | AI? |
|-------|-------------|-----|
| **1. Fetch & Filter** | Pulls commits from GitHub API, filters noise (merge commits, lockfiles, CI configs) | No |
| **2. Classify & Group** | Categories commits (features/improvements/fixes/breaking), clusters related commits | Yes |
| **3. Summarize** | Writes user-facing entries with tone control (Technical/Product/Enterprise) | Yes |

Separating stages means you can re-run Stage 3 with a different tone without re-fetching or re-classifying commits.

**Breaking change detection**: Before Stage 2, heuristics scan for breaking signals (deleted files, API route changes, schema modifications, commit message keywords) and inject them as hints to improve classification accuracy.

### Key features

- **Streaming generation** — entries appear in real-time via Server-Sent Events
- **Tone regeneration** — rewrite changelogs as Technical, Product, or Enterprise with one click
- **Semantic version suggestion** — auto-suggests semver bump based on entry categories
- **AI chat widget** — public visitors can ask questions about recent changes
- **Webhook auto-generation** — push a Git tag and a draft changelog is created automatically
- **Markdown export** — copy or download changelogs as formatted markdown
- **RSS & JSON feeds** — published changelogs available as standard feed formats

### Data flow

```
Manual: User clicks "Generate" → POST /api/generate (SSE stream)
        → Stage 1 → Stage 2 → Stage 3 → Save draft → Edit → Publish

Auto:   Git tag push → POST /api/webhook (HMAC verified)
        → Pipeline runs → Saved as "pending_review" draft → Edit → Publish
```

## Design decisions

**Why a 3-stage pipeline instead of a single prompt?**
Changelogs look simple but the underlying task has distinct concerns: fetching and filtering noise, categorizing what changed, and writing for a specific audience. A single LLM call conflates all three — if you want to change the tone from "Technical" to "Enterprise," you'd have to re-fetch and re-classify everything. Splitting stages means tone regeneration only re-runs Stage 3, which is faster and cheaper. It also makes each stage independently testable and debuggable.

**Why OpenRouter + Gemini 2.5 Flash Lite?**
OpenRouter gives model flexibility without vendor lock-in — swapping to a different model is a one-line config change. Gemini 2.5 Flash Lite was chosen for the best balance of speed, cost, and structured output quality for this use case. Changelogs don't need frontier-model reasoning; they need fast, reliable categorization and clean prose.

**Why SQLite locally, Turso in production?**
For a take-home project, zero-config setup matters. SQLite means `pnpm db:push` and you're running — no Docker, no Postgres connection string, no cloud account. Turso (hosted libSQL) gives the same SQLite compatibility in production with zero migration pain. Prisma abstracts the difference.

**Why SSE streaming instead of a simple POST → response?**
Changelog generation can take 10-15 seconds for repos with many commits. A loading spinner for that long feels broken. Streaming entries as they're generated gives immediate feedback — the user sees progress and can start reading before the pipeline finishes.

**Why tone/audience switching?**
Different stakeholders read changelogs differently. An engineer wants to know what endpoint changed; a product manager wants to know what users can now do; an enterprise buyer wants to know about security and compliance. Tone switching lets one set of commits produce changelogs for each audience without re-running the full pipeline.

**Why a webhook for auto-generation?**
The biggest friction in changelog maintenance is remembering to write one. A webhook on tag push removes that friction entirely — tag a release and a draft appears in the dashboard, ready for review. It's saved as "pending review" rather than auto-published because human review is still important for public-facing content.

**Why an AI chat widget on the public page?**
Changelogs are often scanned, not read. A chat widget lets end-users ask targeted questions ("Did anything change with the auth API?") without scrolling through entries. It also demonstrates the product thinking beyond the basic spec — treating the public page as more than a static list.

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start dev server (port 3002) |
| `pnpm build` | Production build |
| `pnpm db:push` | Push Prisma schema to SQLite |
| `pnpm db:seed` | Seed sample data |
| `pnpm db:studio` | Open Prisma Studio |

## Tech stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: SQLite via Prisma (local), Turso/libSQL (production)
- **Auth**: NextAuth.js + GitHub OAuth
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **AI**: OpenRouter (Gemini 2.5 Flash Lite) via Vercel AI SDK v6
- **GitHub**: Octokit for commits/tags API
- **Validation**: Zod (API requests + structured LLM output)

## API surface

### Authenticated endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/generate` | Run AI pipeline, returns SSE stream |
| `GET/PATCH` | `/api/changelogs/[id]` | Get or update a changelog (autosave) |
| `POST` | `/api/changelogs/[id]/publish` | Publish a changelog |
| `POST` | `/api/changelogs/[id]/regenerate` | Re-run Stage 3 with a different tone |
| `GET/POST` | `/api/projects` | List or connect GitHub repos |

### Public endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/feed/rss` | RSS 2.0 feed of published changelogs |
| `GET` | `/api/feed/json` | JSON Feed 1.1 of published changelogs |
| `POST` | `/api/chat` | AI chat over changelog history |
| `POST` | `/api/webhook` | GitHub webhook for tag-based auto-generation |

## Webhook setup

To enable automatic changelog generation when you push a tag:

1. In your GitHub repo → Settings → Webhooks → Add webhook
2. **Payload URL**: `https://chamelelog.vercel.app/api/webhook`
3. **Content type**: `application/json`
4. **Secret**: `test-secret-123`
5. **Events**: select "Branch or tag creation"

When a tag is pushed, a changelog draft is auto-generated with "Pending review" status. Review and publish it from the dashboard.

## Deployment

Production runs on **Vercel** + **Turso** (hosted libSQL, SQLite-compatible). Local dev uses plain SQLite with zero config changes.

See [docs/dev-ops/deployment.md](docs/dev-ops/deployment.md) for full setup instructions.

## AI tools used

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) — primary development tool (implementation, debugging, deployment)
- [Claude Desktop](https://claude.ai) — planning, architecture decisions, and research
- [Opencode](https://opencode.ai) — supplementary AI-assisted development
- [Pencil.dev](https://pencil.dev) — design spec and UI mockups

## Project structure

```
src/
├── app/
│   ├── (dashboard)/          # Authenticated pages (changelogs, settings)
│   ├── (public)/             # Public changelog page
│   └── api/                  # API routes (generate, changelogs, chat, webhook, feeds)
├── components/
│   ├── dashboard/            # Editor, changelog list, sidebar, filter tabs
│   └── public/               # Changelog feed, entry cards, chat widget
├── lib/
│   ├── ai/                   # Pipeline (classify, summarize, prompts)
│   └── github/               # Commits, tags, client
└── hooks/                    # useChangelogStream, useKeyboardShortcuts
```
