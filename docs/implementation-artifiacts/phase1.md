# Phase 1: Foundation

## Deliverable

App boots, user can sign in with GitHub, database schema is in place, basic dashboard layout renders with empty states.

## Tasks

### 1.1 — Project scaffold

Initialize the Next.js project with the following:

```bash
pnpm create next-app@latest chamelelog --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

Install core dependencies:

```bash
# UI
pnpm add @shadcn/ui class-variance-authority clsx tailwind-merge lucide-react next-themes

# Database
pnpm add prisma @prisma/client
pnpm add -D prisma

# Auth
pnpm add next-auth @auth/prisma-adapter

# AI (will be used in Phase 2, but install now)
pnpm add ai @ai-sdk/openai

# GitHub API
pnpm add octokit

# Validation
pnpm add zod

# Date handling
pnpm add date-fns
```

Initialize shadcn/ui:

```bash
pnpm dlx shadcn@latest init
```

Add these shadcn components (add more as needed in later phases):

```bash
pnpm dlx shadcn@latest add button card input label select textarea badge separator skeleton dropdown-menu dialog tabs scroll-area toast
```

### 1.2 — Prisma schema

Create `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime?
  image         String?
  accounts      Account[]
  sessions      Session[]
  projects      Project[]
  changelogs    Changelog[]
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

model Project {
  id         String      @id @default(cuid())
  userId     String
  user       User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  repoOwner  String
  repoName   String
  repoUrl    String
  changelogs Changelog[]
  createdAt  DateTime    @default(now())
  updatedAt  DateTime    @updatedAt

  @@unique([userId, repoOwner, repoName])
}

model Changelog {
  id          String    @id @default(cuid())
  projectId   String
  project     Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  userId      String
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  title       String
  content     String    @default("{}") // JSON string: { features: [], improvements: [], fixes: [], breaking: [] }
  rawContent  String    @default("")   // Rendered markdown
  status      String    @default("draft") // draft | pending_review | published
  fromDate    DateTime
  toDate      DateTime
  fromRef     String?   // Git tag or SHA
  toRef       String?
  commitCount Int       @default(0)
  version     String?   // e.g. "v2.3.0"
  publishedAt DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}
```

Create the Prisma client singleton at `src/lib/db.ts`:

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
```

Add scripts to `package.json`:

```json
{
  "scripts": {
    "db:push": "prisma db push",
    "db:seed": "tsx prisma/seed.ts",
    "db:studio": "prisma studio"
  }
}
```

Run `pnpm db:push` to create the SQLite database.

### 1.3 — GitHub OAuth with NextAuth

Create a GitHub OAuth App at https://github.com/settings/developers:
- Authorization callback URL: `http://localhost:3000/api/auth/callback/github`
- Request scopes: `repo`, `read:user`, `user:email`

Create `src/app/api/auth/[...nextauth]/route.ts`:

```typescript
import NextAuth from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";

const handler = NextAuth({
  adapter: PrismaAdapter(db),
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "repo read:user user:email",
        },
      },
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
});

export { handler as GET, handler as POST };
```

Extend the session type in `src/types/next-auth.d.ts`:

```typescript
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}
```

Create a helper to get the current user's GitHub access token from the database:

```typescript
// src/lib/auth.ts
import { getServerSession } from "next-auth";
import { db } from "@/lib/db";

export async function getSession() {
  return getServerSession();
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session?.user?.id) return null;
  return session.user;
}

export async function getGitHubToken(userId: string): Promise<string | null> {
  const account = await db.account.findFirst({
    where: { userId, provider: "github" },
  });
  return account?.access_token ?? null;
}
```

### 1.4 — Dashboard layout

Create the dashboard layout at `src/app/(dashboard)/layout.tsx`:

- Sidebar with:
  - App logo at top: gradient `scan-eye` Lucide icon (green→blue, 135°) + "Chamelelog" in DM Sans 700
  - Sidebar collapse/expand icon button (Lucide `panel-left-close`) top-right of logo row
  - Navigation with Lucide icons: `list` "Changelogs", `circle-plus` "Generate new", `settings` "Settings"
  - Active nav item has `#111111` background (dark) / `$bg-surface` (light), bold text
  - Bottom section: three-icon theme switcher (sun/monitor/moon segmented control), then user avatar + name
  - Theme switcher: icon-only buttons in a pill container. Active mode gets highlighted background. Supports light/dark/system
- Main content area to the right of the sidebar, separated by a 1px border
- Responsive: sidebar collapses to a top bar with hamburger menu on mobile

