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
  - App logo/name at top ("Chamelelog")
  - Navigation: "Changelogs" (list), "New" (generate new), "Settings" (placeholder)
  - User avatar + name at bottom with sign-out option
- Main content area to the right of the sidebar
- Responsive: sidebar collapses to a top bar on mobile

The sidebar should be clean and minimal — no icons needed, just well-spaced text links. Use a subtle border-right to separate from content. Background: white (light) / zinc-950 (dark).

Create the dashboard home page at `src/app/(dashboard)/page.tsx`:

- Page title: "Changelogs"
- If the user has no projects connected, show an empty state: "Connect a GitHub repository to get started" with a "Connect repository" button
- If the user has projects but no changelogs, show: "No changelogs yet. Generate your first one." with a "Generate changelog" button
- If changelogs exist, render a `<ChangelogList />` component (can be a placeholder for now — will be fleshed out in Phase 3)

### 1.5 — Connect repository flow

Create `src/app/api/projects/route.ts`:

- `GET` — Returns all projects for the current user
- `POST` — Connects a new repo. Body: `{ repoOwner: string, repoName: string }`. Validate the repo exists via GitHub API before saving.

On the dashboard, add a "Connect repository" dialog:
- Input field for repo URL or `owner/repo` format
- Parse and validate the input
- On submit, POST to `/api/projects`
- After success, redirect to the generate page

Alternatively, use the GitHub API to list the user's repositories and let them pick from a dropdown. This is a better UX but more work — use the dropdown approach if time permits, fall back to the text input.

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
