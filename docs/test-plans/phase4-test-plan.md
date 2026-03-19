# Phase 4: Public Changelog — Test Plan

## Prerequisites

1. Start the dev server: `pnpm dev`
2. Have at least one connected repository with at least one **published** changelog
3. Have a second browser or incognito window for unauthenticated testing

---

## 1. Route Restructuring

### Dashboard moved to `/changelogs`
- [X] Authenticated user visiting `/` is redirected to `/changelogs`
- [X] `/changelogs` renders the dashboard with "Changelogs" heading, filter tabs, and changelog list
- [X] `/changelogs/new` still works (generate page)
- [X] `/changelogs/[id]` still works (editor page)
- [X] Sidebar "Changelogs" nav item links to `/changelogs` and highlights correctly
- [X] Sidebar "Generate new" nav item links to `/changelogs/new` and highlights correctly
- [X] Sidebar "Changelogs" is **not** highlighted when on `/changelogs/new`

### Sign-in / sign-out flow
- [X] Sign out redirects to `/` (not `/login`)
- [X] Sign in via GitHub redirects to `/changelogs` (not `/`)
- [X] Unauthenticated access to `/changelogs` redirects to `/`

---

## 2. Landing Page (`/`)

- [X] Unauthenticated user sees the landing page (mesh gradient, hero text, CTA)
- [X] Logo renders with gradient icon + "Chamelelog" text
- [X] Hero title: "AI-powered changelogs in seconds" with gradient on "changelogs"
- [X] Subtitle text renders below the hero
- [X] "Sign in with GitHub" button has green-to-blue gradient + glow shadow
- [X] Clicking "Sign in with GitHub" shows "Redirecting..." spinner and initiates OAuth
- [X] "View example changelog →" link navigates to `/changelog`
- [X] Theme toggle (top right) switches between light and dark mode
- [X] Background effects: grid ripple + aurora gradient overlay both render
- [X] Radial overlay adapts to light/dark theme

### Login page (`/login`)
- [X] `/login` renders the same landing content as `/`
- [X] Sign-in flow from `/login` works identically

---

## 3. Public Layout (Sidebar + Main)

- [X] `/changelog` renders a two-panel layout: sidebar (280px) + main content
- [X] Sidebar has `bg-sidebar` background with right border
- [X] Sidebar is sticky (stays in place while main content scrolls)
- [X] Chat FAB appears in the bottom-right corner

---

## 4. Project Sidebar

### Project info
- [ ] Avatar placeholder (36px rounded square) renders
- [X] `owner/repo` text displays in 15px semibold
- [X] Collapse/expand toggle button works (PanelLeftClose ↔ PanelLeftOpen)

### Collapsed state
- [X] Sidebar collapses to 72px width
- [X] Description, links, and filter sections are hidden when collapsed
- [X] Toggle button and "Powered by" sparkle icon remain visible
- [X] Expanding restores full content

### Description
- [X] Generic description text renders in 13px secondary color

### Links
- [X] "View repository" links to the GitHub repo URL (opens in new tab)
- [X] "RSS Feed" links to `/api/feed/rss`
- [X] "JSON Feed" links to `/api/feed/json`

### Category filter
- [X] "FILTER" label renders in 11px uppercase with letter-spacing
- [X] "All changes" is active by default (highlighted background)
- [X] "Features" has green dot, "Improvements" blue, "Fixes" amber, "Breaking" red
- [X] Clicking "Features" navigates to `/changelog?category=features`
- [X] Active filter item has highlighted background (`bg-surface` / `bg-[#111111]` dark)
- [X] Clicking "All changes" returns to `/changelog` (no query param)
- [X] Filter state persists on page reload (URL-driven)

### Bottom section
- [X] Theme toggle (Light/System/Dark) renders and works
- [X] "Powered by Chamelelog" text with sparkles icon renders at bottom

---

## 5. Changelog Entry Card

- [X] Each entry has a 3px colored left bar matching its category
- [X] Background uses the category's semi-transparent tint
- [X] Title renders in 14px medium weight
- [X] Description (if present) renders in 13px secondary color below the title
- [X] Cards have rounded corners (`rounded-lg`)

---

## 6. Category Header

- [X] Colored dot (8px) renders next to category label
- [X] Label text uses the category's color (e.g., green for "New Features")
- [X] Dot and label colors match `CATEGORY_COLORS` definitions

---

## 7. Changelog Feed (Timeline)

