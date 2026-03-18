# Phase 4: Public Changelog

## Deliverable

A beautiful, server-rendered public changelog page at `/changelog` that anyone can visit without logging in. Includes category filtering and RSS/JSON feeds.

## Dependencies

Phase 3 must be complete: changelogs can be created, edited, and published.

## Tasks

### 4.1 — Public changelog page

Create `src/app/(public)/changelog/page.tsx`:

This is a server component that fetches all published changelogs and renders them in a clean, scrollable feed. No authentication required.

**Layout** (max-w-2xl, centered):

1. **Header**
   - Project name or custom title (e.g., "Changelog" or the repo name)
   - Subtitle: "The latest updates and improvements"
   - RSS feed icon/link (subtle, in the header area)
   - Clean, large typography

2. **Category filter**
   - Horizontal pills at the top: "All", "Features", "Improvements", "Fixes", "Breaking"
   - "All" is active by default
   - Clicking a category filters the feed to only show entries in that category
   - Use URL search params for filtering (`?category=features`) so it's shareable
   - Filter is implemented server-side for SSR

3. **Changelog entries**
   - Entries are grouped by date (not by individual changelog)
   - Each date group has a prominent date header: "March 17, 2026"
   - If a version tag exists, show it next to the date: "March 17, 2026 · v2.3.0"
   - Under the date header, entries are grouped by category
   - Category headers: subtle, colored label (e.g., green "New features" text)
   - Each entry: title as the primary text, description below in muted color
   - Entries within a category are listed as clean bullet points or cards

4. **Timeline aesthetic**
   - A subtle vertical line on the left connecting date groups (like a timeline)
   - Date markers sit on the line
   - Content sits to the right of the line
   - On mobile: the timeline collapses, entries stack vertically without the line

**Design reference**: Look at Stripe's changelog (https://docs.stripe.com/changelog) for the timeline feel, but simpler. Our version should be lighter — no sidebar navigation, no search, just a clean vertical feed.

**Example rendered structure**:
```
March 17, 2026 · v2.3.0
─────────────────────────

  ✨ New features

    Added OAuth 2.0 support
    Users can now sign in with Google, GitHub, or email magic links.

    Added webhook event filtering
    Configure which events trigger your webhook endpoints.

  🐛 Bug fixes

    Fixed session timeout on mobile browsers
    Sessions now persist correctly across app backgrounding on iOS and Android.


March 10, 2026
─────────────────────────

  💪 Improvements

    Improved API response times by 40%
    Optimized database queries for the /users and /projects endpoints.
```

### 4.2 — Changelog entry component

Create `src/components/public/changelog-entry.tsx`:

A reusable component for a single changelog entry. Takes:
- `title: string`
- `description?: string`
- `category: string`

Renders the title in regular weight with the optional description below in a muted style. Keep it simple — no cards, no borders, just clean typography with proper spacing.

Create `src/components/public/changelog-feed.tsx`:

The main feed component. Takes an array of published changelogs and renders them grouped by date with the timeline aesthetic.

### 4.3 — Category badges

Create a shared `CategoryBadge` component used across both dashboard and public pages:

```typescript
const CATEGORY_CONFIG = {
  features: { label: "New features", emoji: "✨", color: "green" },
  improvements: { label: "Improvements", emoji: "💪", color: "blue" },
  fixes: { label: "Bug fixes", emoji: "🐛", color: "amber" },
  breaking: { label: "Breaking changes", emoji: "🚨", color: "red" },
};
```

On the public page, use as subtle colored text headers (not pill badges — those are for the dashboard). On the dashboard, use as small pill badges on cards.

### 4.4 — RSS feed

Create `src/app/api/feed/rss/route.ts`:

Generate a valid RSS 2.0 XML feed of published changelogs.

```typescript
export async function GET() {
  const changelogs = await db.changelog.findMany({
    where: { status: "published" },
    orderBy: { publishedAt: "desc" },
    take: 50,
    include: { project: true },
  });

  const items = changelogs.map((cl) => `
    <item>
      <title>${escapeXml(cl.title)}</title>
      <description>${escapeXml(cl.rawContent)}</description>
      <pubDate>${cl.publishedAt!.toUTCString()}</pubDate>
      <guid>${process.env.NEXTAUTH_URL}/changelog#${cl.id}</guid>
    </item>
  `).join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Chamelelog</title>
    <link>${process.env.NEXTAUTH_URL}/changelog</link>
    <description>The latest updates and improvements</description>
    <atom:link href="${process.env.NEXTAUTH_URL}/api/feed/rss" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml",
      "Cache-Control": "s-maxage=3600, stale-while-revalidate",
    },
  });
}
```

Add RSS auto-discovery to the public layout's `<head>`:

```html
<link rel="alternate" type="application/rss+xml" title="Chamelelog" href="/api/feed/rss" />
```

### 4.5 — JSON feed

Create `src/app/api/feed/json/route.ts`:

Follow the JSON Feed spec (https://www.jsonfeed.org/version/1.1/):

```typescript
export async function GET() {
  const changelogs = await db.changelog.findMany({
    where: { status: "published" },
    orderBy: { publishedAt: "desc" },
    take: 50,
    include: { project: true },
  });

  const feed = {
    version: "https://jsonfeed.org/version/1.1",
    title: "Chamelelog",
    home_page_url: `${process.env.NEXTAUTH_URL}/changelog`,
    feed_url: `${process.env.NEXTAUTH_URL}/api/feed/json`,
    items: changelogs.map((cl) => ({
      id: cl.id,
      title: cl.title,
      content_text: cl.rawContent,
      date_published: cl.publishedAt!.toISOString(),
      url: `${process.env.NEXTAUTH_URL}/changelog#${cl.id}`,
      tags: Object.keys(JSON.parse(cl.content)).filter(
        (k) => JSON.parse(cl.content)[k]?.length > 0
      ),
    })),
  };

  return Response.json(feed, {
    headers: {
      "Cache-Control": "s-maxage=3600, stale-while-revalidate",
    },
  });
}
```

### 4.6 — Public layout

Create `src/app/(public)/layout.tsx`:

A minimal layout for public pages:
- Simple top bar with the project name on the left, and a subtle "Powered by Chamelelog" on the right
- No sidebar
- Centered content with max-w-2xl
- Light/clean background (zinc-50 light, zinc-950 dark)
- Dark mode support

### 4.7 — Landing / sign-in page

Create or update `src/app/page.tsx` (the root page):

For unauthenticated users, this is a simple landing/sign-in page:
- Headline: "Chamelelog — AI-powered changelogs in seconds"
- Subtitle: "Generate beautiful changelogs from your Git commits. Adapts to any audience, just like a chameleon."
- "Sign in with GitHub" button
- Link to the public changelog page: "View example changelog →"

For authenticated users, redirect to the dashboard.

Keep this page very simple — it's not the focus of the project, just a clean entry point.

## Acceptance criteria

- [ ] `/changelog` renders published changelogs without authentication
- [ ] Entries are grouped by date with a clean timeline aesthetic
- [ ] Category filter works via URL params
- [ ] Version tags display alongside dates when present
- [ ] RSS feed at `/api/feed/rss` is valid XML and auto-discoverable
- [ ] JSON feed at `/api/feed/json` follows the JSON Feed spec
- [ ] Public page looks beautiful on both desktop and mobile
- [ ] The page is server-rendered (check: view source shows content)
- [ ] Empty state when no changelogs are published
- [ ] Landing page provides a clear path to sign in
- [ ] Dark mode works on all public pages
