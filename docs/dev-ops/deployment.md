# Deployment: Vercel + Turso

Chamelelog is deployed on **Vercel** (hosting) with **Turso** (hosted libSQL/SQLite) as the production database.

## Architecture

- **Local dev**: Plain SQLite via `DATABASE_URL=file:./dev.db` — no changes to local workflow
- **Production**: Turso (libSQL) via `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`
- The app detects Turso env vars at runtime and uses the libSQL adapter automatically (`src/lib/db.ts`)

## Turso Setup

1. Install CLI: `curl -sSfL https://get.tur.so/install.sh | bash`
2. `turso auth login`
3. `turso db create chamelelog`
4. Get URL: `turso db show chamelelog --url` → `libsql://...`
5. Get token: `turso db tokens create chamelelog`

## Push Schema to Production

Run locally with production credentials:

```bash
DATABASE_URL="libsql://chamelelog-xxx.turso.io" pnpm prisma db push
```

## Vercel Environment Variables

| Variable | Value |
|----------|-------|
| `TURSO_DATABASE_URL` | `libsql://chamelelog-xxx.turso.io` |
| `TURSO_AUTH_TOKEN` | Token from `turso db tokens create` |
| `DATABASE_URL` | Same as `TURSO_DATABASE_URL` (needed for `prisma db push`) |
| `GITHUB_CLIENT_ID` | Production GitHub OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | Production GitHub OAuth App client secret |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `https://chamelelog.vercel.app` |
| `OPENROUTER_API_KEY` | OpenRouter API key |

## GitHub OAuth (Production)

Create a separate OAuth App for production:
- **Homepage URL**: `https://chamelelog.vercel.app`
- **Callback URL**: `https://chamelelog.vercel.app/api/auth/callback/github`

## Verification Checklist

1. Local dev still works: `pnpm dev` with existing `.env.local`
2. Build passes: `pnpm build`
3. Schema pushed to Turso: `DATABASE_URL="libsql://..." pnpm prisma db push`
4. Site loads at production URL
5. GitHub OAuth sign-in works
6. Full flow: Connect repo → generate changelog → publish → visit public page