### Timeline structure
- [X] Each date group has a green dot (10px) aligned at the top
- [X] Vertical line connects consecutive date groups
- [X] Last date group has no trailing line
- [X] Content column is indented from the timeline

### Date header
- [X] Date renders as "Month Day, Year" (e.g., "March 17, 2026") in 17px semibold
- [X] Version badge renders in JetBrains Mono 12px with border and rounded-sm

### Category sections
- [X] Entries are grouped under category headers
- [X] Categories are sorted by `CATEGORY_ORDER`: Features → Fixes → Improvements → Breaking
- [X] Each category section has a `CategoryHeader` followed by entry cards with 12px gap
- [X] 24px gap between category sections

### Filtering
- [X] With `?category=features`, only "Features" entries display
- [X] Empty date groups are skipped when filtering removes all entries
- [X] "No changelog entries found." message shows when filter yields zero results

---

## 8. Public Changelog Page (`/changelog`)

- [X] "Changelog" heading renders in DM Sans 28px extrabold with -0.5px letter-spacing
- [X] Subtitle shows "All notable changes to owner/repo"
- [X] Published changelogs display in reverse chronological order
- [X] Only published changelogs appear (drafts are excluded)
- [X] Page is server-rendered (view source shows SSR content)
- [X] No authentication required to view

### Empty state
- [X] When no published changelogs exist, empty state shows with file icon
- [X] "No published changelogs yet" heading and subtitle render

---

## 9. Chat FAB

- [X] Floating button is fixed to bottom-right (`bottom-6 right-6`)
- [X] Green-to-blue gradient background with green glow shadow
- [X] MessageCircle icon + "Ask about changes" text in dark green
- [X] Button has `z-50` and stays above other content
- [X] Button is decorative (no functionality yet — clicking does nothing harmful)

---

## 10. RSS Feed (`/api/feed/rss`)

- [X] Returns valid XML with `Content-Type: application/rss+xml`
- [X] Contains `<rss version="2.0">` root element with Atom namespace
- [X] `<channel>` has title, link, description, and `<atom:link>` self-reference
- [X] Each published changelog appears as an `<item>` with title, description, link, guid, pubDate
- [X] Description contains plaintext category/entry breakdown
- [X] Special characters (`&`, `<`, `>`, `"`, `'`) are properly escaped
- [X] `Cache-Control` header includes `s-maxage=3600, stale-while-revalidate`
- [X] Maximum 50 items returned
- [X] Items are ordered by `publishedAt` descending

---

## 11. JSON Feed (`/api/feed/json`)

- [X] Returns valid JSON with `Content-Type: application/json`
- [X] `version` field is `"https://jsonfeed.org/version/1.1"`
- [X] Contains `title`, `home_page_url`, `feed_url`, `description` fields
- [X] Each published changelog appears in `items` array with id, title, content_text, date_published, url, tags
- [X] `tags` array contains the category names from the changelog content
- [X] `date_published` is ISO 8601 format
- [X] `Cache-Control` header includes `s-maxage=3600, stale-while-revalidate`
- [X] Maximum 50 items returned

---

## 12. Feed Auto-Discovery

- [X] View page source on `/changelog` — `<link>` tags present for RSS and JSON feeds
- [X] RSS link has `type="application/rss+xml"` and `href="/api/feed/rss"`
- [X] JSON link has `type="application/feed+json"` and `href="/api/feed/json"`

---

## 13. Theme Support

- [X] Public changelog page respects dark/light theme
- [X] Sidebar theme toggle works on `/changelog`
- [X] Entry card backgrounds adapt to theme
- [X] Version badge background adapts (`bg-[#1A1A1A]` dark / `bg-surface` light)
- [X] Timeline dot and line colors are consistent across themes
- [X] Chat FAB appearance is consistent across themes
- [X] Theme transition animation triggers on toggle (300ms class-based transition)

---

## 14. Edge Cases

- [ ] **No projects in DB**: sidebar shows fallback "owner/repo", changelog page still renders
- [X] **Published changelog with empty content**: no crash, entry gracefully skipped
- [X] **Published changelog with null version**: version badge does not render
- [X] **Multiple changelogs on same date**: grouped under one timeline entry
- [X] **Invalid category in URL** (`?category=nonexistent`): shows "No changelog entries found."
- [X] **Direct navigation to `/changelog`**: no auth required, page loads
- [X] **Rapid filter switching**: URL updates correctly, no stale state
- [X] **Browser back/forward**: filter state restores from URL
