# Phase 4: Public Changelog — Todos

Spec: `docs/implementation-artifiacts/phase4.md`

---

## Core Tasks

- [ ] **4.1 — Public changelog page** (`/changelog`): Server-rendered feed of published changelogs, two-panel layout with project sidebar + scrollable timeline content
- [ ] **4.2 — Changelog entry component**: Reusable `changelog-entry.tsx`, `changelog-feed.tsx` (timeline with green dots), `project-sidebar.tsx` (project info, links, category filter)
- [ ] **4.3 — Category badges**: Shared `CategoryBadge` component — subtle colored text on public page, pill badges on dashboard
- [ ] **4.4 — RSS feed** (`/api/feed/rss`): Valid RSS 2.0 XML with auto-discovery `<link>` in public layout
- [ ] **4.5 — JSON feed** (`/api/feed/json`): JSON Feed 1.1 spec compliant
- [ ] **4.6 — Public layout** (`src/app/(public)/layout.tsx`): Two-panel with sidebar, theme switcher, "Powered by Chamelelog" footer
- [ ] **4.7 — Landing page** (`/`): Mesh gradient background, gradient "changelogs" headline, GitHub sign-in CTA, example changelog link

## High Priority

- [X] **Multi-repo public changelog support**: Public changelog page (`/changelog`) has no way to switch between repos. Currently shows all published changelogs mixed together with no repo separation. Need repo-scoped views (e.g., `/changelog?repo=owner/name` or `/changelog/[owner]/[repo]`) and a way for users to navigate between repos in the sidebar.

## Bugs / Polish

- [ ] **Sidebar repo icon**: Replace empty gray placeholder with generic logo image (`docs/design/images/generic-logo.png`)
- [ ] **Sidebar collapse button position**: Move the expand/collapse icon button to right above the theme switcher (matching the dev dashboard layout)
- [ ] **Sticky changelog header**: Make the "Changelog" h1 and "All notable changes to {repo}" subtitle sticky at the top when the user scrolls down
- [ ] **Windows scrollbar styling**: Style scrollbars on Windows to match macOS thin overlay scrollbars
- [ ] **Editor page scroll**: On `/changelogs/[id]`, only the changelog entries section should scroll, not the entire page (header should stay fixed)

## Deferred (cross-phase)

- [ ] **Mobile responsive — dashboard (Phase 3)**: Dashboard generate page and editor are broken on narrow viewports
- [ ] **Mobile responsive — public page (Phase 4)**: Sidebar collapses to top bar, entries stack without timeline, filter pills become scrollable row, floating chat FAB
- [ ] **Keyboard shortcuts (Phase 3)**: Ctrl+N conflicts with browser new window; other shortcuts (Ctrl+Enter, Ctrl+Shift+P) not firing — needs investigation
- [ ] **Handle expired GitHub tokens**: Stale OAuth tokens return 401 from GitHub API; should detect and prompt re-auth instead of showing generic 500 errors
