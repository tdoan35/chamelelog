# Chamelelog

AI-powered changelog generation from Git commits. Adapts to any audience — just like a chameleon.

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
4. (Optional) Add an `OPENROUTER_API_KEY` for AI features (Phase 2+)

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start dev server (port 3002) |
| `pnpm build` | Production build |
| `pnpm db:push` | Push Prisma schema to SQLite |
| `pnpm db:seed` | Seed sample data |
| `pnpm db:studio` | Open Prisma Studio |

## Tech stack

- **Framework**: Next.js 14 (App Router)
- **Database**: SQLite via Prisma
- **Auth**: NextAuth.js + GitHub OAuth
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **AI**: OpenRouter (Claude Sonnet) via Vercel AI SDK
