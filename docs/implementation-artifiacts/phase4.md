# Phase 4: Public Changelog

## Deliverable

A beautiful, server-rendered public changelog page at `/changelog` that anyone can visit without logging in. Includes category filtering and RSS/JSON feeds.

## Dependencies

Phase 3 must be complete: changelogs can be created, edited, and published.

## Tasks

### 4.1 — Public changelog page

Create `src/app/(public)/changelog/page.tsx`:

This is a server component that fetches all published changelogs and renders them in a clean, scrollable feed. No authentication required.

**Layout** — two-panel with project sidebar (see design screens 06, 06L, 09):

**Left sidebar** (280px, `#070707` dark / `$bg-surface` light):
1. **Project info** at top:
   - Project avatar (rounded square) + repo name (`owner/repo`) in 15px semibold
   - Sidebar collapse button (Lucide `panel-left-close`) on the right of the logo row
   - Project description in 13px secondary text
2. **Links section**:
   - `github` icon + "View repository"
   - `rss` icon + "RSS Feed"
   - `braces` icon + "JSON Feed"
3. **Category filter** (replaces horizontal pills):
   - "FILTER" label in 11px uppercase monospace with letter-spacing
   - Vertical list: "All changes" (active, highlighted bg), then each category with a colored dot: green "Features", blue "Improvements", amber "Fixes", red "Breaking"
   - Active filter has `#1A1A1A` bg (dark) / `$bg-page` (light)
4. **Bottom section**:
   - Three-icon theme switcher (sun/monitor/moon) matching dashboard pattern
   - "✨ Powered by Chamelelog" footer text in 11px tertiary

**Main content area** (scrollable, 40px padding):
1. **Page header**:
   - "Changelog" in DM Sans 800 28px
   - Subtitle: "The latest updates and improvements to owner/repo."

2. **Timeline entries** — date groups with green dot markers:
   - Each date group: horizontal layout with timeline column (28px, centered dot + vertical line) and content column
   - Date header: 17px semibold + version badge in JetBrains Mono (monospace pill with subtle border)
   - First date dot: solid `#10B981` green. Subsequent dots also green.
   - Vertical connecting line: 1px `$border`
   - Timeline dot vertically centered with date header text (use ~6px top padding on timeline column)

3. **Entry cards** within each date group:
   - Category header: colored dot (8px) + category label in colored bold 13px text (e.g., green "New features")
   - Each entry is a card with: colored left border (3px), category-tinted background fill (e.g., `#10B98108` for features, `#F59E0B08` for fixes, `#3B82F608` for improvements), `rounded-lg`
   - Card content: title (14px medium) + description (13px secondary, 1.5 line-height)

4. **Mobile** (see design screen 09, 390px) — **DEFERRED** (tracked in `docs/todos/phase4.md`):
   - Sidebar collapses to a top bar: gradient logo icon + "Chamelelog" + hamburger menu icon
   - No timeline line — entries stack vertically with date headers
   - Filter pills become horizontal scrollable row
   - Floating chat FAB (56px circle, gradient fill) in bottom-right

5. **Chat widget FAB** (bottom-right corner):
   - Green-to-blue gradient fill (`#10B981` → `#3B82F6`, 135°) with green glow shadow
   - Desktop: pill shape with `message-circle` icon + "Ask about changes" text
   - Mobile: circle with icon only

### 4.2 — Changelog entry component

Create `src/components/public/changelog-entry.tsx`:

A reusable component for a single changelog entry card. Takes:
- `title: string`
- `description?: string`
- `category: string`

Renders as a card with colored left border (3px, category color), category-tinted background, rounded corners. Title in 14px medium, description in 13px secondary with 1.5 line-height.

Create `src/components/public/changelog-feed.tsx`:

The main feed component. Takes an array of published changelogs and renders them grouped by date with the timeline aesthetic (green dots, vertical connecting line, date headers with version badges).

Create `src/components/public/project-sidebar.tsx`:

The left sidebar for the public changelog page. Receives project info, links, and filter state. Handles the category filter via URL search params.

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

A two-panel layout for public pages:
- Left: project sidebar (280px) with project info, links, category filter, theme switcher, and "Powered by Chamelelog" footer
- Right: scrollable content area with page title and timeline entries
- Sidebar separated from content by a 1px `$border` divider
- Dark mode by default, with theme switcher (sun/monitor/moon) in sidebar
- On mobile (<768px): sidebar collapses to a top bar with hamburger, content fills full width

### 4.7 — Landing / sign-in page

Create or update `src/app/page.tsx` (see design screens 01, 01L):

For unauthenticated users, this is a visually rich landing page:

**Background layers** (bottom to top):
1. `$bg-page` solid fill
2. Grid lines: 60px spacing, subtle color (`#1A1A1A` dark / `#F0F0F0` light)
3. Mesh gradient overlay: green/teal/blue (`#10B981`, `#0D9488`, `#3B82F6`, `#059669`, `#6366F1`, `#14B8A6`) at 15% opacity (dark) / 12% (light) — creates the chameleon color-shift effect
4. Radial vignette: transparent center fading to `$bg-page` at edges

**Content** (centered vertically):
- Gradient logo icon (`scan-eye`) + "Chamelelog" in DM Sans 700
- Headline: "AI-powered **changelogs** in seconds" — "changelogs" has a green→blue gradient fill (`#10B981` → `#3B82F6`), rest in `$text-primary`. DM Sans 800, 48px, -1px letter-spacing
- Subtitle: "Generate beautiful, categorized changelogs from your Git commits. Published in one click." in 16px secondary
- "Sign in with GitHub" green button with GitHub icon, green glow shadow
- "View example changelog →" text link in secondary color

For authenticated users, redirect to the dashboard.

## Acceptance criteria

- [ ] `/changelog` renders published changelogs without authentication
- [ ] Two-panel layout: project sidebar + scrollable timeline content
- [ ] Entries are grouped by date with green timeline dots and connecting line
- [ ] Category filter in sidebar works via URL params
- [ ] Version tags display as JetBrains Mono badges alongside dates
- [ ] Entry cards have colored left borders and category-tinted backgrounds
- [ ] RSS feed at `/api/feed/rss` is valid XML and auto-discoverable
- [ ] JSON feed at `/api/feed/json` follows the JSON Feed spec
- [ ] Public page looks beautiful on desktop
- [ ] *(Deferred)* Mobile: sidebar collapses to top bar, entries stack without timeline
- [ ] The page is server-rendered (check: view source shows content)
- [ ] Empty state when no changelogs are published
- [ ] Landing page: mesh gradient bg, gradient "changelogs" text, green CTA with glow
- [ ] Theme switcher works on public page sidebar
- [ ] Dark mode works on all public pages
- [ ] **Design check**: Compare all frontend output against `docs/design/chamelelog-design.pen` (screens 01, 01L, 06, 06L, 09). Verify: project sidebar layout, green timeline dots, category-tinted entry cards, mesh gradient landing, gradient hero text, mobile viewport adaptation. The .pen file is the source of truth.