Sidebar uses a distinctly darker background (`#070707`) than the page (`#0A0A0A`) in dark mode to create depth separation. In light mode, sidebar is white with `$bg-surface` nav highlights.

**Design system — refer to `docs/design/chamelelog-design.pen` for the finalized screens.**

**Typography:**
- Display/titles: DM Sans (700-800 weight, tight letter-spacing)
- Technical metadata: JetBrains Mono (repo names, dates, commit counts, version numbers — 11px)
- Body/UI: Inter (nav items, descriptions, buttons — 12-14px)

**Color palette (dark-first, Greptile-inspired):**
- Backgrounds: `#0A0A0A` (page), `#141414` (surface/cards), `#070707` (sidebar)
- Borders: `#262626` (primary), `#1C1C1C` (muted)
- Text: `#F5F5F5` (primary), `#A3A3A3` (secondary), `#6B6B6B` (tertiary)
- Primary accent: `#10B981` (emerald green) — buttons, active states, CTA
- Button text on green: `#022C22` (dark green)
- Category accents: `#10B981` (features), `#3B82F6` (improvements), `#F59E0B` (fixes), `#EF4444` (breaking)
- Category card tints: very subtle semi-transparent category color backgrounds (e.g. `#10B98108`)
- Green glow on primary buttons: `box-shadow: 0 0 16px #10B98130`

**Light mode** mirrors the same structure with inverted neutrals:
- Backgrounds: `#FFFFFF` (page), `#FAFAFA` (surface), white sidebar
- Borders: `#E4E4E7` / `#F4F4F5`
- Text: `#18181B` / `#71717A` / `#A1A1AA`
- Same accent colors work in both modes

Create the dashboard home page at `src/app/(dashboard)/page.tsx`:

- Page title: "Changelogs" in DM Sans 700
- If the user has no projects connected, show an empty state: icon in a bordered container, "No changelogs yet" heading, "Connect a GitHub repository and generate your first changelog from your Git commits." description, green "Connect repository" CTA button with GitHub icon and glow, plus an "or generate from a public repo" text link
- If the user has projects but no changelogs, show similar empty state with "Generate changelog" CTA
- If changelogs exist, render a `<ChangelogList />` component (can be a placeholder for now — will be fleshed out in Phase 3)

### 1.5 — Connect repository flow

Create `src/app/api/projects/route.ts`:

- `GET` — Returns all projects for the current user
- `POST` — Connects a new repo. Body: `{ repoOwner: string, repoName: string }`. Validate the repo exists via GitHub API before saving.

On the dashboard, add a "Connect repository" modal dialog (see design screen 10):
- Modal with header ("Connect repository" + close X button), body, and footer
- Search input with search icon: "Search repositories..."
- List of user's GitHub repos fetched via API, each showing `git-branch` icon + `owner/repo` name
- Selected repo highlighted in green with check icon
- Footer: "Cancel" secondary button + "Connect" green primary button with glow
- Use the GitHub API to list the user's repositories — this is the primary UX (not a text input fallback)
- On submit, POST to `/api/projects`
- After success, redirect to the generate page

### 1.6 — Environment and configuration

Create `.env.example`:

```env
DATABASE_URL="file:./dev.db"
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""
NEXTAUTH_SECRET=""
NEXTAUTH_URL="http://localhost:3000"
OPENROUTER_API_KEY=""
```

Create `src/lib/ai-client.ts` (placeholder for Phase 2):

```typescript
import { createOpenAI } from "@ai-sdk/openai";

export const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY!,
});

export const model = openrouter("anthropic/claude-sonnet-4-20250514");
```

### 1.7 — Seed script

Create `prisma/seed.ts` that generates sample data for development and demo purposes:

- Create a test user
- Create 1-2 sample projects
- Create 3-5 sample changelogs with realistic content across different statuses (draft, published)
- Use realistic changelog content: features, fixes, improvements with proper formatting

This seed data will be useful for developing the UI in Phase 3 and for the demo recording.

## Acceptance criteria

- [ ] `pnpm install && pnpm db:push && pnpm dev` starts the app without errors
- [ ] User can sign in with GitHub and sees the dashboard
- [ ] Dashboard shows empty state with CTA when no projects exist
- [ ] User can connect a GitHub repository
- [ ] Connected repos appear in the dashboard
- [ ] Sign out works
- [ ] Dark mode toggle works
- [ ] `.env.example` documents all required variables
- [ ] Seed script creates realistic sample data
