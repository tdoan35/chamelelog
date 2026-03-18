# CLAUDE.md — Chamelelog

## Project overview

**Chamelelog** — an AI-powered changelog generator that helps developers automatically create user-facing changelogs from Git commits. Two surfaces: a developer dashboard for generating/editing/publishing changelogs, and a public-facing changelog page for end users. The name is a play on "chameleon" + "changelog" — chameleons change colors, and this is a changelog.

This is a take-home project for Greptile (AI code review company). The evaluators care about: working product, clean backend logic, user-centered product design, visual polish, and developer UX.

## Tech stack

- **Framework**: Next.js 14 (App Router), TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **Database**: SQLite via Prisma ORM (zero-config for reviewers — no Docker needed)
- **AI**: OpenRouter API (defaulting to `anthropic/claude-sonnet-4-20250514`) via Vercel AI SDK (`ai` package)
- **Auth**: NextAuth.js with GitHub OAuth provider
- **Deployment**: Local-first (reviewer runs `pnpm install && pnpm dev`)

## Key architecture decisions

1. **SQLite over Postgres**: Reviewer shouldn't need Docker or a cloud DB to evaluate the project. Prisma makes swapping to Postgres a one-line config change.
2. **OpenRouter over direct Anthropic API**: Gives model flexibility while defaulting to Claude (Greptile's own AI provider). Mention this choice in the README.
3. **Vercel AI SDK**: Provides built-in streaming helpers and OpenRouter support. Cuts SSE implementation to ~10 lines.
4. **Structured JSON + raw markdown storage**: Changelog content is stored as both structured JSON (for rendering category-grouped views) and markdown (for editing and export).
5. **3-stage AI pipeline**: Fetch/filter → Classify/group → Summarize. Stages are decoupled so they can be independently improved or rerun.

## Project structure

```
src/
├── app/
│   ├── (dashboard)/              # Authenticated routes (developer-facing)
│   │   ├── layout.tsx            # Dashboard shell with sidebar nav
│   │   ├── page.tsx              # Dashboard home — list of changelogs
│   │   └── changelogs/
│   │       ├── new/page.tsx      # Generate new changelog
│   │       └── [id]/page.tsx     # Edit/review a changelog
│   ├── (public)/                 # Unauthenticated routes (public-facing)
│   │   └── changelog/
│   │       └── page.tsx          # Public changelog feed
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── generate/route.ts         # POST — SSE streaming changelog generation
│   │   ├── changelogs/route.ts       # GET (list), POST (create)
│   │   ├── changelogs/[id]/route.ts  # GET, PATCH, DELETE
│   │   ├── changelogs/[id]/publish/route.ts  # POST — publish a draft
│   │   ├── projects/route.ts         # GET (list), POST (connect repo)
│   │   ├── webhook/route.ts          # POST — GitHub webhook for auto-drafts
│   │   └── feed/
│   │       ├── rss/route.ts
│   │       └── json/route.ts
│   ├── layout.tsx
│   └── globals.css
├── lib/
│   ├── ai/
│   │   ├── pipeline.ts           # Orchestrates the 3 stages
│   │   ├── classify.ts           # Stage 2: LLM groups commits by category
│   │   ├── summarize.ts          # Stage 3: LLM writes user-facing entries
│   │   └── prompts.ts            # All prompt templates live here
│   ├── github/
│   │   ├── client.ts             # Authenticated GitHub API client (Octokit)
│   │   ├── commits.ts            # Fetch commits for a date range + filter
│   │   └── diffs.ts              # Fetch diff stats per commit
│   ├── db.ts                     # Prisma client singleton
│   └── ai-client.ts              # OpenRouter client via Vercel AI SDK
├── components/
│   ├── ui/                       # shadcn/ui primitives (Button, Card, Input, etc.)
│   ├── dashboard/
│   │   ├── generate-form.tsx     # Repo selector + date range + tone + generate button
│   │   ├── changelog-editor.tsx  # Editable changelog with category groups
│   │   ├── changelog-list.tsx    # List of all changelogs (drafts + published)
│   │   └── streaming-output.tsx  # Real-time SSE display during generation
│   └── public/
│       ├── changelog-feed.tsx    # Scrollable feed of published entries
│       ├── changelog-entry.tsx   # Single entry card with category badges
│       └── chat-widget.tsx       # AI chat for asking about changes (nice-to-have)
└── types/
    └── index.ts                  # Shared TypeScript types
```

## Code style conventions

- Use `async/await` everywhere, no raw `.then()` chains
- Prefer named exports over default exports (except for page components)
- API routes return typed JSON: `{ data: T }` on success, `{ error: string }` on failure
- Use Zod for request validation in API routes
- Error handling: try/catch at the API route level, let errors bubble up from lib functions
- Components: functional components with hooks only, no class components
- Use `cn()` utility (from shadcn) for conditional Tailwind classes
- Prefer server components by default; add `"use client"` only when needed (interactivity, hooks)

## Design principles

- **Minimal and clean**: Generous whitespace, restrained color palette. Think Linear/Vercel aesthetic.
- **Category color coding**: Features = green left-border accent, Improvements = blue, Fixes = amber, Breaking = red. Use subtle left borders on cards, not loud backgrounds.
- **Typography**: Use the default system font stack from Tailwind. Clear hierarchy: page titles (text-2xl font-semibold), section headers (text-lg font-medium), body (text-sm).
- **Dark mode**: Support both light and dark mode via Tailwind's `dark:` prefix and next-themes.
- **Loading states**: Use skeleton loaders, never spinners. During AI generation, stream tokens directly — don't show a loading state.
- **Empty states**: Every list view needs a thoughtful empty state with a clear CTA.

## Environment variables

```env
# .env.local
DATABASE_URL="file:./dev.db"
GITHUB_CLIENT_ID="..."
GITHUB_CLIENT_SECRET="..."
NEXTAUTH_SECRET="..."       # Generate with: openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000"
OPENROUTER_API_KEY="..."
GITHUB_WEBHOOK_SECRET="..."  # For webhook verification (nice-to-have)
```

## Commands

```bash
pnpm install          # Install dependencies
pnpm db:push          # Push Prisma schema to SQLite
pnpm db:seed          # Seed with sample data (for development)
pnpm dev              # Start dev server
pnpm build            # Production build
pnpm lint             # ESLint
```

## Implementation order

Follow the phase specs in order. Each phase builds on the previous one:

1. **Phase 1** (`docs/phase1.md`): Foundation — scaffold, Prisma schema, auth, basic layout
2. **Phase 2** (`docs/phase2.md`): AI pipeline — GitHub commit fetching, 3-stage LLM pipeline
3. **Phase 3** (`docs/phase3.md`): Developer dashboard — generate UI, streaming, editor, publish
4. **Phase 4** (`docs/phase4.md`): Public changelog — SSR page, filters, RSS/JSON feeds
5. **Phase 5** (`docs/phase5.md`): Polish + nice-to-haves — chat widget, webhook agent, tone config

Complete each phase fully before moving to the next. After each phase, verify the deliverable works end-to-end.

## Testing approach

- No unit test framework required (this is a take-home, not production)
- But DO add a seed script (`prisma/seed.ts`) that creates sample data for demo purposes
- Manually verify each phase's deliverable before proceeding
- The screen recording IS the test — make sure every flow works smoothly

## README requirements

The README should include:
1. A demo GIF or screenshot at the top
2. One-command setup: `pnpm install && pnpm dev`
3. Architecture decisions with rationale (why SQLite, why OpenRouter, why 3-stage pipeline)
4. Brief description of the AI pipeline
5. Mention AI tools used in development
6. Note: "Uses SQLite for zero-config setup; swap to Postgres via DATABASE_URL for production"
