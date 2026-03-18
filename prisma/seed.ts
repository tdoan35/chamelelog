import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Clean existing data
  await prisma.changelog.deleteMany();
  await prisma.project.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  // Create a test user
  const user = await prisma.user.create({
    data: {
      id: "seed-user-1",
      name: "Demo User",
      email: "demo@chamelelog.dev",
      image: "https://avatars.githubusercontent.com/u/0?v=4",
    },
  });

  // Create sample projects
  const project1 = await prisma.project.create({
    data: {
      userId: user.id,
      repoOwner: "acme",
      repoName: "web-app",
      repoUrl: "https://github.com/acme/web-app",
    },
  });

  const project2 = await prisma.project.create({
    data: {
      userId: user.id,
      repoOwner: "acme",
      repoName: "api-server",
      repoUrl: "https://github.com/acme/api-server",
    },
  });

  // Sample changelog content
  const publishedContent = JSON.stringify({
    features: [
      {
        title: "Added OAuth 2.0 support",
        description:
          "Users can now sign in with Google, GitHub, or email magic links.",
        commits: ["abc1234", "def5678"],
      },
      {
        title: "Added webhook event filtering",
        description:
          "Configure which events trigger your webhook endpoints from the dashboard.",
        commits: ["ghi9012"],
      },
    ],
    improvements: [
      {
        title: "Improved API response times by 40%",
        description:
          "Optimized database queries for the /users and /projects endpoints.",
        commits: ["jkl3456"],
      },
    ],
    fixes: [
      {
        title: "Fixed session timeout on mobile browsers",
        description:
          "Sessions now persist correctly across app backgrounding on iOS and Android.",
        commits: ["mno7890"],
      },
    ],
    breaking: [],
  });

  const publishedMarkdown = `## ✨ New Features

- **Added OAuth 2.0 support** — Users can now sign in with Google, GitHub, or email magic links.
- **Added webhook event filtering** — Configure which events trigger your webhook endpoints from the dashboard.

## 💪 Improvements

- **Improved API response times by 40%** — Optimized database queries for the /users and /projects endpoints.

## 🐛 Bug Fixes

- **Fixed session timeout on mobile browsers** — Sessions now persist correctly across app backgrounding on iOS and Android.`;

  await prisma.changelog.create({
    data: {
      projectId: project1.id,
      userId: user.id,
      title: "Release v2.3.0",
      content: publishedContent,
      rawContent: publishedMarkdown,
      status: "published",
      fromDate: new Date("2026-03-10"),
      toDate: new Date("2026-03-17"),
      fromRef: "v2.2.0",
      toRef: "v2.3.0",
      commitCount: 47,
      version: "v2.3.0",
      publishedAt: new Date("2026-03-17T14:00:00Z"),
    },
  });

  // Draft changelog
  const draftContent = JSON.stringify({
    features: [
      {
        title: "Added team member management",
        description:
          "Invite team members and assign roles directly from the settings page.",
        commits: ["pqr1234"],
      },
    ],
    improvements: [
      {
        title: "Redesigned the dashboard navigation",
        description: "Cleaner sidebar with collapsible sections and keyboard shortcuts.",
        commits: ["stu5678", "vwx9012"],
      },
    ],
    fixes: [
      {
        title: "Fixed CSV export encoding for non-ASCII characters",
        description: null,
        commits: ["yza3456"],
      },
    ],
    breaking: [],
  });

  const draftMarkdown = `## ✨ New Features

- **Added team member management** — Invite team members and assign roles directly from the settings page.

## 💪 Improvements

- **Redesigned the dashboard navigation** — Cleaner sidebar with collapsible sections and keyboard shortcuts.

## 🐛 Bug Fixes

- **Fixed CSV export encoding for non-ASCII characters**`;

  await prisma.changelog.create({
    data: {
      projectId: project1.id,
      userId: user.id,
      title: "Release v2.4.0",
      content: draftContent,
      rawContent: draftMarkdown,
      status: "draft",
      fromDate: new Date("2026-03-17"),
      toDate: new Date("2026-03-24"),
      fromRef: "v2.3.0",
      commitCount: 23,
      version: "v2.4.0",
    },
  });

  // Older published changelog
  const olderContent = JSON.stringify({
    features: [
      {
        title: "Added real-time collaboration",
        description: "Multiple users can now edit documents simultaneously with live cursors.",
        commits: ["bcd1234"],
      },
    ],
    improvements: [],
    fixes: [
      {
        title: "Fixed notification delivery delays",
        description: "Push notifications now arrive within 2 seconds of the triggering event.",
        commits: ["efg5678"],
      },
      {
        title: "Fixed dark mode contrast issues on the settings page",
        description: null,
        commits: ["hij9012"],
      },
    ],
    breaking: [
      {
        title: "Removed deprecated v1 API endpoints",
        description:
          "The /api/v1/* endpoints have been removed. Please migrate to /api/v2/*.",
        commits: ["klm3456"],
      },
    ],
  });

  const olderMarkdown = `## 🚨 Breaking Changes

- **Removed deprecated v1 API endpoints** — The /api/v1/* endpoints have been removed. Please migrate to /api/v2/*.

## ✨ New Features

- **Added real-time collaboration** — Multiple users can now edit documents simultaneously with live cursors.

## 🐛 Bug Fixes

- **Fixed notification delivery delays** — Push notifications now arrive within 2 seconds of the triggering event.
- **Fixed dark mode contrast issues on the settings page**`;

  await prisma.changelog.create({
    data: {
      projectId: project1.id,
      userId: user.id,
      title: "Release v2.2.0",
      content: olderContent,
      rawContent: olderMarkdown,
      status: "published",
      fromDate: new Date("2026-03-01"),
      toDate: new Date("2026-03-10"),
      fromRef: "v2.1.0",
      toRef: "v2.2.0",
      commitCount: 34,
      version: "v2.2.0",
      publishedAt: new Date("2026-03-10T10:00:00Z"),
    },
  });

  // API server changelog
  await prisma.changelog.create({
    data: {
      projectId: project2.id,
      userId: user.id,
      title: "API Server v1.5.0",
      content: JSON.stringify({
        features: [
          {
            title: "Added rate limiting middleware",
            description: "Configurable per-endpoint rate limits with sliding window algorithm.",
            commits: ["nop1234"],
          },
        ],
        improvements: [
          {
            title: "Improved error response consistency",
            description: "All error responses now follow the { error: string, code: string } format.",
            commits: ["qrs5678"],
          },
        ],
        fixes: [],
        breaking: [],
      }),
      rawContent: `## ✨ New Features

- **Added rate limiting middleware** — Configurable per-endpoint rate limits with sliding window algorithm.

## 💪 Improvements

- **Improved error response consistency** — All error responses now follow the { error: string, code: string } format.`,
      status: "published",
      fromDate: new Date("2026-03-05"),
      toDate: new Date("2026-03-15"),
      fromRef: "v1.4.0",
      toRef: "v1.5.0",
      commitCount: 18,
      version: "v1.5.0",
      publishedAt: new Date("2026-03-15T16:00:00Z"),
    },
  });

  console.log("Seed complete:");
  console.log(`  - 1 user`);
  console.log(`  - 2 projects`);
  console.log(`  - 4 changelogs (3 published, 1 draft)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
