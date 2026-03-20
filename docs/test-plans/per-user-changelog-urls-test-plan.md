# Per-User Public Changelog URLs — Test Plan

## Prerequisites
- Two GitHub accounts (User A and User B) with access to the app
- At least one published changelog from User A
- Database accessible via Prisma Studio (`pnpm prisma studio`)

---

## 1. Username Field Population
- [X] Sign in with GitHub as User A
- [X] Open Prisma Studio → User table → verify `username` field is populated with your GitHub login (e.g. `tdoan35`)
- [X] Sign out and sign back in → verify `username` is still correct (not duplicated or nulled)

## 2. Root `/changelog` Redirect — Signed In
- [X] Sign in as User A (who has published changelogs)
- [X] Navigate to `/changelog`
- [X] Verify browser redirects to `/changelog/{userA-username}`
- [X] URL bar shows `/changelog/{userA-username}`

## 3. Root `/changelog` Redirect — Signed Out
- [X] Sign out (or use incognito)
- [X] Navigate to `/changelog`
- [X] Verify browser redirects to `/changelog/{first-user-with-published-changelogs}`
- [X] If no published changelogs exist at all → verify empty state page is shown (no redirect loop)

## 4. User-Scoped Changelog Page
- [X] Navigate to `/changelog/{userA-username}`
- [X] Verify only User A's published changelogs appear
- [X] Verify page title shows "Changelog" with the correct repo name subtitle
- [X] Navigate to `/changelog/{userB-username}` (User B has no published changelogs)
- [X] Verify empty state: "No published changelogs yet"

## 5. 404 for Invalid Username
- [X] Navigate to `/changelog/nonexistent-user-12345`
- [X] Verify a 404 page is returned (not a redirect loop or blank page)

## 6. Sidebar Project Switcher
- [X] On `/changelog/{userA-username}`, verify the sidebar shows only User A's projects (those with published changelogs)
- [X] If User A has multiple projects: click a different project in the sidebar dropdown
- [X] Verify URL updates to `/changelog/{userA-username}?project={projectId}`
- [X] Verify changelogs filter to the selected project
- [X] Verify no projects from other users appear in the dropdown

## 7. Sidebar Category Filter
- [X] Click "Features" filter in the sidebar
- [X] Verify URL updates to `/changelog/{userA-username}?category=features`
- [X] Verify only feature entries are shown
- [X] Click "All changes" → filter resets, URL returns to `/changelog/{userA-username}`

## 8. RSS Feed
- [X] In the sidebar, click "RSS Feed"
- [X] Verify URL is `/api/feed/rss?user={userA-username}` (may include `&project=...` if multi-project)
- [X] Verify RSS XML loads with valid entries
- [X] Verify `<link>` elements point to `/changelog/{userA-username}`, not `/changelog`
- [X] Verify `<atom:link>` self URL includes `?user={userA-username}`
- [X] Visit `/api/feed/rss?user=nonexistent` → verify 404 response

## 9. JSON Feed
- [X] In the sidebar, click "JSON Feed"
- [X] Verify URL is `/api/feed/json?user={userA-username}`
- [X] Verify JSON response has correct `home_page_url` pointing to `/changelog/{usXrA-username}`
- [X] Verify `feed_url` includes `?user={userA-username}`
- [X] Verify items contain only User A's changelogs
- [X] Visit `/api/feed/json?user=nonexistent` → verify 404 JSON response

## 10. Chat Widget — Scoped to User
- [X] On `/changelog/{userA-username}`, click "Ask about changes" FAB
- [X] Ask "What changed recently?" → verify response references only User A's changelogs
- [X] If User B has different changelogs, verify they are NOT mentioned in the response
- [X] Close and reopen the chat → verify it still functions

## 11. Multi-User Isolation
- [X] Publish a changelog as User A
- [X] Publish a changelog as User B
- [X] Visit `/changelog/{userA-username}` → see only User A's changelogs
- [X] Visit `/changelog/{userB-username}` → see only User B's changelogs
- [X] Verify sidebar on each page shows only that user's projects
- [X] Verify RSS/JSON feeds on each page return only that user's data

## 12. Feed Metadata in HTML Head
- [X] View page source on `/changelog/{userA-username}`
- [X] Verify `<link rel="alternate" type="application/rss+xml">` href is `/api/feed/rss?user={userA-username}`
- [X] Verify `<link rel="alternate" type="application/feed+json">` href is `/api/feed/json?user={userA-username}`

## 13. Build Verification
- [X] Run `pnpm build` → no TypeScript errors, no build failures
- [X] Verify all routes compile: `/(public)/changelog/page`, `/(public)/changelog/[username]/page`, `/(public)/changelog/[username]/layout`
